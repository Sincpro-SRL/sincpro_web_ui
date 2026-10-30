"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Check, Minus } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Switch as AriaSwitch } from "react-aria-components";

/**
 * On or off, and it takes effect NOW: "send the invoice by email", "show archived".
 *
 * Context: it is React Aria's — a real input underneath, with the press, hover and keyboard
 * focus of the rest of this family. Its inline label is optional and can be any node: inside
 * a `Field` the field's label already names it, and the children add the sentence that says
 * what "on" means (both are read aloud). It replaced the hand-written `Toggle`: one switch,
 * one component.
 *
 * It is not a checkbox. A check is an answer that waits for the form to be submitted; a
 * switch promises the change already happened. The track is `primary` when on — the
 * system's color for a chosen state — never the gold of the one main action.
 */

const track = tv({
  base: "relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill transition-colors duration-(--duration-quick) forced-color-adjust-none",
  variants: {
    isSelected: {
      false: "bg-line-strong forced-colors:bg-[ButtonBorder]",
      true: "bg-primary forced-colors:bg-[Highlight]",
    },
    isPressed: {
      true: "brightness-95",
    },
    isFocusVisible: {
      true: "outline-2 outline-offset-2 outline-primary forced-colors:outline-[Highlight]",
    },
  },
});

const thumb = tv({
  base: "inline-block size-4 rounded-pill bg-surface shadow-raised transition-transform duration-(--duration-quick) ease-(--ease-out) forced-colors:bg-[ButtonText]",
  variants: {
    isSelected: {
      false: "translate-x-0.5",
      true: "translate-x-4.5",
    },
  },
});

export type SwitchProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** The sentence next to the track — part of the click target. */
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the answer. */
  mode?: FormMode;
};

export function Switch({
  checked,
  onChange,
  children,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  mode,
}: SwitchProps) {
  const { id, labelledBy, describedBy } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
  });
  const textId = useId();
  /* Named by the field AND by its own sentence: «Notificaciones, enviar la factura por
     correo» — either one alone loses half of what the switch does. */
  const named =
    [labelledBy, children === undefined ? undefined : textId]
      .filter((part) => part !== undefined)
      .join(" ") || undefined;

  /* In read mode an off track looks like a disabled one. The answer is drawn as a mark. */
  if (useFormMode(mode) === "read") {
    return (
      <span className="flex min-h-(--size-control-md) items-center gap-1.5 text-meta text-ink">
        {checked ? (
          <Check aria-hidden className="size-(--size-icon-sm) text-good" strokeWidth={2.5} />
        ) : (
          <Minus aria-hidden className="size-(--size-icon-sm) text-muted" strokeWidth={2.5} />
        )}
        {children}
      </span>
    );
  }

  return (
    <AriaSwitch
      id={id}
      aria-labelledby={named}
      aria-describedby={describedBy}
      isSelected={checked}
      onChange={(next) => onChange?.(next)}
      isDisabled={disabled}
      /* The height of a control, so a switch alone in a field lines up with a text input in
         the next column. */
      className="group inline-flex min-h-(--size-control-md) min-w-0 cursor-pointer items-center gap-2.5 text-meta text-ink disabled:cursor-not-allowed disabled:opacity-45"
    >
      {(state) => (
        <>
          <span className={track(state)}>
            <span className={thumb(state)} />
          </span>
          {children === undefined ? null : (
            <span id={textId} className="min-w-0">
              {children}
            </span>
          )}
        </>
      )}
    </AriaSwitch>
  );
}
