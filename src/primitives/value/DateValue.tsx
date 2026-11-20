"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  dateFormat,
  formatDateTime,
  formatRelative,
} from "@sincpro/web-ui/primitives/value/format";

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

/* The formatters — `formatRelative`, `formatDateTime` — are `format.ts`, without the
   directive, so a server component writes a date the same way; re-exported so every path that
   read them here keeps reading them. */
export { formatDateTime, formatRelative };

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

  const exact = formatDateTime(d, copy.locale);
  const text =
    format === "exact"
      ? exact
      : format === "date"
        ? dateFormat(copy.locale).format(d)
        : formatRelative(d, now, copy);

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
