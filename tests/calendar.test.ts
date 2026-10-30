import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  dateKey,
  dateLabel,
  grainName,
  monthName,
} from "@sincpro/web-ui/foundations/calendar";
import { installCopy } from "@sincpro/web-ui/foundations/copy";

/* El español, como lo pone la aplicación: el `locale` y las dos palabras que
   ningún calendario nombra. Los doce meses y los siete días NO están acá — los
   dice `Intl`, que es el punto. */
const SPANISH = {
  locale: "es-BO",
  calendar: {
    week: "Semana {n}",
    weekOfYear: "Semana {n} de {year}",
    quarter: "T{n}",
    quarterOfYear: "T{n} {year}",
  },
};

/* Un martes de septiembre de 2026, que cae en la semana 38. */
const TUESDAY = new Date(2026, 8, 15);

afterEach(() => {
  installCopy();
});

/* ---------------------------------------------------------------- *
 *  La clave: un solo idioma, el del motor
 * ---------------------------------------------------------------- */

test("cada grano recorta la fecha con el texto que escribe el motor", () => {
  assert.equal(dateKey(TUESDAY, "year"), "2026");
  assert.equal(dateKey(TUESDAY, "quarter"), "2026-Q3");
  assert.equal(dateKey(TUESDAY, "month"), "2026-09");
  assert.equal(dateKey(TUESDAY, "week"), "2026-W38");
  assert.equal(dateKey(TUESDAY, "day"), "2026-09-15");
});

test("la clave no cambia con el idioma", () => {
  installCopy(SPANISH);
  assert.equal(dateKey(TUESDAY, "month"), "2026-09");
});

/* La semana 1 es la que tiene el primer jueves, así que el 1 de enero de 2027
   —viernes— todavía es la última semana de 2026. El año de la clave es el de la
   SEMANA y no el de la fecha; si no, «2027-W53» sería una semana que no existe. */
test("una semana de fin de año pertenece al año de su jueves", () => {
  assert.equal(dateKey(new Date(2027, 0, 1), "week"), "2026-W53");
  assert.equal(dateKey(new Date(2026, 0, 1), "week"), "2026-W01");
});

test("sin fecha la clave es vacía, y es un montón como cualquier otro", () => {
  assert.equal(dateKey(null, "month"), "");
  assert.equal(dateKey(undefined, "month"), "");
  assert.equal(dateKey("", "month"), "");
  assert.equal(dateKey("no es una fecha", "month"), "");
});

/* ---------------------------------------------------------------- *
 *  El rótulo: el idioma activo, y sólo lo que no se dijo arriba
 * ---------------------------------------------------------------- */

test("el rótulo se planta solo cuando no hay nadie arriba", () => {
  assert.equal(dateLabel("2026", "year"), "2026");
  assert.equal(dateLabel("2026-Q3", "quarter"), "Q3 2026");
  assert.equal(dateLabel("2026-09", "month"), "September 2026");
  assert.equal(dateLabel("2026-W38", "week"), "Week 38, 2026");
  assert.equal(dateLabel("2026-09-15", "day"), "Tuesday, Sep 15, 2026");
});

test("con el año arriba, el rótulo no lo repite", () => {
  assert.equal(dateLabel("2026-Q3", "quarter", ["year"]), "Q3");
  assert.equal(dateLabel("2026-09", "month", ["year"]), "September");
  assert.equal(dateLabel("2026-W38", "week", ["year"]), "Week 38");
});

/* Un mes arriba ya dijo de qué año es la semana: no hace falta el año puesto
   como nivel para que «Semana 38» sea una sola semana. */
test("un mes arriba también alcanza para una semana", () => {
  assert.equal(dateLabel("2026-W38", "week", ["month"]), "Week 38");
  assert.equal(dateLabel("2026-W38", "week", ["quarter"]), "Week 38");
});

/* Adentro de una semana hay siete días y ninguno se repite, así que el nombre
   alcanza. Afuera no: un «Tuesday» suelto no dice cuál de los cincuenta y dos. */
test("adentro de una semana, un día es su nombre", () => {
  assert.equal(dateLabel("2026-09-15", "day", ["year", "month", "week"]), "Tuesday");
  assert.equal(dateLabel("2026-09-15", "day", ["year", "month"]), "Tuesday, Sep 15");
});

test("el idioma lo pone la copia, y los meses y los días los dice Intl", () => {
  installCopy(SPANISH);
  assert.equal(dateLabel("2026-09", "month", ["year"]), "Septiembre");
  assert.equal(dateLabel("2026-W38", "week", ["year"]), "Semana 38");
  assert.equal(dateLabel("2026-Q3", "quarter", ["year"]), "T3");
  assert.equal(dateLabel("2026-09-15", "day", ["year", "month", "week"]), "Martes");
  assert.equal(dateLabel("2026-09", "month"), "Septiembre de 2026");
});

/* Encabeza un montón: en español `Intl` devuelve «septiembre» con minúscula y
   «Septiembre» es lo que se lee arriba de una lista. */
test("el rótulo arranca con mayúscula en los dos idiomas", () => {
  assert.equal(dateLabel("2026-09", "month", ["year"]), "September");
  installCopy(SPANISH);
  assert.equal(dateLabel("2026-09", "month", ["year"]), "Septiembre");
});

test("sin fecha se dice con palabras, no con una clave vacía", () => {
  assert.equal(dateLabel("", "month"), "no date");
  installCopy({ locale: "es-BO", time: { noDate: "sin fecha" } });
  assert.equal(dateLabel("", "month"), "sin fecha");
});

/* Un montón contado afuera puede traer una clave que esta capa no escribió. Se
   dibuja tal cual: inventarle una fecha sería dibujar un dato que no es. */
test("una clave que no tiene la forma de su grano se dibuja tal cual", () => {
  assert.equal(dateLabel("septiembre", "month"), "septiembre");
  assert.equal(dateLabel("2026-09-15", "month"), "2026-09-15");
});

/* `Date` no se queja de un mes 13 ni de un 31 de febrero: los corre al mes
   siguiente. Un rótulo «Enero» sobre un montón que nadie contó es peor que una
   clave a la vista, así que la forma se valida antes de creerle. */
test("una fecha que no existe no se dibuja como otra que sí", () => {
  assert.equal(dateLabel("2026-13", "month"), "2026-13");
  assert.equal(dateLabel("2026-02-31", "day"), "2026-02-31");
  assert.equal(dateLabel("2026-W54", "week"), "2026-W54");
});

/* ---------------------------------------------------------------- *
 *  Los otros dos nombres
 * ---------------------------------------------------------------- */

test("un mes se llama por su número, sin tener ninguna fecha en la mano", () => {
  assert.equal(monthName(9), "September");
  installCopy(SPANISH);
  assert.equal(monthName(9), "Septiembre");
});

/* El grano nombra el CORTE —«día»— y el rótulo nombra lo cortado —«Martes»—. */
test("el grano se llama como la copia llama a su unidad de tiempo", () => {
  assert.equal(grainName("day"), "Day");
  assert.equal(grainName("week"), "Week");
  installCopy({
    locale: "es-BO",
    dates: { day: "día", week: "semana", month: "mes", quarter: "trimestre", year: "año" },
  });
  assert.equal(grainName("day"), "Día");
  assert.equal(grainName("quarter"), "Trimestre");
});
