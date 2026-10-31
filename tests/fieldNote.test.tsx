import assert from "node:assert/strict";

import { DataField, Field, Record, TextInput, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a note that belongs to ONE field — «vence en 3 días» next to «Vencimiento» — is a
 * `Flag` by the field's label (WHERE) and an entry in the record's activity, above its
 * timeline (WHAT), which takes you back to the field. Cards aligned in the activity column
 * were dropped: they fought the history for one column. The sentence also describes the
 * control, for a screen reader.
 */

const renderToStaticMarkup = (node: ReactNode) =>
  render(<UiCopyProvider>{node}</UiCopyProvider>);

const NOTE = {
  tone: "warn" as const,
  label: "Vence en 3 días",
  detail: "El 2/11/2026, sin pagos registrados.",
};

test("the note describes the control, after the error", () => {
  const html = renderToStaticMarkup(
    <Field label="Vencimiento" htmlFor="due" error="Poné una fecha." note={NOTE}>
      <TextInput value="" onChange={() => {}} />
    </Field>,
  );
  const input = /<input[^>]*>/.exec(html)?.[0] ?? "";
  const describedBy = /aria-describedby="([^"]+)"/.exec(input)?.[1];
  assert.equal(describedBy, "due-error due-note");
  const note = new RegExp(`id="due-note"[^>]*>([\\s\\S]*?)</span>`).exec(html)?.[1] ?? "";
  assert.match(note, /Vence en 3 días/);
  assert.match(note, /sin pagos registrados/);
});

test("the mark by the label says where; the sentence stays, hidden, for the field", () => {
  const html = renderToStaticMarkup(
    <Field label="Cliente" note={{ ...NOTE, action: <button type="button">Aplicar</button> }}>
      <TextInput value="Ferretería Sur" onChange={() => {}} />
    </Field>,
  );
  /* The flag by the label: named by the sentence (shape + word, never colour alone). */
  assert.match(html, /<button[^>]*aria-label="Vence en 3 días"/);
  /* Nothing floats beside the form any more: the note's trace in the field is hidden. */
  const trace = /<div[^>]*data-field-note=""[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(trace, /\bhidden\b/);
  assert.doesNotMatch(html, /absolute|lane/);
});

test("a field without a note draws neither face", () => {
  const html = renderToStaticMarkup(
    <Field label="Cliente">
      <TextInput value="" onChange={() => {}} />
    </Field>,
  );
  assert.doesNotMatch(html, /data-field-note/);
  assert.doesNotMatch(html, /-note/);
});

test("a data field carries the note too, describing its value", () => {
  const html = renderToStaticMarkup(
    <DataField label="Vencimiento" value="2/11/2026" note={NOTE} />,
  );
  const describedBy = /<span aria-describedby="([^"]+)"[^>]*>2\/11\/2026/.exec(html)?.[1];
  assert.ok(describedBy, "the value is described by the note");
  assert.match(html, new RegExp(`id="${describedBy}"[\\s\\S]*Vence en 3 días`));
  assert.match(html, /data-field-note/);
});

test("a fact of the record carries a note too", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            { label: "Cliente", value: "Ferretería Sur", note: NOTE },
            { label: "Emitida", value: "18/09/2026" },
          ]}
        />
      </Record.Paper>
    </Record>,
  );
  const describedBy = /<dd aria-describedby="([^"]+)"[^>]*>Ferretería Sur/.exec(html)?.[1];
  assert.ok(describedBy, "the fact's value is described by the note");
  assert.match(html, new RegExp(`id="${describedBy}"[\\s\\S]*Vence en 3 días`));
  assert.equal(html.split('data-field-note=""').length - 1, 1, "only the fact with a note");
  /* Inside the value: a `<dl>` holds only its terms and values. */
  assert.match(html, /<dd[^>]*>Ferretería Sur<div data-field-note=""/);
});
