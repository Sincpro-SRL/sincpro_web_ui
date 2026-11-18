"use client";

import type { ChartData } from "@sincpro/web-ui/foundations/chart";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { PivotKey } from "@sincpro/web-ui/foundations/pivot";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { useMemo } from "react";

/**
 * A BAR LIST: a ranking read as a list — the name, a bar, the number — one row each.
 *
 * Context: «why were messages rejected» is six reasons and a count each. A bar chart answers
 * it with two axes, a grid and the names tilted under thirty-pixel columns; a `Meter` answers
 * a different question (a quantity against a known capacity, coloured by alarm). A ranking
 * is a list whose bars only say «how much against the biggest», so that is what this draws:
 * the name where the eye starts, a thin bar proportional to the largest value, and the
 * number at the end — written, because the bar alone gives the shape and not the amount.
 *
 * It reads `ChartData`, the same thing a `Chart` draws — `chartFromPivot`, `chartFromRecord`
 * — never a second way to fold. With one series it draws that series; with several it draws
 * what each whole category gives (`totals`).
 *
 *  - A zero is a row with an empty track, not a missing row: «0 spam» is an answer.
 *  - A hole (`null`) reads «—»: not counted is not zero.
 *  - The gathered tail («otros») draws in the de-emphasis grey and does not open.
 *  - Negative values have no length here (a ranking of magnitudes): their row writes the
 *    number with its sign and an empty track. A diverging reading is a `Chart`.
 */
export type BarListProps = {
  data: ChartData;
  /** The accessible name: what is ranked. */
  label: string;
  /** A row was pressed: open what fell there. Absent, the rows only show. */
  onPoint?: (category: PivotKey) => void;
};

export function BarList({ data, label, onPoint }: BarListProps) {
  const copy = useUiCopy();
  const number = useMemo(
    () => new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 2 }),
    [copy.locale],
  );
  const format = (value: number) => data.measure.format?.(value) ?? number.format(value);
  const amounts = data.categories.map((_, at) =>
    data.series.length === 1 ? (data.values[at]?.[0] ?? null) : (data.totals[at] ?? null),
  );
  const peak = Math.max(0, ...amounts.map((value) => value ?? 0));
  const written = amounts.map((value) => (value === null ? "—" : format(value)));
  /* One width for the numbers' column, the longest one's: they line up at the right edge
     like a column of a table, whatever the measure writes. */
  const column = `${String(Math.max(...written.map((text) => text.length), 1) + 1)}ch`;

  if (data.categories.length === 0)
    return <Empty sentence={copy.chart.empty} align="start" />;

  return (
    <ul aria-label={label} className="flex min-w-0 flex-col gap-0.5">
      {data.categories.map((category, at) => {
        const value = amounts[at] ?? null;
        const text = written[at] ?? "—";
        const share = value === null || value <= 0 || peak === 0 ? 0 : (value / peak) * 100;
        const rest = category.rest === true;
        const row = (
          <>
            <span className="w-1/3 min-w-0 shrink-0 truncate text-meta text-ink">
              {category.label}
            </span>
            <span aria-hidden className="h-2 min-w-0 flex-1 rounded-pill bg-ink/6">
              <span
                className={`block h-full rounded-pill ${rest ? "bg-muted" : "bg-data"}`}
                style={{ width: `${String(share)}%` }}
              />
            </span>
            <span
              className="shrink-0 text-right text-meta whitespace-nowrap text-ink tabular-nums"
              style={{ width: column }}
            >
              {text}
            </span>
          </>
        );
        const line = "flex w-full min-w-0 items-center gap-3 rounded-control px-1.5 py-1.5";
        return (
          <li key={category.id} className="min-w-0">
            {onPoint === undefined || rest ? (
              <div className={line}>{row}</div>
            ) : (
              <button
                type="button"
                onClick={() => onPoint(category.key)}
                className={`${line} cursor-pointer text-left outline-0 transition-colors duration-(--duration-instant) hover:bg-ink/4 focus-visible:outline-2 focus-visible:outline-primary`}
              >
                {row}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
