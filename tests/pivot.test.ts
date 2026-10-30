import assert from "node:assert/strict";
import { test } from "node:test";

import {
  axisLabels,
  axisSpans,
  type GroupLevel,
  keyStarts,
  type PivotFold,
  pivotFrom,
  pivotIsEmpty,
  pivotOf,
} from "@sincpro/web-ui";

type Row = { id: string; origin: string; month: string; rows: number };

/* Los importes están elegidos para que el promedio de los promedios NO sea el
   promedio: «sintético» tiene un mes de una fila con 100 y otro de dos filas con
   10 y 10. Promediar los dos meses da 55; promediar las tres filas da 40. */
const ROWS: Row[] = [
  { id: "a", origin: "sintético", month: "2026-09", rows: 100 },
  { id: "b", origin: "sintético", month: "2026-08", rows: 10 },
  { id: "c", origin: "sintético", month: "2026-08", rows: 10 },
  { id: "d", origin: "traído", month: "2026-09", rows: 7 },
];

const of = (row: Row, level: GroupLevel): string =>
  level.field === "origin" ? row.origin : row.month;

const BY_ORIGIN: GroupLevel[] = [{ field: "origin" }];
const BY_MONTH: GroupLevel[] = [{ field: "month", grain: "month" }];

const SUM: PivotFold<Row> = {
  id: "rows",
  header: "filas",
  fold: (items) => (items.length === 0 ? null : items.reduce((a, b) => a + b.rows, 0)),
};

const MEAN: PivotFold<Row> = {
  id: "mean",
  header: "promedio",
  fold: (items) =>
    items.length === 0 ? null : items.reduce((a, b) => a + b.rows, 0) / items.length,
};

const build = (measures: readonly PivotFold<Row>[] = [SUM]) =>
  pivotFrom(ROWS, { rows: BY_ORIGIN, columns: BY_MONTH, of, measures });

test("los ejes traen cada clave que apareció, en orden de primera aparición", () => {
  const pivot = build();
  assert.deepEqual(pivot.rows.keys, [["sintético"], ["traído"]]);
  assert.deepEqual(pivot.columns.keys, [["2026-09"], ["2026-08"]]);
});

test("los niveles rotulan el eje, y `labelOf` los traduce", () => {
  assert.deepEqual(build().rows.levels, [{ field: "origin", label: "origin" }]);
  const named = pivotFrom(ROWS, {
    rows: BY_ORIGIN,
    columns: BY_MONTH,
    of,
    measures: [SUM],
    labelOf: (level) => (level.field === "origin" ? "procedencia" : "mes"),
  });
  assert.deepEqual(named.rows.levels, [{ field: "origin", label: "procedencia" }]);
  /* El nivel viaja ENTERO —con su grano— porque el rótulo del nivel no alcanza
     para leer sus claves: «registrado» no convierte «2026-09» en «Septiembre». */
  assert.deepEqual(named.columns.levels, [{ field: "month", grain: "month", label: "mes" }]);
});

test("un cruce con filas trae su conteo y sus medidas", () => {
  const cell = build().cell(["sintético"], ["2026-08"]);
  assert.equal(cell?.count, 2);
  assert.equal(cell?.values["rows"], 20);
});

test("un cruce SIN filas es un agujero, no un cero", () => {
  /* «traído» no tiene agosto. Devolver una celda con cero diría que hubo cero
     filas, que es otra cosa: la grilla dibuja un cero y un blanco distinto. */
  assert.equal(build().cell(["traído"], ["2026-08"]), undefined);
});

test("el margen se pliega sobre la BASE y no sobre los cruces", () => {
  const pivot = build([MEAN]);
  // Los dos meses de «sintético», cada uno promediado por su cuenta.
  assert.equal(pivot.cell(["sintético"], ["2026-09"])?.values["mean"], 100);
  assert.equal(pivot.cell(["sintético"], ["2026-08"])?.values["mean"], 10);
  /* El margen NO es (100 + 10) / 2 = 55: es el promedio de las tres filas. Un
     promedio de promedios no es un promedio, y esto es esa regla ejecutada. */
  assert.equal(pivot.rowTotal?.(["sintético"])?.values["mean"], 40);
  assert.equal(pivot.rowTotal?.(["sintético"])?.count, 3);
});

