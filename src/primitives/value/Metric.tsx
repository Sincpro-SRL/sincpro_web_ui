"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * A metric that also FILTERS: «2 por confirmar», «41 por entregar».
 *
 * Context: it is different from `KeyValue` and from a `ListingBar` counter, and
 * the difference is that this one gets pressed. A number that leads somewhere has
 * to look like something that gets pressed, or nobody discovers that the list can
 * be narrowed from there — which is the most common case of «I didn't know you
 * could do that».
 *
 * ── The color shows up when the narrowing is APPLIED ─────────────────
 *
 * At rest the cards are all the same: sheet background and a hair of border. The
 * only tinted thing is the FIGURE, which is what the card is about. Four
 * different color backgrounds on top of a list are not four filters, they are
 * four stains competing with the rows that don't say which one is applied.
 *
 * The tone paints the background only when the metric is active. There the color
 * does mean something —«I'm only seeing this»— and with a single card lit up
 * there is nothing to compete with.
 *
 * The figure goes big on top and the label small underneath, the other way around
 * from a smart button: here what gets compared at a glance across three cards is
 * the NUMBER.
 */
export type MetricProps = {
  value: number | string;
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  /** Present = narrows the list. Absent = only informs, and doesn't get pressed. */
  onClick?: () => void;
  /** This narrowing is applied. */
  active?: boolean;
  /**
   * How it moved against a NAMED period: `{ by: 0.18, against: "2025" }` draws «↗ +18 % vs
   * 2025». Whether up is good is the domain's (`better`, up by default): more sales is
   * good news, more overdue invoices is not. The arrow carries the direction and the word
   * the period, so the colour is never the only channel.
   */
  change?: { by: number; against: string; better?: "up" | "down" };
};

const TONE: Record<Tone, { background: string; text: string; edge: string }> = {
  neutral: { background: "bg-ink/6", text: "text-ink", edge: "border-ink/20" },
  info: { background: "bg-info/10", text: "text-info", edge: "border-info/35" },
  good: { background: "bg-good/10", text: "text-good", edge: "border-good/35" },
  warn: { background: "bg-warn/12", text: "text-warn", edge: "border-warn/40" },
  bad: { background: "bg-bad/10", text: "text-bad", edge: "border-bad/35" },
  /* The gold can't be text over the canvas (2,43:1), so here the figure goes in
     ink and the tone is only visible when the card is lit up. */
  accent: { background: "bg-accent/20", text: "text-ink", edge: "border-accent/50" },
};

export function Metric({
  value,
  label,
  tone = "neutral",
  icon: Icon,
  onClick,
  active = false,
  change,
}: MetricProps) {
  const copy = useUiCopy();
  const sup = useSurface();
  const t = TONE[tone];
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
    [copy.locale],
  );

  /* At rest the box is the sheet with a hair of border: that is what makes four
     metrics read as one row and not as four notices. Lit up it gets tinted, and
     there the color says which one is applied. */
  const skin = active
    ? `${t.background} ${t.edge}`
    : bySurface(sup, "bg-surface border-line", "bg-chrome-ink/6 border-chrome-ink/15");

  const box = `flex min-w-(--container-metric) shrink-0 flex-col justify-center gap-0.5 rounded-box border px-3.5 py-2 text-left transition-colors duration-(--duration-instant) ${skin} ${
    onClick === undefined
      ? ""
      : "cursor-pointer hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  }`;

  const content = (
    <>
      <span
        className={`flex items-center gap-1.5 text-title font-semibold tabular-nums ${t.text}`}
      >
        {Icon === undefined ? null : (
          <Icon className="size-(--size-icon-md)" strokeWidth={2} aria-hidden />
        )}
        {typeof value === "number" ? value.toLocaleString(copy.locale) : value}
      </span>
      <span className={`text-micro ${bySurface(sup, "text-muted", "text-chrome-muted")}`}>
        {label}
      </span>
      {change === undefined ? null : <Change change={change} format={percent.format} />}
    </>
  );

  if (onClick === undefined) {
    return (
      <div className={box} aria-label={`${value} ${label}`}>
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={box}>
      {content}
    </button>
  );
}

function Change({
  change,
  format,
}: {
  change: NonNullable<MetricProps["change"]>;
  format: (value: number) => string;
}) {
  const copy = useUiCopy();
  const sup = useSurface();
  const up = change.by > 0;
  const flat = change.by === 0;
  const good = flat ? null : up === ((change.better ?? "up") === "up");
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  /* On the chrome the states have their own steps; on the canvas, the usual ones. */
  const color =
    good === null
      ? bySurface(sup, "text-muted", "text-chrome-muted")
      : good
        ? bySurface(sup, "text-good", "text-chrome-good")
        : bySurface(sup, "text-bad", "text-chrome-bad");
  return (
    <span className={`flex items-center gap-1 text-micro tabular-nums ${color}`}>
      {flat ? null : <Arrow className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />}
      {format(change.by)}
      <span className={bySurface(sup, "text-muted", "text-chrome-muted")}>
        {fillCopy(copy.chart.against, { name: change.against })}
      </span>
    </span>
  );
}

/** The row of metrics. It wraps if they don't fit; it doesn't scroll: a hidden
 *  metric is a filter nobody finds. */
export function Metrics({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-stretch gap-2">{children}</div>;
}
