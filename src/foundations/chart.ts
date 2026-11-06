import { dateKeysBetween } from "@sincpro/web-ui/foundations/calendar";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/copy";
import { pathKey } from "@sincpro/web-ui/foundations/grouping";
import {
  axisLabels,
  type Pivot,
  type PivotAxis,
  type PivotCell,
  type PivotKey,
} from "@sincpro/web-ui/foundations/pivot";

/**
 * THE CHART: a pivot read as marks.
 *
 * Context: an ERP chart —Odoo's, anyone's— answers the same question
 * as a pivot: the set split by one field (the axis), sometimes by another (the
 * series), and at each crossing a folded number. That is why this brings NO other way to fold:
 * it reads a `Pivot`. And since a `Pivot` is built the same by whoever holds the records in hand
 * (`pivotFrom`), whoever folded it on the server (`pivotOf`) or whoever built it from the cells
 * of a file, the same chart serves records, a dataset and what is grouped
 * a thousand kilometres away. A dictionary or a `SeriesBar[]` come in through the two helpers below.
 *
 * ── The pivot's rows are the AXIS; its columns, the SERIES ──────────
 *
 * As in Odoo: the first grouping goes below and the second is stacked or set beside it.
 *
 * ── Three rules that come from the pivot, and still hold ────────────
 *
 *  1. **A hole is not a zero.** `null` is «there are no rows there»: the bar is not drawn and
 *     the line breaks. A zero is a bar flush with the axis.
 *  2. **Sums are not invented.** Gathering the tail into «otros» or accumulating a line is summing, and
 *     it is only done if the measure sums (`additive`; the count always). Otherwise the tail is
 *     left out and SAID (`hiddenSeries`): an average of averages is not an average.
 *  3. **Colour follows the series, not its position.** The remaining series keep the
 *     pivot's order; sorting by size sorts the AXIS, never repaints.
 */

export type ChartKind = "bar" | "line" | "pie";

export type ChartOrder = "asc" | "desc";

/** The row count of each crossing, offered as one more measure: it is the only one that
 *  can always be answered. */
export const COUNT_MEASURE = "__count";

/** How many series are told apart by colour. It is the palette's length (`--color-series-*`):
 *  a ninth series would be a generated colour, and under colour blindness that one gets confused with another. */
export const SERIES_COLORS = 8;

/** A key of a chart axis: its path in the pivot and how it reads. */
export type ChartPoint = {
  key: PivotKey;
  /** `pathKey(key)`: the stable identity for React and for colour. */
  id: string;
  label: string;
  /** The tail gathered into one: «otros (12)». Drawn quieter and does not open. */
  rest?: boolean;
  /** The previous period of a comparison: drawn quiet, behind the current one. */
  previous?: boolean;
};

export type ChartMeasure = {
  id: string;
  header: string;
  format?: (value: number) => string;
  additive: boolean;
};

export type ChartData = {
  categories: readonly ChartPoint[];
  series: readonly ChartPoint[];
  /** `values[category][series]`; `null` is a hole. */
  values: readonly (readonly (number | null)[])[];
  /** What each whole category gives, folded from the base when the pivot brings it. It is what
   *  a pie measures and what orders the axis. */
  totals: readonly (number | null)[];
  measure: ChartMeasure;
  /** What the cuts are called: «sucursal», «año · forma de pago». */
  categoryTitle: string;
  seriesTitle: string;
  /** Series that did not make it and could not be gathered into «otros» (the measure does not sum). */
  hiddenSeries: number;
  /** The same, for the categories a pie cannot show. */
  hiddenCategories: number;
  /** The two series are the current and the previous period (`chartCompare`). */
  compare?: boolean;
};

export type ChartReading = {
  /** The measure's id, or `COUNT_MEASURE`. By default the pivot's first. */
  measure?: string;
  /** Sorts the AXIS by what each category gives. Without this, the order of its keys. */
  order?: ChartOrder;
  /** Each point adds the previous ones: «how much we have so far». Only with a measure that sums. */
  cumulative?: boolean;
  /** More series than this are gathered into «otros». By default, the palette's colours. */
  maxSeries?: number;
  /** More categories than this are gathered into «otros». A pie asks for six. */
  maxCategories?: number;
  /**
   * With a single DATE level on the axis, fills in the periods where nothing happened:
   * August is not left stuck to October. The count of an empty period is 0; any other
   * measure is a hole (`null`), like any crossing without rows. On by default.
   */
  fillDates?: boolean;
};

