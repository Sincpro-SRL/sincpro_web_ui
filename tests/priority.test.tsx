import assert from "node:assert/strict";

import { Priority, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/** Context: stars are counted without reading, and named so they are not colour alone. */

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("editable, it is a named radio group with one stop in the tab order", () => {
  const html = draw(<Priority value={2} onChange={() => {}} />);
  assert.match(html, /role="radiogroup" aria-label="Prioridad"/);
  assert.equal(html.split('role="radio"').length - 1, 3);
  assert.match(html, /aria-checked="true" aria-label="2 de 3"/);
  assert.equal(html.split('tabindex="0"').length - 1, 1);
});

test("read-only, it says its value in words", () => {
  assert.match(draw(<Priority value={1} />), /role="img" aria-label="Prioridad: 1 de 3"/);
  assert.match(draw(<Priority value={0} />), /aria-label="Prioridad: sin prioridad"/);
});

test("the set stars are filled, the rest are not", () => {
  const html = draw(<Priority value={2} max={4} />);
  assert.equal(html.split("fill-warn").length - 1, 2);
});
