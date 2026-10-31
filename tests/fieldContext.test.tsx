import assert from "node:assert/strict";

import {
  Checkbox,
  CheckList,
  Field,
  NumberInput,
  Select,
  Suggest,
  TextArea,
  TextInput,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a control written directly inside a `Field` takes its wiring from the field —
 * the label names it, the hint and the error describe it, and it is marked invalid. If any
 * of the three is lost, the form still LOOKS right and a screen reader reads a nameless
 * box, which is why each one is asserted on the markup and not on the props. Every control
 * of the family goes through the same three checks.
 */

function attr(html: string, selector: RegExp, name: string): string | undefined {
  const element = selector.exec(html)?.[0] ?? "";
  return new RegExp(`\\s${name}="([^"]*)"`).exec(element)?.[1];
}

/** The element that carries the control's id — the one the label's `for` points at. */
function control(id: string): RegExp {
  return new RegExp(`<(input|textarea|button)\\b[^>]*\\sid="${id}"[^>]*>`);
}

const CONTROLS: [string, ReactElement][] = [
  ["TextInput", <TextInput key="t" value="Distribuidora Andina" />],
  ["TextArea", <TextArea key="a" value="" />],
  ["NumberInput", <NumberInput key="n" value={30} />],
  [
    "Select",
    <Select key="s" value="BOB" options={[{ value: "BOB", label: "Bolivianos" }]} />,
  ],
  ["Suggest", <Suggest key="g" value="La Paz" suggestions={["La Paz", "Sucre"]} />],
  ["Checkbox", <Checkbox key="c" checked={false} label="Exento de IVA" />],
];

for (const [name, element] of CONTROLS) {
  test(`${name}: named by the field's label, described by its hint and error, invalid`, () => {
    const html = renderToStaticMarkup(
      <Field label="Campo" htmlFor="campo" hint="La ayuda." error="Lo que hay que poner.">
        {element}
      </Field>,
    );
    const own = control("campo");
    assert.ok(own.test(html), "the control carries the field's id");
    assert.equal(attr(html, /<label\b[^>]*>/, "for"), "campo");
    assert.match(attr(html, own, "aria-labelledby") ?? "", /\bcampo-label\b/);
    const describedBy = (attr(html, own, "aria-describedby") ?? "").split(" ");
    assert.ok(describedBy.includes("campo-hint"), "the hint describes it");
    assert.ok(describedBy.includes("campo-error"), "the error describes it");
    /* A trigger button is not a form value, so React Aria marks the Select's root invalid
       and not the button; every other control carries `aria-invalid` itself. */
    if (name === "Select") assert.match(html, /data-invalid="true"/);
    else assert.equal(attr(html, own, "aria-invalid"), "true");
  });
}

test("a check list takes the field's hint and error as its description", () => {
  const html = renderToStaticMarkup(
    <Field label="Cuentas" htmlFor="cuentas" hint="La ayuda." error="Elegí al menos una.">
      <CheckList
        label="Cuentas"
        value={[]}
        items={[{ value: "1.1.1.01", label: "1.1.1.01", detail: "Caja moneda nacional" }]}
      />
    </Field>,
  );
  const listbox = /<div\b[^>]*role="listbox"[^>]*>/;
  const describedBy = attr(html, listbox, "aria-describedby") ?? "";
  assert.deepEqual(describedBy.split(" ").sort(), ["cuentas-error", "cuentas-hint"]);
});

test("an explicit prop on the control wins over the field", () => {
  const html = renderToStaticMarkup(
    <Field label="Nombre" htmlFor="propio">
      <TextInput id="otro" value="" />
    </Field>,
  );
  assert.ok(control("otro").test(html));
});

test("the render prop still works, and the control inside it is still named", () => {
  const html = renderToStaticMarkup(
    <Field label="Nombre" htmlFor="nombre">
      {(aria) => <TextInput id={aria.id} value="" />}
    </Field>,
  );
  const own = control("nombre");
  assert.equal(attr(html, /<label\b[^>]*>/, "for"), "nombre");
  assert.equal(attr(html, own, "aria-labelledby"), "nombre-label");
});

test("outside a field a control is named by aria-label, or by its placeholder", () => {
  const labelled = renderToStaticMarkup(<NumberInput value={3} aria-label="Cantidad" />);
  assert.match(labelled, /<input\b[^>]*aria-label="Cantidad"/);
  const placeholder = renderToStaticMarkup(
    <TextArea value="" placeholder="Escribí un mensaje…" />,
  );
  assert.match(placeholder, /<textarea\b[^>]*aria-label="Escribí un mensaje…"/);
});
