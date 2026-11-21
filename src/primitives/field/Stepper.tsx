"use client";

import { controlName } from "@sincpro/web-ui/foundations/controlName";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { buttonClasses } from "@sincpro/web-ui/primitives/button/classes";
import { type ControlProps, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";

export type StepperProps = Omit<ControlProps, "describedBy" | "invalid"> & {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** `lg` for a kiosk or a till — targets a thumb hits; `md` in a line of a form or a cart. */
  size?: "md" | "lg";
  /**
   * At the minimum, «−» becomes «remove» (a bin) and calls this: a cart's line goes from 1 to
   * nothing in the same place, the way a shop's and a kiosk's do. Without it, «−» stops at
   * `min`.
   */
  onRemove?: () => void;
  /** What one unit is called, for the buttons' names: «Quitar un Capuchino». */
  unitLabel?: string;
};

/**
 * A quantity with «−» and «+» — a cart's line, a kiosk's item, the people at a table.
 *
 * Context: `NumberInput` is for typing a number; its small step buttons are for a mouse.
 * On a touch screen a quantity is changed by pressing, not typing: two targets as big as a
 * control, the figure between them in tabular digits so it does not jump. The arrows step it
 * from the keyboard (the group is one stop, a spin button), Home and End go to the limits.
 * With `onRemove`, «−» at the minimum is a bin and takes the line away — no second control.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  size = "md",
  onRemove,
  unitLabel,
  id: ownId,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: StepperProps) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy } = useFieldIds({ id: ownId });
  if (useFormMode(mode) === "read") return <ReadValue value={value} />;
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  const removes = atMin && onRemove !== undefined;
  const clamp = (n: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, n));
  /* «Sumar uno: Capuchino» — the unit after the verb, so a list of steppers is told apart. */
  const named = (verb: string) => (unitLabel === undefined ? verb : `${verb}: ${unitLabel}`);
  const lower = () => (removes ? onRemove() : onChange(clamp(value - step)));
  const raise = () => onChange(clamp(value + step));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const keys: Record<string, () => void> = {
      ArrowUp: raise,
      ArrowRight: raise,
      ArrowDown: () => !atMin && onChange(clamp(value - step)),
      ArrowLeft: () => !atMin && onChange(clamp(value - step)),
      Home: () => onChange(min),
      ...(max === undefined ? {} : { End: () => onChange(max) }),
    };
    const run = keys[event.key];
    if (run === undefined) return;
    event.preventDefault();
    run();
  };

  const button = `${buttonClasses("secondary", size === "lg" ? "lg" : "sm")} aspect-square px-0`;
  return (
    <div
      data-ui="stepper"
      data-size={size}
      className="inline-flex min-w-0 items-center gap-1.5"
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || (atMin && !removes)}
        onClick={lower}
        aria-label={named(removes ? copy.stepper.remove : copy.stepper.decrease)}
        className={button}
      >
        {removes ? (
          <Trash2 aria-hidden className="size-(--size-icon-md)" />
        ) : (
          <Minus aria-hidden className="size-(--size-icon-md)" />
        )}
      </button>
      {/* The figure is the spin button: one tab stop, the arrows step it, a screen reader
          hears the value and its limits. */}
      <div
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        {...(id === undefined ? {} : { id })}
        aria-valuenow={value}
        aria-valuemin={min}
        {...(max === undefined ? {} : { "aria-valuemax": max })}
        {...(labelledBy === undefined
          ? { "aria-label": controlName(undefined, ariaLabel, copy.stepper.label) }
          : { "aria-labelledby": labelledBy })}
        {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className={`min-w-8 rounded-control text-center font-semibold text-ink tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          size === "lg" ? "text-title" : "text-body"
        }`}
      >
        {value}
      </div>
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atMax}
        onClick={raise}
        aria-label={named(copy.stepper.increase)}
        className={button}
      >
        <Plus aria-hidden className="size-(--size-icon-md)" />
      </button>
    </div>
  );
}
