import assert from "node:assert/strict";

import {
  Field,
  FormModeProvider,
  Rating,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: an average is read in its figure, estimated in its stars, and weighed by how many
 * opinions it comes from — so shown it is ONE image with all three in its name. Asked, it is a
 * radio group with one tab stop, named by its `Field`; in read mode it shows.
 */

const es = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("shown: one image named with the average, the scale and how many opinions", () => {
  const html = es(<Rating value={4.5} count={128} />);
  assert.match(html, /role="img" aria-label="Calificación: 4,5 de 5, 128 opiniones"/);
  assert.match(html, /aria-hidden="true" class="[^"]*">4,5<\/span>/);
  assert.match(html, />\(128\)</);
});

test("one opinion is singular, and none is «sin calificar» with no figure", () => {
  assert.match(es(<Rating value={5} count={1} />), /5,0 de 5, 1 opinión"/);
  const none = es(<Rating value={0} />);
  assert.match(none, /aria-label="Calificación: todavía sin calificar"/);
  assert.doesNotMatch(none, /0,0/);
});

test("to the nearest half star and no finer: 4.2 draws four, 4.3 four and a half", () => {
  const halves = (html: string) => (html.match(/w-1\/2/g) ?? []).length;
  const wholes = (html: string) => (html.match(/w-full/g) ?? []).length;
  const low = es(<Rating value={4.2} />);
  assert.equal(wholes(low), 4);
  assert.equal(halves(low), 0);
  const mid = es(<Rating value={4.3} />);
  assert.equal(wholes(mid), 4);
  assert.equal(halves(mid), 1);
});

test("asked: a radio group, one tab stop on the given star, each star named", () => {
  const html = es(<Rating value={3} onChange={() => {}} />);
  assert.match(html, /role="radiogroup" aria-label="Calificación"/);
  assert.equal((html.match(/role="radio"/g) ?? []).length, 5);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.match(html, /aria-checked="true" aria-label="3 de 5 estrellas" tabindex="0"/);
});

test("inside a Field it is named by the label; in read mode it shows", () => {
  const html = es(
    <Field label="¿Cómo te atendimos?">
      <Rating value={4} onChange={() => {}} />
    </Field>,
  );
  assert.match(html, /role="radiogroup" aria-labelledby="[^"]+"/);
  const read = es(
    <FormModeProvider value="read">
      <Rating value={4} onChange={() => {}} />
    </FormModeProvider>,
  );
  assert.match(read, /role="img"/);
  assert.doesNotMatch(read, /radiogroup/);
});
