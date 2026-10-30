"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import {
  Slider as AriaSlider,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";

/**
 * A number in a range, where the position says as much as the figure: a discount, a
 * tolerance, a probability.
 *
 * Context: the figure is always written next to the track — a slider alone answers "about
 * there", and an invoice needs "12 %". It is formatted by React Aria in the locale of the copy
 * table (`AriaLocale`), with the consumer's `Intl.NumberFormatOptions`: `{ style: "percent" }`
 * expects a fraction (0.12), a plain number with a unit is the consumer's `unit` style.
 *
 * When the exact figure matters more than the position — an amount, a quantity — the control
 * is `NumberInput`: dragging to 1 250,00 is a game nobody wins.
 */

const thumb = tv({
  base: "top-1/2 size-4 rounded-pill border-2 border-primary bg-surface shadow-raised transition-colors duration-(--duration-instant) forced-color-adjust-none forced-colors:border-[Highlight]",
  variants: {
    isDragging: {
      true: "bg-primary",
    },
    isFocusVisible: {
      true: "outline-2 outline-offset-2 outline-primary forced-colors:outline-[Highlight]",
    },
    isDisabled: {
      true: "border-line-strong forced-colors:border-[GrayText]",
    },
  },
});

export type SliderProps = {
  value: number;
  onChange?: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /** How the figure is written, in the copy's locale. `{ style: "percent" }` takes 0–1. */
  format?: Intl.NumberFormatOptions;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the figure. */
  mode?: FormMode;
};

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  mode,
}: SliderProps) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
  });
  if (useFormMode(mode) === "read") {
    return <ReadValue value={new Intl.NumberFormat(copy.locale, format).format(value)} />;
  }
  return (
    <AriaLocale>
      <AriaSlider
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        value={value}
        onChange={(next) => onChange?.(next)}
        minValue={min}
        maxValue={max}
        step={step}
        formatOptions={format}
        isDisabled={disabled}
        className="flex h-(--size-control-md) w-full min-w-0 items-center gap-3 disabled:opacity-45"
      >
        {/* The track is as tall as a control — the whole height is the click target — and
            the rail is the thin line drawn in its middle. React Aria sizes the fill to the
            height of its parent, so the fill lives inside the rail. */}
        <SliderTrack className="relative flex h-(--size-control-md) min-w-0 flex-1 cursor-pointer items-center disabled:cursor-not-allowed">
          <span className="relative h-1 w-full rounded-pill bg-line-strong forced-colors:bg-[ButtonBorder]">
            <SliderFill className="rounded-pill bg-primary disabled:bg-muted forced-colors:bg-[Highlight]" />
          </span>
          {/* The thumb is the input a screen reader lands on, and React Aria names it after
              a `<Label>` this system does not render — the field's label goes on it too. */}
          <SliderThumb
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={thumb}
          />
        </SliderTrack>
        {/* A fixed column for the figure, so the track does not change length while the
            number grows from one digit to three under the drag. */}
        <SliderOutput className="w-14 shrink-0 text-right text-meta text-ink tabular-nums" />
      </AriaSlider>
    </AriaLocale>
  );
}
