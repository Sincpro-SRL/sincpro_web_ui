import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type DatePeriod,
  datePeriodGroup,
  datePeriodOptions,
  type DateRange,
  periodId,
  readPeriodId,
  recentMonths,
  recentYears,
  resolvePeriods,
} from "@sincpro/web-ui/components/search/datePeriods";

/* Un miércoles de septiembre de 2026. */
const NOW = new Date(2026, 8, 16, 15, 30);

const iso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const spans = (periods: readonly DatePeriod[], now = NOW): string[] =>
  resolvePeriods(periods, now).map(
    (range: DateRange) => `${iso(range.from)}→${iso(range.to)}`,
  );

test("sin nada tildado no hay recorte", () => {
  assert.deepEqual(spans([]), []);
});

test("un mes solo es ese mes del año en curso", () => {
  assert.deepEqual(spans([{ kind: "month", month: 9 }]), ["2026-09-01→2026-10-01"]);
});

/* Dos meses NO son un solo tramo de julio a octubre: agosto queda afuera porque
   nadie lo pidió. */
test("dos meses salteados son dos tramos, no uno que los une", () => {
  assert.deepEqual(
    spans([
      { kind: "month", month: 9 },
      { kind: "month", month: 7 },
    ]),
    ["2026-09-01→2026-10-01", "2026-07-01→2026-08-01"],
  );
});

test("un año solo es el año entero", () => {
  assert.deepEqual(spans([{ kind: "year", year: 2025 }]), ["2025-01-01→2026-01-01"]);
});

/* La regla de Odoo: el año MULTIPLICA y el mes RECORTA. «septiembre» + «2025»
   es septiembre de 2025, no «septiembre o 2025». */
test("un mes y un año se cruzan: es ese mes de ese año", () => {
  assert.deepEqual(
    spans([
      { kind: "month", month: 9 },
      { kind: "year", year: 2025 },
    ]),
    ["2025-09-01→2025-10-01"],
  );
});

test("dos años y un mes dan ese mes en cada año", () => {
  assert.deepEqual(
    spans([
      { kind: "month", month: 3 },
      { kind: "year", year: 2026 },
      { kind: "year", year: 2025 },
    ]),
    ["2026-03-01→2026-04-01", "2025-03-01→2025-04-01"],
  );
});

test("un trimestre son sus tres meses", () => {
  assert.deepEqual(spans([{ kind: "quarter", quarter: 3 }]), ["2026-07-01→2026-10-01"]);
});

test("Q4 termina al arrancar el año siguiente", () => {
  assert.deepEqual(spans([{ kind: "quarter", quarter: 4 }]), ["2026-10-01→2027-01-01"]);
});

test("un trimestre y un año se cruzan igual que un mes", () => {
  assert.deepEqual(
    spans([
      { kind: "quarter", quarter: 1 },
      { kind: "year", year: 2024 },
    ]),
    ["2024-01-01→2024-04-01"],
  );
});

/* El final queda AFUERA: si no, una fila guardada a las 00:00:00 del 1 de
   octubre caería en septiembre Y en el cuarto trimestre. */
test("dos períodos contiguos encastran sin pisarse", () => {
  const [septiembre] = resolvePeriods([{ kind: "month", month: 9 }], NOW);
  const [octubre] = resolvePeriods([{ kind: "month", month: 10 }], NOW);
  assert.equal(septiembre!.to.getTime(), octubre!.from.getTime());
});

/* En enero, «los tres meses recientes» cruzan el año: son de dos años
   distintos, y por eso cada mes viaja con el suyo. */
test("los meses recientes cruzan el fin de año", () => {
  assert.deepEqual(recentMonths(new Date(2027, 0, 10)), [
    { month: 1, year: 2027 },
    { month: 12, year: 2026 },
    { month: 11, year: 2026 },
  ]);
});

test("los años recientes van del actual hacia atrás", () => {
  assert.deepEqual(recentYears(NOW), [2026, 2025, 2024]);
});

test("las opciones salen en tres renglones: meses, trimestres, años", () => {
  const options = datePeriodOptions(NOW, (month) => `mes ${month}`);
  assert.deepEqual(
    options.months.map((one) => one.label),
    ["mes 9", "mes 8", "mes 7"],
  );
  assert.deepEqual(
    options.quarters.map((one) => one.label),
    ["Q1", "Q2", "Q3", "Q4"],
  );
  assert.deepEqual(
    options.years.map((one) => one.label),
    ["2026", "2025", "2024"],
  );
});

test("el id va y vuelve", () => {
  const todos: DatePeriod[] = [
    { kind: "month", month: 9 },
    { kind: "quarter", quarter: 3 },
    { kind: "year", year: 2026 },
  ];
  for (const period of todos) {
    assert.deepEqual(readPeriodId(periodId(period)), period);
  }
});

test("un id roto no se adivina", () => {
  assert.equal(readPeriodId("month:13"), null);
  assert.equal(readPeriodId("month:0"), null);
  assert.equal(readPeriodId("quarter:5"), null);
  assert.equal(readPeriodId("siempre"), null);
});

/* Lo que se guarda es la intención, así que un favorito contesta otra cosa el
   año que viene. Ése es el punto, no un efecto colateral. */
test("«septiembre» resuelve distinto en otro año", () => {
  const septiembre: DatePeriod[] = [{ kind: "month", month: 9 }];
  assert.notDeepEqual(spans(septiembre), spans(septiembre, new Date(2027, 5, 1)));
});

/* El panel de filtros dibujaba «9 · 8 · 7» en vez de «Septiembre · Agosto ·
   Julio»: el grupo tenía su propio default —`String`— y pisaba el del
   calendario. Un default repetido en dos lugares dice dos cosas. */
test("el grupo de fechas nombra los meses, no los numera", () => {
  const grupo = datePeriodGroup({ label: "Fecha de registro", active: [], now: NOW });
  assert.deepEqual(
    grupo.options.slice(0, 3).map((one) => one.label),
    ["September", "August", "July"],
  );
});
