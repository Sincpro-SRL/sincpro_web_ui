import {
  currentCopy,
  currentCopyLocale,
  type UiCopy,
} from "@sincpro/web-ui/foundations/uiCopy";

/**
 * THE FORMATTERS a value is written with — a number (`Numeric`, `Cell`) and a date
 * (`DateValue`) — in the installed locale unless one is passed.
 *
 * Context: they lived beside their components, which carry `"use client"`, and a React
 * Server Components bundler turns every export of a client module into a client reference:
 * `formatCount(1234)` called on the server returned a reference, not «1,234». Here, without
 * the directive, they are functions anywhere. On the server they read the server's installed
 * words (`installCopy`, called in the module of the root layout) — or the locale passed.
 */

/* ── Numbers ─────────────────────────────────────────────────────────── */

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

/** A number written with any `Intl.NumberFormatOptions` — a currency, a percentage, fixed
 *  decimals — in the session locale. The same options `NumberInput` takes, so a value reads
 *  the same in its form and in the cell or the figure that shows it elsewhere. */
export const formatWith = (
  value: number,
  options: Intl.NumberFormatOptions,
  locale = currentCopyLocale(),
) => new Intl.NumberFormat(locale, options).format(value);

/* ── Dates — see `DateValue.tsx` for why the relative stops at a week ── */

function relativeFormat(locale: string) {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
}
/** The day alone, in digits and in the locale's order. Exported for `DateValue`'s `date`
 *  format; not public. */
export function dateFormat(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function timeFormat(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The steps, from finest to coarsest. The first one that fits, wins. */
const STEPS: readonly [ms: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [MINUTE, "minute"],
  [HOUR, "hour"],
  [DAY, "day"],
];

/** Context: `copy` defaults to the installed words — what a caller outside a component has;
 *  a component passes its branch's (read with `useUiCopy`), so a provider reaches the
 *  sentence. */
export function formatRelative(
  when: Date,
  now: Date = new Date(),
  copy: UiCopy = currentCopy(),
): string {
  const locale = copy.locale;
  const delta = when.getTime() - now.getTime();
  const abs = Math.abs(delta);

  if (abs < MINUTE) return copy.time.justNow;
  if (abs > 7 * DAY) return dateFormat(locale).format(when);

  const step = STEPS.find(([ms]) => abs < ms * 60) ?? STEPS[STEPS.length - 1]!;
  const [ms, unit] = step;
  return relativeFormat(locale).format(Math.round(delta / ms), unit);
}

export function formatDateTime(when: Date, locale: string = currentCopyLocale()): string {
  return `${dateFormat(locale).format(when)} ${timeFormat(locale).format(when)}`;
}
