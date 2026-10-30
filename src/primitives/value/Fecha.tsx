"use client";

import { currentCopy, currentCopyLocale, useUiCopy } from "@sincpro/web-ui/foundations/copy";

/* ==================================================================== *
 *  WHEN — a date says two things and they can't both be said together.
 *
 *      «2 min ago»             how recent it is. Understood without thinking.
 *      «14/09/2026 06:21»      which one it is. It gets compared, copied, cited.
 *
 *  The first is the one that helps in a list —what is being asked is «is this
 *  from now?»— and the second the one that helps when something has to be done
 *  with the datum. Writing both spends twice the width to answer a single
 *  question, so the relative one is drawn and the exact one goes in the `title`:
 *  a hover away, taking up nothing.
 *
 *  ── Why there is no «4 months ago» ──────────────────────────────────
 *
 *  Past the week, the relative stops informing: «4 months ago» doesn't let you
 *  order two things or remember which one it was. From there on the date is
 *  drawn, which is what at that distance is really being asked.
 * ==================================================================== */

function relativeFormat(locale: string) {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
}
function dateFormat(locale: string) {
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

export function formatRelative(when: Date, now: Date = new Date()): string {
  const locale = currentCopyLocale();
  const delta = when.getTime() - now.getTime();
  const abs = Math.abs(delta);

  if (abs < MINUTE) return currentCopy().time.justNow;
  if (abs > 7 * DAY) return dateFormat(locale).format(when);

  const step = STEPS.find(([ms]) => abs < ms * 60) ?? STEPS[STEPS.length - 1]!;
  const [ms, unit] = step;
  return relativeFormat(locale).format(Math.round(delta / ms), unit);
}

export function formatDateTime(when: Date): string {
  const locale = currentCopyLocale();
  return `${dateFormat(locale).format(when)} ${timeFormat(locale).format(when)}`;
}

/** A day written as `YYYY-MM-DD` (what a date field stores) is that day HERE. `new Date()`
 *  reads it as midnight in UTC, and west of Greenwich that is the evening before: a due date
 *  of the 15th was drawn as the 14th in La Paz. Anything else goes through `Date` as is. */
function toDate(when: string | number): Date {
  const day = typeof when === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(when) : null;
  if (day === null) return new Date(when);
  return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
}

export function DateValue({
  when,
  format = "relative",
  /** So it can be tested: without this, a story with «hace 2 min» changes its
   *  text every minute and no snapshot works as a reference. */
  now,
}: {
  when: Date | string | number;
  /** `relative` for lists and logs; `exact` when the datum gets compared or
   *  copied; `date` when the time of day means nothing. */
  format?: "relative" | "exact" | "date";
  now?: Date;
}) {
  const copy = useUiCopy();
  const d = when instanceof Date ? when : toDate(when);

  if (Number.isNaN(d.getTime())) {
    return (
      <span className="text-meta text-muted italic" title={copy.time.invalid}>
        {copy.time.noDate}
      </span>
    );
  }

  const exact = formatDateTime(d);
  const text =
    format === "exact"
      ? exact
      : format === "date"
        ? dateFormat(copy.locale).format(d)
        : formatRelative(d, now);

  return (
    <time
      dateTime={d.toISOString()}
      title={exact}
      className="text-meta whitespace-nowrap tabular-nums text-muted"
    >
      {text}
    </time>
  );
}
