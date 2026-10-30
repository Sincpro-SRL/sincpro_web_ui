"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import { labelOf, type SegmentOption } from "@sincpro/web-ui/primitives/choice/options";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

/**
 * Switching what is looked at: the period of a report ("Día · Semana · Mes"), the grouping of
 * a board. One of a few, always one, and the change is immediate.
 *
 * Context: it draws exactly what the list's view switcher (`ViewSwitcher`) draws — one
 * bordered box split by hairlines, the chosen segment tinted with ink, the others muted — so
 * every "which view" control of a screen reads as the same kind of thing. It adds a label
 * next to the icon, because a period has no icon that says "Semana".
 *
 * It is a VIEW control first, so it ignores the form's read mode — a report in a record that
 * is being looked at still has to switch period. Written inside a `Field` it is a form answer
 * instead (the kind of a contact: Persona · Empresa), and then it follows the form: in read
 * mode it draws the chosen label.
 */

const group = tv({
  base: "inline-flex w-fit max-w-full min-w-0 shrink-0 items-stretch overflow-hidden rounded-control border border-line-strong bg-surface forced-colors:border-[ButtonBorder]",
  variants: {
    size: {
      sm: "h-(--size-control-sm)",
      md: "h-(--size-control-md)",
    },
  },
});

const segment = tv({
  base: "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 border-l border-line-strong text-meta whitespace-nowrap transition-colors duration-(--duration-instant) outline-0 first:border-l-0 forced-color-adjust-none forced-colors:border-[ButtonBorder]",
  variants: {
    size: {
      sm: "px-2.5",
      md: "px-3.5",
    },
    isSelected: {
      false: "bg-surface text-muted hover:bg-ink/5 hover:text-ink pressed:bg-ink/10",
      true: "bg-ink/8 text-ink forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isFocusVisible: {
      true: "outline-2 -outline-offset-2 outline-primary forced-colors:outline-[Highlight]",
    },
    isDisabled: {
      true: "cursor-not-allowed opacity-45",
    },
  },
});

export type SegmentedControlProps = {
  value: string;
  onChange?: (next: string) => void;
  options: readonly SegmentOption[];
  /** `sm` in a toolbar or a list bar, next to the view switcher; `md` in a form row. */
  size?: "sm" | "md";
  disabled?: boolean;
  describedBy?: string;
  /** Forces the mode. By default it follows the form only when written inside a `Field`. */
  mode?: FormMode;
  /** The name of the group when it is not inside a `Field` — "Período". */
  "aria-label"?: string;
};

export function SegmentedControl({
  value,
  onChange,
  options,
  size = "md",
  disabled = false,
  describedBy: ownDescribedBy,
  mode,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  /* No `id`: a group of buttons is not something a `<label for>` can point at; the field
     names it through `aria-labelledby`. */
  const { labelledBy, describedBy } = useFieldIds({ describedBy: ownDescribedBy });
  const formMode = useFormMode(mode);
  const inForm = mode !== undefined || labelledBy !== undefined;
  if (inForm && formMode === "read") return <ReadValue value={labelOf(options, value)} />;
  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      selectionMode="single"
      /* Always one: a period switcher with nothing pressed shows a report of no period. */
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [next] = keys;
        if (next !== undefined && String(next) !== value) onChange?.(String(next));
      }}
      isDisabled={disabled}
      className={group({ size })}
    >
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <ToggleButton
            key={o.value}
            id={o.value}
            isDisabled={o.disabled}
            className={(state) => segment({ ...state, size })}
          >
            {Icon === undefined ? null : (
              <Icon aria-hidden className="size-(--size-icon-md) shrink-0" strokeWidth={2} />
            )}
            {o.label}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
