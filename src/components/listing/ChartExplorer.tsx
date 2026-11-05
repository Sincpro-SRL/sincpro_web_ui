"use client";

import { AxisLevels, namer } from "@sincpro/web-ui/components/listing/AxisLevels";
import {
  chartCompare,
  type ChartData,
  chartFromPivot,
  type ChartKind,
  chartMeasures,
  type ChartOrder,
  COUNT_MEASURE,
  orderChart,
} from "@sincpro/web-ui/foundations/chart";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type {
  GroupableField,
  GroupLevel,
  PileOf,
} from "@sincpro/web-ui/foundations/grouping";
import {
  type Pivot,
  type PivotFold,
  pivotFrom,
  type PivotKey,
} from "@sincpro/web-ui/foundations/pivot";
import { downloadPivot } from "@sincpro/web-ui/foundations/pivotSheet";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Chart } from "@sincpro/web-ui/primitives/chart/Chart";
import { SegmentedControl } from "@sincpro/web-ui/primitives/choice/SegmentedControl";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  Download,
  GitCompareArrows,
  Layers,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * The PREVIOUS period, to draw beside the current one — Odoo's «compare with».
 *
 * The application knows what «previous» means (the same months last year, the week before)
 * and hands over those records, or that pivot folded by the server. The chart folds them
 * with the same axis and measure and draws them quiet, behind the current ones.
 */
export type ChartComparison<T> = {
  /** What the current period is called on the legend: «2026». */
  current: string;
  /** What the previous one is called: «2025». It also names the toggle. */
  previous: string;
  items?: readonly T[];
  folded?: Pivot;
  /** On from the start. */
  defaultOn?: boolean;
};

export type ChartExplorerProps<T> = {
  /**
   * The pivot already folded by whoever holds the data. Its axes are theirs, so they are
   * shown and not edited; the chart type, the measure and the order stay the person's.
   * Wins over `items` when both are given.
   */
  folded?: Pivot;
  /** The records to fold here, with `of`, `fields` and `measures`. */
  items?: readonly T[];
  /** Which pile a record falls in, at a level — the same contract that groups a list. */
  of?: PileOf<T>;
  /** What the chart can be split by: a field, and its grains when it is a date. */
  fields?: readonly GroupableField[];
  /** How a level is named when it is not among `fields` — the spec's `labelOf`. */
  labelOf?: (level: GroupLevel) => string;
  /** What can be measured, besides the count (always offered). */
  measures?: readonly PivotFold<T>[];
  /** The measure it opens on. The first of `measures` by default; `COUNT_MEASURE` for the count. */
  defaultMeasure?: string;
  /** Several measures at once, each its OWN chart, one under the other: two measures of
   *  different scale on one axis flatten the smaller one, and two axes invent a
   *  correlation. Wins over `defaultMeasure`. */
  defaultMeasures?: readonly string[];
  /** The levels, CONTROLLED from outside — the search bar's grouping, as in Odoo: the first
   *  goes along the axis, the rest are the series. While given, they are not edited here. */
  levels?: readonly GroupLevel[];
  /** Where the axis and the series start when nothing outside decides them. */
  defaultCategories?: readonly GroupLevel[];
  defaultSeries?: readonly GroupLevel[];
  kind?: ChartKind;
  defaultKind?: ChartKind;
  onKindChange?: (kind: ChartKind) => void;
  /** Bars stacked from the start (Odoo stacks them). */
  defaultStacked?: boolean;
  /** A line that adds up from the start: «how much so far». */
  defaultCumulative?: boolean;
  /** The axis ordered by size from the start. */
  defaultOrder?: ChartOrder;
  /** The previous period, to draw beside this one. */
  compare?: ChartComparison<T>;
  /** A bar, a point or a slice was pressed: open the records that fell there. */
  onPoint?: (category: PivotKey, series?: PivotKey) => void;
  /** What the chart shows, for the screen reader: «Ventas por sucursal». */
  label?: string;
  height?: number | string;
  /** The file's name when downloaded. */
  fileName?: string;
};

const KIND_ICON = { bar: ChartColumnBig, line: ChartLine, pie: ChartPie } as const;

