"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { tv } from "@sincpro/web-ui/foundations/variants";
import type { ReactNode } from "react";
import { Meter as AriaMeter } from "react-aria-components";

/**
 * Where a quantity stands against a known range: the credit used, the stock against the
 * capacity of the warehouse, the budget spent.
 *
 * Context: it looks like `ProgressBar` and it is the opposite thing. A progress bar is a
 * TASK advancing toward done — an import, a stock count — and full is good news. A meter is a
 * MEASUREMENT that just is, and full is often the alarm: a credit line at 95 % is a client
 * who cannot buy tomorrow. That is why its color is not a tone the consumer picks but the
 * reading of the value — `good` under 70 %, `warn` from 70 to 90, `danger` above — so the
 * one that needs a look is the red one in a column of thirty. The thresholds move for the
 * measure where full is fine (a warehouse meant to run at 95 %).
 *
 * React Aria writes `role="meter"` and the `aria-value*`; the visible figure is formatted by
 * React Aria in the locale of the copy table (`AriaLocale`), in tabular figures so a column
 * of meters keeps its digits aligned.
 */
const fill = tv({
  base: "block h-full rounded-pill transition-[width] duration-(--duration-panel) ease-(--ease-out) forced-colors:bg-[Highlight]",
  variants: {
    level: {
      good: "bg-good",
      warn: "bg-warn",
      danger: "bg-danger",
    },
  },
});

export type MeterLevel = "good" | "warn" | "danger";

/** Percentages of the range where the color changes. */
export type MeterThresholds = { warn: number; danger: number };

const DEFAULT_THRESHOLDS: MeterThresholds = { warn: 70, danger: 90 };

/** The level of a percentage: under `warn` is good, up to `danger` is warn, above is danger. */
export function meterLevel(
  percentage: number,
  thresholds: MeterThresholds = DEFAULT_THRESHOLDS,
): MeterLevel {
  if (percentage > thresholds.danger) return "danger";
  if (percentage >= thresholds.warn) return "warn";
  return "good";
}

export type MeterProps = {
  /** What is measured: «Crédito usado», «Stock». */
  label: string;
  value: number;
  minValue?: number;
  /** The capacity. 100 by default, so a plain percentage needs nothing else. */
  maxValue?: number;
  /** How the figure is written. Absent: the percentage of the range. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The figure written by hand, when a single formatted number does not say it:
   *  «Bs 42.500 de 50.000». It is also what a screen reader reads. */
  valueLabel?: ReactNode;
  /** Where the color changes, in percent of the range. */
  thresholds?: MeterThresholds;
  /** Off when the figure is already beside it — a cell with its column. */
  showValue?: boolean;
  /** The width of the track. A meter in a table cell is shorter than one in a card. */
  width?: string;
};

export function Meter({
  label,
  value,
  minValue = 0,
  maxValue = 100,
  formatOptions,
  valueLabel,
  thresholds = DEFAULT_THRESHOLDS,
  showValue = true,
  width = "w-64",
}: MeterProps) {
  return (
    <AriaLocale>
      <AriaMeter
        aria-label={label}
        value={value}
        minValue={minValue}
        maxValue={maxValue}
        formatOptions={formatOptions}
        valueLabel={valueLabel}
        className={`flex max-w-full flex-col gap-1.5 ${width}`}
      >
        {({ percentage, valueText }) => {
          const level = meterLevel(percentage, thresholds);
          return (
            <>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-meta text-ink">{label}</span>
                {showValue ? (
                  <span
                    data-level={level}
                    className={`shrink-0 text-meta tabular-nums ${level === "danger" ? "font-medium text-danger" : "text-muted"}`}
                  >
                    {valueText}
                  </span>
                ) : null}
              </span>
              <span className="block h-(--size-track) overflow-hidden rounded-pill bg-ink/10 forced-colors:outline forced-colors:outline-[ButtonBorder]">
                <span
                  data-level={level}
                  className={fill({ level })}
                  style={{ width: `${percentage}%` }}
                />
              </span>
            </>
          );
        }}
      </AriaMeter>
    </AriaLocale>
  );
}
