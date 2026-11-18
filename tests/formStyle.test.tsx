import assert from "node:assert/strict";

import {
  DataField,
  Field,
  FieldLayoutProvider,
  FormSection,
  FormStyleProvider,
  Record,
  TextInput,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the «settings» form style is an application's choice, set once — so the two
 * things that must hold are that NOTHING changes without it (every other app keeps the dense
 * sheet), and that with it the help is written out and still describes the control, a field
 * that may stay empty says so, and a section is a card.
 */

const settings = (node: ReactNode) =>
  renderToStaticMarkup(<FormStyleProvider value="settings">{node}</FormStyleProvider>);

const HELP = "La parte del correo antes de la @.";

function nombre(optional = false) {
  return (
    <Field label="Usuario" hint={HELP} optional={optional}>
      <TextInput value="info" />
    </Field>
  );
}

test("without the provider a field is the dense one: help behind a `?`, no «(optional)»", () => {
  const html = renderToStaticMarkup(nombre(true));
  assert.doesNotMatch(html, /data-style="settings"/);
  assert.doesNotMatch(html, /\(optional\)/);
  assert.doesNotMatch(html, new RegExp(`<p[^>]*>${HELP}</p>`));
});

test("settings: the help is written under the label and describes the control", () => {
  const html = settings(nombre());
  const help = new RegExp(`<p id="([^"]+)"[^>]*>${HELP}</p>`).exec(html);
  assert.ok(help, "the help is a paragraph, not a popover");
  const input = /<input\b[^>]*>/.exec(html)?.[0] ?? "";
  assert.match(input, new RegExp(`aria-describedby="[^"]*${help[1]}`));
});

test("settings: a field that may stay empty says so, a required one does not", () => {
  assert.match(settings(nombre(true)), /\(optional\)/);
  const required = settings(
    <Field label="Usuario" required optional>
      <TextInput value="" />
    </Field>,
  );
  assert.doesNotMatch(required, /\(optional\)/);
});

test("settings: beside its control a field is a row, stacked it is not", () => {
  const row = settings(
    <FieldLayoutProvider value="horizontal">{nombre()}</FieldLayoutProvider>,
  );
  assert.match(row, /class="grid-setting /);
  assert.doesNotMatch(settings(nombre()), /grid-setting/);
});

test("settings: a value read is a row with its help too", () => {
  const html = settings(
    <FieldLayoutProvider value="horizontal">
      <DataField label="Dominio" hint="No cambia." value="sincpro.dev" />
    </FieldLayoutProvider>,
  );
  assert.match(html, /grid-setting/);
  assert.match(html, /<p[^>]*>No cambia\.<\/p>/);
});

test("settings: a section is a card with its title; dense keeps its plain group", () => {
  const section = (
    <FormSection title="Contacto" columns={2}>
      {nombre()}
    </FormSection>
  );
  assert.match(settings(section), /data-ui="form\.section"/);
  assert.doesNotMatch(settings(section), /grid-cols-2/);
  assert.doesNotMatch(renderToStaticMarkup(section), /data-ui="form\.section"/);
});

test("settings: a record's unsaved work floats at the bottom instead of the rail", () => {
  const dirty = { onSave: () => undefined, onDiscard: () => undefined };
  const record = (
    <Record identity={{ title: "Cuenta" }} placement="page" dirty={dirty}>
      <Record.Rail>
        <Record.Crumbs crumbs={[{ label: "Cuentas" }]} />
      </Record.Rail>
      <Record.Paper layout="horizontal">{nombre()}</Record.Paper>
    </Record>
  );
  const floating = settings(record);
  assert.match(floating, /data-ui="dirty\.bar"/);
  assert.doesNotMatch(floating, /data-thumb-bar/);
  assert.equal(floating.match(/>Save</g)?.length, 1);
  const dense = renderToStaticMarkup(record);
  assert.doesNotMatch(dense, /data-ui="dirty\.bar"/);
});
