"use client";

import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import {
  type CardBrand,
  cardBrand,
  cardBrandName,
  cardCodeLength,
  cardDigits,
  cardMaxDigits,
  formatCardNumber,
  formatExpiry,
  maskCardNumber,
} from "@sincpro/web-ui/primitives/field/card";
import {
  controlClasses,
  type ControlProps,
  nameOf,
  ReadValue,
} from "@sincpro/web-ui/primitives/field/Field";
import { maskedChange, useMaskCaret } from "@sincpro/web-ui/primitives/field/mask";
import { CreditCard } from "lucide-react";
import type { Ref } from "react";
import { Input, TextField as AriaTextField } from "react-aria-components";

/**
 * A payment card number: typed in the brand's groups, the brand named as it is recognised.
 *
 * Context: the value is the DIGITS (`card.ts`); the spaces are drawn. Formatting while
 * typing has one trap — inserting a space moves the text under the caret, and a caret that
 * jumps to the end on every fourth digit makes correcting the middle of a number impossible.
 * So the caret is kept by DIGIT, not by character: after each change it goes back after the
 * same number of digits it was after. Deleting a space deletes the digit before it, which is
 * what the person meant.
 *
 * What it does not decide is whether the number is WRONG: `isValidCardNumber` (Luhn, length
 * by brand) is exported for the form to say it in the field's `error`, when the person tries
 * — not on every keystroke, while the number is still half typed.
 *
 * Read mode shows the brand and the last four («Visa •••• 4242»): a stored card is shown that
 * way everywhere. `masked={false}` shows it whole, for the one screen that has to. An
 * application that only keeps the last four passes those and the `brand`.
 */
const isDigit = (char: string) => /\d/.test(char);

export function CardNumberInput({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  brand: givenBrand,
  masked = true,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** The digits, without spaces. Whatever else comes in (a pasted «4242-4242…») is dropped. */
  value: string;
  onChange?: (digits: string) => void;
  placeholder?: string;
  /** The brand when the digits cannot say it — a stored card known only by its last four. */
  brand?: CardBrand;
  /** In read mode, only the last four. On by default. */
  masked?: boolean;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const digits = cardDigits(value);
  const brand = givenBrand ?? cardBrand(digits);
  const formatted = formatCardNumber(digits, brand);
  const { input, keep } = useMaskCaret(formatted, isDigit);

  if (useFormMode(mode) === "read") {
    const shown = masked ? maskCardNumber(digits) : formatted;
    return (
      <ReadValue
        mono
        value={
          digits === "" ? null : brand === null ? shown : `${cardBrandName(brand)} ${shown}`
        }
      />
    );
  }

  const change = (raw: string) => {
    const { next, caret } = maskedChange({
      raw,
      at: input.current?.selectionStart ?? raw.length,
      current: digits,
      drawn: formatted,
      clean: cardDigits,
      max: cardMaxDigits(cardDigits(raw), givenBrand),
    });
    keep(caret);
    onChange?.(next);
  };

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={formatted}
      onChange={change}
      inputMode="numeric"
      autoComplete="cc-number"
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <FieldGroup isInvalid={invalid} isDisabled={disabled}>
        <CreditCard
          aria-hidden
          className="ml-2.5 size-(--size-icon-sm) shrink-0 text-muted"
          strokeWidth={2}
        />
        <Input
          ref={input}
          aria-describedby={describedBy}
          placeholder={placeholder}
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-meta text-ink tabular-nums outline-0 placeholder:text-muted disabled:cursor-not-allowed"
        />
        {brand === null ? null : (
          /* The brand as it is recognised: a wrong first digit shows up here, before the
             sixteenth. Read with the number, as part of what the field holds. */
          <span className="mr-2.5 shrink-0 text-micro font-medium whitespace-nowrap text-muted">
            {cardBrandName(brand)}
          </span>
        )}
      </FieldGroup>
    </AriaTextField>
  );
}

/** The box of a short card datum: numeric keyboard, its autofill, digits in tabular mono. */
function CardDatumBox({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  "aria-label": ariaLabel,
  autoComplete,
  inputRef,
}: Omit<ControlProps, "mode"> & {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  autoComplete: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={value}
      onChange={onChange}
      inputMode="numeric"
      autoComplete={autoComplete}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <Input
        {...(inputRef === undefined ? {} : { ref: inputRef })}
        aria-describedby={describedBy}
        placeholder={placeholder}
        spellCheck={false}
        className={`${controlClasses(invalid)} font-mono tabular-nums`}
      />
    </AriaTextField>
  );
}

/**
 * The expiry of a card, «MM/AA». The value is the four digits («1228»); the slash is drawn.
 *
 * Context: the month that can only be one digit gets its zero while typing — «4» is April,
 * so «04/» — which is what a card's face says and what saves a keystroke. The caret is kept
 * by digit, like `CardNumberInput`. Whether it already EXPIRED is the form's to say, with
 * `isExpiryValid`: good through the last day of its month.
 */
export function CardExpiryInput({
  mode,
  value,
  onChange,
  placeholder = "MM/AA",
  ...props
}: ControlProps & {
  /** The four digits, MMAA. */
  value: string;
  onChange?: (digits: string) => void;
  placeholder?: string;
}) {
  const digits = cardDigits(value).slice(0, 4);
  const drawn = formatExpiry(digits);
  const { input, keep } = useMaskCaret(drawn, isDigit);

  if (useFormMode(mode) === "read") {
    return <ReadValue mono value={digits === "" ? null : drawn} />;
  }

  const change = (raw: string) => {
    let { next, caret } = maskedChange({
      raw,
      at: input.current?.selectionStart ?? raw.length,
      current: digits,
      drawn,
      clean: cardDigits,
      max: 4,
    });
    /* Only while TYPING: deleting the zero of «04» must not put it back. */
    if (raw.length > drawn.length && /^[2-9]/.test(next)) {
      next = `0${next}`.slice(0, 4);
      caret = Math.min(caret + 1, next.length);
    }
    keep(caret);
    onChange?.(next);
  };

  return (
    <CardDatumBox
      {...props}
      value={drawn}
      onChange={change}
      placeholder={placeholder}
      autoComplete="cc-exp"
      inputRef={input}
    />
  );
}

/**
 * The security code on the back of a card (on the front of an Amex): three digits, four for
 * Amex — `brand` decides, so it can be the one `CardNumberInput` recognised.
 *
 * Read mode never shows it: a fixed row of dots, as long as the brand's code, and the copy
 * button finds nothing to copy. It is asked once and not stored — a form that keeps it is
 * outside what a card network allows.
 */
export function CardCodeInput({
  mode,
  value,
  onChange,
  brand,
  placeholder,
  ...props
}: ControlProps & {
  value: string;
  onChange?: (digits: string) => void;
  /** The card's brand, for its length. */
  brand?: CardBrand | null;
  placeholder?: string;
}) {
  const length = cardCodeLength(brand);
  if (useFormMode(mode) === "read") {
    return (
      <ReadValue
        value={
          value === "" ? null : (
            <span aria-hidden data-copy-skip="" className="tracking-widest">
              {"•".repeat(length)}
            </span>
          )
        }
      />
    );
  }
  return (
    <CardDatumBox
      {...props}
      value={cardDigits(value).slice(0, length)}
      onChange={(raw) => onChange?.(cardDigits(raw).slice(0, length))}
      placeholder={placeholder ?? "•".repeat(length)}
      autoComplete="cc-csc"
    />
  );
}
