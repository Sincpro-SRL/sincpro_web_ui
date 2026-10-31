import assert from "node:assert/strict";

import { type DataColumn, DataTable, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import { pilesOf } from "@sincpro/web-ui/foundations/grouping";
import { reportColumnsOf, sheetRowsOf } from "@sincpro/web-ui/views/list/derive";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * AN AGGREGATE IS WRITTEN LIKE ITS COLUMN.
 *
 * The cells of an amount column say «Bs. 12.300,00» through `cell`; the footer has no row
 * to hand to `cell`, only a number, and drew it raw: «78.752,9», one decimal lost and no
 * currency. `format` writes it — in the footer, the bands of the sheet and the report
 * built from the piles — and a count stays a count.
 */

type Linea = { id: string; grupo: string; monto: number };

const LINEAS: Linea[] = [
  { id: "l1", grupo: "a", monto: 50000 },
  { id: "l2", grupo: "a", monto: 28752.9 },
  { id: "l3", grupo: "b", monto: 100 },
];

const bs = (n: number) =>
  `Bs. ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const monto = (over: Partial<DataColumn<Linea>> = {}): DataColumn<Linea> => ({
  id: "monto",
  header: "monto",
  value: (l) => l.monto,
  numeric: true,
  aggregate: "sum",
  ...over,
});

const footerOf = (html: string) => html.slice(html.indexOf("<tfoot"));

test("the footer writes a sum with the column's format", () => {
  const html = footerOf(
    draw(
      <DataTable
        data={LINEAS}
        columns={[monto({ format: bs })]}
        getRowId={(l) => l.id}
        totals
      />,
    ),
  );
  assert.ok(html.includes(bs(78852.9)), html);
});

test("without a format, the footer writes the number as before", () => {
  const html = footerOf(
    draw(<DataTable data={LINEAS} columns={[monto()]} getRowId={(l) => l.id} totals />),
  );
  assert.ok(html.includes((78852.9).toLocaleString("es-BO")));
  assert.ok(!html.includes("Bs."));
});

test("mean, min and max are in the column's units; a count is not", () => {
  const html = footerOf(
    draw(
      <DataTable
        data={LINEAS}
        columns={[
          monto({ id: "media", aggregate: "mean", format: bs }),
          monto({ id: "cuantos", aggregate: "count", format: bs }),
        ]}
        getRowId={(l) => l.id}
        totals
      />,
    ),
  );
  assert.ok(html.includes(`media ${bs(78852.9 / 3)}`), html);
  assert.ok(html.includes("3 filas"), html);
});

test("the band of a grouped sheet writes its total like the footer", () => {
  const columns = [monto({ format: bs })];
  const piles = pilesOf(LINEAS, {
    levels: [{ field: "grupo" }],
    of: (l: Linea) => l.grupo,
  });
  const entries = sheetRowsOf(piles, () => true, columns) ?? [];
  const band = entries.find((entry) => entry.band?.label === "a")?.band;
  assert.equal(band?.total?.({ id: "monto", header: "monto" }, 0), bs(78752.9));
});

test("a report built from the piles takes the list column's format", () => {
  const columns = [
    monto({ format: bs }),
    monto({ id: "cuantos", aggregate: "count", format: bs }),
  ];
  const own = (n: number) => `${n} %`;
  const report = reportColumnsOf(
    [
      { id: "monto", header: "monto" },
      { id: "cuantos", header: "cuántos" },
    ],
    columns,
  );
  assert.equal(report[0]?.format, bs);
  assert.equal(report[1]?.format, undefined, "a count is not an amount");
  /* What the report column declares wins: it is the more specific declaration. */
  const declared = reportColumnsOf([{ id: "monto", header: "monto", format: own }], columns);
  assert.equal(declared[0]?.format, own);
});
