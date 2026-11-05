"use client";

import {
  type ChartData,
  type ChartKind,
  type ChartPoint,
  SERIES_COLORS,
} from "@sincpro/web-ui/foundations/chart";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { PivotKey } from "@sincpro/web-ui/foundations/pivot";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A CHART: the numbers of a set, as marks — bars, lines or a pie.
 *
 * Context: «series» used to be a column of 6 px progress bars stretched across the page, the
 * number 1,200 px away from its bar, and an empty bin drawn with a stub as if it had data. It
 * answered one question (how one column spreads) and Odoo's graph view answers the one an
 * ERP actually asks: the set split by one field, maybe by a second, and a measure in each
 * crossing. That is a pivot, so this draws `ChartData`, which `chartFromPivot` reads off any
 * `Pivot` — records, a dataset, or one folded by the server.
 *
 * Drawn with Recharts (SVG): its fills take `var(--color-*)`, so a token and the dark theme
 * reach the marks with no re-render, which no canvas engine does. What it draws follows the
 * system's chart rules — thin marks (≤ 24 px), a 4 px rounded data end and square at the
 * baseline, hairline solid grid, text in text tokens and never in a series colour, one hue
 * for one series (`data`), the categorical palette only from two, a legend only from two,
 * and no animation: a chart that moves when it loads is decoration (MOTION in tokens.css).
 *
 * A primitive: it knows nothing about lists or toolbars. `ChartExplorer` puts the controls
 * around it; anyone can draw it alone with a `ChartData`.
 */

export type ChartProps = {
  data: ChartData;
  kind?: ChartKind;
  /** Series one on top of the other (bars), or areas stacked (lines). */
  stacked?: boolean;
  /** Bars lying down. By default they lie down when the names are long or many — a column
   *  chart with thirty customers is thirty unreadable tick labels. */
  horizontal?: boolean;
  /** A bar, a point or a slice was pressed: open what fell there. `series` is absent when
   *  the press means every series (a point of a line with several). */
  onPoint?: (category: PivotKey, series?: PivotKey) => void;
  /** The accessible name: what this chart shows. */
  label: string;
  /** The plot's height. By default the chart decides: lying bars grow with their rows. */
  height?: number | string;
};

const MAX_BAR = 24;
const RADIUS = 4;

function colorOf(point: ChartPoint, index: number, alone: boolean): string {
  /* The tail and the previous period are context, not the subject: the de-emphasis grey. */
  if (point.rest === true || point.previous === true) return "var(--color-muted)";
  /* The current period of a comparison is the one series that matters. */
  if (point.id === "\u0000current") return "var(--color-data)";
  if (alone) return "var(--color-data)";
  return `var(--color-series-${String((index % SERIES_COLORS) + 1)})`;
}

