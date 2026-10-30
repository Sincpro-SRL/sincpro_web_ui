import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DataField,
  Field,
  FieldCopyProvider,
  Picker,
  SPANISH_COPY,
  TextInput,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: every field carries a small copy button by its label — in read mode and in edit
 * mode, a many2one included — so a value is pasted elsewhere without opening it or selecting
 * it by hand. It is on by default and never imposed: `copy="…"` copies something else,
 * `copy={false}` removes it from a field, `FieldCopyProvider value={false}` from a form.
 * What it copies is read from the screen at the press (`shownText`), which needs a DOM: the
 * walk is driven in a browser; here, the button and its switches.
 */

const html = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);
const button = (label: string) => new RegExp(`aria-label="Copiar «${label}»"`);

test("a field in edit mode carries a copy button named by the field", () => {
  const out = html(
    <Field label="Referencia">
      <TextInput value="OC-2026-0412" onChange={() => {}} />
    </Field>,
  );
  assert.match(out, button("Referencia"));
});

test("a many2one carries it too, in edit and in read mode", () => {
  const items = [{ id: "c1", name: "Clínica San Gabriel S.A." }];
  assert.match(
    html(
      <Field label="Cliente">
        <Picker items={items} value="c1" />
      </Field>,
    ),
    button("Cliente"),
  );
  assert.match(
    html(
      <Field label="Cliente" mode="read">
        <Picker items={items} value="c1" />
      </Field>,
    ),
    button("Cliente"),
  );
});

test("a value shown with its name carries it; a missing value does not", () => {
  assert.match(html(<DataField label="NIT" value="1020304050" mono />), button("NIT"));
  assert.doesNotMatch(html(<DataField label="NIT" value={null} />), /Copiar/);
});

test("off for one field, or for a whole form", () => {
  assert.doesNotMatch(html(<DataField label="NIT" value="1" copy={false} />), /Copiar/);
  assert.doesNotMatch(
    html(
      <FieldCopyProvider value={false}>
        <DataField label="NIT" value="1" />
        <Field label="Referencia">
          <TextInput value="x" onChange={() => {}} />
        </Field>
      </FieldCopyProvider>,
    ),
    /Copiar/,
  );
});
