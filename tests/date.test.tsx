import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Calendar,
  DatePicker,
  DateRangePicker,
  Field,
  FormModeProvider,
  RangeCalendar,
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

test("a day in read mode is that day wherever the machine is: the 30th is not the 29th in La Paz", () => {
  const zone = process.env.TZ;
  process.env.TZ = "America/La_Paz";
  try {
    const html = renderToStaticMarkup(
      <UiCopyProvider copy={SPANISH_COPY}>
        <FormModeProvider value="read">
          <DatePicker value="2026-10-30" />
        </FormModeProvider>
      </UiCopyProvider>,
    );
    assert.match(html, />30 oct/);
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});

/* The heading's month and year are selects named by `Intl` in the copy's language, and the
   year list reaches a century back — a birth date is one pick, not eighty months. */
test("the calendar heading jumps: a month and a year select, named in the copy's language", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Calendar value="1987-04-12" aria-label="Fecha de nacimiento" />
    </UiCopyProvider>,
  );
  assert.match(html, /aria-label="mes"/);
  assert.match(html, /aria-label="año"/);
  assert.match(html, />abril</);
  assert.match(html, />1987</);
});

test("two months side by side keep their heading; one month jumps like the calendar", () => {
  const two = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <RangeCalendar months={2} value={{ start: "2026-10-01", end: "2026-11-15" }} />
    </UiCopyProvider>,
  );
  assert.doesNotMatch(two, /aria-label="año"/);
  assert.match(two, /<h2/);
  const one = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <RangeCalendar value={{ start: "2019-03-01", end: "2019-03-15" }} />
    </UiCopyProvider>,
  );
  assert.match(one, /aria-label="año"/);
  assert.match(one, />2019</);
});
