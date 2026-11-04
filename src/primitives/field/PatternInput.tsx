"use client";

import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import {
  controlClasses,
  type ControlProps,
  nameOf,
  ReadValue,
} from "@sincpro/web-ui/primitives/field/Field";
import { maskedChange, useMaskCaret } from "@sincpro/web-ui/primitives/field/mask";
import {
  formatPattern,
  patternLength,
  patternValue,
} from "@sincpro/web-ui/primitives/field/pattern";
import { Input, TextField as AriaTextField } from "react-aria-components";

const isSlotChar = (char: string) => /[a-z\d]/i.test(char);

/**
 * An identifier with a fixed shape — a NIT, a CI, a bank account, an IBAN — typed on its
 * `pattern` (`#` digit, `A` letter, `*` either; see `pattern.ts`).
 *
 * Context: written into a `TextInput`, «1020304-5», «10203045» and «1020304 5» were three
 * values for the same company, and the search found one of them. Here the value is only the
 * characters (`"10203045"`), the separators are drawn as they are typed, a character the
 * slot does not take is not let in, and the caret stays where it was while the separators
 * appear (`mask.ts`). Pasting «BO12 3456…» with any spacing lands in the slots.
 *
 * Read mode draws it on the pattern, in mono — a value written by a machine and compared
 * with the one next to it. Whether it is COMPLETE is the form's to say: `isPatternComplete`.
 */
export function PatternInput({
  id: ownId,
  value,
  onChange,
  pattern,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** The characters only, without separators. */
  value: string;
  onChange?: (value: string) => void;
  /** «###-#######», «AA## #### #### ####». */
  pattern: string;
  /** Without one, the pattern itself with `0` for a digit: «000-0000000». */
  placeholder?: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const clean = patternValue(value, pattern);
  const drawn = formatPattern(clean, pattern);
  const { input, keep } = useMaskCaret(drawn, isSlotChar);

  if (useFormMode(mode) === "read") {
    return <ReadValue mono value={clean === "" ? null : drawn} />;
  }

  const change = (raw: string) => {
    const { next, caret } = maskedChange({
      raw,
      at: input.current?.selectionStart ?? raw.length,
      current: clean,
      drawn,
      clean: (text) => patternValue(text, pattern),
      max: patternLength(pattern),
    });
    keep(caret);
    onChange?.(next);
  };
  const shown = placeholder ?? pattern.replace(/#/g, "0").replace(/\*/g, "X");

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, shown)}
      value={drawn}
      onChange={change}
      inputMode={/[A*]/.test(pattern) ? "text" : "numeric"}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <Input
        ref={input}
        aria-describedby={describedBy}
        placeholder={shown}
        spellCheck={false}
        autoCapitalize="characters"
        className={`${controlClasses(invalid)} font-mono tabular-nums`}
      />
    </AriaTextField>
  );
}
