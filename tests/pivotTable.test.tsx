import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type GroupLevel,
  type PivotFold,
  pivotFrom,
  pivotOf,
  PivotTable,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Lo que una grilla puede tener mal sin que el tipo se queje: que las celdas de
 * una fila no sumen las columnas que el encabezado prometió.
 *
 * Un `colSpan` de más corre todo lo que tiene a la derecha medio ancho, y eso no
 * se ve en un typecheck ni en una prueba del contrato — se ve mirando, o
 * contando celdas. Esto cuenta celdas.
 */

type Venta = { sucursal: string; trimestre: string; importe: number };

const VENTAS: Venta[] = [
  { sucursal: "La Paz", trimestre: "Q1", importe: 100 },
  { sucursal: "La Paz", trimestre: "Q2", importe: 0 },
  { sucursal: "Tarija", trimestre: "Q2", importe: -50 },
];

const of = (venta: Venta, level: GroupLevel): string =>
  level.field === "sucursal" ? venta.sucursal : venta.trimestre;

const IMPORTE: PivotFold<Venta> = {
  id: "importe",
  header: "importe",
  fold: (items) => (items.length === 0 ? null : items.reduce((a, b) => a + b.importe, 0)),
};

const CONTEO: PivotFold<Venta> = {
  id: "n",
  header: "cuántas",
  fold: (items) => items.length,
};

const build = (measures: readonly PivotFold<Venta>[]) =>
  pivotFrom(VENTAS, {
    rows: [{ field: "sucursal" }],
    columns: [{ field: "trimestre" }],
    of,
    measures,
  });

/** Las filas del `<tbody>`, cada una con sus celdas. */
function bodyRows(html: string): string[][] {
  const body = html.split("<tbody>")[1]?.split("</tbody>")[0] ?? "";
  return body
    .split("<tr")
    .slice(1)
    .map((row) => row.split(/<t[dh]/).slice(1));
}

test("cada fila trae los rótulos, los cruces y el margen, y ni una celda más", () => {
  const html = renderToStaticMarkup(<PivotTable pivot={build([IMPORTE])} />);
  // 1 rótulo + 2 trimestres × 1 medida + 1 margen.
  for (const row of bodyRows(html)) assert.equal(row.length, 4);
});

test("con dos medidas cada clave del eje ocupa dos celdas", () => {
  const html = renderToStaticMarkup(<PivotTable pivot={build([IMPORTE, CONTEO])} />);
  // 1 rótulo + 2 trimestres × 2 medidas + 2 del margen.
  for (const row of bodyRows(html)) assert.equal(row.length, 7);
});

test("el encabezado promete exactamente las columnas que el cuerpo dibuja", () => {
  const html = renderToStaticMarkup(<PivotTable pivot={build([IMPORTE, CONTEO])} />);
  const head = html.split("<thead")[1]?.split("</thead>")[0] ?? "";
  const spans = [...head.matchAll(/colSpan="(\d+)"|colspan="(\d+)"/g)].map((m) =>
    Number(m[1] ?? m[2]),
  );
  /* El primer renglón: la esquina (1 columna de rótulos) + un tramo por
     trimestre (2 celdas cada uno) + el margen (2). */
  assert.deepEqual(spans, [1, 2, 2, 2]);
});

test("un agujero no dibuja nada, y un cero dibuja el cero", () => {
  const html = renderToStaticMarkup(<PivotTable pivot={build([IMPORTE])} />);
  const tarija = bodyRows(html).find((row) => row[0]?.includes("Tarija"));
  // Tarija no tiene Q1: la celda existe en la grilla y está vacía.
  assert.equal(/>\s*<\/td>/.test(`<td${tarija?.[1] ?? ""}`), true);
  // La Paz sí tiene Q2, y vendió cero: eso se dibuja.
  const laPaz = bodyRows(html).find((row) => row[0]?.includes("La Paz"));
  assert.equal(laPaz?.[2]?.includes(">0<"), true);
});

test("sin márgenes no hay ni columna ni pie de totales", () => {
  const html = renderToStaticMarkup(
    <PivotTable
      pivot={pivotOf({
        rows: { levels: [{ field: "branch", label: "sucursal" }], keys: [["La Paz"]] },
        columns: { levels: [{ field: "quarter", label: "trimestre" }], keys: [["Q1"]] },
        measures: [{ id: "importe", header: "importe" }],
        crossings: [{ row: ["La Paz"], column: ["Q1"], count: 1, values: { importe: 100 } }],
      })}
    />,
  );
  assert.equal(html.includes("<tfoot>"), false);
  // 1 rótulo + 1 cruce, y nada a la derecha.
  assert.deepEqual(
    bodyRows(html).map((row) => row.length),
    [1 + 1],
  );
});

test("un tramo repetido del eje vertical no se vuelve a escribir", () => {
  const html = renderToStaticMarkup(
    <PivotTable
      pivot={pivotFrom(VENTAS, {
        rows: [{ field: "sucursal" }, { field: "trimestre" }],
        columns: [{ field: "trimestre" }],
        of,
        measures: [IMPORTE],
      })}
    />,
  );
  /* «La Paz» tiene dos trimestres y por lo tanto dos filas, y se escribe una
     sola vez: la segunda deja el rótulo en blanco. */
  assert.equal(html.split("La Paz").length - 1, 1);
});