/** The measures that can be charted from a pivot: the count and its own. */
export function chartMeasures(pivot: Pivot): ChartMeasure[] {
  return [
    { id: COUNT_MEASURE, header: currentCopy().chart.count, additive: true },
    ...pivot.measures.map((one) => ({
      id: one.id,
      header: one.header,
      ...(one.format === undefined ? {} : { format: one.format }),
      additive: one.additive === true,
    })),
  ];
}

function title(axis: PivotAxis): string {
  return axis.levels.map((level) => level.label).join(" · ");
}

function pointOf(axis: PivotAxis, key: PivotKey, fallback: string): ChartPoint {
  return {
    key,
    id: pathKey(key),
    label: axis.levels.length === 0 ? fallback : axisLabels(axis, key).join(" · "),
  };
}

function sum(values: readonly (number | null)[]): number | null {
  let out: number | null = null;
  for (const value of values) if (value !== null) out = (out ?? 0) + value;
  return out;
}

/** Biggest first; a hole goes last, because «nothing there» is not «less than zero». */
function byTotal(totals: readonly (number | null)[], order: ChartOrder) {
  return (a: number, b: number) => {
    const x = totals[a] ?? null;
    const y = totals[b] ?? null;
    if (x === null || y === null) return x === y ? a - b : x === null ? 1 : -1;
    return order === "asc" ? x - y || a - b : y - x || a - b;
  };
}

/**
 * Which indices stay, in their own order, when there are more than `max`: the biggest by
 * total. With an additive measure one place is left for «otros».
 */
function keep(
  totals: readonly (number | null)[],
  max: number,
  additive: boolean,
): { kept: number[]; rest: number[] } {
  const all = totals.map((_, at) => at);
  if (all.length <= max) return { kept: all, rest: [] };
  const room = additive ? Math.max(1, max - 1) : max;
  const top = new Set([...all].sort(byTotal(totals, "desc")).slice(0, room));
  return {
    kept: all.filter((at) => top.has(at)),
    rest: all.filter((at) => !top.has(at)),
  };
}

/**
 * The pivot as a chart: the rows are the axis, the columns the series, and at each crossing
 * the number of the chosen measure.
 */
