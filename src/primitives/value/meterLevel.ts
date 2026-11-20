/* Without `"use client"`, apart from `Meter.tsx`: a server component that colours a figure by
   how full it is reads the same thresholds. */

export type MeterLevel = "good" | "warn" | "danger";

/** Percentages of the range where the color changes. */
export type MeterThresholds = { warn: number; danger: number };

/** Exported for `Meter`'s default; not public. */
export const DEFAULT_THRESHOLDS: MeterThresholds = { warn: 70, danger: 90 };

/** The level of a percentage: under `warn` is good, up to `danger` is warn, above is danger. */
export function meterLevel(
  percentage: number,
  thresholds: MeterThresholds = DEFAULT_THRESHOLDS,
): MeterLevel {
  if (percentage > thresholds.danger) return "danger";
  if (percentage >= thresholds.warn) return "warn";
  return "good";
}
