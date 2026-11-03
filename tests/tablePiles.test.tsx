import assert from "node:assert/strict";

import { type DataColumn, DataTable, List, type Pile } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: grouped on the server, a pile comes counted over the WHOLE set and holding only
 * its first page. The rows presentation drew those piles; the table regrouped the page it
 * had, so the same list said «187» in rows and «2» in the table. These pin that the table
 * draws the piles as they come — count, label, detail — and offers the rest of each one.
 */

type Order = { id: string; customer: string; total: number };

const COLUMNS: DataColumn<Order>[] = [
  { id: "customer", header: "Customer", value: (o) => o.customer },
  { id: "total", header: "Total", value: (o) => o.total, numeric: true },
];

const PAGE: Order[] = [
  { id: "o1", customer: "Andina", total: 100 },
  { id: "o2", customer: "Andina", total: 250 },
];

/** What a server answers: one pile of 187 orders, the first two of them here. */
const COUNTED: Pile<Order>[] = [
  {
    path: ["andina"],
    depth: 0,
    field: "customer",
    key: "andina",
    label: "Distribuidora Andina",
    count: 187,
    detail: "Bs 1.204.933",
    items: PAGE,
    piles: [],
  },
];

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test("the table draws the piles someone else counted, as they come", () => {
  const out = draw(
    <DataTable<Order>
      data={PAGE}
      columns={COLUMNS}
      getRowId={(o) => o.id}
      piles={COUNTED}
      onMore={() => {}}
    />,
  );
  assert.match(out, /Distribuidora Andina/);
  assert.match(out, />187</);
  assert.match(out, /Bs 1\.204\.933/);
  assert.match(out, /Show 185 more/);
});

test("without a way to ask for more, a short pile offers nothing", () => {
  const out = draw(
    <DataTable<Order> data={PAGE} columns={COLUMNS} getRowId={(o) => o.id} piles={COUNTED} />,
  );
  assert.doesNotMatch(out, /more/);
});

test("a folded pile keeps its count and hides its rows", () => {
  const out = draw(
    <DataTable<Order>
      data={PAGE}
      columns={COLUMNS}
      getRowId={(o) => o.id}
      piles={COUNTED}
      collapsed={["andina"]}
      onGroupToggle={() => {}}
    />,
  );
  assert.match(out, />187</);
  assert.match(out, /aria-expanded="false"/);
  assert.doesNotMatch(out, />Andina</);
});

test("a list grouped on the server says the same count in the table as in rows", () => {
  const list = (present: "rows" | "table") =>
    draw(
      <List<Order>
        items={PAGE}
        keyOf={(o) => o.id}
        present={present}
        group={{
          levels: [{ field: "customer" }],
          of: (o) => o.customer,
          piles: COUNTED,
          onMore: () => {},
        }}
      >
        <List.Rows<Order> row={(o) => ({ name: o.customer })} />
        <List.Table<Order> columns={COLUMNS} />
      </List>,
    );
  for (const present of ["rows", "table"] as const) {
    const out = list(present);
    assert.match(out, />187</, present);
    assert.match(out, /Show 185 more/, present);
  }
});
