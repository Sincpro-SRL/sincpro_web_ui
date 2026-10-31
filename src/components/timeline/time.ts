/**
 * Context: the arithmetic of a timeline, apart from any screen — what period a scale shows
 * around a date, its columns, how far a drag snaps, and how bars that overlap in one row are
 * stacked. Pure, so it is tested without a browser (`tests/timeline.test.ts`).
 */

export type TimelineScale = "day" | "week" | "month" | "year";

export const TIMELINE_SCALES: readonly TimelineScale[] = ["day", "week", "month", "year"];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** One column of the scale: where it starts and what it says. */
export type TimeUnit = { start: Date; label: string; weekend: boolean };

export type TimeRange = { start: Date; end: Date; title: string; units: TimeUnit[] };

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
/** Monday: the week of a workplace in Bolivia, not the US Sunday. */
const startOfWeek = (date: Date) => {
  const day = startOfDay(date);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() - ((day.getDay() + 6) % 7),
  );
};
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

/** The period a scale shows around `date`, with its columns, written in `locale`. */
export function rangeOf(scale: TimelineScale, date: Date, locale: string): TimeRange {
  const say = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options);
  if (scale === "day") {
    const start = startOfDay(date);
    const units = Array.from({ length: 24 }, (_, hour) => ({
      start: new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour),
      label: String(hour),
      weekend: false,
    }));
    return {
      start,
      end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
      title: say({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
        start,
      ),
      units,
    };
  }
  if (scale === "week") {
    const start = startOfWeek(date);
    const units = Array.from({ length: 7 }, (_, day) => {
      const at = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
      return {
        start: at,
        label: say({ weekday: "short", day: "numeric" }).format(at),
        weekend: isWeekend(at),
      };
    });
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return {
      start,
      end,
      title: say({ day: "numeric", month: "long", year: "numeric" }).formatRange(
        start,
        new Date(end.getTime() - DAY),
      ),
      units,
    };
  }
  if (scale === "month") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const days = Math.round((end.getTime() - start.getTime()) / DAY);
    const units = Array.from({ length: days }, (_, day) => {
      const at = new Date(start.getFullYear(), start.getMonth(), day + 1);
      return { start: at, label: String(day + 1), weekend: isWeekend(at) };
    });
    return {
      start,
      end,
      title: say({ month: "long", year: "numeric" }).format(start),
      units,
    };
  }
  const start = new Date(date.getFullYear(), 0, 1);
  const units = Array.from({ length: 12 }, (_, month) => {
    const at = new Date(date.getFullYear(), month, 1);
    return { start: at, label: say({ month: "short" }).format(at), weekend: false };
  });
  return {
    start,
    end: new Date(date.getFullYear() + 1, 0, 1),
    title: String(date.getFullYear()),
    units,
  };
}

/** The date one period before or after: the toolbar's arrows. */
export function shiftDate(scale: TimelineScale, date: Date, steps: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  if (scale === "day") return new Date(y, m, d + steps);
  if (scale === "week") return new Date(y, m, d + 7 * steps);
  if (scale === "month") return new Date(y, m + steps, 1);
  return new Date(y + steps, 0, 1);
}

/** How far a drag or an arrow key moves a bar: a quarter of an hour on a day, an hour on a
 *  week, a day on a month or a year. */
export function snapOf(scale: TimelineScale): number {
  return { day: 15 * MINUTE, week: HOUR, month: DAY, year: DAY }[scale];
}

/** What a click on an empty column creates: that column. */
export function unitSpan(scale: TimelineScale, at: Date): { start: Date; end: Date } {
  if (scale === "day") {
    const start = new Date(at.getFullYear(), at.getMonth(), at.getDate(), at.getHours());
    return { start, end: new Date(start.getTime() + HOUR) };
  }
  if (scale === "year") {
    const start = new Date(at.getFullYear(), at.getMonth(), 1);
    return { start, end: new Date(at.getFullYear(), at.getMonth() + 1, 1) };
  }
  const start = startOfDay(at);
  return { start, end: new Date(start.getTime() + DAY) };
}

export function snap(time: number, step: number): number {
  return Math.round(time / step) * step;
}

/**
 * The lane of each bar in a row: bars that overlap go one under the other, the way Odoo stacks
 * two attendances of one morning. Greedy, in start order: a bar takes the first lane free when
 * it starts.
 */
export function lanesOf<T>(
  items: readonly T[],
  startOf: (item: T) => Date,
  endOf: (item: T) => Date,
): { lane: Map<T, number>; count: number } {
  const ends: number[] = [];
  const lane = new Map<T, number>();
  for (const item of [...items].sort((a, b) => +startOf(a) - +startOf(b))) {
    const start = +startOf(item);
    let at = ends.findIndex((end) => end <= start);
    if (at === -1) at = ends.length;
    ends[at] = +endOf(item);
    lane.set(item, at);
  }
  return { lane, count: Math.max(1, ends.length) };
}

/** «03:48»: a duration as hours and minutes. */
export function hoursMinutes(ms: number): string {
  const minutes = Math.round(ms / MINUTE);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
