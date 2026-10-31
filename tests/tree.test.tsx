import assert from "node:assert/strict";

import { SPANISH_COPY, Tree, type TreeItem, UiCopyProvider } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the keys of the tree — arrows, folding, type-ahead — are React Aria's to test. What
 * is ours is the contract around it: a named tree of rows with their level, what is folded
 * is not drawn, the figure of each row, how a chosen row and a row that cannot be chosen are
 * said, and the empty tree speaking from the copy table.
 */

const PLAN: TreeItem[] = [
  {
    id: "1",
    label: "1 Activo",
    meta: "152.340,00",
    children: [
      {
        id: "1.1",
        label: "1.1 Activo corriente",
        meta: "98.120,00",
        disabled: true,
        children: [
          { id: "1.1.01", label: "1.1.01 Caja", meta: "4.500,00" },
          { id: "1.1.02", label: "1.1.02 Bancos", meta: "93.620,00" },
        ],
      },
    ],
  },
  {
    id: "2",
    label: "2 Pasivo",
    meta: "61.000,00",
    children: [{ id: "2.1", label: "2.1 Pasivo corriente", meta: "61.000,00" }],
  },
];

/** The opening tag of the tree itself. */
function treegrid(html: string): string {
  const tag = /<div[^>]*role="treegrid"[^>]*>/.exec(html)?.[0];
  assert.ok(tag !== undefined, "a treegrid is drawn");
  return tag;
}

/** The markup of the row with this key, up to where the next row opens. */
function rowOf(html: string, key: string): string {
  const start = html.indexOf(`data-key="${key}"`);
  assert.ok(start > -1, `row ${key} is drawn`);
  const next = html.indexOf('role="row"', html.indexOf('role="row"', start) + 1);
  return html.slice(
    html.lastIndexOf("<div", start),
    next === -1 ? undefined : html.lastIndexOf("<div", next),
  );
}

test("the tree is a named treegrid of rows with a level each", () => {
  const html = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan de cuentas" defaultExpanded={["1"]} />,
  );
  assert.match(treegrid(html), /aria-label="Plan de cuentas"/);
  assert.match(rowOf(html, "1"), /aria-level="1"/);
  assert.match(rowOf(html, "1"), /aria-expanded="true"/);
  assert.match(rowOf(html, "1.1"), /aria-level="2"/);
  assert.match(rowOf(html, "2"), /aria-expanded="false"/);
});

test("a visible heading can name it instead", () => {
  const html = renderToStaticMarkup(<Tree items={PLAN} labelledBy="plan-title" />);
  assert.match(treegrid(html), /aria-labelledby="plan-title"/);
  assert.doesNotMatch(treegrid(html), /aria-label=/);
});

test("what is open is drawn, two levels down; what is folded is not", () => {
  const html = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan de cuentas" defaultExpanded={["1", "1.1"]} />,
  );
  assert.match(html, /1\.1\.01 Caja/);
  assert.match(rowOf(html, "1.1.02"), /aria-level="3"/);
  assert.doesNotMatch(html, /2\.1 Pasivo corriente/, "«2» is folded");

  const folded = renderToStaticMarkup(<Tree items={PLAN} label="Plan de cuentas" />);
  assert.doesNotMatch(folded, /Activo corriente/);
  assert.doesNotMatch(folded, /data-key="1\.1"/);
});

test("the controlled expansion wins over the default", () => {
  const html = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan" expanded={["2"]} defaultExpanded={["1"]} />,
  );
  assert.match(html, /2\.1 Pasivo corriente/);
  assert.doesNotMatch(html, /Activo corriente/);
});

test("each row draws its figure in tabular digits", () => {
  const html = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan de cuentas" defaultExpanded={["1", "1.1"]} />,
  );
  assert.match(rowOf(html, "1.1.02"), /class="[^"]*tabular-nums[^"]*">93\.620,00</);
  assert.match(rowOf(html, "2"), />61\.000,00</);
});

test("a group folds with a chevron named by React Aria; a record has none", () => {
  const html = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan de cuentas" defaultExpanded={["1", "1.1"]} />,
  );
  assert.match(rowOf(html, "1"), /aria-label="Collapse"/);
  assert.match(rowOf(html, "2"), /aria-label="Expand"/);
  assert.doesNotMatch(rowOf(html, "1.1.01"), /aria-label="(Expand|Collapse)"/);
});

test("a chosen row says it: selected, tinted and checked", () => {
  const html = renderToStaticMarkup(
    <Tree
      items={PLAN}
      label="Plan de cuentas"
      selectionMode="single"
      selected={["1.1.02"]}
      defaultExpanded={["1", "1.1"]}
    />,
  );
  const chosen = rowOf(html, "1.1.02");
  assert.match(chosen, /aria-selected="true"/);
  assert.match(chosen, /bg-primary\/10/);
  assert.match(chosen, /lucide-check/);
  assert.match(rowOf(html, "1.1.01"), /aria-selected="false"/);
  assert.doesNotMatch(rowOf(html, "1.1.01"), /lucide-check/);
});

test("a row that cannot be chosen still folds, but is not offered as a choice", () => {
  const one = renderToStaticMarkup(
    <Tree
      items={PLAN}
      label="Plan de cuentas"
      selectionMode="single"
      defaultExpanded={["1", "1.1"]}
    />,
  );
  const view = rowOf(one, "1.1");
  assert.match(view, /aria-expanded="true"/, "a view account still opens");
  assert.doesNotMatch(view, /aria-selected=/, "and is not announced as selectable");
  assert.match(view, /text-muted[^"]*">1\.1 Activo corriente</);
  assert.match(rowOf(one, "1.1.01"), /aria-selected="false"/);

  const many = renderToStaticMarkup(
    <Tree
      items={PLAN}
      label="Plan de cuentas"
      selectionMode="multiple"
      defaultExpanded={["1", "1.1"]}
    />,
  );
  assert.match(rowOf(many, "1.1"), /<input[^>]*disabled=""[^>]*type="checkbox"/);
});

test("many to choose: every row carries its check", () => {
  const html = renderToStaticMarkup(
    <Tree
      items={PLAN}
      label="Plan de cuentas"
      selectionMode="multiple"
      selected={["1.1.01"]}
      defaultExpanded={["1", "1.1"]}
    />,
  );
  assert.match(treegrid(html), /aria-multiselectable="true"/);
  const rows = html.match(/role="row"/g)?.length;
  assert.equal(rows, 5);
  assert.equal(html.match(/type="checkbox"/g)?.length, rows);
  assert.match(rowOf(html, "1.1.01"), /<input[^>]*type="checkbox"[^>]*checked=""/);
  assert.doesNotMatch(rowOf(html, "1.1.02"), /checked=""/);

  const read = renderToStaticMarkup(
    <Tree items={PLAN} label="Plan de cuentas" defaultExpanded={["1", "1.1"]} />,
  );
  assert.doesNotMatch(read, /type="checkbox"/, "a tree that only reads has no checks");
});

test("an empty tree speaks from the copy table, or says what the screen gives it", () => {
  const english = renderToStaticMarkup(<Tree items={[]} label="Categorías" />);
  assert.match(english, /data-empty="true"/);
  assert.match(english, />Nothing here yet\.</);

  const spanish = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Tree items={[]} label="Categorías" />
    </UiCopyProvider>,
  );
  assert.match(spanish, />Todavía no hay nada acá\.</);

  const own = renderToStaticMarkup(
    <Tree items={[]} label="Categorías" empty="Sin categorías." />,
  );
  assert.match(own, />Sin categorías\.</);
});
