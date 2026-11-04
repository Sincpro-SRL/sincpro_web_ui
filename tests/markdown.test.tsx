import assert from "node:assert/strict";

import { Markdown } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the markdown comes from people and from engines, and a script in it must never
 * reach the page. The browser check is the story's `play`; here the server render, which is
 * what a page that loads late still shows, is checked for the same promise.
 */
test("markdown is drawn as its structure, and a script in it does not survive", () => {
  const html = renderToStaticMarkup(
    <Markdown label="Nota">{"# Título\n\nTexto <script>alert(1)</script> fin"}</Markdown>,
  );
  assert.match(html, /<h1/);
  assert.match(html, /role="document"/);
  assert.doesNotMatch(html, /<script/i);
});
