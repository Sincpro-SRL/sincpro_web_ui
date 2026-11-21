"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds } from "@sincpro/web-ui/foundations/form";
import { buttonClasses } from "@sincpro/web-ui/primitives/button/classes";
import {
  applyKey,
  keyOfKeyboard,
  type KeypadKey,
} from "@sincpro/web-ui/primitives/field/keypadKeys";
import { Delete } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

export type KeypadProps = {
  /** The number being typed, in the machine's form: «1250.5». */
  value: string;
  onChange: (next: string) => void;
  /** Decimals the number takes — `0` for units (no decimal key), `2` for money. */
  decimals?: number;
  /** The key beside the zero: the decimal point (default, unless `decimals` is 0), «00» for a
   *  till that types prices in cents, or «±» for an amount that can be negative. */
  extra?: "decimal" | "double-zero" | "sign";
  /** `lg` for a till or a kiosk — keys a thumb hits without looking; `md` beside a form. */
  size?: "md" | "lg";
  /** A wide key under the pad: «Cantidad», «Cobrar» — what the number is FOR. */
  children?: ReactNode;
  /**
   * The pad's screen, on top, as a calculator has: what is being typed, big and right-aligned,
   * and what it is («Capuchino · Cant.»). Without it the screen is the application's. `value`
   * is already written for the person (`«12,50»`), the pad does not format it.
   */
  screen?: { label?: ReactNode; value: ReactNode };
  /** The pad's accessible name, when no `Field` names it. */
  "aria-label"?: string;
  id?: string;
  disabled?: boolean;
};

const ROWS: readonly (readonly KeypadKey[])[] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

/**
 * The on-screen number pad of a till, a kiosk, a scale — the calculator's layout (7 8 9 on
 * top), keys a thumb hits.
 *
 * Context: a cashier types quantities and prices all day on a touch screen with no keyboard,
 * and the phone's numeric keyboard covers half the ticket. The pad is a CONTROL: it edits a
 * value (`value` / `onChange`, the machine's «1250.5»), and what it is for — quantity,
 * discount, price — is the screen's, as a `SegmentedControl` over it. The rules of each key
 * are pure (`applyKey`), the same ones a physical keyboard follows here: with the pad
 * focused, digits, «,» or «.», Backspace, Delete and «-» do what their key does.
 *
 * The decimal key shows the person's separator («,» in Bolivia) but writes «.»: the screen
 * formats, the value travels in one form.
 */
export function Keypad({
  value,
  onChange,
  decimals,
  extra = decimals === 0 ? "double-zero" : "decimal",
  size = "lg",
  children,
  "aria-label": ariaLabel,
  id: ownId,
  disabled = false,
  screen,
}: KeypadProps) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy } = useFieldIds({ id: ownId });
  const rules = decimals === undefined ? {} : { decimals };
  const press = (key: KeypadKey) => onChange(applyKey(value, key, rules));
  const separator =
    new Intl.NumberFormat(copy.locale).formatToParts(1.5).find((p) => p.type === "decimal")
      ?.value ?? ".";

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = keyOfKeyboard(event.key);
    if (key === null) return;
    if (key === "decimal" && extra !== "decimal") return;
    if (key === "sign" && extra !== "sign") return;
    event.preventDefault();
    press(key);
  };

  const keyClass = `${buttonClasses("secondary", size)} w-full font-medium tabular-nums ${
    size === "lg" ? "h-14 text-title" : "text-lead"
  }`;
  const key = (k: KeypadKey, face: ReactNode, label?: string) => (
    <button
      key={k}
      type="button"
      disabled={disabled}
      onClick={() => press(k)}
      {...(label === undefined ? {} : { "aria-label": label })}
      data-ui="keypad.key"
      className={keyClass}
    >
      {face}
    </button>
  );

  const extraKey =
    extra === "decimal"
      ? key("decimal", separator, copy.keypad.decimal)
      : extra === "sign"
        ? key("sign", "±", copy.keypad.sign)
        : key("00", "00");

  return (
    /* A group, not a grid: the keys are reached by Tab in reading order, and the group itself
       takes the physical keyboard while focus is inside it. */
    <div
      role="group"
      data-ui="keypad"
      data-size={size}
      {...(id === undefined ? {} : { id })}
      {...(labelledBy === undefined
        ? { "aria-label": ariaLabel ?? copy.keypad.label }
        : { "aria-labelledby": labelledBy })}
      {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
      onKeyDown={onKeyDown}
      className="grid w-full min-w-0 grid-cols-3 gap-1.5"
    >
      {screen === undefined ? null : (
        /* Live, so a screen reader hears the number as it is typed. */
        <div
          data-ui="keypad.screen"
          aria-live="polite"
          className="col-span-3 flex min-w-0 flex-col items-end rounded-control border border-line bg-ink/4 px-3 py-2"
        >
          {screen.label === undefined ? null : (
            <span className="min-w-0 max-w-full truncate text-micro text-muted">
              {screen.label}
            </span>
          )}
          <span className="text-display leading-none font-semibold text-ink tabular-nums">
            {screen.value}
          </span>
        </div>
      )}
      {ROWS.flat().map((k) => key(k, k))}
      {extraKey}
      {key("0", "0")}
      {key(
        "backspace",
        <Delete aria-hidden className="size-(--size-icon-lg)" />,
        copy.keypad.backspace,
      )}
      {children === undefined ? null : (
        <div className="col-span-3 flex min-w-0">{children}</div>
      )}
    </div>
  );
}
