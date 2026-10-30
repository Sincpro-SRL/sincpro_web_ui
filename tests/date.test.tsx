import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DatePicker,
  DateRangePicker,
  Field,
  FormModeProvider,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the date controls are React Aria's, so their keyboard behaviour is React Aria's
 * to test. What is ours is the wiring — the field names the control, the locale of the copy
 * decides the order of the segments — and the ISO in, ISO out contract.
 */

test("a date picker inside a field is named by the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Fecha de emisión" htmlFor="emision">
      <DatePicker value="2026-10-30" />
    </Field>,
  );
  assert.match(html, /id="emision-label"/);
  assert.match(html, /aria-labelledby="[^"]*emision-label/);
});

test("the segments follow the locale of the copy: day before month in Spanish", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <DatePicker value="2026-10-30" />
    </UiCopyProvider>,
  );
  const day = html.indexOf(">30<");
  const month = html.indexOf(">10<");
  assert.ok(day > -1 && month > -1, "both segments are drawn");
  assert.ok(day < month, "30 comes before 10 in es-BO");
});

test("in read mode a date is drawn as text, not as a control", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <FormModeProvider value="read">
        <DatePicker value="2026-10-30" />
      </FormModeProvider>
    </UiCopyProvider>,
  );
  assert.doesNotMatch(html, /role="group"/);
  assert.match(html, /2026/);
});

test("a range in read mode reads as one span", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <DateRangePicker value={{ start: "2026-11-01", end: "2027-10-31" }} />
    </FormModeProvider>,
  );
  assert.match(html, /2026.*–.*2027/);
});

test("an empty or broken ISO renders an empty field instead of throwing", () => {
  assert.doesNotThrow(() => renderToStaticMarkup(<DatePicker value="" />));
  assert.doesNotThrow(() => renderToStaticMarkup(<DatePicker value="no-es-fecha" />));
});
