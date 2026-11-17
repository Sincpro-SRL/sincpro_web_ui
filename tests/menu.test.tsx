import assert from "node:assert/strict";

import type { MenuGroup } from "@sincpro/web-ui";
import {
  indexOptions,
  MenuList,
  menuTriggerClasses,
} from "@sincpro/web-ui/primitives/menu/Menu";
import { Users } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the menu is React Aria's, so opening a submenu with → or hover, closing it with ←
 * or Escape, the safe triangle the pointer crosses and where the focus lands are React Aria's
 * and are checked in a browser (the Menu stories), not here. A server render cannot open a
 * popover either, so the PANEL is rendered on its own (`MenuList`, internal) and what is ours
 * is checked on its markup: the row that opens a submenu says so to assistive technology and
 * draws a chevron, its children stay out until it opens, a shortcut is drawn and linked to
 * its row, and a flat menu renders exactly as it did.
 */

const noop = () => {};

const panel = (groups: readonly MenuGroup[]) =>
  renderToStaticMarkup(
    <MenuList
      label="Más acciones"
      groups={groups}
      onAction={noop}
      closeOnSelect
      emptyText="Nada coincide."
    />,
  );

const ACCIONES: MenuGroup[] = [
  {
    options: [
      { id: "dup", label: "Duplicar" },
      {
        id: "print",
        label: "Imprimir",
        items: [
          { id: "print-invoice", label: "Factura" },
          { id: "print-waybill", label: "Remito" },
        ],
      },
    ],
  },
];

test("an option with items is a submenu trigger: aria-haspopup and a trailing chevron", () => {
  const html = panel(ACCIONES);
  const trigger = /<div[^>]*data-key="print"[^>]*>.*?<\/div>/.exec(html)?.[0] ?? "";
  assert.match(trigger, /aria-haspopup="menu"/);
  assert.match(trigger, /aria-expanded="false"/);
  assert.match(trigger, /data-has-submenu="true"/);
  assert.match(html, /lucide-chevron-right/);
  // Closed, the children are not in the page.
  assert.doesNotMatch(html, /Remito/);
});

test("a plain option is not a trigger and carries no chevron", () => {
  const html = panel([{ options: [{ id: "dup", label: "Duplicar" }] }]);
  assert.match(html, /role="menuitem"/);
  assert.doesNotMatch(html, /aria-haspopup/);
  assert.doesNotMatch(html, /lucide-chevron-right/);
});

test("a shortcut is drawn as <kbd> and describes its row", () => {
  const html = panel([{ options: [{ id: "print", label: "Imprimir", shortcut: "Ctrl+P" }] }]);
  const kbd = /<kbd[^>]*id="([^"]+)"[^>]*>Ctrl\+P<\/kbd>/.exec(html);
  assert.ok(kbd, "the shortcut is a <kbd> with an id");
  const row = /<div[^>]*role="menuitem"[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(row, new RegExp(`aria-describedby="[^"]*${kbd[1]}`));
});

test("children of a submenu are reachable by id from the root, at any depth", () => {
  const byId = indexOptions([
    ...(ACCIONES[0]?.options ?? []),
    { id: "move", label: "Mover a", items: [{ id: "W-ALT", label: "El Alto", items: [] }] },
  ]);
  assert.equal(byId.get("print-waybill")?.label, "Remito");
  assert.equal(byId.get("W-ALT")?.label, "El Alto");
  assert.equal(byId.get("dup")?.label, "Duplicar");
});

/* ---------------------------------------------------------------- *
 *  SECTIONS, COLUMNS AND «HERE»
 * ---------------------------------------------------------------- */

const SECCIONES: MenuGroup[] = [
  {
    label: "Clientes",
    icon: Users,
    options: [
      { id: "facturas", label: "Facturas" },
      { id: "cobros", label: "Cobros" },
    ],
  },
  { label: "Bancos", options: [{ id: "extractos", label: "Extractos" }] },
];

test("a section's title carries its icon and is a step above the rows", () => {
  const html = panel(SECCIONES);
  /* The icon sits on the mark column, so every row keeps that column and the texts align. */
  assert.match(html, /font-semibold text-muted"[^>]*><svg[^>]*lucide-users/);
  assert.equal(
    html.match(/<span class="size-\(--size-icon-sm\) shrink-0" aria-hidden="true">/g)?.length,
    1,
  );
});

test("layout='columns' lays the sections side by side from sm up, stacked on a phone", () => {
  const html = renderToStaticMarkup(
    <MenuList
      label="Operaciones"
      groups={SECCIONES}
      layout="columns"
      onAction={noop}
      closeOnSelect
      emptyText="Nada coincide."
    />,
  );
  assert.match(html, /flex flex-col sm:flex-row/);
  assert.match(html, /sm:\[&amp;:not\(:first-child\)\]:border-l/);
  assert.doesNotMatch(panel(SECCIONES), /sm:flex-row/, "a list stays a list");
});

test("the menu that holds the screen on view is marked with a bar under its label", () => {
  const here = menuTriggerClasses({ variant: "text", surface: "chrome", current: true });
  assert.match(here, /after:h-0\.5/);
  assert.match(here, /after:bg-chrome-accent/);
  assert.doesNotMatch(menuTriggerClasses({ variant: "text", surface: "chrome" }), /after:/);
  assert.match(menuTriggerClasses({ variant: "text", current: true }), /after:bg-primary/);
});

const REPORTES: MenuGroup[] = [
  { options: [{ id: "mayor", label: "Libro mayor" }] },
  {
    label: "Reportes financieros",
    collapsible: true,
    options: [
      { id: "balance", label: "Balance general" },
      { id: "resultados", label: "Estado de resultados" },
      { id: "flujo", label: "Flujo de caja" },
    ],
  },
];

test("a collapsible section is one row that unfolds in place, folded by default", () => {
  const html = panel(REPORTES);
  /* The door: a row of the menu, that says it is folded and how many wait behind it. */
  assert.match(
    html,
    /role="menuitem"[^>]*aria-expanded="false"[^>]*>.*?Reportes financieros/,
  );
  assert.match(html, /data-count="3"/);
  /* Folded, its options are not in the menu: arrows and typeahead skip them. */
  assert.doesNotMatch(html, /Balance general/);
  assert.match(html, /Libro mayor/);
});

test("a collapsible section with something ticked starts open, and a search box opens all", () => {
  const ticked = REPORTES.map((g) =>
    g.collapsible === true
      ? { ...g, options: g.options.map((o) => ({ ...o, checked: o.id === "flujo" })) }
      : g,
  );
  assert.match(panel(ticked), /aria-expanded="true"[\s\S]*Balance general/);

  const searchable = renderToStaticMarkup(
    <MenuList
      label="Informes"
      groups={REPORTES}
      foldable={false}
      onAction={noop}
      closeOnSelect
      emptyText="Nada coincide."
    />,
  );
  assert.match(searchable, /Balance general/);
  assert.doesNotMatch(searchable, /aria-expanded/);
});
