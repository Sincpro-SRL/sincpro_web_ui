import assert from "node:assert/strict";

import { ViewStyleProvider } from "@sincpro/web-ui/foundations/viewStyle";
import { List } from "@sincpro/web-ui/views/list/List";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * A LIST'S HEADER IN THE MODERN STYLE (#68): the trail is the page's heading, as a record's,
 * and the search sits on the row of the controls. A nested trail used to wrap in the left
 * third of the search line and cut its last crumb, with the title repeated under it.
 */

type Payment = { id: string; detail: string };
const PAYMENTS: Payment[] = [{ id: "1", detail: "3 meses" }];
const CRUMBS = [
  { label: "Pagos", onClick: () => {} },
  { label: "María Fernanda Apaza Quispe", onClick: () => {} },
  { label: "Pagos" },
];

function Payments() {
  return (
    <List<Payment> items={PAYMENTS} keyOf={(p) => p.id} sortable={[]} sort={[]}>
      <List.Bar>
        <List.Crumbs crumbs={CRUMBS} />
        <List.Identity title="Pagos" description="los comprobantes enviados" />
        <List.Search>
          <input aria-label="Buscar" data-search />
        </List.Search>
      </List.Bar>
      <List.Table<Payment>
        columns={[{ id: "detail", header: "Detalle", value: (p) => p.detail }]}
      />
      <List.Rows<Payment> row={(p) => ({ name: p.detail })} />
    </List>
  );
}

/** A crumb at the title's size, inside the trail (not anywhere after it). */
const INSIDE_THE_TRAIL_AT_TITLE_SIZE = /<nav[^>]*>(?:(?!<\/nav>).)*text-title/;

const modern = () =>
  renderToStaticMarkup(
    <ViewStyleProvider value="modern">
      <Payments />
    </ViewStyleProvider>,
  );

test("modern: the trail is the heading, at the title's size, and the title is not drawn twice", () => {
  const html = modern();
  // Where I am, at the title's size (the last crumb).
  assert.match(html, INSIDE_THE_TRAIL_AT_TITLE_SIZE);
  // The list's name stays in the outline, but only for a screen reader.
  assert.match(html, /<h2 class="sr-only">Pagos<\/h2>/);
  assert.equal(html.match(/<h2 class="text-title/g), null);
});

test("modern: the controls' row reads description · search · switcher, in that order", () => {
  const html = modern();
  const description = html.indexOf("los comprobantes enviados");
  const search = html.indexOf("data-search");
  const switcher = html.indexOf('role="group"');
  assert.ok(description > -1 && search > -1 && switcher > -1, "all three are drawn");
  assert.ok(description < search && search < switcher, "in the order of the row");
});

test("traditional is unchanged: small crumbs, the title as the visible heading", () => {
  const html = renderToStaticMarkup(<Payments />);
  assert.match(html, /<h2 class="text-title[^"]*">Pagos<\/h2>/);
  assert.doesNotMatch(html, INSIDE_THE_TRAIL_AT_TITLE_SIZE);
});
