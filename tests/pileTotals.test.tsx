import assert from "node:assert/strict";

import { StatusBar } from "@sincpro/web-ui/components/record/StatusBar";
import type { Pile } from "@sincpro/web-ui/foundations/grouping";
import {
  columnFormat,
  type DataColumn,
  DataTable,
  pileAggregate,
} from "@sincpro/web-ui/primitives/table/DataTable";
import { Truck } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * A GROUP SAYS WHAT IT ADDS UP TO, under each column — and a column writes its numbers ONE way.
 * What the server summed wins; without it, the rows are summed only when the pile holds all of
 * them: one page's sum of a pile of thousands looks like its total and is not.
 */

type Order = { id: string; stage: string; total: number };

const TOTAL: DataColumn<Order> = {
  id: "total",
  header: "total",
  value: (o) => o.total,
  numeric: true,
  aggregate: "sum",
  decimals: 2,
};
const STAGE: DataColumn<Order> = { id: "stage", header: "estado", value: (o) => o.stage };

const ROWS: Order[] = [
  { id: "a", stage: "pedido", total: 58000 },
  { id: "b", stage: "pedido", total: 112480.5 },
];

function pile(over: Partial<Pile<Order>> = {}): Pile<Order> {
  return {
    path: ["pedido"],
    depth: 0,
    field: "estado",
    key: "pedido",
    label: "pedido",
    count: ROWS.length,
    items: ROWS,
    piles: [],
    ...over,
  };
}

test("a pile with all its rows sums them; a column without an aggregate says nothing", () => {
  assert.equal(pileAggregate(TOTAL, pile()), 170480.5);
  assert.equal(pileAggregate(STAGE, pile()), null);
});

test("a pile that holds one page of its rows does not pass the page's sum off as its total", () => {
  assert.equal(pileAggregate(TOTAL, pile({ count: 5000 })), null);
});

test("what the server summed wins, by the column's id or its field", () => {
  assert.equal(
    pileAggregate(TOTAL, pile({ count: 5000, totals: { total: 1204933.5 } })),
    1204933.5,
  );
  const byField = { ...TOTAL, id: "importe", field: "amount_total" };
  assert.equal(pileAggregate(byField, pile({ totals: { amount_total: 7 } })), 7);
});

test("a column's numbers carry the same decimals; its format wins over them", () => {
  assert.equal(columnFormat(TOTAL, "es-BO")?.(6057.1), "6.057,10");
  assert.equal(columnFormat({ ...TOTAL, format: (n) => `Bs ${n}` }, "es-BO")?.(1), "Bs 1");
  assert.equal(columnFormat(STAGE, "es-BO"), undefined);
});

test("the pile's row draws its sum under the column that sums, and the cells their decimals", () => {
  const html = renderToStaticMarkup(
    <DataTable<Order>
      data={ROWS}
      columns={[STAGE, TOTAL]}
      getRowId={(o) => o.id}
      piles={[pile()]}
    />,
  );
  const row = /<tr[^>]*data-ui="table.pile"[^>]*>([\s\S]*?)<\/tr>/.exec(html)?.[1] ?? "";
  // The name spans up to the first column that sums; then one cell per column.
  assert.match(row, /colSpan="1"|colspan="1"/i);
  assert.equal(row.match(/<td/g)?.length, 2);
  // In the copy's locale: «170,480.50» here, «170.480,50» in Spanish — two decimals either way.
  assert.match(row, /170[.,]480[.,]50/);
  assert.match(html, /58[.,]000[.,]00/);
});

test("a stage draws its icon, its hint and its count", () => {
  const html = renderToStaticMarkup(
    <StatusBar
      stages={[
        {
          id: "transit",
          label: "En camino",
          icon: Truck,
          hint: "Salió del almacén",
          count: 3,
        },
        { id: "done", label: "Entregado" },
      ]}
      current="transit"
      layout="trail"
    />,
  );
  assert.match(html, /lucide-truck/);
  assert.match(html, /title="Salió del almacén"/);
  assert.match(html, />3</);
});
