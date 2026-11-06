import { monthName as calendarMonthName } from "@sincpro/web-ui/foundations/calendar";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/copy";

/**
 * THE DATE FILTER, the way Odoo does it: months, quarters and years that
 * combine.
 *
 *     Fecha de orden
 *       ─ septiembre        ← the three most recent months, by name
 *       ─ agosto
 *       ─ julio
 *       ────────────
 *       ─ Q1  Q2  Q3  Q4    ← the four quarters
 *       ────────────
 *       ─ 2026  2025  2024  ← the three most recent years
 *
 * ── Why they combine and are not chosen ─────────────────────────────
 *
 * Because that is how the questions people have get answered. «Septiembre» and
 * «agosto» together are the two months: options on the SAME row are added with OR.
 * But «septiembre» and «2025» is not «septiembre or 2025», it is **September
 * 2025**: different rows are crossed with AND. A single-period selector cannot
 * say either.
 *
 * With no year ticked, the months and quarters are those of the current year — which
 * is what somebody means when they tick «septiembre» and nothing else.
 *
 * ── What is saved is the INTENT ─────────────────────────────────────
 *
 * «Los últimos tres meses» saved in September has to answer something else
 * in December. That is why what travels is `month:9`, not `2026-09-01`, and the
 * interval is computed every time it is read. A favourite with absolute dates
 * lies from the next day on.
 */

/** A ticked period. The year is separate and so is not here: it is the other axis. */
export type DatePeriod =
  | { kind: "month"; month: number }
  | { kind: "quarter"; quarter: 1 | 2 | 3 | 4 }
  | { kind: "year"; year: number };

/** A HALF-OPEN interval `[from, to)`. The end stays OUTSIDE, and it is no
 *  detail: with an inclusive `between`, a row saved at 00:00:00 on the
 *  first of the next month falls in two contiguous periods and is counted twice. */
export type DateRange = { from: Date; to: Date };

export function periodId(period: DatePeriod): string {
  if (period.kind === "month") return `month:${period.month}`;
  if (period.kind === "quarter") return `quarter:${period.quarter}`;
  return `year:${period.year}`;
}

export function readPeriodId(id: string): DatePeriod | null {
  const [kind, raw] = id.split(":");
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  if (kind === "month")
    return value >= 1 && value <= 12 ? { kind: "month", month: value } : null;
  if (kind === "quarter") {
    return value >= 1 && value <= 4
      ? { kind: "quarter", quarter: value as 1 | 2 | 3 | 4 }
      : null;
  }
  if (kind === "year") return { kind: "year", year: value };
  return null;
}

/** The three most recent months, from the current one backwards. Each with the year it
 *  belongs to, because in January the previous three are from two years. */
export function recentMonths(
  now: Date = new Date(),
  howMany = 3,
): {
  month: number;
  year: number;
}[] {
  const out: { month: number; year: number }[] = [];
  for (let back = 0; back < howMany; back += 1) {
    const when = new Date(now.getFullYear(), now.getMonth() - back, 1);
    out.push({ month: when.getMonth() + 1, year: when.getFullYear() });
  }
  return out;
}

/** The most recent years, from the current one backwards. */
export function recentYears(now: Date = new Date(), howMany = 3): number[] {
  return Array.from({ length: howMany }, (_, back) => now.getFullYear() - back);
}

