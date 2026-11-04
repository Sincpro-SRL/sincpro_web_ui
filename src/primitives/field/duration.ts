/* ==================================================================== *
 *  A DURATION in hours — «8:30» is 8.5, the `float_time` of an ERP.
 *
 *  Stored as a number of hours (what a timesheet sums), read as hours and
 *  minutes (what a person says). Typed any of the ways people write it:
 *
 *      8:30   8,5   8.5   8h30   8h 30m   45m   2h   -1:15
 *
 *  Pure: the control writes and reads with it, and a report formats a total the
 *  same way.
 * ==================================================================== */

/** Hours as «h:mm», rounded to the minute: 8.5 → «8:30», 0.25 → «0:15», -1.25 → «-1:15». */
export function formatDuration(hours: number): string {
  const total = Math.round(Math.abs(hours) * 60);
  const sign = hours < 0 && total > 0 ? "-" : "";
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** What was typed, as hours; `""` for an empty box and `null` for something that is not a
 *  duration (minutes past 59 included: «8:75» is a typo, not 9:15). */
export function parseDuration(text: string): number | "" | null {
  const clean = text.trim().toLowerCase().replace(/\s+/g, "");
  if (clean === "") return "";
  const sign = clean.startsWith("-") ? -1 : 1;
  const body = clean.replace(/^[-+]/, "");

  const colon = /^(\d+):(\d{1,2})$/.exec(body);
  if (colon !== null) {
    const minutes = Number(colon[2]);
    return minutes > 59 ? null : sign * (Number(colon[1]) + minutes / 60);
  }
  const decimal = /^\d+(?:[.,]\d+)?$/.exec(body);
  if (decimal !== null) return sign * Number(body.replace(",", "."));
  const units = /^(?:(\d+)h)?(?:(\d+)m(?:in)?)?$/.exec(body);
  if (units !== null && (units[1] !== undefined || units[2] !== undefined)) {
    const minutes = Number(units[2] ?? 0);
    if (units[1] !== undefined && minutes > 59) return null;
    return sign * (Number(units[1] ?? 0) + minutes / 60);
  }
  /* «8h30» — hours, then bare minutes. */
  const short = /^(\d+)h(\d{1,2})$/.exec(body);
  if (short !== null) {
    const minutes = Number(short[2]);
    return minutes > 59 ? null : sign * (Number(short[1]) + minutes / 60);
  }
  return null;
}
