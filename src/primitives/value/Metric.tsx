"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";

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
}: MetricProps) {
  const copy = useUiCopy();
  const sup = useSurface();
  const t = TONE[tone];

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

/** The row of metrics. It wraps if they don't fit; it doesn't scroll: a hidden
 *  metric is a filter nobody finds. */
export function Metrics({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-stretch gap-2">{children}</div>;
}
