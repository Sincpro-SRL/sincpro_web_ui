import assert from "node:assert/strict";
import { test } from "node:test";

import { Field, FormModeProvider, Picker, type PickerItem } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the Picker is React Aria's combobox, so arrows, Enter and Escape are React Aria's
 * to test (they are driven in a browser). What is ours is the contract around it: the field
 * names it, the CLOSED field shows the chosen record's name — even when that record is not
 * among the first eight the list would show — and read mode draws the name, not a control.
 */

const ITEMS: PickerItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `P-${i}`,
  name: `Producto ${i}`,
  meta: `${i * 10} en stock`,
}));

test("a picker inside a field is a combobox named by the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Producto" htmlFor="producto">
      <Picker items={ITEMS} value="P-1" />
    </Field>,
  );
  assert.match(html, /role="combobox"/);
  assert.match(html, /id="producto"/);
  assert.match(html, /aria-labelledby="producto-label"/);
  assert.match(html, /aria-expanded="false"/);
});

test("the closed field shows the chosen name, also beyond the cap of eight", () => {
  const html = renderToStaticMarkup(<Picker items={ITEMS} value="P-11" />);
  assert.match(html, /value="Producto 11"/);
});

test("with nothing chosen the field is empty and shows the placeholder", () => {
  const html = renderToStaticMarkup(
    <Picker items={ITEMS} placeholder="elegí un producto…" />,
  );
  assert.match(html, /value=""/);
  assert.match(html, /placeholder="elegí un producto…"/);
});

test("an invalid picker says so to assistive technology", () => {
  const html = renderToStaticMarkup(
    <Field label="Producto" htmlFor="producto" error="Elegí un producto.">
      <Picker items={ITEMS} />
    </Field>,
  );
  assert.match(html, /data-invalid="true"|aria-invalid="true"/);
});

test("in read mode a picker is the chosen name as text, not a control", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <Picker items={ITEMS} value="P-3" />
    </FormModeProvider>,
  );
  assert.doesNotMatch(html, /role="combobox"/);
  assert.match(html, />Producto 3</);
});
