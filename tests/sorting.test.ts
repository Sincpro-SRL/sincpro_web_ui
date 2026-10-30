import assert from "node:assert/strict";
import { test } from "node:test";

import { type SortField, sortItems } from "@sincpro/web-ui/components/listing/SortMenu";

type Row = { id: string; name: string; rows: number | null };

const ROWS: Row[] = [
  { id: "b", name: "beta", rows: 400 },
  { id: "a", name: "alfa", rows: 50 },
  { id: "d", name: "delta", rows: null },
  { id: "c", name: "gamma", rows: 2688991 },
];

const FIELDS: SortField<Row>[] = [
  { field: "name", label: "nombre", value: (one) => one.name },
  { field: "rows", label: "filas", value: (one) => one.rows },
  /* Sin `value`: éste lo ordena el motor, no el navegador. */
  { field: "registered_at", label: "registrado" },
];

const ids = (items: readonly Row[]): string[] => items.map((one) => one.id);

test("sin orden puesto, las filas quedan como vinieron", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, null)), ["b", "a", "d", "c"]);
});

test("ordena por texto", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, { key: "name", direction: "asc" })), [
    "a",
    "b",
    "d",
    "c",
  ]);
});

/* Por número y no por su texto: «2688991» empieza con «2», así que ordenado como
   texto quedaría antes que «400». */
test("ordena los números como números", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, { key: "rows", direction: "asc" })), [
    "a",
    "b",
    "c",
    "d",
  ]);
});

test("invertir la dirección invierte el orden", () => {
  assert.deepEqual(
    ids(sortItems(ROWS, FIELDS, { key: "rows", direction: "desc" })).slice(0, 3),
    ["c", "b", "a"],
  );
});

/* Un vacío no es «el más chico»: es la ausencia de respuesta. Ponerlo primero al
   invertir el orden llena la primera pantalla con las filas que menos dicen. */
test("los faltantes van al final, suba o baje el orden", () => {
  const subiendo = ids(sortItems(ROWS, FIELDS, { key: "rows", direction: "asc" }));
  const bajando = ids(sortItems(ROWS, FIELDS, { key: "rows", direction: "desc" }));
  assert.equal(subiendo[subiendo.length - 1], "d");
  assert.equal(bajando[bajando.length - 1], "d");
});

/* Un campo sin `value` lo ordena quien trajo las filas —el motor, que las tiene
   todas—. Ordenar acá la página traída daría un orden que es mentira: ordenaría
   las cuatro que llegaron y no las ciento ochenta y siete que hay. */
test("un campo sin lector no se ordena en el navegador", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, { key: "registered_at", direction: "asc" })), [
    "b",
    "a",
    "d",
    "c",
  ]);
});

test("un campo que no está declarado no rompe nada", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, { key: "no_existe", direction: "asc" })), [
    "b",
    "a",
    "d",
    "c",
  ]);
});

test("ordenar no muta el arreglo que le pasaron", () => {
  const original = [...ROWS];
  sortItems(ROWS, FIELDS, { key: "name", direction: "asc" });
  assert.deepEqual(ROWS, original);
});
