import assert from "node:assert/strict";

import {
  Field,
  FormModeProvider,
  RangeSlider,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: two thumbs both called «Precio» leave a screen reader guessing which end it moves;
 * each says its end after the field's name. Read, it is the two figures with a dash.
 */

const es = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>).replace(
    /\u00a0/g,
    " ",
  );

test("the group carries the field's words; each thumb, its end", () => {
  const html = es(
    <Field label="Precio">
      <RangeSlider value={[50, 300]} min={0} max={500} />
    </Field>,
  );
  assert.equal((html.match(/type="range"/g) ?? []).length, 2);
  assert.match(html, /role="group"[^>]*aria-label="Precio"/);
  assert.match(html, /aria-label="Mínimo"/);
  assert.match(html, /aria-label="Máximo"/);
  assert.match(html, /data-ui="range-slider"/);
});

test("outside a field the group is named by its own aria-label", () => {
  const html = es(<RangeSlider aria-label="Monto" value={[1, 2]} min={0} max={10} />);
  assert.match(html, /role="group"[^>]*aria-label="Monto"/);
});

test("in read mode it writes both ends in the locale", () => {
  const html = es(
    <FormModeProvider value="read">
      <RangeSlider
        value={[1000, 25000]}
        min={0}
        max={50000}
        format={{ style: "currency", currency: "BOB", maximumFractionDigits: 0 }}
      />
    </FormModeProvider>,
  );
  assert.match(html, /Bs 1\.000 – Bs 25\.000/);
  assert.doesNotMatch(html, /type="range"/);
});