test("el total plega TODO una vez", () => {
  assert.equal(build([MEAN]).total?.values["mean"], (100 + 10 + 10 + 7) / 4);
  assert.equal(build().total?.values["rows"], 127);
});

test("el margen de una columna pliega su columna entera", () => {
  const pivot = build();
  assert.equal(pivot.columnTotal?.(["2026-09"])?.values["rows"], 107);
  assert.equal(pivot.columnTotal?.(["2026-08"])?.values["rows"], 20);
});

test("sin filas no hay pivote", () => {
  const empty = pivotFrom([] as Row[], {
    rows: BY_ORIGIN,
    columns: BY_MONTH,
    of,
    measures: [SUM],
  });
  assert.equal(pivotIsEmpty(empty), true);
  assert.equal(pivotIsEmpty(build()), false);
});

/* ---------------------------------------------------------------- *
 *  El pivote que llega plegado de afuera
 * ---------------------------------------------------------------- */

const AXES = {
  rows: {
    levels: [{ field: "origin", label: "procedencia" }],
    keys: [["sintético"], ["traído"]],
  },
  columns: {
    levels: [{ field: "registered_at", grain: "month" as const, label: "mes" }],
    keys: [["2026-09"], ["2026-08"]],
  },
  measures: [{ id: "rows", header: "filas" }],
};

test("`pivotOf` indexa los cruces que vinieron y deja agujeros en el resto", () => {
  const pivot = pivotOf({
    ...AXES,
    crossings: [
      { row: ["sintético"], column: ["2026-09"], count: 1, values: { rows: 100 } },
      { row: ["traído"], column: ["2026-09"], count: 1, values: { rows: 7 } },
    ],
  });
  assert.equal(pivot.cell(["sintético"], ["2026-09"])?.values["rows"], 100);
  assert.equal(pivot.cell(["sintético"], ["2026-08"]), undefined);
});

test("sin márgenes no hay banda de totales: acá no se suman celdas", () => {
  const pivot = pivotOf({ ...AXES, crossings: [] });
  assert.equal(pivot.rowTotal, undefined);
  assert.equal(pivot.columnTotal, undefined);
  assert.equal(pivot.total, undefined);
});

test("los márgenes que vinieron se leen por su clave", () => {
  const pivot = pivotOf({
    ...AXES,
    crossings: [],
    rowMargins: [{ key: ["sintético"], count: 3, values: { rows: 120 } }],
    columnMargins: [{ key: ["2026-09"], count: 2, values: { rows: 107 } }],
    total: { count: 4, values: { rows: 127 } },
  });
  assert.equal(pivot.rowTotal?.(["sintético"])?.values["rows"], 120);
  assert.equal(pivot.rowTotal?.(["traído"]), undefined);
  assert.equal(pivot.columnTotal?.(["2026-09"])?.values["rows"], 107);
  assert.equal(pivot.total?.values["rows"], 127);
});

test("dos rutas distintas no se pisan aunque concatenen igual", () => {
  /* `["a"]×["b","c"]` y `["a","b"]×["c"]` son dos celdas distintas de la grilla.
     Con un separador escribible entre las dos rutas serían la misma clave y una
     taparía a la otra. */
  const pivot = pivotOf({
    rows: { levels: [{ field: "x", label: "x" }], keys: [["a"], ["a", "b"]] },
    columns: { levels: [{ field: "y", label: "y" }], keys: [["b", "c"], ["c"]] },
    measures: [{ id: "n", header: "n" }],
    crossings: [
      { row: ["a"], column: ["b", "c"], count: 1, values: { n: 1 } },
      { row: ["a", "b"], column: ["c"], count: 1, values: { n: 2 } },
    ],
  });
  assert.equal(pivot.cell(["a"], ["b", "c"])?.values["n"], 1);
  assert.equal(pivot.cell(["a", "b"], ["c"])?.values["n"], 2);
});

