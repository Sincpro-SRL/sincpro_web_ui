import assert from "node:assert/strict";

import { type DataColumn, ViewStyleProvider } from "@sincpro/web-ui";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the list bar says each thing once, and marks only what the person set. Measured on
 * the invoices module (1280 px): «Facturas» small on the search's row and «Facturas» as the
 * heading below; «columnas» drawn as set while nobody had touched it.
 */

type Fila = { id: string; total: number };

const COLUMNS: readonly DataColumn<Fila>[] = [
  { id: "id", header: "Número", value: (one) => one.id },
  { id: "total", header: "Total", value: (one) => one.total, optional: true },
  { id: "notes", header: "Notas", value: () => "", optional: true, defaultHidden: true },
];

const list = (crumbs: readonly { label: string }[]) => (
  <ListView<Fila>
    items={[{ id: "FAC/0047", total: 10 }]}
    keyOf={(one) => one.id}
    row={(one) => ({ name: one.id })}
    present="table"
    columns={COLUMNS}
    identity={{ title: "Facturas" }}
    crumbs={crumbs}
  />
);

const count = (html: string, word: string) => html.split(`>${word}<`).length - 1;
const draw = (node: ReactElement) => renderToStaticMarkup(node);

test("a sole crumb that says the title is not drawn in the traditional bar", () => {
  assert.equal(count(draw(list([{ label: "Facturas" }])), "Facturas"), 1);
  /* A real trail stays: it says where, not what. */
  const trail = draw(list([{ label: "Ventas" }, { label: "Facturas" }]));
  assert.ok(trail.includes(">Ventas<"));
});

test("the modern bar keeps it — there the crumb IS the heading", () => {
  const html = draw(
    <ViewStyleProvider value="modern">{list([{ label: "Facturas" }])}</ViewStyleProvider>,
  );
  assert.ok(count(html, "Facturas") >= 1);
});

test("«columnas» is not marked while the columns are the view's own defaults", () => {
  const html = draw(list([{ label: "Facturas" }]));
  const triggers = html.match(/<button[^>]*data-ui="menu.trigger"[^>]*>/g) ?? [];
  assert.ok(triggers.length > 0, "the columns menu is drawn");
  for (const trigger of triggers) assert.doesNotMatch(trigger, /border-primary\/60/);
});