export function chartFromPivot(pivot: Pivot, reading: ChartReading = {}): ChartData {
  const words = currentCopy();
  const measures = chartMeasures(pivot);
  const wanted = reading.measure ?? pivot.measures[0]?.id ?? COUNT_MEASURE;
  const measure = measures.find((one) => one.id === wanted) ?? measures[0]!;
  const read = (cell: PivotCell | undefined): number | null =>
    cell === undefined
      ? null
      : measure.id === COUNT_MEASURE
        ? cell.count
        : (cell.values[measure.id] ?? null);

  let categories = pivot.rows.keys.map((key) => pointOf(pivot.rows, key, words.pivot.total));
  let series = pivot.columns.keys.map((key) => pointOf(pivot.columns, key, measure.header));
  let values = categories.map((row) =>
    series.map((column) => read(pivot.cell(row.key, column.key))),
  );
  /* The margins come from the BASE when the pivot brings them; summing cells is the honest
     way out only when the measure sums. */
  const margin = (cell: PivotCell | undefined, inside: readonly (number | null)[]) =>
    cell !== undefined ? read(cell) : measure.additive ? sum(inside) : null;
  let totals = categories.map((row, at) =>
    margin(pivot.rowTotal?.(row.key), values[at] ?? []),
  );

  /* 0 · The whole time span: the empty periods between the first and the last. */
  const grain = pivot.rows.levels.length === 1 ? pivot.rows.levels[0]?.grain : undefined;
  if (grain !== undefined && reading.fillDates !== false) {
    const dated = categories
      .map((point, at) => ({ point, at, key: point.key[0] ?? "" }))
      .filter((one) => one.key !== "")
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const first = dated[0]?.key;
    const last = dated[dated.length - 1]?.key;
    const full =
      first === undefined || last === undefined ? null : dateKeysBetween(first, last, grain);
    if (full !== null) {
      const byKey = new Map(dated.map((one) => [one.key, one.at]));
      const empty = measure.id === COUNT_MEASURE ? 0 : null;
      const undated = categories
        .map((_, at) => at)
        .filter((at) => (categories[at]?.key[0] ?? "") === "");
      const filled = full.map((key) => {
        const at = byKey.get(key);
        return at === undefined
          ? {
              point: pointOf(pivot.rows, [key], key),
              values: series.map(() => empty),
              total: empty,
            }
          : { point: categories[at]!, values: values[at]!, total: totals[at] ?? null };
      });
      /* The records without a date stay, at the end: they are not a moment in time. */
      for (const at of undated) {
        filled.push({
          point: categories[at]!,
          values: values[at]!,
          total: totals[at] ?? null,
        });
      }
      categories = filled.map((one) => one.point);
      values = filled.map((one) => one.values);
      totals = filled.map((one) => one.total);
    }
  }

  /* 1 · The series that do not fit in the palette. */
  let hiddenSeries = 0;
  const seriesTotals = series.map((column, at) =>
    margin(
      pivot.columnTotal?.(column.key),
      values.map((row) => row[at] ?? null),
    ),
  );
  const seriesCut = keep(seriesTotals, reading.maxSeries ?? SERIES_COLORS, measure.additive);
  if (seriesCut.rest.length > 0) {
    const kept = seriesCut.kept;
    if (measure.additive) {
      series = [
        ...kept.map((at) => series[at]!),
        {
          key: [],
          id: "\u0000rest",
          label: fillCopy(words.chart.rest, { count: seriesCut.rest.length }),
          rest: true,
        },
      ];
      values = values.map((row) => [
        ...kept.map((at) => row[at] ?? null),
        sum(seriesCut.rest.map((at) => row[at] ?? null)),
      ]);
    } else {
      hiddenSeries = seriesCut.rest.length;
      series = kept.map((at) => series[at]!);
      values = values.map((row) => kept.map((at) => row[at] ?? null));
    }
  }

  /* 2 · The categories that do not fit (a pie). */
  let hiddenCategories = 0;
  let restCategory: {
    point: ChartPoint;
    values: (number | null)[];
    total: number | null;
  } | null = null;
  if (reading.maxCategories !== undefined) {
    const cut = keep(totals, reading.maxCategories, measure.additive);
    if (cut.rest.length > 0) {
      if (measure.additive) {
        restCategory = {
          point: {
            key: [],
            id: "\u0000rest",
            label: fillCopy(words.chart.rest, { count: cut.rest.length }),
            rest: true,
          },
          values: series.map((_, s) => sum(cut.rest.map((at) => values[at]?.[s] ?? null))),
          total: sum(cut.rest.map((at) => totals[at] ?? null)),
        };
      } else {
        hiddenCategories = cut.rest.length;
      }
      categories = cut.kept.map((at) => categories[at]!);
      values = cut.kept.map((at) => values[at]!);
      totals = cut.kept.map((at) => totals[at] ?? null);
    }
  }

  /* 3 · The axis order. The gathered tail always goes last: it is not one more category. */
  if (reading.order !== undefined) {
    const at = categories.map((_, index) => index).sort(byTotal(totals, reading.order));
    categories = at.map((index) => categories[index]!);
    values = at.map((index) => values[index]!);
    totals = at.map((index) => totals[index] ?? null);
  }
  if (restCategory !== null) {
    categories = [...categories, restCategory.point];
    values = [...values, restCategory.values];
    totals = [...totals, restCategory.total];
  }

  /* 4 · Cumulative: a hole carries over what was running, it does not cut it. */
  if (reading.cumulative === true && measure.additive) {
    const running: (number | null)[] = series.map(() => null);
    values = values.map((row) =>
      row.map((value, s) => {
        if (value !== null) running[s] = (running[s] ?? 0) + value;
        return running[s] ?? null;
      }),
    );
    let total: number | null = null;
    totals = totals.map((value) => {
      if (value !== null) total = (total ?? 0) + value;
      return total;
    });
  }

  return {
    categories,
    series,
    values,
    totals,
    measure,
    categoryTitle: title(pivot.rows),
    seriesTitle: title(pivot.columns),
    hiddenSeries,
    hiddenCategories,
  };
}