/* ---------------------------------------------------------------- *
 *  Lo que el dibujo necesita saber de las claves
 * ---------------------------------------------------------------- */

test("un tramo se escribe sólo cuando cambia", () => {
  assert.deepEqual(keyStarts(["sintético", "2026-09"], undefined), [true, true]);
  assert.deepEqual(keyStarts(["sintético", "2026-08"], ["sintético", "2026-09"]), [
    false,
    true,
  ]);
});

test("cuando cambia un nivel de arriba, los de abajo arrancan de nuevo", () => {
  /* El «2026-09» de «traído» no es la continuación del «2026-09» de
     «sintético»: son dos filas de montones distintos. */
  assert.deepEqual(keyStarts(["traído", "2026-09"], ["sintético", "2026-09"]), [true, true]);
});

test("un tramo del eje horizontal cubre las columnas que cuelgan de él", () => {
  const eje = {
    levels: [
      { field: "registered_at", label: "año" },
      { field: "registered_at", label: "trimestre" },
    ],
    keys: [
      ["2026", "Q1"],
      ["2026", "Q2"],
      ["2027", "Q1"],
    ],
  };
  assert.deepEqual(axisSpans(eje, 0), [
    { label: "2026", span: 2, at: 0 },
    { label: "2027", span: 1, at: 2 },
  ]);
});

test("dos rótulos iguales bajo padres distintos son dos tramos", () => {
  /* Fundirlos en uno dibujaría una celda que abarca columnas que no son
     hermanas: el Q1 de 2026 y el de 2027 no son el mismo trimestre. */
  const eje = {
    levels: [
      { field: "registered_at", label: "año" },
      { field: "registered_at", label: "trimestre" },
    ],
    keys: [
      ["2026", "Q1"],
      ["2027", "Q1"],
    ],
  };
  assert.deepEqual(axisSpans(eje, 1), [
    { label: "Q1", span: 1, at: 0 },
    { label: "Q1", span: 1, at: 1 },
  ]);
});

/* ---------------------------------------------------------------- *
 *  La clave identifica; el rótulo se lee
 * ---------------------------------------------------------------- */

/* El eje dibujaba su clave cruda, así que una columna decía «2026-09» donde el
   mismo montón en una lista decía «Septiembre de 2026»: el mismo corte con dos
   caras según en qué presentación cayó. */
test("una clave de fecha se lee con el nombre de su corte", () => {
  const eje = {
    levels: [{ field: "registered_at", grain: "month" as const, label: "registrado" }],
    keys: [["2026-09"], ["2026-08"]],
  };
  /* Sin un año más afuera, el mes lo dice: es la única manera de saber cuál es. */
  assert.deepEqual(axisLabels(eje, ["2026-09"]), ["September 2026"]);
  assert.deepEqual(axisSpans(eje, 0), [
    { label: "September 2026", span: 1, at: 0 },
    { label: "August 2026", span: 1, at: 1 },
  ]);
});

/* Con el año afuera, el mes no repite el año: eso ya está escrito una columna
   antes, y decirlo dos veces llena la grilla con lo que ya se leyó. */
test("un nivel de adentro no repite lo que dijo el de afuera", () => {
  const eje = {
    levels: [
      { field: "registered_at", grain: "year" as const, label: "año" },
      { field: "registered_at", grain: "month" as const, label: "mes" },
    ],
    keys: [["2026", "2026-09"]],
  };
  assert.deepEqual(axisLabels(eje, ["2026", "2026-09"]), ["2026", "September"]);
});

/* Lo que no es una fecha se dibuja tal cual: «sintético» se identifica y se lee
   con la misma palabra, y traducirlo sería inventar un valor que nadie guardó. */
test("lo que no es una fecha se lee como se guardó", () => {
  const eje = { levels: [{ field: "origin", label: "procedencia" }], keys: [["sintético"]] };
  assert.deepEqual(axisLabels(eje, ["sintético"]), ["sintético"]);
});
