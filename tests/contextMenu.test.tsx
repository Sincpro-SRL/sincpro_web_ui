import assert from "node:assert/strict";

import { ContextMenu } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the menu wraps a row or a card without a box of its own, so a table or a grid keeps
 * its layout; and nothing of the menu is drawn until it is opened.
 */

test("it wraps its child without a box and draws no menu until opened", () => {
  const html = renderToStaticMarkup(
    <ContextMenu label="Acciones" groups={[{ options: [{ id: "abrir", label: "Abrir" }] }]}>
      <li>Factura 0047</li>
    </ContextMenu>,
  );
  assert.match(html, /<div data-ui="context-menu" class="contents"><li>Factura 0047<\/li>/);
  assert.doesNotMatch(html, /role="menu"/);
  assert.doesNotMatch(html, /Abrir/);
});
