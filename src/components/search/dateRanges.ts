import type { GroupGrain } from "@sincpro/web-ui/foundations/grouping";

/**
 * DATE CUTS, in RELATIVE terms.
 *
 * Context: a date filter written in absolute terms —«from 2026-06-01»— is an
 * answer that ages. Somebody saves «los últimos tres meses» as a favourite
 * in September and in December it still shows June, July and August: the
 * filter says what it said, not what it meant. What has to be saved is the
 * INTENT —«los últimos 3 meses»— and resolve it every time it is read.
 *
 * **And that is why the UI resolves it.** There is no need to ask anyone when
 * last quarter starts: it is calendar arithmetic on the clock of whoever
 * looks. Sending the server «relative: last 3 months» and letting it decide
 * adds a round trip and a second definition of «month» — and the server's is in
 * its time zone, not the person's.
 *
 * What comes out of here is a HALF-OPEN interval `[from, to)`. The end
 * stays OUTSIDE, and it is no detail: with an inclusive `between`, a row saved
 * at 00:00:00 on the first of the next month falls in both cuts, and two contiguous
 * filters return the same row.
 */

export type DateRange = {
  /** Desde, inclusive. */
  from: Date;
  /** Hasta, EXCLUSIVE. */
  to: Date;
};

/**
 * A relative cut, as it is saved: a unit and how many.
 *
 * `last` counts backwards from now including the current period; `prior`
 * counts the COMPLETE previous periods, without the one that is running. They are
 * different and the difference matters on the 2nd of the month: «este mes» has one day and
 * «el mes pasado» has thirty.
 */
export type RelativeRange = {
  unit: GroupGrain | "quarter";
  count: number;
  mode: "last" | "prior";
};

/** The id a relative cut travels with, to save it and recognise it. */
export function rangeId(range: RelativeRange): string {
  return `${range.mode}:${range.count}:${range.unit}`;
}

export function readRangeId(id: string): RelativeRange | null {
  const [mode, count, unit] = id.split(":");
  if (mode !== "last" && mode !== "prior") return null;
  const howMany = Number(count);
  if (!Number.isInteger(howMany) || howMany < 1) return null;
  if (
    unit !== "day" &&
    unit !== "week" &&
    unit !== "month" &&
    unit !== "quarter" &&
    unit !== "year"
  ) {
    return null;
  }
  return { mode, count: howMany, unit };
}

/** The start of the period that contains `when`. It is where «este mes»,
 *  «esta semana», «este trimestre» begin. */
function startOf(unit: RelativeRange["unit"], when: Date): Date {
  const year = when.getFullYear();
  const month = when.getMonth();
  if (unit === "year") return new Date(year, 0, 1);
  if (unit === "quarter") return new Date(year, Math.floor(month / 3) * 3, 1);
  if (unit === "month") return new Date(year, month, 1);
  if (unit === "week") {
    /* The week starts on MONDAY, which is ISO and is what the engine uses to
       cut by week. With Sunday, two layers would split the same data into different
       weeks and the counts would not add up. */
    const day = new Date(year, month, when.getDate());
    const weekday = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - weekday);
    return day;
  }
  return new Date(year, month, when.getDate());
}

/** Moves `count` periods from `from`. Negative goes backwards. */
function shift(unit: RelativeRange["unit"], from: Date, count: number): Date {
  const out = new Date(from);
  if (unit === "year") out.setFullYear(out.getFullYear() + count);
  else if (unit === "quarter") out.setMonth(out.getMonth() + count * 3);
  else if (unit === "month") out.setMonth(out.getMonth() + count);
  else if (unit === "week") out.setDate(out.getDate() + count * 7);
  else out.setDate(out.getDate() + count);
  return out;
}

/**
 * Resolves a relative cut against a clock.
 *
 * `now` is passed in and not read from inside: a function that looks at the clock
 * cannot be tested, and whoever tests it would have to freeze the global time.
 */
export function resolveRange(range: RelativeRange, now: Date = new Date()): DateRange {
  const current = startOf(range.unit, now);
  if (range.mode === "last") {
    /* «Los últimos 3 meses» INCLUDES the running one: it ends at the end of the current one.
       Ending «now» would leave out what is saved during the rest of the day, and
       a filter that hides what you just created reads as an error. */
    return {
      from: shift(range.unit, current, -(range.count - 1)),
      to: shift(range.unit, current, 1),
    };
  }
  return { from: shift(range.unit, current, -range.count), to: current };
}

/** The cuts worth offering, in the order they are read. It is a
 *  suggestion with a name and not a closed list: a consumer builds their own with
 *  `rangeId` if their domain looks at time differently. */
export const COMMON_RANGES: readonly RelativeRange[] = [
  { mode: "last", count: 7, unit: "day" },
  { mode: "last", count: 30, unit: "day" },
  { mode: "last", count: 3, unit: "month" },
  { mode: "prior", count: 1, unit: "month" },
  { mode: "last", count: 1, unit: "quarter" },
  { mode: "prior", count: 1, unit: "quarter" },
  { mode: "last", count: 1, unit: "year" },
  { mode: "last", count: 3, unit: "year" },
];