/**
 * Odoo's GRAPH view, for any set: bars, lines or a pie; which measures; split by what along
 * the axis and by what into series; stacked, cumulative, ordered; against the previous
 * period; and a press on a mark opens the records under it.
 *
 * Context: it folds with the same `pivotFrom` the pivot uses, so the numbers on the chart
 * and on the grid can never disagree — and a server-folded pivot (`folded`) draws the same.
 * Inside a list the levels FOLLOW the search bar's grouping and the records are the ones
 * the search left: the chart answers the same question the list is asking.
 */
export function ChartExplorer<T>({
  folded,
  items,
  of,
  fields = [],
  labelOf: outerLabel,
  measures = [],
  defaultMeasure,
  defaultMeasures,
  levels: outerLevels,
  defaultCategories = [],
  defaultSeries = [],
  kind: kindProp,
  defaultKind = "bar",
  onKindChange,
  defaultStacked = true,
  defaultCumulative = false,
  defaultOrder,
  compare,
  onPoint,
  label,
  height,
  fileName,
}: ChartExplorerProps<T>) {
  const copy = useUiCopy();
  const words = copy.chart;

  const [ownKind, setOwnKind] = useState<ChartKind>(kindProp ?? defaultKind);
  const kind = onKindChange === undefined ? ownKind : (kindProp ?? defaultKind);
  const setKind = onKindChange ?? setOwnKind;

  const [ownCategories, setOwnCategories] =
    useState<readonly GroupLevel[]>(defaultCategories);
  const [ownSeries, setOwnSeries] = useState<readonly GroupLevel[]>(defaultSeries);
  const following = outerLevels !== undefined && outerLevels.length > 0;
  const categories = following ? outerLevels.slice(0, 1) : ownCategories;
  const series = following ? outerLevels.slice(1) : ownSeries;

  const [chosen, setChosen] = useState<readonly string[]>(
    () => defaultMeasures ?? [defaultMeasure ?? measures[0]?.id ?? COUNT_MEASURE],
  );
  const [stacked, setStacked] = useState(defaultStacked);
  const [cumulative, setCumulative] = useState(defaultCumulative);
  const [order, setOrder] = useState<ChartOrder | undefined>(defaultOrder);
  const [comparing, setComparing] = useState(compare?.defaultOn === true);

  const labelOf = namer(fields, outerLabel);
  const fold = (records: readonly T[] | undefined, columns: readonly GroupLevel[]) =>
    of === undefined
      ? undefined
      : pivotFrom(records ?? [], { rows: categories, columns, of, measures, labelOf });

  /* A pie is one whole: its series would be split and summed back. */
  const columns = kind === "pie" ? [] : series;
  const pivot = useMemo(
    () => folded ?? fold(items, columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fold` reads these same inputs
    [folded, items, of, measures, fields, categories, columns],
  );

  /* Comparing draws two periods of ONE series each: with series of its own, or as a pie
     (one whole), there is nothing to put beside it. */
  const canCompare = compare !== undefined && kind !== "pie" && columns.length === 0;
  const previousPivot = useMemo(
    () =>
      !canCompare || !comparing ? undefined : (compare.folded ?? fold(compare.items, [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fold` reads these same inputs
    [canCompare, comparing, compare, of, measures, fields, categories],
  );
  /* Time is compared by position (the first month with the first month); a thing, by key. */
  const timeAxis =
    (pivot?.rows.levels.length ?? 0) === 1 && pivot?.rows.levels[0]?.grain !== undefined;

  const available = pivot === undefined ? [] : chartMeasures(pivot);
  const shown = available.filter((one) => chosen.includes(one.id));
  const measuresShown = shown.length > 0 ? shown : available.slice(0, 1);

  const charts = useMemo(() => {
    if (pivot === undefined) return [];
    return measuresShown.map((measure): ChartData => {
      const reading = {
        measure: measure.id,
        cumulative: kind === "line" && cumulative,
        ...(kind === "pie" ? { maxCategories: 7 } : {}),
      };
      const current = chartFromPivot(pivot, reading);
      if (previousPivot === undefined || compare === undefined) {
        return orderChart(current, order);
      }
      const previous = chartFromPivot(previousPivot, reading);
      return orderChart(
        chartCompare(
          current,
          previous,
          { current: compare.current, previous: compare.previous },
          timeAxis ? "position" : "key",
        ),
        order,
      );
    });
  }, [pivot, previousPivot, measuresShown, kind, cumulative, order, compare, timeAxis]);

  const manySeries = charts.some((data) => data.series.length > 1 && data.compare !== true);
  const additive = measuresShown.every((one) => one.additive);
  const first = measuresShown[0];
  const measureLabel =
    first === undefined
      ? words.measure
      : measuresShown.length === 1
        ? first.header
        : fillCopy(words.moreMeasures, {
            name: first.header,
            count: measuresShown.length - 1,
          });

  const toggleOrder = (next: ChartOrder) =>
    setOrder((now) => (now === next ? undefined : next));
  const toggleMeasure = (id: string) => {
    const on = measuresShown.map((one) => one.id);
    /* The last one stays: a chart of no measure is no chart. */
    setChosen(
      !on.includes(id) ? [...on, id] : on.length === 1 ? on : on.filter((one) => one !== id),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <SegmentedControl
          aria-label={words.kind}
          size="sm"
          value={kind}
          onChange={(next) => setKind(next as ChartKind)}
          options={(["bar", "line", "pie"] as const).map((one) => ({
            value: one,
            label: words[one],
            icon: KIND_ICON[one],
          }))}
        />
        <Menu
          label={measureLabel}
          title={words.measure}
          icon={Sigma}
          closeOnSelect={false}
          groups={[
            {
              label: words.measure,
              options: available.map((one) => ({
                id: one.id,
                label: one.header,
                checked: measuresShown.some((on) => on.id === one.id),
              })),
            },
          ]}
          onSelect={toggleMeasure}
        />
        {folded === undefined ? (
          <>
            <AxisLevels
              name={words.categoriesAxis}
              levels={categories}
              onChange={following ? null : setOwnCategories}
              fields={fields}
              used={series}
              labelOf={labelOf}
            />
            {/* Following the search, series exist only when it has a second level. */}
            {kind === "pie" || (following && series.length === 0) ? null : (
              <AxisLevels
                name={words.seriesAxis}
                levels={series}
                onChange={following ? null : setOwnSeries}
                fields={fields}
                used={categories}
                labelOf={labelOf}
              />
            )}
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {canCompare ? (
            <IconButton
              icon={GitCompareArrows}
              label={fillCopy(words.compareWith, { name: compare.previous })}
              aria-pressed={comparing}
              onClick={() => setComparing((now) => !now)}
            />
          ) : null}
          {kind !== "pie" && manySeries ? (
            <IconButton
              icon={Layers}
              label={words.stacked}
              aria-pressed={stacked}
              onClick={() => setStacked((now) => !now)}
            />
          ) : null}
          {kind === "line" ? (
            <IconButton
              icon={TrendingUp}
              label={words.cumulative}
              aria-pressed={cumulative && additive}
              disabled={!additive}
              onClick={() => setCumulative((now) => !now)}
            />
          ) : null}
          <IconButton
            icon={ArrowDownWideNarrow}
            label={words.descending}
            aria-pressed={order === "desc"}
            onClick={() => toggleOrder("desc")}
          />
          <IconButton
            icon={ArrowUpNarrowWide}
            label={words.ascending}
            aria-pressed={order === "asc"}
            onClick={() => toggleOrder("asc")}
          />
          {pivot === undefined ? null : (
            <Button
              role="ghost"
              size="sm"
              icon={Download}
              onClick={() =>
                downloadPivot(pivot, fileName === undefined ? {} : { name: fileName })
              }
            >
              {copy.pivot.download}
            </Button>
          )}
        </div>
      </div>
      {charts.map((data) => (
        <section key={data.measure.id} className="flex min-w-0 flex-col gap-2">
          {/* Small multiples: each measure names its own chart. One alone is named by the
              menu above, and saying it twice is noise. */}
          {charts.length > 1 ? (
            <h3 className="text-meta font-semibold text-ink">{data.measure.header}</h3>
          ) : null}
          <Chart
            data={data}
            kind={kind}
            stacked={stacked}
            label={
              charts.length > 1
                ? describe(data.measure.header, label ?? data.categoryTitle)
                : (label ?? describe(data.measure.header, data.categoryTitle))
            }
            {...(onPoint === undefined ? {} : { onPoint })}
            {...(height === undefined ? {} : { height })}
          />
        </section>
      ))}
    </div>
  );
}

function describe(measure: string, by: string): string {
  return by === "" ? measure : `${measure} · ${by}`;
}
