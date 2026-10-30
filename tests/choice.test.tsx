import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ComboBox,
  Field,
  FormModeProvider,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Slider,
  SPANISH_COPY,
  Switch,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the choice controls are React Aria's, so their keyboard behaviour is React Aria's
 * to test. What is ours is the wiring — the field names the control, read mode draws the
 * option's label — and the plain-value contract: a `string`, a `number`, a `boolean` in and
 * out, never React Aria's `Key` or `Selection`.
 */

const MONEDAS = [
  { value: "BOB", label: "Boliviano" },
  { value: "USD", label: "Dólar", description: "US$" },
] as const;

const labelledByField = /aria-labelledby="[^"]*campo-label/;

test("every control written inside a field is named by the field's label", () => {
  const controls = [
    <ComboBox key="combo" value="BOB" options={MONEDAS} />,
    <RadioGroup key="radio" value="BOB" options={MONEDAS} />,
    <Switch key="switch" checked />,
    <Slider key="slider" value={5} min={0} max={10} />,
    <SegmentedControl key="segmented" value="BOB" options={MONEDAS} />,
    <SearchField key="search" value="" />,
  ];
  for (const control of controls) {
    const html = renderToStaticMarkup(
      <Field label="Campo" htmlFor="campo">
        {control}
      </Field>,
    );
    assert.match(html, /id="campo-label"/, `${String(control.key)} keeps the field label`);
    assert.match(html, labelledByField, `${String(control.key)} is labelled by the field`);
  }
});

test("a field's hint describes the control inside it", () => {
  const html = renderToStaticMarkup(
    <Field label="Moneda" htmlFor="moneda" hint="La de la factura.">
      <ComboBox value={null} options={MONEDAS} />
    </Field>,
  );
  assert.match(html, /aria-describedby="[^"]*moneda-hint/);
});

test("the slider's thumb — the input a screen reader lands on — carries the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Descuento" htmlFor="descuento">
      <Slider value={5} min={0} max={10} />
    </Field>,
  );
  assert.match(
    html,
    /<input[^>]*aria-labelledby="[^"]*descuento-label[^"]*"[^>]*type="range"/,
  );
});

test("a switch with its own sentence is named by the field AND by the sentence", () => {
  const html = renderToStaticMarkup(
    <Field label="Notificación" htmlFor="aviso">
      <Switch checked={false}>Enviar por correo</Switch>
    </Field>,
  );
  assert.match(html, /aria-labelledby="aviso-label [^"]+"/);
  assert.match(html, /Enviar por correo/);
});

test("the combobox shows the chosen option's label, not its value", () => {
  const html = renderToStaticMarkup(<ComboBox value="USD" options={MONEDAS} />);
  assert.match(html, /value="Dólar"/);
});

test("in read mode each control draws the option's LABEL as text, not a control", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <ComboBox value="USD" options={MONEDAS} />
      <RadioGroup value="BOB" options={MONEDAS} />
    </FormModeProvider>,
  );
  assert.match(html, /Dólar/);
  assert.match(html, /Boliviano/);
  assert.doesNotMatch(html, /USD|BOB/, "the backend's key never reaches the screen");
  assert.doesNotMatch(html, /<input|role="combobox"|role="radiogroup"/);
});

test("a segmented control follows read mode only when it is a form answer", () => {
  const inField = renderToStaticMarkup(
    <FormModeProvider value="read">
      <Field label="Tipo">
        <SegmentedControl value="USD" options={MONEDAS} />
      </Field>
    </FormModeProvider>,
  );
  assert.doesNotMatch(inField, /<button/);
  assert.match(inField, /Dólar/);

  const asView = renderToStaticMarkup(
    <FormModeProvider value="read">
      <SegmentedControl aria-label="Moneda" value="USD" options={MONEDAS} />
    </FormModeProvider>,
  );
  assert.match(asView, /<button/, "a view switch still switches in a read-only record");
  assert.match(asView, /aria-checked="true"[^>]*>Dólar</, "the chosen segment is checked");
});

test("the slider writes its figure in the copy's locale, in both modes", () => {
  const editing = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Slider
        value={0.125}
        min={0}
        max={0.2}
        step={0.005}
        format={{ style: "percent", maximumFractionDigits: 1 }}
      />
    </UiCopyProvider>,
  );
  assert.match(editing, /12,5\s?%/);

  const reading = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <FormModeProvider value="read">
        <Slider value={1250.5} min={0} max={5000} />
      </FormModeProvider>
    </UiCopyProvider>,
  );
  assert.match(reading, /1\.250,5/);
});

test("a switch in read mode draws its sentence, not a track", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <Switch checked>Enviar por correo</Switch>
    </FormModeProvider>,
  );
  assert.doesNotMatch(html, /role="switch"|<input/);
  assert.match(html, /Enviar por correo/);
});

test("nothing chosen, or a value that is not an option, reads as empty instead of throwing", () => {
  for (const value of [null, "XYZ"]) {
    const html = renderToStaticMarkup(
      /* The copy is installed HERE: the empty value is a word of the copy table, and a test
         that leaned on an earlier test installing Spanish passed or failed by file order. */
      <UiCopyProvider copy={SPANISH_COPY}>
        <FormModeProvider value="read">
          <ComboBox value={value} options={MONEDAS} />
        </FormModeProvider>
      </UiCopyProvider>,
    );
    assert.match(html, /sin definir/);
  }
  assert.doesNotThrow(() => renderToStaticMarkup(<ComboBox value="XYZ" options={MONEDAS} />));
  assert.doesNotThrow(() =>
    renderToStaticMarkup(<RadioGroup value={null} options={MONEDAS} />),
  );
});
