import assert from "node:assert/strict";

import {
  COMMON_RANGES,
  rangeId,
  readRangeId,
  type RelativeRange,
  resolveRange,
} from "@sincpro/web-ui/components/search/dateRanges";
import { test } from "vitest";

/* Un miércoles de septiembre, a media tarde. Se elige a propósito en el medio
   del mes, de la semana y del trimestre: los bordes se prueban aparte. */
const NOW = new Date(2026, 8, 16, 15, 30);

const iso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const span = (range: RelativeRange, now = NOW): [string, string] => {
  const out = resolveRange(range, now);
  return [iso(out.from), iso(out.to)];
};

test("«los últimos 3 meses» incluye el mes en curso", () => {
  // Julio, agosto y septiembre; termina al arrancar octubre.
  assert.deepEqual(span({ mode: "last", count: 3, unit: "month" }), [
    "2026-07-01",
    "2026-10-01",
  ]);
});

test("«el mes anterior» es el mes COMPLETO de atrás, sin el que corre", () => {
  assert.deepEqual(span({ mode: "prior", count: 1, unit: "month" }), [
    "2026-08-01",
    "2026-09-01",
  ]);
});

test("el trimestre en curso arranca en su primer mes", () => {
  // Septiembre cae en julio–septiembre.
  assert.deepEqual(span({ mode: "last", count: 1, unit: "quarter" }), [
    "2026-07-01",
    "2026-10-01",
  ]);
});

test("el trimestre anterior es abril–junio", () => {
  assert.deepEqual(span({ mode: "prior", count: 1, unit: "quarter" }), [
    "2026-04-01",
    "2026-07-01",
  ]);
});

test("la semana arranca el lunes", () => {
  // El 16/09/2026 es miércoles; su lunes es el 14.
  assert.deepEqual(span({ mode: "last", count: 1, unit: "week" }), [
    "2026-09-14",
    "2026-09-21",
  ]);
});

test("un domingo sigue perteneciendo a la semana que arrancó el lunes", () => {
  const domingo = new Date(2026, 8, 20, 23, 0);
  assert.deepEqual(span({ mode: "last", count: 1, unit: "week" }, domingo), [
    "2026-09-14",
    "2026-09-21",
  ]);
});

test("«los últimos 3 años» incluye el año en curso", () => {
  assert.deepEqual(span({ mode: "last", count: 3, unit: "year" }), [
    "2024-01-01",
    "2027-01-01",
  ]);
});

/* El fin queda AFUERA: con un `between` inclusivo, una fila guardada a las
   00:00:00 del primero de octubre caería en «los últimos 3 meses» Y en el
   recorte siguiente. */
test("el final del intervalo es exclusivo y encastra con el que sigue", () => {
  const ultimos = resolveRange({ mode: "last", count: 1, unit: "month" }, NOW);
  const anterior = resolveRange({ mode: "prior", count: 1, unit: "month" }, NOW);
  assert.equal(anterior.to.getTime(), ultimos.from.getTime());
});

test("cruzar diciembre no rompe el año", () => {
  const enero = new Date(2027, 0, 10);
  assert.deepEqual(span({ mode: "prior", count: 1, unit: "month" }, enero), [
    "2026-12-01",
    "2027-01-01",
  ]);
});

test("un trimestre anterior desde enero cae en el año pasado", () => {
  const enero = new Date(2027, 0, 10);
  assert.deepEqual(span({ mode: "prior", count: 1, unit: "quarter" }, enero), [
    "2026-10-01",
    "2027-01-01",
  ]);
});

/* Lo que se guarda es la INTENCIÓN. Un favorito guardado en septiembre tiene que
   contestar otra cosa en diciembre, y ése es justamente el punto. */
test("el mismo recorte resuelve distinto en otra fecha", () => {
  const range: RelativeRange = { mode: "last", count: 3, unit: "month" };
  assert.notDeepEqual(span(range), span(range, new Date(2026, 11, 2)));
});

test("el id va y vuelve", () => {
  for (const range of COMMON_RANGES) {
    assert.deepEqual(readRangeId(rangeId(range)), range);
  }
});

test("un id roto no se adivina", () => {
  assert.equal(readRangeId("last:0:month"), null);
  assert.equal(readRangeId("last:3:decade"), null);
  assert.equal(readRangeId("siempre"), null);
  assert.equal(readRangeId("last:tres:month"), null);
});
