import assert from "node:assert/strict";

import { type SortField, sortItems } from "@sincpro/web-ui/components/listing/SortMenu";
import {
  flipSort,
  moveSort,
  pressSort,
  sortPosition,
} from "@sincpro/web-ui/primitives/table/sorting";
import { test } from "vitest";

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
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, [])), ["b", "a", "d", "c"]);
});

test("ordena por texto", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, [{ key: "name", direction: "asc" }])), [
    "a",
    "b",
    "d",
    "c",
  ]);
});

/* Por número y no por su texto: «2688991» empieza con «2», así que ordenado como
   texto quedaría antes que «400». */
test("ordena los números como números", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, [{ key: "rows", direction: "asc" }])), [
    "a",
    "b",
    "c",
    "d",
  ]);
});

test("invertir la dirección invierte el orden", () => {
  assert.deepEqual(
    ids(sortItems(ROWS, FIELDS, [{ key: "rows", direction: "desc" }])).slice(0, 3),
    ["c", "b", "a"],
  );
});

/* Un vacío no es «el más chico»: es la ausencia de respuesta. Ponerlo primero al
   invertir el orden llena la primera pantalla con las filas que menos dicen. */
test("los faltantes van al final, suba o baje el orden", () => {
  const subiendo = ids(sortItems(ROWS, FIELDS, [{ key: "rows", direction: "asc" }]));
  const bajando = ids(sortItems(ROWS, FIELDS, [{ key: "rows", direction: "desc" }]));
  assert.equal(subiendo[subiendo.length - 1], "d");
  assert.equal(bajando[bajando.length - 1], "d");
});

/* Un campo sin `value` lo ordena quien trajo las filas —el motor, que las tiene
   todas—. Ordenar acá la página traída daría un orden que es mentira: ordenaría
   las cuatro que llegaron y no las ciento ochenta y siete que hay. */
test("un campo sin lector no se ordena en el navegador", () => {
  assert.deepEqual(
    ids(sortItems(ROWS, FIELDS, [{ key: "registered_at", direction: "asc" }])),
    ["b", "a", "d", "c"],
  );
});

test("un campo que no está declarado no rompe nada", () => {
  assert.deepEqual(ids(sortItems(ROWS, FIELDS, [{ key: "no_existe", direction: "asc" }])), [
    "b",
    "a",
    "d",
    "c",
  ]);
});

test("ordenar no muta el arreglo que le pasaron", () => {
  const original = [...ROWS];
  sortItems(ROWS, FIELDS, [{ key: "name", direction: "asc" }]);
  assert.deepEqual(ROWS, original);
});

/* ── Varios criterios: el segundo sólo decide entre los que el primero deja iguales ── */

type Sale = { id: string; date: string; customer: string; product: string | null };

const SALES: Sale[] = [
  { id: "1", date: "2026-11-02", customer: "Beta", product: "Tornillo" },
  { id: "2", date: "2026-11-01", customer: "Alfa", product: "Tuerca" },
  { id: "3", date: "2026-11-02", customer: "Alfa", product: "Tuerca" },
  { id: "4", date: "2026-11-02", customer: "Alfa", product: "Arandela" },
  { id: "5", date: "2026-11-02", customer: "Alfa", product: null },
];

const SALE_FIELDS: SortField<Sale>[] = [
  { field: "date", label: "fecha", value: (one) => one.date },
  { field: "customer", label: "cliente", value: (one) => one.customer },
  { field: "product", label: "producto", value: (one) => one.product },
];

test("ordena por fecha, luego por cliente, luego por producto", () => {
  const sorted = sortItems(SALES, SALE_FIELDS, [
    { key: "date", direction: "desc" },
    { key: "customer", direction: "asc" },
    { key: "product", direction: "asc" },
  ]);
  /* 2 de noviembre primero; ahí Alfa antes que Beta; dentro de Alfa por producto, y el que
     no tiene producto al final aunque el orden suba. */
  assert.deepEqual(
    sorted.map((one) => one.id),
    ["4", "3", "5", "1", "2"],
  );
});

test("un criterio que el navegador no sabe leer se saltea y no tapa a los demás", () => {
  const sorted = sortItems(
    SALES,
    [...SALE_FIELDS, { field: "remote", label: "remoto" }],
    [
      { key: "remote", direction: "asc" },
      { key: "customer", direction: "desc" },
    ],
  );
  assert.equal(sorted[0]?.customer, "Beta");
});

test("clic en un encabezado: sola, asc → desc → nada", () => {
  assert.deepEqual(pressSort([], "date", false), [{ key: "date", direction: "asc" }]);
  assert.deepEqual(pressSort([{ key: "date", direction: "asc" }], "date", false), [
    { key: "date", direction: "desc" },
  ]);
  assert.deepEqual(pressSort([{ key: "date", direction: "desc" }], "date", false), []);
});

test("clic sin Mayús con varios criterios deja la columna sola y nunca vacía", () => {
  const two = [
    { key: "date", direction: "desc" },
    { key: "customer", direction: "asc" },
  ] as const;
  assert.deepEqual(pressSort(two, "customer", false), [
    { key: "customer", direction: "desc" },
  ]);
  assert.deepEqual(pressSort(two, "date", false), [{ key: "date", direction: "asc" }]);
  assert.deepEqual(pressSort(two, "product", false), [{ key: "product", direction: "asc" }]);
});

test("Mayús+clic agrega un desempate, lo invierte en su lugar y después lo saca", () => {
  const one = [{ key: "date", direction: "desc" }] as const;
  const added = pressSort(one, "customer", true);
  assert.deepEqual(added, [
    { key: "date", direction: "desc" },
    { key: "customer", direction: "asc" },
  ]);
  const flipped = pressSort(added, "customer", true);
  assert.deepEqual(flipped[1], { key: "customer", direction: "desc" });
  assert.deepEqual(pressSort(flipped, "customer", true), one);
});

test("posición de una columna en el orden", () => {
  const sort = [
    { key: "date", direction: "desc" },
    { key: "customer", direction: "asc" },
  ] as const;
  assert.deepEqual(sortPosition(sort, "customer"), { index: 1, direction: "asc" });
  assert.equal(sortPosition(sort, "product"), null);
});

test("invertir y mover criterios", () => {
  const sort = [
    { key: "date", direction: "desc" },
    { key: "customer", direction: "asc" },
    { key: "product", direction: "asc" },
  ] as const;
  assert.deepEqual(flipSort(sort, 0)[0], { key: "date", direction: "asc" });
  assert.deepEqual(
    moveSort(sort, new Set(["product"]), "date", "before").map((one) => one.key),
    ["product", "date", "customer"],
  );
  assert.deepEqual(
    moveSort(sort, new Set(["date"]), "product", "after").map((one) => one.key),
    ["customer", "product", "date"],
  );
  /* Un destino que no está deja el orden como estaba. */
  assert.deepEqual(moveSort(sort, new Set(["date"]), "nope", "after"), [...sort]);
});
