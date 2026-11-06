import { currentCopy, currentCopyLocale, fillCopy } from "@sincpro/web-ui/foundations/copy";

/** The grain of a date level. Without a grain, a date field splits by
 *  instant and every row ends up in its own bucket, which is not grouping. */
export type GroupGrain = "day" | "week" | "month" | "quarter" | "year";

/**
 * THE CALENDAR: from a date to a KEY, and from a key to a LABEL.
 *
 * Context: a date bucket has two texts and they are not the same. «2026-09» is
 * what the engine writes —what identifies the bucket, what is compared with what
 * the server counted, what is stored folded— and «Septiembre» is what is
 * read. Writing only one forces a choice of which one is lost: with the key in view
 * the interface speaks machine, and with the label as identity two Septembers of
 * different years melt into a bucket that does not exist.
 *
 * That is why there are two functions and not one:
 *
 *     dateKey(when, "month")      → «2026-09»     the identity, in a single language
 *     dateLabel("2026-09", …)     → «Septiembre»  the label, in the active language
 *
 * ── The language is not translated: it is ASKED for ─────────────────
 *
 * The months and the days of the week are said by `Intl` with the `locale` the copy
 * has set, so there is no table of twelve months here, in Spanish or in
 * English — nor would one have to be written for a third language. The only things that
 * are copy are the week and the quarter, because no calendar names them: «W38»
 * is not a word and `Intl` does not have it.
 *
 * ── A label says what the one above did NOT say ─────────────────────
 *
 * A tree of dates is read from top to bottom, and repeating the year in every month
 * and the month in every day fills the indentation with text that is already two lines
 * above:
 *
 *     2026                        ← the year is said once
 *       Septiembre                ← not «Septiembre de 2026»
 *         Semana 38               ← not «Semana 38 de 2026»
 *           Martes                ← not «martes, 15 sept 2026»
 *
 * `within` takes care of that: the grains that the buckets above —of the same
 * field— already said. With nobody above, the label stands alone and says the whole
 * date, because a bare «Martes» is not a day.
 */

/**
 * The shape of each grain's key. It is the whole `GroupGrain`: a grain the
 * calendar could not cut would be a level that splits nothing.
 *
 * The ranges go in the expression and not in an `if` because `new Date(2026, 12, 1)`
 * does not fail: it rolls over to January 2027. A key «2026-13» drawn as «Enero»
 * is a month nobody counted, and that is worse than an unreadable label.
 */
const KEY_SHAPES: Readonly<Record<GroupGrain, RegExp>> = {
  year: /^(\d{4})$/,
  quarter: /^(\d{4})-Q([1-4])$/,
  month: /^(\d{4})-(0[1-9]|1[0-2])$/,
  week: /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/,
  day: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

/**
 * A date cut down to the KEY of its grain.
 *
 * The text is the one the engine produces —«2026», «2026-Q3», «2026-09», «2026-W38»,
 * «2026-09-15»—, and both sides writing it the same is what lets a grouping
 * made in the browser be compared with one counted a thousand kilometres away. Without a date
 * the key is empty: a bucket that exists —the one for those that have none— and that is
 * drawn with the words of the copy.
 */
export function dateKey(
  when: Date | string | number | null | undefined,
  grain: GroupGrain,
): string {
  if (when === null || when === undefined || when === "") return "";
  /* A date WITHOUT a time («2025-01-01») is a day of the calendar, not an instant: `new Date`
     reads it as midnight UTC, which in La Paz (UTC−4) is the 31st of December — and January's
     sales landed in last year's December. It is read as a local day instead. */
  const day = typeof when === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(when) : null;
  const date =
    day !== null
      ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
      : when instanceof Date
        ? when
        : new Date(when);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (grain === "year") return String(year);
  if (grain === "quarter") return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  if (grain === "month") return `${year}-${pad(month)}`;
  if (grain === "week") {
    const [weekYear, week] = isoWeek(date);
    return `${weekYear}-W${pad(week)}`;
  }
  return `${year}-${pad(month)}-${pad(date.getDate())}`;
}

/**
 * The LABEL of a date key, in the active language.
 *
 * `within` are the grains the buckets above already said: with the year
 * above, a month is «Septiembre» and not «Septiembre de 2026». A key that does not
 * have the shape of its grain is drawn AS IS —that is what keeps a bucket
 * counted elsewhere, with a key this layer did not write, readable
 * instead of vanishing behind an invented date.
 */
export function dateLabel(
  key: string,
  grain: GroupGrain,
  within: readonly GroupGrain[] = [],
): string {
  const copy = currentCopy();
  if (key === "") return copy.time.noDate;

  const parts = KEY_SHAPES[grain].exec(key);
  if (parts === null) return key;

  const locale = currentCopyLocale();
  const year = Number(parts[1]);
  const said = (one: GroupGrain) => within.includes(one);

  if (grain === "year") return String(year);

  if (grain === "quarter") {
    const quarter = Number(parts[2]);
    return said("year")
      ? fillCopy(copy.calendar.quarter, { n: quarter })
      : fillCopy(copy.calendar.quarterOfYear, { n: quarter, year });
  }

  if (grain === "week") {
    const week = Number(parts[2]);
    /* The month is enough too: a week inside September already knows which
       year it is, because the month said so. */
    return said("year") || said("quarter") || said("month")
      ? fillCopy(copy.calendar.week, { n: week })
      : fillCopy(copy.calendar.weekOfYear, { n: week, year });
  }

  if (grain === "month") {
    const when = new Date(year, Number(parts[2]) - 1, 1);
    return capitalized(
      said("year")
        ? format(locale, { month: "long" }).format(when)
        : format(locale, { month: "long", year: "numeric" }).format(when),
    );
  }

  const day = Number(parts[3]);
  const when = new Date(year, Number(parts[2]) - 1, day);
  /* 31 February has the shape of a day and is none: `Date` rolls it over
     to 3 March instead of complaining, so we ask whether the same day came back. */
  if (when.getDate() !== day) return key;
  /* Inside a week, the day is its NAME: there are seven and none repeats,
     so «Martes» is enough and the day number would be noise. Outside it is not: a bare
     «Martes» does not say which of the fifty-two. */
  if (said("week")) return capitalized(format(locale, { weekday: "long" }).format(when));
  return capitalized(
    format(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      ...(said("year") ? {} : { year: "numeric" }),
    }).format(when),
  );
}

