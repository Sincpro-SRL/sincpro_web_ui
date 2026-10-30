"use client";

import type { SeriesBar } from "@sincpro/web-ui/components/frame/model";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";

/**
 * One series, drawn as a bar list: the name, the count, and a track.
 *
 * A column of vertical bars with the names in a legend underneath asks the
 * eye to match a bar to a word. Here the word sits on its own bar, which is
 * the question this piece answers — how the values of one column are spread.
 * CSS, not a charting library: the width is a percentage of the largest
 * count, and the color is the data color, one series, not a palette.
 */

export function SeriesChart({ series }: { series: readonly SeriesBar[] }) {
  const copy = useUiCopy();
  const peak = Math.max(1, ...series.map((bar) => bar.count));

  if (series.length === 0) {
    return <p className="px-3 py-4 text-body text-muted">{copy.frame.noSeries}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5 px-3 py-3">
      {series.map((bar) => {
        const width = Math.max((bar.count / peak) * 100, 2);
        const count = bar.count.toLocaleString(copy.locale);
        return (
          <li
            key={bar.label}
            className="flex min-w-0 flex-col gap-1"
            title={`${bar.label}: ${count}`}
          >
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-meta text-ink">{bar.label}</span>
              <span className="shrink-0 text-micro tabular-nums text-muted">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-ink/8">
              <div className="h-full rounded-pill bg-data" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
