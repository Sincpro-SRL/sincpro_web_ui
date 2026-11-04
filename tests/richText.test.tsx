import assert from "node:assert/strict";

import {
  FormModeProvider,
  isRichTextEmpty,
  RichTextInput,
  richTextPlain,
  RichTextValue,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: on the server (and here, in Node) there is no DOM for DOMPurify to clean with, so
 * the rich text must come out as TEXT — never as the HTML it arrived with. The cleaning itself
 * and the editor are driven in a real browser by `2 · Primitivas/Texto enriquecido`.
 */

const html = (children: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>);

const HOSTILE =
  '<p>Hola <strong>equipo</strong></p><img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">clic</a>';

test("without a DOM, rich text is drawn as its words, nothing that runs", () => {
  const out = html(<RichTextValue value={HOSTILE} />);
  assert.ok(out.includes("Hola equipo"));
  assert.ok(!out.includes("<script"));
  assert.ok(!out.includes("onerror"));
  assert.ok(!out.includes("javascript:"));
  assert.ok(!out.includes("<strong"), "the tags are text-only on the server");
});

test("an emptied editor counts as nothing", () => {
  assert.ok(isRichTextEmpty("<p></p>"));
  assert.ok(isRichTextEmpty(""));
  assert.ok(isRichTextEmpty(null));
  assert.ok(!isRichTextEmpty("<p>x</p>"));
  assert.ok(!isRichTextEmpty('<p><img src="data:image/png;base64,AAA"></p>'));
  assert.ok(html(<RichTextValue value="<p></p>" />).includes("sin definir"));
});

test("the plain text keeps the spaces between blocks and decodes entities", () => {
  assert.equal(richTextPlain("<p>uno</p><p>dos &amp; tres</p>"), "uno dos & tres");
  assert.equal(richTextPlain("<ul><li>a</li><li>b</li></ul>"), "a b");
});

test("read mode never mounts the editor", () => {
  const out = html(
    <FormModeProvider value="read">
      <RichTextInput value="<p>Nota</p>" />
    </FormModeProvider>,
  );
  assert.ok(out.includes("Nota"));
  assert.ok(!out.includes("contenteditable"));
});

test("edit mode holds the place while the editor chunk loads", () => {
  const out = html(<RichTextInput aria-label="Notas" value="" />);
  assert.match(out, /aria-busy="true"/);
});
