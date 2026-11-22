import assert from "node:assert/strict";

import { type ChoiceOption, Field, RadioGroup } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a colour is seen, not read — so the option IS the colour — but never alone: it is
 * named, and the chosen one is written. A size has no colour: its word in a box.
 */

const COLORES: readonly ChoiceOption[] = [
  { value: "roble", label: "Roble", swatch: "#b0814f" },
  {
    value: "verde",
    label: "Verde salvia",
    swatch: "#9caf88",
    disabled: true,
    description: "Sin stock",
  },
];

test("a colour is drawn with the application's colour and named by its label", () => {
  const html = renderToStaticMarkup(
    <Field label="Color">
      <RadioGroup look="swatches" value="roble" options={COLORES} />
    </Field>,
  );
  assert.match(html, /data-look="swatches"/);
  assert.match(html, /style="background:#b0814f"/);
  assert.match(html, /<span class="sr-only">Roble<\/span>/);
  assert.match(html, /data-ui="radio-group.chosen"[^>]*>Roble</);
  assert.match(html, /title="Verde salvia · Sin stock"/);
});

test("a size is its word in a box, and no «chosen» line — the word is already there", () => {
  const html = renderToStaticMarkup(
    <RadioGroup
      look="swatches"
      value="m"
      options={[
        { value: "m", label: "M" },
        { value: "l", label: "L" },
      ]}
    />,
  );
  assert.match(html, />M<\/span>/);
  assert.doesNotMatch(html, /radio-group\.chosen/);
  assert.doesNotMatch(html, /background:/);
});
