import assert from "node:assert/strict";

import {
  DateTimePicker,
  Field,
  FormModeProvider,
  SPANISH_COPY,
  TimeField,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the segments, the arrows and the hour cycle are React Aria's. What is ours is the
 * wiring (who names the control) and the contract: `"HH:MM"` and `"YYYY-MM-DDTHH:MM"` in,
 * the same out, and a read mode that draws the value as text.
 */

/* The text of the editable segments, in order — what the person sees in the box. */
function segments(html: string): string[] {
  return [...html.matchAll(/role="spinbutton"[^>]*>([^<]*)</g)].map((m) => m[1] ?? "");
}

test("a time field outside a Field is named by its aria-label", () => {
  const html = renderToStaticMarkup(<TimeField value="09:05" aria-label="Hora de la cita" />);
  assert.match(html, /aria-label="Hora de la cita"/);
});

test("a time field inside a Field is named by the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Hora de la cita" htmlFor="cita">
      <TimeField value="09:05" />
    </Field>,
  );
  assert.match(html, /id="cita-label"/);
  assert.match(html, /aria-labelledby="[^"]*cita-label/);
});

test("the value round-trips: «09:05» is drawn as its hour and minute", () => {
  const html = renderToStaticMarkup(
    <TimeField value="09:05" hourCycle={24} aria-label="Hora" />,
  );
  assert.deepEqual(segments(html).slice(0, 2), ["09", "05"]);
});

test("a time with seconds, as a time column sends it, is still read", () => {
  const html = renderToStaticMarkup(
    <TimeField value="15:30:00" hourCycle={24} aria-label="Hora" />,
  );
  assert.deepEqual(segments(html).slice(0, 2), ["15", "30"]);
});

test("in read mode a time is drawn as text in the locale's format", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <FormModeProvider value="read">
        <TimeField value="15:05" hourCycle={24} />
      </FormModeProvider>
    </UiCopyProvider>,
  );
  assert.doesNotMatch(html, /role="group"/);
  assert.match(html, />15:05</);
});

test("an empty or broken time renders an empty field instead of throwing", () => {
  assert.doesNotThrow(() => renderToStaticMarkup(<TimeField value="" aria-label="Hora" />));
  assert.doesNotThrow(() =>
    renderToStaticMarkup(<TimeField value="nueve" aria-label="Hora" />),
  );
});

test("a date-time picker outside a Field is named by its aria-label", () => {
  const html = renderToStaticMarkup(
    <DateTimePicker value="2026-10-30T09:05" aria-label="Entrega programada" />,
  );
  assert.match(html, /aria-label="Entrega programada"/);
});

test("a date-time picker inside a Field is named by the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Entrega programada" htmlFor="entrega">
      <DateTimePicker value="2026-10-30T09:05" />
    </Field>,
  );
  assert.match(html, /aria-labelledby="[^"]*entrega-label/);
});

test("a date-time round-trips: day, month, year, hour and minute in the copy's order", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <DateTimePicker value="2026-10-30T09:05" hourCycle={24} />
    </UiCopyProvider>,
  );
  assert.deepEqual(segments(html), ["30", "10", "2026", "09", "05"]);
});

test("in read mode a date-time is drawn as one text, and the zone of the machine does not move it", () => {
  const zone = process.env.TZ;
  process.env.TZ = "America/La_Paz";
  try {
    const html = renderToStaticMarkup(
      <UiCopyProvider copy={SPANISH_COPY}>
        <FormModeProvider value="read">
          <DateTimePicker value="2026-10-30T09:05" hourCycle={24} />
        </FormModeProvider>
      </UiCopyProvider>,
    );
    assert.doesNotMatch(html, /role="group"/);
    assert.match(html, /30 oct.*2026.*09:05/);
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});
