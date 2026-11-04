import assert from "node:assert/strict";

import { type DataColumn, DataTable, List, type Pile, pileFoot } from "@sincpro/web-ui";
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

test("without a way to ask for more, a short pile offers nothing and says what it shows", () => {
  const out = draw(
    <DataTable<Order> data={PAGE} columns={COLUMNS} getRowId={(o) => o.id} piles={COUNTED} />,
  );
  assert.doesNotMatch(out, /more/);
  assert.match(out, /Showing 2 of 187/);
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

/* ── What one press brings, and the cap ─────────────────────────────── */

const paged = (more: number | false | undefined, items = PAGE): Pile<Order> => ({
  ...COUNTED[0]!,
  items,
  ...(more === undefined ? {} : { more }),
});

test("the foot says what one press brings, not what is missing", () => {
  assert.deepEqual(pileFoot(paged(50), true), { kind: "more", left: 185, next: 50 });
  /* Unsaid, it counts what is left — as before `more` existed. */
  assert.deepEqual(pileFoot(paged(undefined), true), { kind: "more", left: 185 });
  /* The last page brings what is left: «50 more of 12» would promise rows that are not there. */
  assert.deepEqual(pileFoot({ ...paged(50), count: 14 }, true), { kind: "more", left: 12 });
});

test("a pile at its cap offers no press: it says what it shows of what it counts", () => {
  assert.deepEqual(pileFoot(paged(false), true), { kind: "end", shown: 2, count: 187 });
  assert.deepEqual(pileFoot(paged(0), true), { kind: "end", shown: 2, count: 187 });
  /* Nobody pages it: the same honest end. */
  assert.deepEqual(pileFoot(paged(50), false), { kind: "end", shown: 2, count: 187 });
});

test("a whole pile, or one that holds piles, has no foot", () => {
  assert.equal(pileFoot({ ...paged(50), count: 2 }, true), null);
  assert.equal(pileFoot({ ...paged(50), piles: [paged(50)] }, true), null);
});

test("rows and table say the same: «Show 50 more of 185», then «Showing … of 187» at the cap", () => {
  const list = (present: "rows" | "table", pile: Pile<Order>) =>
    draw(
      <List<Order>
        items={pile.items}
        keyOf={(o) => o.id}
        present={present}
        group={{
          levels: [{ field: "customer" }],
          of: (o) => o.customer,
          piles: [pile],
          onMore: () => {},
        }}
      >
        <List.Rows<Order> row={(o) => ({ name: o.customer })} />
        <List.Table<Order> columns={COLUMNS} />
      </List>,
    );
  for (const present of ["rows", "table"] as const) {
    assert.match(list(present, paged(50)), /Show 50 more of 185/, present);
    const capped = list(present, paged(false));
    assert.match(capped, /Showing 2 of 187/, present);
    assert.doesNotMatch(capped, /<button[^>]*>Show/, present);
  }
});
