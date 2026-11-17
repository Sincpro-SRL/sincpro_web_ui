"use client";

import { controlName, useFieldIds } from "@sincpro/web-ui/foundations/form";
import { type FormMode, useFormMode } from "@sincpro/web-ui/foundations/form";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { labelOf, type SegmentOption } from "@sincpro/web-ui/primitives/choice/options";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
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

/* On the chrome (the `ThemeSwitcher` at the foot of a sidebar in the brand's colour) the
   control speaks the chrome's palette: a white box on the navy was the mix the surface
   context exists to prevent. The hairline is ink at 25 %, the selection ink at 15 %. */
const group = tv({
  base: "inline-flex w-fit max-w-full min-w-0 shrink-0 items-stretch overflow-hidden rounded-control border forced-colors:border-[ButtonBorder]",
  variants: {
    size: {
      sm: "h-(--size-control-sm)",
      md: "h-(--size-control-md)",
    },
    surface: {
      canvas: "border-line-strong bg-surface",
      chrome: "border-chrome-ink/25 bg-chrome-ink/6",
    },
  },
});

const segment = tv({
  base: "inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 border-l text-meta whitespace-nowrap transition-colors duration-(--duration-instant) outline-0 first:border-l-0 forced-color-adjust-none forced-colors:border-[ButtonBorder]",
  variants: {
    size: {
      sm: "px-2.5",
      md: "px-3.5",
    },
    surface: {
      canvas: "border-line-strong",
      chrome: "border-chrome-ink/25",
    },
    isSelected: {
      false: "",
      true: "forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isFocusVisible: {
      true: "outline-2 -outline-offset-2 outline-primary forced-colors:outline-[Highlight]",
    },
    isDisabled: {
      true: "cursor-not-allowed opacity-45",
    },
  },
  compoundVariants: [
    {
      surface: "canvas",
      isSelected: false,
      class: "bg-surface text-muted hover:bg-ink/5 hover:text-ink pressed:bg-ink/10",
    },
    { surface: "canvas", isSelected: true, class: "bg-ink/8 text-ink" },
    {
      surface: "chrome",
      isSelected: false,
      class:
        "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink pressed:bg-chrome-ink/15",
    },
    { surface: "chrome", isSelected: true, class: "bg-chrome-ink/15 text-chrome-ink" },
    { surface: "chrome", isFocusVisible: true, class: "outline-chrome-link" },
  ],
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
  /** By default it inherits it from the surface that wraps it. */
  surface?: Surface;
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
  surface,
}: SegmentedControlProps) {
  const sup = useSurface(surface);
  /* No `id`: a group of buttons is not something a `<label for>` can point at; the field
     names it through `aria-labelledby`. */
  const { labelledBy, describedBy } = useFieldIds({ describedBy: ownDescribedBy });
  const formMode = useFormMode(mode);
  const inForm = mode !== undefined || labelledBy !== undefined;
  if (inForm && formMode === "read") return <ReadValue value={labelOf(options, value)} />;
  return (
    <ToggleButtonGroup
      aria-label={controlName(labelledBy, ariaLabel)}
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
      className={group({ size, surface: sup })}
    >
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <ToggleButton
            key={o.value}
            id={o.value}
            isDisabled={o.disabled}
            className={(state) => segment({ ...state, size, surface: sup })}
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
