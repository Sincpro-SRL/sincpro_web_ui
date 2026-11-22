"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { controlName, useFieldIds } from "@sincpro/web-ui/foundations/form";
import { type FormMode, useFormMode } from "@sincpro/web-ui/foundations/form";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
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
  /** The name when it is NOT inside a `Field` — a toolbar's zoom. Inside a field, the
   *  field's label names it. */
  "aria-label"?: string;
  /** The figure beside the track. Off for a control whose number means nothing — a zoom. */
  output?: boolean;
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
  "aria-label": ariaLabel,
  output = true,
}: SliderProps) {
  const copy = useUiCopy();
  const { id, labelledBy, label, describedBy } = useFieldIds({
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
        /* With the field's words the group is named by them alone: the reference AND the
           words named it twice («Descuento Descuento»). */
        aria-labelledby={label === undefined ? labelledBy : undefined}
        aria-label={label ?? controlName(labelledBy, ariaLabel)}
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
          {/* The thumb is the input a screen reader lands on. React Aria names it by pointing
              at the group, so the group carries the field's words as `aria-label` (the name
              rules do not follow a second reference): a name given here too was read twice,
              and without the words the group was read by its whole text, figure included. */}
          <SliderThumb aria-describedby={describedBy} className={thumb} />
        </SliderTrack>
        {/* A fixed column for the figure, so the track does not change length while the
            number grows from one digit to three under the drag. */}
        {output ? (
          <SliderOutput className="w-14 shrink-0 text-right text-meta text-ink tabular-nums" />
        ) : null}
      </AriaSlider>
    </AriaLocale>
  );
}

export type RangeSliderProps = Omit<SliderProps, "value" | "onChange"> & {
  /** The two ends, low first. */
  value: readonly [number, number];
  onChange?: (next: [number, number]) => void;
  /** Called once when a drag ends — where a list re-queries, not on every pixel. */
  onChangeEnd?: (next: [number, number]) => void;
};

/**
 * A range with two ends: a shop's «precio entre», an ERP's «monto entre», a tolerance band.
 *
 * Context: the `Slider`'s sibling, with the same track, thumbs and figure, so a filter panel
 * reads the same with one or two. Each thumb is its own input and says which end it is
 * («Mínimo», «Máximo») with the field's name — two thumbs both called «Precio» leave a screen
 * reader guessing. The thumbs cannot cross: React Aria keeps the low one below the high one.
 * The figure writes both ends («Bs 50 – Bs 300»), in a wider column than one value's. A list
 * filtered by it should listen to `onChangeEnd`: re-querying on every pixel of a drag is what
 * makes a shop's filter stutter.
 */
export function RangeSlider({
  value,
  onChange,
  onChangeEnd,
  min,
  max,
  step = 1,
  format,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  mode,
  "aria-label": ariaLabel,
  output = true,
}: RangeSliderProps) {
  const copy = useUiCopy();
  const { id, labelledBy, label, describedBy } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
  });
  const name = label ?? controlName(labelledBy, ariaLabel);
  const written = (n: number) => new Intl.NumberFormat(copy.locale, format).format(n);
  if (useFormMode(mode) === "read") {
    return <ReadValue value={`${written(value[0])} – ${written(value[1])}`} />;
  }
  const pair = (next: number | number[]): [number, number] =>
    Array.isArray(next) ? [next[0] ?? min, next[1] ?? max] : [next, next];
  return (
    <AriaLocale>
      <AriaSlider
        id={id}
        aria-labelledby={label === undefined ? labelledBy : undefined}
        aria-label={name}
        aria-describedby={describedBy}
        value={[value[0], value[1]]}
        onChange={(next) => onChange?.(pair(next))}
        onChangeEnd={(next) => onChangeEnd?.(pair(next))}
        minValue={min}
        maxValue={max}
        step={step}
        formatOptions={format}
        isDisabled={disabled}
        data-ui="range-slider"
        className="flex h-(--size-control-md) w-full min-w-0 items-center gap-3 disabled:opacity-45"
      >
        <SliderTrack className="relative flex h-(--size-control-md) min-w-0 flex-1 cursor-pointer items-center disabled:cursor-not-allowed">
          <span className="relative h-1 w-full rounded-pill bg-line-strong forced-colors:bg-[ButtonBorder]">
            <SliderFill className="rounded-pill bg-primary disabled:bg-muted forced-colors:bg-[Highlight]" />
          </span>
          {([0, 1] as const).map((index) => (
            <SliderThumb
              key={index}
              index={index}
              /* Its end, read with the group's name — React Aria puts the thumb's first:
                 «Mínimo, Precio». */
              aria-label={index === 0 ? copy.range.min : copy.range.max}
              aria-describedby={describedBy}
              className={thumb}
            />
          ))}
        </SliderTrack>
        {output ? (
          <SliderOutput className="w-36 shrink-0 text-right text-meta whitespace-nowrap text-ink tabular-nums">
            {({ state }) => `${state.getThumbValueLabel(0)} – ${state.getThumbValueLabel(1)}`}
          </SliderOutput>
        ) : null}
      </AriaSlider>
    </AriaLocale>
  );
}