/** A swatch: identity rides the mark beside the text, never the text's colour. */
function Swatch({ color, line = false }: { color: string; line?: boolean }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 ${line ? "h-0.5 w-3 rounded-pill" : "size-2.5 rounded-mark"}`}
      style={{ background: color }}
    />
  );
}

export function Chart({
  data,
  kind = "bar",
  stacked: stackedProp = false,
  horizontal: horizontalProp,
  onPoint,
  label,
  height,
}: ChartProps) {
  const copy = useUiCopy();
  const words = copy.chart;
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set());

  const alone = data.series.length <= 1;
  /* Stacking one series is the series: it would only cost the rounded tip and the number. */
  const stacked = stackedProp && !alone && data.compare !== true;
  const number = useMemo(
    /* Grouping ALWAYS: Spanish writes 7000 but 14.000, and one axis cannot say both. */
    () =>
      new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 2, useGrouping: "always" }),
    [copy.locale],
  );
  const compact = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, { notation: "compact", maximumFractionDigits: 1 }),
    [copy.locale],
  );
  const format = (value: number) => data.measure.format?.(value) ?? number.format(value);

  const peak = Math.max(
    0,
    ...data.values.flatMap((row) => row.map((value) => Math.abs(value ?? 0))),
  );
  const negative = data.values.some((row) => row.some((value) => (value ?? 0) < 0));
  /* In full up to the millions (7.000, 14.000), compact from there (2,5 M): Spanish compact
     thousands come out as «7 K» next to «14 k» on the same axis. */
  const tick = (value: number) =>
    peak >= 1_000_000 ? compact.format(value) : number.format(value);

  /* One object per category, the shape Recharts reads: `s0`, `s1`… per series. */
  const rows = useMemo(
    () =>
      data.categories.map((category, c) => {
        const row: Record<string, string | number | null> = { label: category.label };
        data.series.forEach((_, s) => {
          row[`s${String(s)}`] = data.values[c]?.[s] ?? null;
        });
        return row;
      }),
    [data],
  );

  const series = data.series.map((point, index) => ({
    point,
    index,
    key: `s${String(index)}`,
    color: colorOf(point, index, alone),
    shown: !off.has(point.id),
  }));
  const visible = series.filter((one) => one.shown);

  const open = (categoryIndex: number, seriesIndex?: number) => {
    const category = data.categories[categoryIndex];
    if (onPoint === undefined || category === undefined || category.rest === true) return;
    if (seriesIndex === undefined) return onPoint(category.key);
    const one = data.series[seriesIndex];
    /* The tail and the previous period are not records of THIS set: nothing to open. */
    if (one === undefined || one.rest === true || one.previous === true) return;
    onPoint(category.key, one.key);
  };

  const hidden = data.hiddenSeries + data.hiddenCategories;
  const note =
    hidden === 0 ? null : (
      <p className="text-micro text-muted">{fillCopy(words.hidden, { count: hidden })}</p>
    );

  if (data.categories.length === 0 || data.series.length === 0) {
    return <Empty sentence={words.empty} />;
  }

  /* ── The pie: one whole, split. ───────────────────────────────── */
  if (kind === "pie") {
    if (data.totals.some((value) => (value ?? 0) < 0)) {
      return <Empty sentence={words.pieNegative} />;
    }
    const slices = data.categories
      .map((category, index) => ({
        category,
        index,
        value: data.totals[index] ?? 0,
        color: colorOf(category, index, false),
      }))
      .filter((slice) => slice.value > 0);
    const whole = slices.reduce((total, slice) => total + slice.value, 0);
    if (whole === 0) return <Empty sentence={words.empty} />;
    const percent = new Intl.NumberFormat(copy.locale, {
      style: "percent",
      maximumFractionDigits: 1,
    });
    return (
      /* The pie asks ITS width, not the window's: in a narrow board tile the legend goes
         under the ring instead of being squeezed beside it. */
      <figure aria-label={label} className="@container flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col items-center gap-6 @lg:flex-row">
          <div className="relative aspect-square w-full max-w-64 shrink-0">
            <PieChart responsive width="100%" height="100%" title={label}>
              <Pie
                data={slices.map((slice) => ({
                  name: slice.category.label,
                  value: slice.value,
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="98%"
                /* From twelve o'clock, clockwise: how a whole is read. */
                startAngle={90}
                endAngle={-270}
                stroke="var(--color-surface)"
                strokeWidth={2}
                isAnimationActive={false}
                {...(onPoint === undefined
                  ? {}
                  : { onClick: (_: unknown, at: number) => open(slices[at]?.index ?? -1) })}
                cursor={onPoint === undefined ? "default" : "pointer"}
              >
                {slices.map((slice) => (
                  <Cell key={slice.category.id} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                content={(props) => <Readout {...props} format={format} />}
              />
            </PieChart>
            {/* The whole, where the hole is: what the parts are parts of. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-title font-semibold text-ink">{format(whole)}</span>
              <span className="text-micro text-muted">{data.measure.header}</span>
            </div>
          </div>
          <ul className="flex w-full max-w-sm min-w-0 flex-col gap-1.5" aria-label={label}>
            {slices.map((slice) => (
              <li
                key={slice.category.id}
                className="flex min-w-0 items-center gap-2 text-meta"
              >
                <Swatch color={slice.color} />
                <span className="min-w-0 flex-1 truncate text-ink">
                  {slice.category.label}
                </span>
                <span className="shrink-0 text-ink tabular-nums">{format(slice.value)}</span>
                <span className="w-12 shrink-0 text-right text-muted tabular-nums">
                  {percent.format(slice.value / whole)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {note}
      </figure>
    );
  }

  /* ── Bars and lines: categories along an axis. ────────────────── */
  const longest = Math.max(0, ...data.categories.map((category) => category.label.length));
  const horizontal =
    kind === "bar" && (horizontalProp ?? (data.categories.length > 10 || longest > 18));
  const perCategory = stacked || visible.length <= 1 ? 1 : visible.length;
  const size: CSSProperties =
    height !== undefined
      ? { height }
      : horizontal
        ? { height: `${String(data.categories.length * (1 + perCategory * 0.75) + 3)}rem` }
        : {};

  const grid = (
    <CartesianGrid
      vertical={horizontal}
      horizontal={!horizontal}
      stroke="var(--color-line)"
    />
  );
  const tickStyle = { fill: "currentColor" };
  const valueAxis = {
    type: "number" as const,
    tickFormatter: tick,
    tick: tickStyle,
    tickLine: false,
    axisLine: false,
  };
  const categoryAxis = {
    type: "category" as const,
    dataKey: "label",
    tick: tickStyle,
    tickLine: false,
    axisLine: { stroke: "var(--color-line-strong)" },
  };
  const axes = horizontal ? (
    <>
      <XAxis {...valueAxis} />
      <YAxis {...categoryAxis} width="auto" interval={0} />
    </>
  ) : (
    <>
      <XAxis {...categoryAxis} interval="preserveStartEnd" minTickGap={8} />
      <YAxis {...valueAxis} width="auto" />
    </>
  );
  const zero = negative ? (
    <ReferenceLine
      {...(horizontal ? { x: 0 } : { y: 0 })}
      stroke="var(--color-line-strong)"
    />
  ) : null;
  const readout = (props: TooltipContentProps) => (
    <Readout {...props} format={format} compare={data.compare === true} />
  );

  /* The value rides the tip of its bar when there is ONE series: the axis gives the scale,
     the tip gives the number, and nobody has to hover thirty bars to read them. With
     several series it would be a number on every mark, which is noise. */
  const tips =
    !stacked && visible.length === 1 && (horizontal || data.categories.length <= 12);

  let plot: ReactNode;
  if (kind === "bar") {
    plot = (
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        responsive
        width="100%"
        height="100%"
        title={label}
        barGap={2}
        barCategoryGap="20%"
        margin={{
          top: tips && !horizontal ? 20 : 8,
          right: tips && horizontal ? 56 : 8,
          bottom: 0,
          left: 0,
        }}
        stackOffset={negative ? "sign" : "none"}
      >
        {grid}
        {axes}
        {zero}
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: "var(--color-ink)", fillOpacity: 0.04 }}
          content={readout}
        />
        {visible.map((one) => (
          <Bar
            key={one.point.id}
            dataKey={one.key}
            name={one.point.label}
            fill={one.color}
            maxBarSize={MAX_BAR}
            isAnimationActive={false}
            {...(stacked
              ? { stackId: "stack", stroke: "var(--color-surface)", strokeWidth: 1 }
              : {
                  radius: horizontal
                    ? [0, RADIUS, RADIUS, 0]
                    : ([RADIUS, RADIUS, 0, 0] as [number, number, number, number]),
                })}
            cursor={onPoint === undefined ? "default" : "pointer"}
            {...(onPoint === undefined
              ? {}
              : { onClick: (_: unknown, at: number) => open(at, one.index) })}
          >
            {tips ? (
              <LabelList
                dataKey={one.key}
                content={(props) => (
                  <Tip
                    viewBox={props.viewBox}
                    value={props.value}
                    horizontal={horizontal}
                    format={format}
                  />
                )}
              />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    );
  } else {
    const dots = rows.length <= 24;
    const common = {
      data: rows,
      responsive: true,
      width: "100%" as const,
      height: "100%" as const,
      title: label,
      margin: { top: 8, right: 12, bottom: 0, left: 0 },
      ...(onPoint === undefined
        ? {}
        : {
            onClick: (state: { activeIndex?: number | string | null | undefined }) => {
              const at = Number(state.activeIndex);
              if (Number.isInteger(at)) open(at, alone ? 0 : undefined);
            },
            style: { cursor: "pointer" },
          }),
    };
    const ring = { r: 5, stroke: "var(--color-surface)", strokeWidth: 2 };
    const tooltip = (
      <Tooltip
        isAnimationActive={false}
        cursor={{ stroke: "var(--color-line-strong)" }}
        content={readout}
      />
    );
    plot = stacked ? (
      <AreaChart {...common} stackOffset={negative ? "sign" : "none"}>
        {grid}
        {axes}
        {zero}
        {tooltip}
        {visible.map((one) => (
          <Area
            key={one.point.id}
            type="monotone"
            dataKey={one.key}
            name={one.point.label}
            stackId="stack"
            stroke={one.color}
            strokeWidth={2}
            fill={one.color}
            fillOpacity={0.12}
            dot={false}
            activeDot={{ ...ring, fill: one.color }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    ) : (
      <LineChart {...common}>
        {grid}
        {axes}
        {zero}
        {tooltip}
        {visible.map((one) => (
          <Line
            key={one.point.id}
            type="monotone"
            dataKey={one.key}
            name={one.point.label}
            stroke={one.color}
            strokeWidth={2}
            dot={
              dots
                ? { r: 4, fill: one.color, stroke: "var(--color-surface)", strokeWidth: 2 }
                : false
            }
            activeDot={{ ...ring, fill: one.color }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    );
  }

  return (
    <figure aria-label={label} className="flex min-w-0 flex-col gap-3">
      {alone ? null : (
        <ul className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
          {series.map((one) => (
            <li key={one.point.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={one.shown}
                aria-label={fillCopy(one.shown ? words.hideSeries : words.showSeries, {
                  name: one.point.label,
                })}
                /* The last one on cannot be turned off: a chart with nothing on it reads
                   as broken, not as «you hid everything». */
                disabled={one.shown && visible.length === 1}
                onClick={() =>
                  setOff((current) => {
                    const next = new Set(current);
                    if (next.has(one.point.id)) next.delete(one.point.id);
                    else next.add(one.point.id);
                    return next;
                  })
                }
                className={`inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-control px-1.5 py-0.5 text-meta transition-colors duration-(--duration-instant) outline-0 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-primary ${
                  one.shown ? "text-ink" : "text-muted line-through"
                }`}
              >
                <Swatch
                  color={one.shown ? one.color : "var(--color-line-strong)"}
                  line={kind === "line"}
                />
                <span className="truncate">{one.point.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`min-w-0 text-micro text-muted ${height === undefined && !horizontal ? "h-72" : ""}`}
        style={size}
      >
        {plot}
      </div>
      {note}
    </figure>
  );
}

/**
 * The number at the tip of a bar, on ONE line. Recharts' own label wraps to the bar's
 * width, which breaks «Bs. 51.100» in two over a 24 px bar.
 */
function Tip({
  viewBox,
  value,
  horizontal,
  format,
}: {
  viewBox: unknown;
  value: unknown;
  horizontal: boolean;
  format: (value: number) => string;
}) {
  if (typeof value !== "number" || typeof viewBox !== "object" || viewBox === null)
    return null;
  const box = viewBox as { x?: number; y?: number; width?: number; height?: number };
  const { x = 0, y = 0, width = 0, height = 0 } = box;
  /* A negative bar has its tip on the other side of the zero. */
  const below = value < 0;
  return horizontal ? (
    <text
      x={below ? x + width - 6 : x + width + 6}
      y={y + height / 2}
      textAnchor={below ? "end" : "start"}
      dominantBaseline="central"
      fill="var(--color-ink)"
      className="tabular-nums"
    >
      {format(value)}
    </text>
  ) : (
    <text
      x={x + width / 2}
      y={below ? y + height + 6 : y - 6}
      textAnchor="middle"
      dominantBaseline={below ? "hanging" : "auto"}
      fill="var(--color-ink)"
      className="tabular-nums"
    >
      {format(value)}
    </text>
  );
}

/** What hovering (or arrowing to) a category says: its name, and each series' number. */
function Readout({
  active,
  payload,
  label,
  format,
  compare = false,
}: Partial<TooltipContentProps> & { format: (value: number) => string; compare?: boolean }) {
  const copy = useUiCopy();
  const words = copy.chart;
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
    [copy.locale],
  );
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const heading = label ?? payload[0]?.name;
  /* Now against before, said as a change: the number a comparison is asked for. */
  const now = payload[0]?.value;
  const before = payload[1]?.value;
  const change =
    compare && typeof now === "number" && typeof before === "number" && before !== 0
      ? (now - before) / Math.abs(before)
      : null;
  return (
    <div className="max-w-xs min-w-40 rounded-control border border-line-strong bg-surface px-3 py-2 text-micro text-ink shadow-float">
      {heading === undefined || heading === "" ? null : (
        <p className="mb-1.5 truncate font-medium">{String(heading)}</p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((entry) => {
          const color =
            typeof entry.color === "string"
              ? entry.color
              : typeof entry.payload?.fill === "string"
                ? (entry.payload.fill as string)
                : "var(--color-data)";
          return (
            <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
              <Swatch color={color} />
              <span className="min-w-0 flex-1 truncate text-muted">{String(entry.name)}</span>
              <span className="shrink-0 tabular-nums">
                {typeof entry.value === "number" ? format(entry.value) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      {change === null ? null : (
        <p className="mt-1.5 flex items-center justify-between gap-3 border-t border-line pt-1.5">
          <span className="text-muted">{words.change}</span>
          <span className="tabular-nums">{percent.format(change)}</span>
        </p>
      )}
    </div>
  );
}