/**
 * The NEXT key in the same grain: «2026-09» → «2026-10», «2026-Q4» → «2027-Q1»,
 * «2026-W52» → the ISO week that follows. `null` if the key does not have the shape of its grain —
 * one counted elsewhere, which this layer did not write and so cannot continue.
 */
export function nextDateKey(key: string, grain: GroupGrain): string | null {
  const parts = KEY_SHAPES[grain].exec(key);
  if (parts === null) return null;
  const year = Number(key.slice(0, 4));
  if (grain === "year") return String(year + 1);
  if (grain === "quarter") {
    const quarter = Number(key.slice(6));
    return quarter === 4 ? `${year + 1}-Q1` : `${year}-Q${quarter + 1}`;
  }
  if (grain === "month") {
    const month = Number(key.slice(5, 7));
    return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  }
  if (grain === "week") {
    /* The Monday of ISO week 1 is the Monday of the week holding 4 January. */
    const week = Number(key.slice(6));
    const fourth = new Date(year, 0, 4);
    const monday = new Date(year, 0, 4 - ((fourth.getDay() + 6) % 7) + (week - 1) * 7);
    return dateKey(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7),
      "week",
    );
  }
  const date = new Date(year, Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)) + 1);
  return dateKey(date, "day");
}

/**
 * All the keys of a grain between two, both included: the whole time AXIS.
 *
 * An axis that skips the month where nothing happened lies about time —August stuck to
 * October reads as one month— and that gap is often exactly what someone is looking for. `null` if
 * some key cannot be continued or if there would be more than `max`: an axis by day over ten years
 * is not a chart.
 */
export function dateKeysBetween(
  first: string,
  last: string,
  grain: GroupGrain,
  max = 1000,
): string[] | null {
  const out = [first];
  let key = first;
  while (key < last) {
    const next = nextDateKey(key, grain);
    if (next === null || out.length >= max) return null;
    out.push(next);
    key = next;
  }
  return key === last ? out : null;
}

/** The name of a month —1 to 12— in the active language. Used by whoever offers months
 *  without holding any date, like the cut by period. */
export function monthName(month: number): string {
  return capitalized(
    format(currentCopyLocale(), { month: "long" }).format(new Date(2000, month - 1, 1)),
  );
}

/** What a GRAIN is called —«día», «semana»—, which is different from what a bucket
 *  of it is called: the grain names the cut and the label names what was cut. It comes from
 *  the copy, which is where the time units in the singular already live. */
export function grainName(grain: GroupGrain): string {
  return capitalized(currentCopy().dates[grain]);
}

/**
 * The ISO year and week of a date.
 *
 * Week 1 is the one holding the first Thursday of the year, so it is computed with
 * the Thursday of the datum's week: it decides which year it belongs to, and that is
 * why a week at the end of December can be week 1 of the next year. The year
 * that comes out of here is that of THAT week and not that of the date.
 */
function isoWeek(date: Date): [year: number, week: number] {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const first = new Date(thursday.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getDay() + 6) % 7)) /
        7,
    );
  return [thursday.getFullYear(), week];
}

function format(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, options);
}

/** A label heads a bucket, and in Spanish `Intl` returns «septiembre» in
 *  lowercase. The first letter is raised with the active language, which is the one that knows
 *  what the capital of that letter is. */
function capitalized(text: string): string {
  const first = text.charAt(0);
  return first === "" ? text : first.toLocaleUpperCase(currentCopyLocale()) + text.slice(1);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