/**
 * Sorts the AXIS of an already built chart by what each category gives. The gathered tail
 * («otros») stays last. It is the same as `order` in `chartFromPivot`, for a chart
 * that was built another way —a comparison, a dictionary—.
 */
export function orderChart(data: ChartData, order: ChartOrder | undefined): ChartData {
  if (order === undefined) return data;
  const at = data.categories
    .map((_, index) => index)
    .filter((index) => data.categories[index]?.rest !== true)
    .sort(byTotal(data.totals, order));
  const tail = data.categories
    .map((_, index) => index)
    .filter((index) => data.categories[index]?.rest === true);
  const all = [...at, ...tail];
  return {
    ...data,
    categories: all.map((index) => data.categories[index]!),
    values: all.map((index) => data.values[index]!),
    totals: all.map((index) => data.totals[index] ?? null),
  };
}

/**
 * THE PREVIOUS PERIOD beside the current one — Odoo's «comparar con».
 *
 * Each chart is built on its own (`chartFromPivot` over each period's records)
 * and this joins them into two series: the current and the previous, which is drawn quiet. What is
 * compared is what each whole category gives.
 *
 * `by` says how they are matched: by KEY when the axis is a thing —La Paz with La Paz— and
 * by POSITION when it is time —the first month with the first month—, because «2026-09» and
 * «2025-09» are different keys and what is compared is «the same moment of the period».
 * A category of the previous that is not in the current is not drawn: the axis is today's.
 */
export function chartCompare(
  current: ChartData,
  previous: ChartData,
  labels: { current: string; previous: string },
  by: "key" | "position" = "key",
): ChartData {
  const whole = (data: ChartData, at: number) =>
    data.series.length === 1 ? (data.values[at]?.[0] ?? null) : (data.totals[at] ?? null);
  const index = new Map(previous.categories.map((point, at) => [point.id, at]));
  const before = (point: ChartPoint, at: number): number | null => {
    const found = by === "position" ? at : index.get(point.id);
    return found === undefined || found >= previous.categories.length
      ? null
      : whole(previous, found);
  };
  return {
    ...current,
    series: [
      { key: [], id: "\u0000current", label: labels.current },
      { key: [], id: "\u0000previous", label: labels.previous, previous: true },
    ],
    values: current.categories.map((point, at) => [whole(current, at), before(point, at)]),
    totals: current.categories.map((_, at) => whole(current, at)),
    hiddenSeries: 0,
    compare: true,
  };
}

/**
 * A DICTIONARY as a chart: `{ "La Paz": 120, "Oruro": 40 }`, or its pairs. It is what
 * a summary endpoint returns, and there is no need to build a pivot for it.
 */
export function chartFromRecord(
  entries:
    Readonly<Record<string, number | null>> | readonly (readonly [string, number | null])[],
  measure: { header: string; format?: (value: number) => string; additive?: boolean },
): ChartData {
  const pairs: readonly (readonly [string, number | null])[] = Array.isArray(entries)
    ? entries
    : Object.entries(entries);
  return {
    categories: pairs.map(([label]) => ({ key: [label], id: label, label })),
    series: [{ key: [], id: "", label: measure.header }],
    values: pairs.map(([, value]) => [value]),
    totals: pairs.map(([, value]) => value),
    measure: {
      id: "value",
      header: measure.header,
      ...(measure.format === undefined ? {} : { format: measure.format }),
      additive: measure.additive ?? true,
    },
    categoryTitle: "",
    seriesTitle: "",
    hiddenSeries: 0,
    hiddenCategories: 0,
  };
}
