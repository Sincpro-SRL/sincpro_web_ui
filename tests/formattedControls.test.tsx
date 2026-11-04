import assert from "node:assert/strict";

import {
  cardBrand,
  CardNumberInput,
  columnsFromModel,
  Field,
  FieldCopyProvider,
  formatCardNumber,
  FormModeProvider,
  isValidCardNumber,
  luhnValid,
  maskCardNumber,
  type ModelDefinition,
  Numeric,
  PasswordInput,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the controls that write a value one way and store it another — a password that is
 * never shown in read mode, a card number stored as digits and read in groups, an amount
 * stored as a number and read in the locale's money. Typing, the eye and the caret are
 * driven in a browser by the stories; what is checked here is what is DRAWN and the pure
 * rules the form validates with.
 */

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <FieldCopyProvider value={false}>{children}</FieldCopyProvider>
    </UiCopyProvider>,
  );
}

const read = (children: ReactNode) =>
  spanish(<FormModeProvider value="read">{children}</FormModeProvider>);

/* ── Password ─────────────────────────────────────────────────────────── */

test("a password in read mode never draws its value, nor its length", () => {
  const short = read(<PasswordInput value="abc" />);
  const long = read(<PasswordInput value="una-frase-larguísima-de-verdad" />);
  assert.ok(!short.includes("abc"));
  assert.ok(!long.includes("larguísima"));
  assert.ok(short.includes("••••••••"));
  assert.equal(short, long, "the same dots whatever the length");
  assert.ok(short.includes("contraseña establecida"));
});

test("an empty password reads as unset, not as dots", () => {
  const html = read(<PasswordInput value="" />);
  assert.ok(!html.includes("•"));
  assert.ok(html.includes("sin definir"));
});

test("a password is typed hidden, with the eye to show it and the manager's hint", () => {
  const html = spanish(
    <Field label="Clave">
      <PasswordInput value="secreto" autoComplete="new-password" />
    </Field>,
  );
  assert.match(html, /type="password"/);
  assert.match(html, /autoComplete="new-password"|autocomplete="new-password"/);
  assert.ok(html.includes('aria-label="Mostrar contraseña"'));
});

test("`revealable={false}` leaves no eye", () => {
  const html = spanish(<PasswordInput aria-label="Clave" value="x" revealable={false} />);
  assert.ok(!html.includes("Mostrar contraseña"));
});

/* ── Card number ──────────────────────────────────────────────────────── */

test("the brand comes from the first digits, Discover before UnionPay", () => {
  assert.equal(cardBrand("4242"), "visa");
  assert.equal(cardBrand("5555"), "mastercard");
  assert.equal(cardBrand("2221"), "mastercard");
  assert.equal(cardBrand("3782"), "amex");
  assert.equal(cardBrand("6011"), "discover");
  assert.equal(cardBrand("622126"), "discover");
  assert.equal(cardBrand("6200"), "unionpay");
  assert.equal(cardBrand("3530"), "jcb");
  assert.equal(cardBrand("3056"), "diners");
  assert.equal(cardBrand("9"), null);
});

test("grouped by brand: Amex is 4-6-5, the rest 4-4-4-4", () => {
  assert.equal(formatCardNumber("378282246310005"), "3782 822463 10005");
  assert.equal(formatCardNumber("4242424242424242"), "4242 4242 4242 4242");
  assert.equal(formatCardNumber("42424"), "4242 4");
  assert.equal(formatCardNumber("4242-4242 42"), "4242 4242 42");
});

test("Luhn and the brand's length decide a whole number", () => {
  assert.ok(luhnValid("4242424242424242"));
  assert.ok(!luhnValid("4242424242424241"));
  assert.ok(isValidCardNumber("4242 4242 4242 4242"));
  assert.ok(isValidCardNumber("378282246310005"));
  assert.ok(!isValidCardNumber("424242424242424"), "a Visa of 15 digits does not exist");
  assert.ok(!isValidCardNumber(""));
});

test("a card reads with its brand and only the last four", () => {
  const html = read(<CardNumberInput value="4242424242424242" />);
  assert.ok(html.includes("Visa •••• 4242"));
  assert.ok(!html.includes("4242 4242"));
  assert.equal(maskCardNumber("378282246310005"), "•••• 0005");
});

test("`masked={false}` reads it whole; a stored last four takes its brand from the prop", () => {
  assert.ok(
    read(<CardNumberInput value="4242424242424242" masked={false} />).includes(
      "Visa 4242 4242 4242 4242",
    ),
  );
  assert.ok(
    read(<CardNumberInput value="0005" brand="amex" />).includes(
      "American Express •••• 0005",
    ),
  );
});

test("typed, it shows the groups, the brand, and asks the keyboard for digits", () => {
  const html = spanish(<CardNumberInput aria-label="Tarjeta" value="4242424242424242" />);
  assert.ok(html.includes('value="4242 4242 4242 4242"'));
  assert.ok(html.includes(">Visa<"));
  assert.match(html, /inputMode="numeric"|inputmode="numeric"/);
  assert.match(html, /autoComplete="cc-number"|autocomplete="cc-number"/);
});

/* ── Numbers with a format ────────────────────────────────────────────── */

test("`Numeric` takes any Intl format: money, percent, fixed decimals", () => {
  const money = spanish(
    <Numeric value={1234.5} format={{ style: "currency", currency: "BOB" }} />,
  );
  assert.match(money, /1\.234,50/);
  assert.match(money, /Bs/);
  assert.match(spanish(<Numeric value={0.125} format={{ style: "percent" }} />), /13\s?%/);
  assert.match(
    spanish(
      <Numeric
        value={2.5}
        unit="kg"
        format={{ minimumFractionDigits: 3, maximumFractionDigits: 3 }}
      />,
    ),
    /2,500.*kg/,
  );
});

test("a model's monetary and float fields are numeric columns", () => {
  const model: ModelDefinition = {
    aggregate: "invoice",
    identity: "id",
    fields: {
      amount_total: { type: "monetary", nullable: false, sortable: true, ops: ["gt"] },
      weight: { type: "float", nullable: true, sortable: true, ops: ["gt"] },
      ref: { type: "text", nullable: false, sortable: true, ops: ["eq"] },
    },
  };
  const columns = columnsFromModel<Record<string, unknown>>([], model);
  const byId = Object.fromEntries(columns.map((one) => [one.id, one]));
  assert.equal(byId["amount_total"]?.numeric, true);
  assert.equal(byId["weight"]?.numeric, true);
  assert.equal(byId["ref"]?.numeric, undefined);
  const cell = spanish(<>{byId["amount_total"]?.cell?.({ amount_total: 1234.5 })}</>);
  assert.match(cell, /1\.234,5/);
  assert.match(cell, /text-right/);
});
