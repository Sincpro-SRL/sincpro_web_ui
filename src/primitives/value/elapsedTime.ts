import type { Tone } from "@sincpro/web-ui/foundations/types";

/**
 * HOW LONG IT HAS BEEN WAITING — the arithmetic of `Elapsed`, pure so a server, a test or a
 * sort can use it: «the oldest ticket first» is the same subtraction.
 *
 * Context: a kitchen's ticket, a support case under an SLA, an order at the counter. What is
 * read is not the hour it arrived but how long ago, and whether that is already too long — so
 * the time carries a tone by two thresholds the domain sets (in minutes): `warnAfter` turns it
 * amber, `badAfter` red. The colour is never alone: the figure is always written.
 */

/** When it started: a `Date`, an ISO string or epoch milliseconds — what a record carries. */
export type ElapsedSince = Date | string | number;

/** The two thresholds, in minutes. Without them the time has no tone: it only informs. */
export type ElapsedThresholds = { warnAfter?: number; badAfter?: number };

export function sinceMillis(since: ElapsedSince): number {
  return since instanceof Date ? since.getTime() : new Date(since).getTime();
}

/** Milliseconds from `since` to `now`; never negative — a clock a little behind the server's
 *  must not write «-0:03». */
export function elapsedMillis(since: ElapsedSince, now: number): number {
  return Math.max(0, now - sinceMillis(since));
}

/** «4:05» under an hour, «1:02:03» over it — the way a stopwatch reads, in figures that line up. */
export function formatElapsed(millis: number): string {
  const total = Math.floor(millis / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** The tone of a wait: `bad` past `badAfter`, `warn` past `warnAfter`, `good` before them,
 *  and `undefined` when no threshold was given (it only informs). */
export function elapsedTone(millis: number, limits: ElapsedThresholds): Tone | undefined {
  const { warnAfter, badAfter } = limits;
  if (warnAfter === undefined && badAfter === undefined) return undefined;
  const minutes = millis / 60_000;
  if (badAfter !== undefined && minutes >= badAfter) return "bad";
  if (warnAfter !== undefined && minutes >= warnAfter) return "warn";
  return "good";
}
