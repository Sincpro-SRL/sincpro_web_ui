"use client";

import type { SeriesBar } from "@sincpro/web-ui/components/frame/model";
import { chartFromRecord } from "@sincpro/web-ui/foundations/chart";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Chart } from "@sincpro/web-ui/primitives/chart/Chart";
import { useMemo } from "react";

/**
 * How ONE column is spread: its values counted, drawn with the system's `Chart`.
 *
 * Context: this used to be its own drawing — 6 px progress bars stretched across the page,
 * the count 1,200 px from its bar, an empty stretch drawn with a stub as if it had rows.
 * Now it is the same chart every other set uses, read from the bars `columnSeries` decides:
 * a text column ranked (bars lying down, the count at the tip), a numeric one as a
 * histogram (columns along the number line, round edges, an empty stretch at zero).
 *
 * Grouping by a field and measuring is `ChartExplorer`'s question; this one is narrower and
 * stays for it: «how are the values of this column spread».
 */
export function SeriesChart({
  series,
  label,
}: {
  series: readonly SeriesBar[];
  /** What is being counted: «ciudad», «importe en tramos». */
  label?: string;
}) {
  const copy = useUiCopy();
  const histogram = series.some((bar) => bar.bin !== undefined);
  const data = useMemo(
    () =>
      chartFromRecord(
        series.map((bar) => [bar.label, bar.count] as const),
        { header: copy.chart.count },
      ),
    [series, copy.chart.count],
  );
  return (
    <Chart
      data={data}
      kind="bar"
      horizontal={!histogram}
      label={label ?? copy.frame.series}
    />
  );
}
