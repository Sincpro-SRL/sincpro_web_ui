import assert from "node:assert/strict";

import { DataTable, SheetGroup, SheetGroups } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the levels of a record must read as levels — a group title above its labels, a
 * column name above its cells. Both used to be drawn at the size, weight or grey of what
 * they head, and the screen read flat.
 */

test("a column header is ink and semibold, not a grey row among the rows", () => {
  const html = renderToStaticMarkup(
    <DataTable
      data={[{ id: "1", name: "S00142" }]}
      columns={[{ id: "name", header: "Pedido", value: (row) => row.name }]}
      getRowId={(row) => row.id}
    />,
  );
  const th = /<th[^>]*scope="col"[^>]*class="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.match(th, /font-semibold/);
  assert.match(th, /text-ink/);
  assert.doesNotMatch(th, /text-muted/);
});

test("a group title is a step above its labels, with a line where the group starts", () => {
  const html = renderToStaticMarkup(
    <SheetGroups>
      <SheetGroup title="Cliente">campos</SheetGroup>
    </SheetGroups>,
  );
  assert.match(html, /<header class="[^"]*border-b border-line[^"]*">/);
  assert.match(html, /<h3 class="[^"]*text-body font-semibold[^"]*">Cliente<\/h3>/);
});