const QUARTERS: readonly (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

/**
 * The options offered, in three rows and in this order: months,
 * quarters, years. It is Odoo's order and the question's — from fine to
 * coarse, because «este mes» is asked for far more often than «2024».
 */
export function datePeriodOptions(
  now: Date = new Date(),
  /** What a month is called. Without this, as the system calendar calls it in
   *  the active language — a hand-written list of twelve months is a list that
   *  has to be rewritten for the next language. */
  monthName: (month: number) => string = calendarMonthName,
): {
  months: { id: string; label: string }[];
  quarters: { id: string; label: string }[];
  years: { id: string; label: string }[];
} {
  return {
    months: recentMonths(now).map(({ month }) => ({
      id: periodId({ kind: "month", month }),
      label: monthName(month),
    })),
    quarters: QUARTERS.map((quarter) => ({
      id: periodId({ kind: "quarter", quarter }),
      label: fillCopy(currentCopy().calendar.quarter, { n: quarter }),
    })),
    years: recentYears(now).map((year) => ({
      id: periodId({ kind: "year", year }),
      label: String(year),
    })),
  };
}

/** A month of a year, as a half-open interval. */
function monthRange(year: number, month: number): DateRange {
  return { from: new Date(year, month - 1, 1), to: new Date(year, month, 1) };
}

function quarterRange(year: number, quarter: number): DateRange {
  const first = (quarter - 1) * 3;
  return { from: new Date(year, first, 1), to: new Date(year, first + 3, 1) };
}

function yearRange(year: number): DateRange {
  return { from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) };
}

/**
 * The intervals that a set of ticked periods represents.
 *
 * It returns SEVERAL and not one: «septiembre y julio» are two stretches with a hole
 * in the middle, and flattening them into a single `[julio, octubre)` would bring in August, which
 * nobody asked for. Whoever uses them crosses them with OR.
 *
 * The rule is Odoo's: years multiply, months and quarters cut.
 * With no years ticked the current year is used; with no months or quarters, the whole
 * year.
 */
export function resolvePeriods(
  periods: readonly DatePeriod[],
  now: Date = new Date(),
): DateRange[] {
  if (periods.length === 0) return [];

  const years = periods.filter((one) => one.kind === "year").map((one) => one.year);
  const months = periods.filter((one) => one.kind === "month").map((one) => one.month);
  const quarters = periods.filter((one) => one.kind === "quarter").map((one) => one.quarter);

  /* With no year ticked, the current year. It is what somebody means when they
     tick «septiembre» and nothing else — and not «every September in
     history», which nobody would know how to write anyway. */
  const overYears = years.length > 0 ? years : [now.getFullYear()];

  if (months.length === 0 && quarters.length === 0) {
    return overYears.map(yearRange);
  }

  return overYears.flatMap((year) => [
    ...months.map((month) => monthRange(year, month)),
    ...quarters.map((quarter) => quarterRange(year, quarter)),
  ]);
}

/**
 * A date's cut as a GROUP of the filters panel: collapsible, with its
 * name, and the three rows separated by a line.
 *
 * It is a function and not a component because the panel's filters are data —the
 * panel draws, the domain declares—, and so a date needs neither a separate slot
 * nor a path of its own inside `SearchBar`.
 */
export function datePeriodGroup(options: {
  /** What the field is called: «Fecha de pedido». */
  label: string;
  /** The ticked ids, from `periodId`. */
  active: readonly string[];
  now?: Date;
  /** What a month is called, when the product says it in other words. Without
   *  this, as the system calendar calls it in the active language. */
  monthName?: (month: number) => string;
}): {
  label: string;
  collapsible: true;
  options: { id: string; label: string; checked: boolean; divider?: boolean }[];
} {
  /* What arrived is FORWARDED, with no default of its own: with `?? String` here, the filters
     panel drew «9 · 8 · 7» instead of «Septiembre · Agosto · Julio»
     —this `String` overrode the calendar's default— and nobody saw why. A
     default repeated in two places is a default that says two things. */
  const { months, quarters, years } = datePeriodOptions(
    options.now ?? new Date(),
    options.monthName,
  );
  const mark = (one: { id: string; label: string }, divider?: boolean) => ({
    ...one,
    checked: options.active.includes(one.id),
    ...(divider === true ? { divider: true } : {}),
  });
  return {
    label: options.label,
    collapsible: true,
    options: [
      ...months.map((one) => mark(one)),
      ...quarters.map((one, index) => mark(one, index === 0)),
      ...years.map((one, index) => mark(one, index === 0)),
    ],
  };
}
