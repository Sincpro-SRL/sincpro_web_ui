import assert from "node:assert/strict";

import { Checkbox, CheckList } from "@sincpro/web-ui";
import { FormModeProvider } from "@sincpro/web-ui/primitives/field/mode";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: `Checkbox` and `CheckList` are React Aria's — a native checkbox and a
 * multiple-selection `ListBox` — so the keyboard is React Aria's to test. What is ours is
 * the contract: the indeterminate state, a plain `string[]` drawn as selected rows, the
 * disabled row drawn but not choosable, and read mode as text.
 */

test("a half-checked box is indeterminate, not on", () => {
  const on = renderToStaticMarkup(<Checkbox checked label="Exento de IVA" />);
  const mixed = renderToStaticMarkup(
    <Checkbox checked={false} mixed label="Todos los almacenes" />,
  );
  assert.match(on, /<input\b[^>]*type="checkbox"/);
  assert.match(on, /data-selected="true"/);
  assert.doesNotMatch(on, /data-indeterminate/);
  assert.match(mixed, /data-indeterminate="true"/);
  assert.doesNotMatch(mixed, /data-selected="true"/);
});

test("the list is a multiple listbox and marks only what is chosen", () => {
  const out = renderToStaticMarkup(
    <CheckList
      label="Cuentas"
      value={["1.1.1.01"]}
      items={[
        { value: "1.1.1.01", label: "1.1.1.01", detail: "Caja moneda nacional" },
        { value: "1.1.2.09", label: "1.1.2.09", disabled: true },
      ]}
    />,
  );
  assert.match(out, /role="listbox"/);
  assert.match(out, /aria-multiselectable="true"/);
  assert.match(
    out,
    /<div\b[^>]*role="option"[^>]*aria-selected="true"[^>]*data-key="1\.1\.1\.01"/,
  );
  assert.match(
    out,
    /<div\b[^>]*role="option"[^>]*aria-disabled="true"[^>]*aria-selected="false"/,
  );
  assert.match(out, /Caja moneda nacional/);
});

test("the list is named by its own label", () => {
  const out = renderToStaticMarkup(
    <CheckList label="Cuentas" value={[]} items={[{ value: "a", label: "a" }]} />,
  );
  const id = /<p id="([^"]+)"[^>]*>Cuentas<\/p>/.exec(out)?.[1];
  assert.ok(id);
  assert.match(out, new RegExp(`aria-labelledby="${id}"[^>]*role="listbox"`));
});

test("in read mode the list says the names and draws no listbox", () => {
  const out = renderToStaticMarkup(
    <FormModeProvider value="read">
      <CheckList
        label="Cuentas"
        value={["1.1.2.01"]}
        emptyLabel="ninguna"
        items={[
          { value: "1.1.1.01", label: "Caja" },
          { value: "1.1.2.01", label: "Banco Mercantil" },
        ]}
      />
    </FormModeProvider>,
  );
  assert.doesNotMatch(out, /role="listbox"/);
  assert.match(out, /Banco Mercantil/);
  assert.doesNotMatch(out, /Caja/);
});

test("in read mode a check is a mark and its sentence, not an input", () => {
  const out = renderToStaticMarkup(
    <FormModeProvider value="read">
      <Checkbox checked label="Exento de IVA" />
    </FormModeProvider>,
  );
  assert.doesNotMatch(out, /<input/);
  assert.match(out, /Exento de IVA/);
});
