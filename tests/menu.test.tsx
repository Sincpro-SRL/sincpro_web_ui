import assert from "node:assert/strict";

import type { MenuGroup } from "@sincpro/web-ui";
import { indexOptions, MenuList } from "@sincpro/web-ui/primitives/menu/Menu";
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
