import assert from "node:assert/strict";

import { List } from "@sincpro/web-ui/views/list/List";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * WITHOUT `present`, THE FIRST FACE WRITTEN (#68): a list that wrote only `List.Table` fell to
 * the view's default, «rows», and drew an empty line per record — it had no `row` to draw.
 */

type Order = { id: string; number: string };
const ORDERS: Order[] = [{ id: "1", number: "S00142" }];

test("a list that writes only a table draws the table", () => {
  const html = renderToStaticMarkup(
    <List<Order> items={ORDERS} keyOf={(o) => o.id}>
      <List.Table<Order> columns={[{ id: "n", header: "Pedido", value: (o) => o.number }]} />
    </List>,
  );
  assert.match(html, /<table/);
  assert.match(html, />S00142</);
});

test("with two faces and no `present`, the first one written is drawn", () => {
  const html = renderToStaticMarkup(
    <List<Order> items={ORDERS} keyOf={(o) => o.id}>
      <List.Table<Order> columns={[{ id: "n", header: "Pedido", value: (o) => o.number }]} />
      <List.Rows<Order> row={(o) => ({ name: o.number })} />
    </List>,
  );
  assert.match(html, /<table/);
});
