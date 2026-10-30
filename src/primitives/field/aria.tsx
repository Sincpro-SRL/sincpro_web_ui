"use client";

import { composeClasses, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import type { Ref } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  Group,
  type GroupProps,
} from "react-aria-components";

/**
 * The pieces every React Aria control of the system is built from — the box a date field,
 * a combobox or a number field draws, and the small button inside it.
 *
 * Context: they look exactly like `controlClasses()` — same height, border, radius and
 * focus — because a form mixes both kinds of control in one column, and a date field one
 * pixel taller than the text input above it is the first thing an eye catches.
 */
export const fieldGroupStyles = tv({
  extend: focusRing,
  base: "group flex h-(--size-control-md) w-full min-w-0 items-center overflow-hidden rounded-control border bg-surface text-meta text-ink transition-colors duration-(--duration-instant) forced-colors:bg-[Field]",
  variants: {
    isFocusWithin: {
      false: "border-line-strong forced-colors:border-[ButtonBorder]",
      true: "border-primary forced-colors:border-[Highlight]",
    },
    isInvalid: {
      true: "border-danger forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "cursor-not-allowed bg-ground text-muted forced-colors:border-[GrayText]",
    },
  },
});

/** The box of a composite control: a field and its buttons, framed as one input. The `ref`
 *  reaches the box (React 19: a plain prop) — a control that floats a list as wide as the
 *  box, like `TagsField`, measures it. */
export function FieldGroup({ ref, ...props }: GroupProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <Group
      ref={ref}
      {...props}
      className={composeRenderProps(props.className, (className, state) =>
        fieldGroupStyles({ ...state, className }),
      )}
    />
  );
}

const fieldButton = tv({
  extend: focusRing,
  base: "inline-flex shrink-0 items-center justify-center rounded-mark p-1 text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink pressed:bg-ink/10",
  variants: {
    isDisabled: {
      true: "text-line-strong hover:bg-transparent forced-colors:text-[GrayText]",
    },
  },
});

/** The button inside a field: the calendar of a date picker, the arrow of a combobox. */
export function FieldButton(props: AriaButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeRenderProps(props.className, (className, state) =>
        fieldButton({ ...state, className }),
      )}
    />
  );
}

/**
 * One row of a floating list — the options of a `Select`, the suggestions of a `Suggest`.
 *
 * Context: the same row `ComboBox` draws (control height, the `primary` tint on the row the
 * keyboard is on), so every list that drops from a field reads as one kind of thing whatever
 * control opened it.
 */
export const listOptionStyles = tv({
  base: "group flex min-h-(--size-control-md) cursor-default items-center gap-2 rounded-control px-2 py-1 text-meta text-ink outline-0 select-none forced-color-adjust-none",
  variants: {
    isFocused: {
      true: "bg-primary/8 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isPressed: {
      true: "bg-primary/12",
    },
    isDisabled: {
      true: "text-muted opacity-45 forced-colors:text-[GrayText]",
    },
  },
});

/** For a control that only adds to the system's classes. */
export { composeClasses };
