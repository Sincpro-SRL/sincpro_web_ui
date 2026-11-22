import type { LucideIcon } from "lucide-react";

/**
 * One answer of a choice: what is stored (`value`) and what is read (`label`).
 *
 * Context: a plain object and not React Aria's `Key` + children, because the options of an
 * ERP form come from data — the currencies of the company, the payment methods configured —
 * and the value goes back to the backend as the same string it came in with.
 */
export interface ChoiceOption {
  value: string;
  label: string;
  /** A second, muted line: what the option IS (a tax id, a city), not a second name. */
  description?: string;
  disabled?: boolean;
  /** Drawn on the option when the choice is shown as cards (`RadioGroup look="cards"`): the
   *  card of «Efectivo», «QR», «Tarjeta». Beside the label, never instead of it. */
  icon?: LucideIcon;
  /** The colour itself, for a variant drawn as a swatch (`RadioGroup look="swatches"`): any CSS
   *  colour the application has for it («#c8a27a», «oklch(…)»). Without it the swatch is the
   *  label in a box — a size, a capacity. The colour is never alone: its label names it. */
  swatch?: string;
}

/** One segment of a `SegmentedControl`. The icon goes before the label, never instead of it. */
export interface SegmentOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Shown but not choosable — a period the report does not have yet. */
  disabled?: boolean;
}

/** The label of the option whose value is `value`, for read mode. */
export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null,
): string | null {
  if (value === null) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
