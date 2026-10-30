"use client";

import { currentCopyLocale, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { ReactNode } from "react";

/**
 * Context: the mono/sans rule decides everything in here. The label goes in
 * PROPORTIONAL —«orígenes», «mediana» are words, not data— and the value in
 * tabular monospace, which is what makes four of these in a row keep their
 * digits in a column.
 *
 * Formats follow the session locale, not a baked-in Spanish `Intl`.
 */

function integerFormat(locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
}
function decimalFormat(locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
}
/** Four decimals and not two for distances — they live near zero
 *  (`0.0696`, `0.0149`) and with two they turn into `0.07` and `0.01`, which is
 *  losing exactly the part that tells one column from another. */
function distanceFormat(locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export const formatCount = (value: number, locale = currentCopyLocale()) =>
  integerFormat(locale).format(value);
export const formatNumber = (value: number, locale = currentCopyLocale()) =>
  decimalFormat(locale).format(value);
export const formatDistance = (value: number, locale = currentCopyLocale()) =>
  distanceFormat(locale).format(value);

/** A label with its number, for the glance at the top of a view. */
export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-lead tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/**
 * A number with its unit: right aligned, with tabular figures.
 *
 * Context: this is the detail a table's look depends on. Tabular figures give every digit
 * the same width, so `32.561` lines up across rows exactly as it did in monospace — without
 * making a business report look like a terminal. The unit stays in the same face so the
 * digits keep their column.
 */
export function Numeric({
  value,
  unit,
  format = "integer",
}: {
  value: number;
  unit?: string;
  format?: "integer" | "decimal" | "distance";
}) {
  const text =
    format === "distance"
      ? formatDistance(value)
      : format === "decimal"
        ? formatNumber(value)
        : formatCount(value);

  return (
    <span className="block text-right text-body tabular-nums whitespace-nowrap text-ink">
      <span className="tabular-nums">{text}</span>
      {unit === undefined ? null : <span className="ml-1 text-muted">{unit}</span>}
    </span>
  );
}

/**
 * A real bar, never a spinner.
 *
 * Context: a spinner says «wait» and doesn't say how much; a bar says both
 * things.
 *
 * ── Why the fill is FLAT and the gradient is asked for ──────────────
 *
 * The bar always lived with `bar-brand`, the blue→gold gradient. At 3 px and at
 * 62 % that doesn't read as a brand: it reads as a blue bar with a broken tip.
 * A gradient needs length to be a gradient, and a bar inside a list row doesn't
 * have it.
 *
 * Now the fill is a flat tone —and the tone SAYS something: `good` finished,
 * `warn` is running slow, `bad` failed— and the gradient is asked for with
 * `tone="brand"`, which is the long bar of a live import: there it does have room
 * to be read.
 *
 * And it got fatter, from 3 px to 6 px. At 3 px it isn't a bar, it's a line: it
 * can't be told apart from a separator and the fill isn't visible unless it goes
 * past 20 %.
 */
export function ProgressBar({
  value,
  label,
  width = "w-24",
  tone = "brand",
  /** The percentage next to it. It is turned off when the bar lives inside
   *  something that already says the figure —a cell with its column— and it
   *  would only mean reading it twice. */
  showValue = true,
}: {
  /** 0 to 100. */
  value: number;
  label: string;
  /** The activity bar wants to be longer than a list row; there is no reason for
   *  it to be the same number on both sides. */
  width?: string;
  tone?: Tone | "brand";
  showValue?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = tone === "brand" ? "bar-brand" : FILL[tone];

  return (
    <span className="flex items-center gap-2">
      <span
        className={`h-(--size-track) overflow-hidden rounded-pill bg-ink/10 ${width}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span
          className={`block h-full rounded-pill transition-[width] duration-(--duration-panel) ease-out ${fill}`}
          style={{ width: `${clamped}%` }}
        />
      </span>
      {showValue ? (
        <span className="text-meta tabular-nums text-muted">{clamped}%</span>
      ) : null}
    </span>
  );
}

const FILL: Record<Tone, string> = {
  neutral: "bg-muted",
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  accent: "bg-accent",
};

/**
 * The content of a data cell, with what the system decides and the view does not.
 *
 * Context: `""` is a TRULY EMPTY cell and not a missing datum — they are two
 * different things and the engine tells them apart, so the interface does too. A
 * missing one is passed as `null` and drawn with its mark; an empty string is a
 * value somebody typed, and it gets one too.
 *
 * It used to live in the application, where it couldn't serve the other five
 * tables.
 */
export function Cell({
  value,
  /** From how many characters it gets truncated. A 64 character identifier
   *  breaks the width of the whole table for a column nobody reads in full. */
  max = 48,
}: {
  value: string | number | null | undefined;
  max?: number;
}) {
  const copy = useUiCopy();
  if (value === null || value === undefined) {
    return (
      <span className="text-muted italic" title={copy.cell.missing}>
        {copy.cell.missing}
      </span>
    );
  }

  if (typeof value === "number") return <Numeric value={value} format="decimal" />;

  if (value === "") {
    return (
      <span className="text-line-strong" title={copy.cell.empty}>
        ·
      </span>
    );
  }

  if (value.length <= max) return <>{value}</>;

  /* It is truncated with the whole value in the `title`: whoever needs the full
     id has it a hover away, and whoever is reading the column next to it doesn't
     pay for its width. */
  return (
    <span title={value} className="truncate">
      {value.slice(0, max)}…
    </span>
  );
}
