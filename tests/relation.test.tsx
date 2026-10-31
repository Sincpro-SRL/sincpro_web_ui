import assert from "node:assert/strict";

import {
  Field,
  FormModeProvider,
  Picker,
  RelationCard,
  RelationValue,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a many2one shown as a value. The contract: the name is a link when it goes
 * somewhere, the secondary line is drawn, no record is SAID, the summary opens from a named
 * button, and in a form the relation is the read face while the `Picker` is the edit face.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const NAME = "Distribuidora Andina S.R.L.";

test("a relation that goes somewhere renders a link and its secondary line", () => {
  const html = es(<RelationValue name={NAME} secondary="NIT 1028457021" onOpen={() => {}} />);
  assert.match(html, /role="link"[^>]*>Distribuidora Andina S.R.L.</);
  assert.match(html, /NIT 1028457021/);
});

test("with an address the link is a real anchor", () => {
  const html = es(<RelationValue name={NAME} href="/clientes/7" />);
  assert.match(html, /<a[^>]*href="\/clientes\/7"[^>]*>Distribuidora Andina S.R.L.<\/a>/);
});

test("with nowhere to go the name is text", () => {
  const html = es(<RelationValue name={NAME} />);
  assert.doesNotMatch(html, /role="link"|<a |<button/);
  assert.match(html, />Distribuidora Andina S.R.L.</);
});

test("no record is said, in muted", () => {
  for (const name of [null, undefined, ""]) {
    const html = es(<RelationValue name={name} />);
    assert.match(html, /text-muted[^"]*">Sin asignar</);
  }
});

test("a summary is opened from a button named after the record", () => {
  const html = es(<RelationValue name={NAME} summary={{ facts: [] }} />);
  assert.match(html, /aria-label="Resumen de Distribuidora Andina S.R.L."/);
  assert.match(html, /aria-haspopup="dialog"/);
});

test("the card draws its title, tag, facts and «Abrir»", () => {
  const html = es(
    <RelationCard
      name={NAME}
      secondary="NIT 1028457021"
      summary={{
        tag: { label: "al día", tone: "good" },
        facts: [
          { label: "Deuda", value: "Bs. 0,00" },
          { label: "Ciudad", value: "La Paz" },
        ],
      }}
      onOpen={() => {}}
    />,
  );
  assert.match(html, /al día/);
  assert.match(html, /<dt[^>]*>Deuda<\/dt><dd[^>]*>Bs. 0,00<\/dd>/);
  assert.match(html, /<button[^>]*>.*Abrir<\/button>/);
  assert.doesNotMatch(es(<RelationCard name={NAME} />), /Abrir/);
});

test("in a read form the field draws the relation; in edit, the picker", () => {
  const field = (
    <Field label="Cliente">
      <RelationValue
        name={NAME}
        secondary="NIT 1028457021"
        editor={<Picker items={[{ id: "1028457021", name: NAME }]} value="1028457021" />}
      />
    </Field>
  );
  const read = es(<FormModeProvider value="read">{field}</FormModeProvider>);
  assert.doesNotMatch(read, /role="combobox"/);
  assert.match(read, /NIT 1028457021/);
  assert.match(read, /min-h-\(--size-control-md\)/);

  const edit = es(<FormModeProvider value="edit">{field}</FormModeProvider>);
  assert.match(edit, /role="combobox"/);
  assert.doesNotMatch(edit, /NIT 1028457021/);
});
