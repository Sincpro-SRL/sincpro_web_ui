import assert from "node:assert/strict";

import {
  CardCodeInput,
  CardExpiryInput,
  CodeInput,
  ColorInput,
  DurationInput,
  expiryDigits,
  expiryParts,
  formatDuration,
  formatExpiry,
  formatPattern,
  FormModeProvider,
  isExpiryValid,
  isPatternComplete,
  NumberInput,
  Numeric,
  parseDuration,
  PatternInput,
  patternValue,
  roundTo,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { caretAfter, maskedChange } from "@sincpro/web-ui/primitives/field/mask";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the rest of the formatted-value controls — expiry and security code, duration,
 * unit chooser, rounding, signed figures, patterns, verification codes, colours. The pure
 * rules are checked here; typing, the caret and the keyboard are driven by the stories.
 */

const html = (children: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>);
const read = (children: ReactNode) =>
  html(<FormModeProvider value="read">{children}</FormModeProvider>);
const digits = (text: string) => text.replace(/\D/g, "");

/* ── The mask's caret ─────────────────────────────────────────────────── */

test("typing in the middle keeps the caret after the same digits", () => {
  /* «4242 4|242» + «9» → raw «4242 49|242» */
  const change = maskedChange({
    raw: "4242 49242",
    at: 7,
    current: "42424242",
    drawn: "4242 4242",
    clean: digits,
    max: 16,
  });
  assert.deepEqual(change, { next: "424249242", caret: 6 });
  assert.equal(
    caretAfter("4242 4924 2", 6, (c) => /\d/.test(c)),
    7,
  );
});

test("deleting a separator deletes the digit before it", () => {
  /* «4242 |4242», Backspace → raw «4242|4242» */
  const change = maskedChange({
    raw: "42424242",
    at: 4,
    current: "42424242",
    drawn: "4242 4242",
    clean: digits,
    max: 16,
  });
  assert.deepEqual(change, { next: "4244242", caret: 3 });
});

/* ── Card expiry and code ─────────────────────────────────────────────── */

test("an expiry: a lone month digit gets its zero, and it reads MM/AA", () => {
  assert.equal(expiryDigits("4"), "04");
  assert.equal(expiryDigits("1"), "1");
  assert.equal(expiryDigits("12/28"), "1228");
  assert.equal(formatExpiry("1228"), "12/28");
  assert.equal(formatExpiry("12"), "12");
  assert.deepEqual(expiryParts("0930"), { month: 9, year: 2030 });
  assert.equal(expiryParts("1328"), null);
});

test("an expiry is good through the last day of its month", () => {
  const now = new Date(2026, 10, 30);
  assert.ok(isExpiryValid("1126", now));
  assert.ok(!isExpiryValid("1026", now));
  assert.ok(isExpiryValid("0127", now));
  assert.ok(!isExpiryValid("12", now));
});

test("read: the expiry as MM/AA, the security code never", () => {
  assert.ok(read(<CardExpiryInput value="1228" />).includes("12/28"));
  const code = read(<CardCodeInput value="1234" brand="amex" />);
  assert.ok(!code.includes("1234"));
  assert.ok(code.includes("••••"));
  assert.ok(read(<CardCodeInput value="123" />).includes(">•••<"));
});

test("edit: the expiry and the code ask for their autofill", () => {
  assert.match(html(<CardExpiryInput aria-label="Vence" value="12" />), /cc-exp/);
  assert.match(html(<CardCodeInput aria-label="CVC" value="" />), /cc-csc/);
});

/* ── Duration ─────────────────────────────────────────────────────────── */

test("a duration reads h:mm, rounded to the minute", () => {
  assert.equal(formatDuration(8.5), "8:30");
  assert.equal(formatDuration(0.25), "0:15");
  assert.equal(formatDuration(-1.25), "-1:15");
  assert.equal(formatDuration(1 / 3), "0:20");
  assert.equal(formatDuration(0), "0:00");
});

test("a duration is typed any way people write it", () => {
  assert.equal(parseDuration("8:30"), 8.5);
  assert.equal(parseDuration("8,5"), 8.5);
  assert.equal(parseDuration("8.5"), 8.5);
  assert.equal(parseDuration("8h30"), 8.5);
  assert.equal(parseDuration("8h 30m"), 8.5);
  assert.equal(parseDuration("45m"), 0.75);
  assert.equal(parseDuration("90m"), 1.5);
  assert.equal(parseDuration("2h"), 2);
  assert.equal(parseDuration("-1:15"), -1.25);
  assert.equal(parseDuration(""), "");
  assert.equal(parseDuration("8:75"), null);
  assert.equal(parseDuration("ocho"), null);
});

test("a duration field shows h:mm and reads with its unit", () => {
  assert.ok(html(<DurationInput aria-label="Horas" value={7.75} />).includes('value="7:45"'));
  assert.ok(read(<DurationInput value={7.75} />).includes("7:45 h"));
});

/* ── Rounding ─────────────────────────────────────────────────────────── */

test("rounding to a multiple, without the float tail", () => {
  assert.equal(roundTo(1.12, 0.05), 1.1);
  assert.equal(roundTo(1.13, 0.05), 1.15);
  assert.equal(roundTo(1.15, 0.05), 1.15);
  assert.equal(roundTo(0.1 + 0.2, 0.1), 0.3);
  assert.equal(roundTo(2.3456, 0.001), 2.346);
  assert.equal(roundTo(12.4, 1), 12);
  assert.equal(roundTo(-1.13, 0.05), -1.15);
});

test("the method is part of the rule", () => {
  assert.equal(roundTo(2.5, 1, "half-up"), 3);
  assert.equal(roundTo(2.5, 1, "half-even"), 2);
  assert.equal(roundTo(3.5, 1, "half-even"), 4);
  assert.equal(roundTo(2.01, 1, "up"), 3);
  assert.equal(roundTo(2.99, 1, "down"), 2);
  assert.equal(roundTo(4, 1, "up"), 4);
});

test("`Numeric` rounds the value before writing it, and signs it when asked", () => {
  assert.match(
    html(
      <Numeric
        value={1.13}
        rounding={{ increment: 0.05 }}
        format={{ minimumFractionDigits: 2 }}
      />,
    ),
    /1,15/,
  );
  const negative = html(<Numeric value={-250} signed format="decimal" />);
  assert.match(negative, /text-danger/);
  assert.match(negative, /[-−]250/);
  const positive = html(<Numeric value={250} signed format="decimal" />);
  assert.match(positive, /\+250/);
  assert.doesNotMatch(positive, /text-danger/);
  assert.doesNotMatch(html(<Numeric value={0} signed />), /[+−-]0/);
});

/* ── Unit chooser ─────────────────────────────────────────────────────── */

const UNITS = {
  options: [
    { id: "kg", label: "kg" },
    { id: "t", label: "t" },
  ],
  value: "t",
  onChange: () => {},
};

test("the unit is chosen in the same box, and read with the number", () => {
  const edit = html(<NumberInput aria-label="Peso" value={12} units={UNITS} />);
  assert.match(edit, /<select[^>]*aria-label="Unidad"/, "outside a field it is named alone");
  assert.match(edit, /<option value="t" selected=""/);
  assert.ok(read(<NumberInput value={12} units={UNITS} />).includes("12 t"));
});

/* ── Pattern ──────────────────────────────────────────────────────────── */

test("a pattern takes only what fits its slots, and draws the separators", () => {
  assert.equal(patternValue("1020304-5", "#######-#"), "10203045");
  assert.equal(patternValue("12ab34", "####"), "1234");
  assert.equal(patternValue("bo12 3456", "AA## ####"), "BO123456");
  assert.equal(formatPattern("10203045", "#######-#"), "1020304-5");
  assert.equal(formatPattern("1020304", "#######-#"), "1020304", "no dangling separator");
  assert.ok(isPatternComplete("10203045", "#######-#"));
  assert.ok(!isPatternComplete("1020", "#######-#"));
});

test("a pattern field draws its value and reads in mono", () => {
  assert.ok(
    html(<PatternInput aria-label="NIT" value="10203045" pattern="#######-#" />).includes(
      'value="1020304-5"',
    ),
  );
  const shown = read(<PatternInput value="10203045" pattern="#######-#" />);
  assert.ok(shown.includes("1020304-5"));
  assert.match(shown, /font-mono/);
});

/* ── Verification code ────────────────────────────────────────────────── */

test("a verification code is one input, with the device's fill-from-SMS", () => {
  const code = html(<CodeInput aria-label="Código" value="12a34" />);
  assert.equal((code.match(/<input/g) ?? []).length, 1);
  assert.match(code, /one-time-code/);
  assert.ok(code.includes('value="1234"'), "letters dropped when it is digits only");
});

/* ── Colour ───────────────────────────────────────────────────────────── */

test("a colour reads as its swatch and its hex; nothing set reads unset", () => {
  const shown = read(<ColorInput value="#1f6feb" />);
  assert.match(shown, /#1F6FEB/i);
  assert.ok(read(<ColorInput value="" />).includes("sin definir"));
  assert.ok(read(<ColorInput value="no-color" />).includes("sin definir"));
});
