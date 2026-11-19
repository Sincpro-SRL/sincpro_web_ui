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
        <List.Dock
          actions={[{ id: "new", label: "Nuevo pago", primary: true, onSelect: () => {} }]}
        />
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

test("modern: the controls' row reads search · switcher; the description is on demand", () => {
  const html = modern();
  const search = html.indexOf("data-search");
  const switcher = html.indexOf('role="group"');
  assert.ok(
    search > -1 && switcher > -1 && search < switcher,
    "search, then how it is looked at",
  );
  // The sentence is the heading's hint, not a line on the controls' row.
  assert.match(html, /aria-label="los comprobantes enviados"/);
  assert.doesNotMatch(html, /text-micro[^"]*">los comprobantes enviados</);
});

test("modern: the list's actions float at the bottom, in a pill named by the list", () => {
  const html = modern();
  assert.match(html, /data-ui="dock" data-placement="bottom"/);
  const pill = html.slice(html.indexOf('data-ui="dock.pill"'));
  // The list's name leads the pill — what its actions act on —, then the actions.
  assert.ok(
    pill.indexOf(">Pagos<") > -1 && pill.indexOf(">Pagos<") < pill.indexOf("Nuevo pago"),
  );
});

test("traditional is unchanged: small crumbs, the title as the visible heading", () => {
  const html = renderToStaticMarkup(<Payments />);
  assert.match(html, /<h2 class="text-title[^"]*">Pagos<\/h2>/);
  assert.doesNotMatch(html, INSIDE_THE_TRAIL_AT_TITLE_SIZE);
});

test("modern: the counters are mini stats under the bar, not words beside the trail", () => {
  const html = renderToStaticMarkup(
    <ViewStyleProvider value="modern">
      <List<Payment> items={PAYMENTS} keyOf={(p) => p.id}>
        <List.Bar>
          <List.Crumbs crumbs={CRUMBS} />
          <List.Identity
            title="Pagos"
            counters={[
              { label: "en revisión", value: 1 },
              { label: "aprobados", value: 1 },
            ]}
          />
        </List.Bar>
        <List.Table<Payment>
          columns={[{ id: "detail", header: "Detalle", value: (p) => p.detail }]}
        />
      </List>
    </ViewStyleProvider>,
  );
  const trail = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
  assert.doesNotMatch(trail, /en revisión/);
  // Each counter is a metric of its own, after the bar and before the rows.
  assert.equal(html.match(/data-ui="metric"/g)?.length, 2);
  assert.ok(html.indexOf('data-ui="metric"') < html.indexOf("<table"));
});
