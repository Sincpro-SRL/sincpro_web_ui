"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { FieldButton, FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { type ControlProps, nameOf, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import { Input, TextField as AriaTextField } from "react-aria-components";

/**
 * A password: hidden while it is typed, shown on purpose with the eye.
 *
 * Context: it is `TextInput`'s wiring — React Aria's `TextField`, named and described by
 * its `Field` through `useFieldIds` — with three things a password owes and a text does not:
 *
 * - **The eye.** Typing blind is where a long password goes wrong; the button shows it as
 *   text and hides it again, and says which of the two it will do. `revealable={false}`
 *   removes it, for a screen where it must not be shown.
 * - **Caps Lock.** The most common reason a right password is refused. While it is on, a
 *   line under the control says so — in the warn tone, with an icon and the words.
 * - **Read mode never shows it.** It draws a fixed row of dots, the same for every length
 *   (a length is a hint), and says «password set» to a screen reader. The field's copy
 *   button copies what is SEEN: the dots are not a value, and a hidden input is skipped
 *   (`clipboard.tsx`); revealed, it copies like any text.
 *
 * `autoComplete` tells a password manager what this is: `current-password` fills a login,
 * `new-password` offers to generate one.
 */
export function PasswordInput({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  autoComplete = "current-password",
  revealable = true,
  "aria-label": ariaLabel,
}: ControlProps & {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  /** `current-password` for a login, `new-password` when choosing one. */
  autoComplete?: "current-password" | "new-password" | "off";
  /** The eye that shows it. On by default; `false` where it must never be shown. */
  revealable?: boolean;
}) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const [shown, setShown] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const capsId = `${useId()}-caps`;

  if (useFormMode(mode) === "read") {
    return (
      <ReadValue
        value={
          value === "" ? null : (
            <>
              <span aria-hidden data-copy-skip="" className="tracking-widest">
                ••••••••
              </span>
              <span className="sr-only">{copy.field.secretSet}</span>
            </>
          )
        }
      />
    );
  }

  const readCaps = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <AriaTextField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
        value={value}
        onChange={(next) => onChange?.(next)}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full min-w-0"
      >
        <FieldGroup isInvalid={invalid} isDisabled={disabled}>
          <Input
            aria-describedby={
              [describedBy, capsLock ? capsId : null].filter(Boolean).join(" ") || undefined
            }
            placeholder={placeholder}
            spellCheck={false}
            onKeyDown={readCaps}
            onKeyUp={readCaps}
            onBlur={() => setCapsLock(false)}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed"
          />
          {revealable ? (
            <FieldButton
              aria-label={shown ? copy.field.hideSecret : copy.field.showSecret}
              isDisabled={disabled}
              onPress={() => setShown((now) => !now)}
              className="mr-1"
            >
              {shown ? (
                <EyeOff aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
              ) : (
                <Eye aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
              )}
            </FieldButton>
          ) : null}
        </FieldGroup>
      </AriaTextField>
      {capsLock ? (
        <p id={capsId} className="flex items-center gap-1.5 text-micro text-warn">
          <TriangleAlert
            aria-hidden
            className="size-(--size-icon-sm) shrink-0"
            strokeWidth={2}
          />
          {copy.field.capsLock}
        </p>
      ) : null}
    </div>
  );
}
