import assert from "node:assert/strict";

import { Empty } from "@sincpro/web-ui";
import { ShoppingCart } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the bare empty keeps its old shape everywhere it is already used; the page-sized one
 * adds a title and a picture, and the picture is never the message — it is hidden from a
 * screen reader.
 */

test("bare, it is the quiet sentence it always was", () => {
  const html = renderToStaticMarkup(<Empty sentence="Sin adjuntos." />);
  assert.match(html, /data-ui="empty" class="flex flex-wrap gap-3/);
  assert.doesNotMatch(html, /data-size="page"/);
  assert.doesNotMatch(html, /empty\.visual/);
});

test("with a title and an icon it is the screen's empty, the icon hidden", () => {
  const html = renderToStaticMarkup(
    <Empty
      title="Tu pedido está vacío"
      sentence="Sumá algo de la vitrina."
      icon={ShoppingCart}
    />,
  );
  assert.match(html, /data-size="page"/);
  assert.match(html, /<span aria-hidden="true" data-ui="empty.visual"/);
  assert.match(html, /data-ui="empty.title"[^>]*>Tu pedido está vacío</);
  assert.ok(
    html.indexOf("empty.visual") < html.indexOf("empty.title"),
    "the picture goes first",
  );
});

test("an illustration wins over the icon and is hidden too", () => {
  const html = renderToStaticMarkup(
    <Empty
      title="Sin pedidos"
      sentence="Cuando compres, aparecen acá."
      icon={ShoppingCart}
      illustration={<svg data-art="" />}
    />,
  );
  assert.match(html, /<div aria-hidden="true" data-ui="empty.visual"[^>]*><svg data-art=""/);
  assert.doesNotMatch(html, /lucide-shopping-cart/);
});
