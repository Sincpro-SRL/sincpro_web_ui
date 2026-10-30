import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ENGLISH_COPY,
  FormModeProvider,
  NumberInput,
  Select,
  SPANISH_COPY,
  Suggest,
  TextArea,
  TextInput,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the text controls are React Aria's, so typing, the arrow keys and the list's
 * keyboard are React Aria's to test (and are driven in a browser in the stories). What is
 * ours: numbers written in the copy's locale and not the browser's, the plain-value
 * contract (`number | ""`, the option's `value` string), and read mode drawing TEXT.
 */

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>,
  );
}

function inputValue(html: string): string | undefined {
  return /<input\b[^>]*\svalue="([^"]*)"/.exec(html)?.[1];
}

test("a number is written in the copy's locale: 1234.56 is «1.234,56» in es-BO", () => {
  assert.equal(inputValue(spanish(<NumberInput value={1234.56} />)), "1.234,56");
});

test("the same number in English is «1,234.56» — the locale is the copy's, not fixed", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={ENGLISH_COPY}>
      <NumberInput value={1234.56} />
    </UiCopyProvider>,
  );
  assert.equal(inputValue(html), "1,234.56");
});

test("`format` writes the number as money or a percentage", () => {
  const money = spanish(
    <NumberInput value={1234.5} format={{ style: "currency", currency: "BOB" }} />,
  );
  assert.match(inputValue(money) ?? "", /^Bs\s1\.234,50$/);
  const percent = spanish(<NumberInput value={0.15} format={{ style: "percent" }} />);
  assert.match(inputValue(percent) ?? "", /^15\s?%$/);
});

test("an empty number is an empty field, never «NaN»", () => {
  const html = spanish(<NumberInput value="" />);
  assert.equal(inputValue(html), "");
  assert.doesNotMatch(html, /NaN/);
});

test("the number field steps with two buttons, named in the copy's language", () => {
  const html = spanish(<NumberInput value={3} aria-label="Cantidad" />);
  assert.match(html, /<button\b[^>]*aria-label="Aumentar[^"]*"[^>]*slot="increment"/);
  assert.match(html, /<button\b[^>]*aria-label="Reducir[^"]*"[^>]*slot="decrement"/);
});

const READ: [string, ReactElement, string][] = [
  [
    "TextInput",
    <TextInput key="t" value="Distribuidora Andina S.R.L." />,
    "Distribuidora Andina S.R.L.",
  ],
  [
    "TextArea",
    <TextArea key="a" value={"Entregar por la tarde.\nLlamar antes."} />,
    "Llamar antes.",
  ],
  [
    "NumberInput",
    <NumberInput key="n" value={18920} format={{ style: "currency", currency: "BOB" }} />,
    "18.920,00",
  ],
  [
    "Select",
    <Select
      key="s"
      value="30"
      options={[
        { value: "contado", label: "Al contado" },
        { value: "30", label: "30 días" },
      ]}
    />,
    "30 días",
  ],
  ["Suggest", <Suggest key="g" value="Potosí" suggestions={["Potosí", "Sucre"]} />, "Potosí"],
];

for (const [name, element, text] of READ) {
  test(`${name} in read mode draws the value as text, not a control`, () => {
    const html = spanish(<FormModeProvider value="read">{element}</FormModeProvider>);
    assert.doesNotMatch(html, /<(input|textarea|select|button)\b/);
    assert.ok(html.includes(text), `«${text}» is drawn`);
  });
}

test("read mode keeps the unit next to the number", () => {
  const html = spanish(
    <FormModeProvider value="read">
      <NumberInput value={1240} unit="u." />
    </FormModeProvider>,
  );
  assert.match(html, /1\.240 u\./);
});

test("a select draws the chosen option's label in its trigger, and the placeholder when empty", () => {
  const options = [{ value: "BOB", label: "Bolivianos (Bs.)" }];
  const chosen = spanish(<Select value="BOB" options={options} aria-label="Moneda" />);
  assert.match(chosen, /<button\b[^>]*aria-haspopup="listbox"[\s\S]*Bolivianos \(Bs\.\)/);
  const empty = spanish(
    <Select value="" options={options} placeholder="Elegí una moneda…" aria-label="Moneda" />,
  );
  assert.match(empty, /data-placeholder="true"[^>]*>Elegí una moneda…/);
});

test("a suggest is a combobox whose value is the text typed", () => {
  const html = spanish(
    <Suggest value="Banco Unión" suggestions={["Banco Unión"]} aria-label="Banco" />,
  );
  assert.match(html, /<input\b[^>]*role="combobox"/);
  assert.equal(inputValue(html), "Banco Unión");
});
