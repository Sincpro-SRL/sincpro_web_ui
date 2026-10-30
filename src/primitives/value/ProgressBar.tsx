"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { cn } from "@sincpro/web-ui/foundations/variants";
import type { ReactNode } from "react";
import { ProgressBar as AriaProgressBar } from "react-aria-components";

/**
 * A task under way: the import of 4.000 rows, the closing of the month, a file going up. A
 * real bar, never a spinner — a spinner says «wait» and does not say how much; a bar says both.
 *
 * Context: it looks like `Meter` and it is the opposite thing. A meter is a QUANTITY in a
 * range that just is — the stock against the warehouse, the credit used — and full is often
 * the alarm. A progress bar is something HAPPENING, moving toward done, and full is the good
 * news. That is why their color comes from different places: the meter's is the reading of
 * its value; this one's is the state of the task, said by whoever runs it — `good` finished,
 * `warn` is running slow, `bad` failed — and `brand` by default, the blue→gold gradient of
 * the long bar of a live import. (At 6 px and 62 % in a list row a gradient reads as a
 * broken bar, so a short bar there asks for a flat tone.)
 *
 * ── Determinate and indeterminate ─────────────────────────────────────
 *
 * With a `value` it fills to it, and the figure next to it is in tabular figures so a column
 * of bars keeps its digits aligned. Without one the task is under way and cannot say how far
 * — the server has not counted the rows yet — and the bar SAYS so instead of inventing a
 * number: a segment sweeps along the track and no figure is drawn. That sweep is the only
 * loop of the system (`--animate-progress-sweep`), and it runs behind `motion-safe:`: with
 * `prefers-reduced-motion` the segment stands still, the whole track faded — «busy» without
 * movement, and without a fill that could be read as a percentage.
 *
 * React Aria writes `role="progressbar"` and the `aria-value*` — no `aria-valuenow` while it
 * is indeterminate, which is how a screen reader tells the two apart — and formats the figure
 * in the copy table's locale (`AriaLocale`).
 *
 * The track is the system's `--size-track`: at 3 px it was a line that could not be told
 * from a separator; two bars of different thickness on one screen read as two things.
 */
const FILL: Record<Tone, string> = {
  neutral: "bg-muted",
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  accent: "bg-accent",
};

export type ProgressBarProps = {
  /** Where the task is, from `minValue` to `maxValue`. Absent = under way and it cannot say
   *  how far: the bar sweeps and draws no figure. */
  value?: number;
  /** What is running: «Importación de clientes», «Cierre de octubre». Always its accessible
   *  name; drawn above the bar only with `showLabel`. */
  label: string;
  minValue?: number;
  /** The size of the task — 4000 for an import of 4.000 rows. 100 by default, so a plain
   *  percentage needs nothing else. */
  maxValue?: number;
  /** How the figure is written. Absent: the percentage of the task. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The figure written by hand, when a percentage does not say it: «1.240 de 4.000 filas».
   *  It is also what a screen reader reads. Indeterminate, it is the only figure drawn —
   *  «leyendo el archivo…». */
  valueLabel?: ReactNode;
  /** Draws the label above the bar: the bar a screen is about (an import, the closing of
   *  the month). Off in a cell or a row, where the column or the line already says it. */
  showLabel?: boolean;
  /** Off when the figure is already beside it — a cell with its column. */
  showValue?: boolean;
  /** The width of the track (inline) or of the whole piece (with `showLabel`). A bar in a
   *  list row is shorter than the bar of an import. */
  width?: string;
  /** The state of the task. `brand` — the gradient — is the long bar of a live process. */
  tone?: Tone | "brand";
};

export function ProgressBar({
  value,
  label,
  minValue = 0,
  maxValue = 100,
  formatOptions,
  valueLabel,
  showLabel = false,
  showValue = true,
  width = "w-24",
  tone = "brand",
}: ProgressBarProps) {
  const fill = tone === "brand" ? "bar-brand" : FILL[tone];

  return (
    <AriaLocale>
      <AriaProgressBar
        aria-label={label}
        {...(value === undefined ? {} : { value })}
        isIndeterminate={value === undefined}
        minValue={minValue}
        maxValue={maxValue}
        formatOptions={formatOptions}
        valueLabel={valueLabel}
        className={
          showLabel
            ? `flex max-w-full flex-col gap-1.5 ${width}`
            : "flex min-w-0 items-center gap-2"
        }
      >
        {({ percentage, valueText, isIndeterminate }) => {
          const figure =
            showValue && valueText !== undefined ? (
              <span className="shrink-0 text-meta tabular-nums text-muted">{valueText}</span>
            ) : null;
          const track = (
            <span
              className={cn(
                "relative block h-(--size-track) overflow-hidden rounded-pill bg-ink/10 forced-colors:outline forced-colors:outline-[ButtonBorder]",
                showLabel ? "w-full" : width,
              )}
            >
              {isIndeterminate ? (
                <span
                  data-indeterminate
                  className={cn(
                    "absolute inset-y-0 left-0 w-2/5 rounded-pill forced-colors:bg-[Highlight]",
                    "motion-safe:animate-progress-sweep motion-reduce:w-full motion-reduce:opacity-40",
                    fill,
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "block h-full rounded-pill transition-[width] duration-(--duration-panel) ease-(--ease-out) forced-colors:bg-[Highlight]",
                    fill,
                  )}
                  style={{ width: `${percentage ?? 0}%` }}
                />
              )}
            </span>
          );
          return showLabel ? (
            <>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-meta text-ink">{label}</span>
                {figure}
              </span>
              {track}
            </>
          ) : (
            <>
              {track}
              {figure}
            </>
          );
        }}
      </AriaProgressBar>
    </AriaLocale>
  );
}
