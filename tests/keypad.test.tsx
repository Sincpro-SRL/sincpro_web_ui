import assert from "node:assert/strict";

import {
  applyKey,
  Field,
  isKeypadKey,
  keyOfKeyboard,
  Keypad,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the pad types quantities and prices with a thumb, so its rules are a calculator's:
 * a lone zero is replaced, a second decimal point does nothing, a digit past the allowed
 * decimals does nothing, ⌫ on «-» leaves nothing. The value is the machine's («1250.5»); the
 * key shows the person's separator.
 */

const type = (keys: string[], rules = {}) =>
  keys.reduce((text, key) => (isKeypadKey(key) ? applyKey(text, key, rules) : text), "");

test("digits append, and a lone zero is replaced", () => {
  assert.equal(type(["0", "5"]), "5");
  assert.equal(type(["1", "2", "0"]), "120");
  assert.equal(type(["0", "0"]), "0");
});

test("one decimal point, and none past the allowed decimals", () => {
  assert.equal(type(["decimal", "5"]), "0.5");
  assert.equal(type(["1", "decimal", "decimal", "2"]), "1.2");
  assert.equal(type(["9", "decimal", "9", "9", "9"], { decimals: 2 }), "9.99");
  /* Units take no decimal point at all. */
  assert.equal(type(["3", "decimal", "5"], { decimals: 0 }), "35");
});

test("«00» writes hundreds, and on nothing it is still nothing", () => {
  assert.equal(type(["1", "00"]), "100");
  assert.equal(type(["00"]), "");
});

test("⌫, clear and the sign", () => {
  assert.equal(type(["1", "2", "backspace"]), "1");
  assert.equal(type(["5", "sign"]), "-5");
  assert.equal(type(["5", "sign", "backspace"]), "");
  assert.equal(type(["5", "sign", "sign"]), "5");
  assert.equal(type(["1", "2", "clear"]), "");
  assert.equal(type(["sign"]), "");
});

test("a physical keyboard's keys stand for the pad's", () => {
  assert.equal(keyOfKeyboard("7"), "7");
  assert.equal(keyOfKeyboard(","), "decimal");
  assert.equal(keyOfKeyboard("."), "decimal");
  assert.equal(keyOfKeyboard("Backspace"), "backspace");
  assert.equal(keyOfKeyboard("Escape"), "clear");
  assert.equal(keyOfKeyboard("a"), null);
});

test("the pad draws twelve keys, the separator of the person's locale, and its name", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Keypad value="" onChange={() => {}} decimals={2} />
    </UiCopyProvider>,
  );
  assert.equal(html.match(/data-ui="keypad.key"/g)?.length, 12);
  assert.match(html, /aria-label="Coma decimal"[^>]*>,<\/button>/);
  assert.match(
    html,
    /role="group"[^>]*aria-label="Teclado numérico"|aria-label="Teclado numérico"[^>]*role="group"/,
  );
  assert.match(html, /aria-label="Borrar el último dígito"/);
});

test("for units the key beside the zero is «00», and inside a Field the field names the pad", () => {
  const html = renderToStaticMarkup(
    <Field label="Cantidad">
      <Keypad value="" onChange={() => {}} decimals={0} />
    </Field>,
  );
  assert.match(html, />00<\/button>/);
  assert.doesNotMatch(html, /Decimal point/);
  assert.match(html, /role="group"[^>]*aria-labelledby=/);
});
