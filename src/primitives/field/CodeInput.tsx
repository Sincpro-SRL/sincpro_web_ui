"use client";

import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { type ControlProps, nameOf, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { useState } from "react";
import { Input, TextField as AriaTextField } from "react-aria-components";

/**
 * A verification code of N characters — the one an SMS or an email sends — drawn as N boxes.
 *
 * Context: the boxes are only drawn. Underneath is ONE input, transparent over them: six
 * inputs that pass the focus from one to the next break pasting the whole code, the
 * device's «fill from SMS» (`autoComplete="one-time-code"`), and a screen reader, which
 * hears six fields with no name. One input does all three, and the boxes show where the next
 * character goes.
 */
export function CodeInput({
  id: ownId,
  value,
  onChange,
  length = 6,
  alphanumeric = false,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  value: string;
  onChange?: (code: string) => void;
  /** How many characters. */
  length?: number;
  /** Letters too, in capitals. Digits only by default. */
  alphanumeric?: boolean;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const [focused, setFocused] = useState(false);
  const clean = (text: string) =>
    (alphanumeric
      ? text.replace(/[^a-z\d]/gi, "").toUpperCase()
      : text.replace(/\D/g, "")
    ).slice(0, length);
  const code = clean(value);

  if (useFormMode(mode) === "read") {
    return <ReadValue mono value={code === "" ? null : code} />;
  }

  /* The box the next character goes into; the last one once the code is whole. */
  const current = Math.min(code.length, length - 1);

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel)}
      value={code}
      onChange={(next) => onChange?.(clean(next))}
      inputMode={alphanumeric ? "text" : "numeric"}
      autoComplete="one-time-code"
      isInvalid={invalid}
      isDisabled={disabled}
      className="relative inline-flex"
    >
      <span aria-hidden className="flex gap-1.5">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={`flex size-(--size-control-md) items-center justify-center rounded-control border bg-surface font-mono text-lead text-ink transition-colors duration-(--duration-instant) ${
              invalid
                ? "border-danger"
                : focused && index === current
                  ? "border-primary outline-2 outline-offset-1 outline-primary"
                  : "border-line-strong"
            } ${disabled ? "bg-ground text-muted" : ""}`}
          >
            {code[index] ?? ""}
          </span>
        ))}
      </span>
      <Input
        aria-describedby={describedBy}
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 size-full cursor-text bg-transparent text-transparent caret-transparent outline-0 selection:bg-transparent disabled:cursor-not-allowed"
      />
    </AriaTextField>
  );
}
