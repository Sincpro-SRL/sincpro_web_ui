"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Sparkline } from "@sincpro/web-ui/primitives/chart/Sparkline";
import { Hint } from "@sincpro/web-ui/primitives/hint/Hint";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { MetricChange, type MetricProps } from "@sincpro/web-ui/primitives/value/Metric";
import type { LucideIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo } from "react";

/**
 * A BOARD: the tiles of a dashboard — Odoo's «Tableros», a BI page — over one slice of data.
 *
 * Context: a board is not a third view. Each tile is a piece that already exists (a `Chart`,
 * a `List`, a `PivotTable`, `Metrics`); what the board adds is the ORDER of the page, and two
 * rules that a page of loose cards breaks:
 *
 *  1. **One filter row, above everything it scopes.** The period and the branch are chosen
 *     once and every tile re-reads the same slice. A filter inside one tile would make two
 *     tiles of the same page answer about two different sets, and nothing on screen would
 *     say so.
 *  2. **The headline numbers first**, then the tiles. What is read in two seconds goes where
 *     the eye lands.
 *
 * The grid asks the CONTAINER and not the window (`@container`): a board inside a panel of
 * the workspace is as narrow as the panel, whatever the screen measures.
 *
 * It knows no domain and folds nothing: the application reads its data with the filters and
 * hands each tile what to draw — the same `Pivot` the list's chart and pivot read.
 *
 * ── Each tile reads on its own, and says so ─────────────────────────
 *
 * N tiles are N readings, and they land one at a time. A board that waited for all of them
 * blanked the page for its slowest tile; one that drew nothing for a failed tile left a hole
 * nobody could explain. So a tile takes its `state` — reading, ready, or failed with the
 * server's refusal and a way to ask again — and draws it in ITS OWN space, the height of the
 * chart it will hold (`--size-tile-body`), so a neighbour landing never moves the grid. The
 * board's own `state` is the same for what the board reads as a whole: its headline numbers.
 * The application (or web-framework's boards) decides each state; web-ui only draws it.
 *
 * ── A tile is a panel of the page, and looks like one ──────────────────
 *
 * A tile used to be a box with a hard border (`line-strong`) and 16 px of air, the radius of
 * a card inside a form: on the near-white ground the border did all the separating, and a
 * page of them read as a wireframe. A tile is a PANEL — the panel's radius, the soft
 * hairline every card has, more air — and its look is its own tokens (`--ui-tile-*`),
 * falling back to the card's.
 *
 * The headline numbers are `BoardStat`s in a `BoardStats` row: tiles too, the same width as
 * the columns under them, the figure in its own type step (`figure`, `hero`) and the trend
 * beside it. `Metric` stays what it is — the chip that filters a list.
 */

/** What a tile — or the board's own headline reading — is doing. */
export type BoardState =
  | { status: "ready" }
  | { status: "loading" }
  | {
      status: "failed";
      /** Why, in the server's words: the refusal, not «something went wrong». */
      sentence: string;
      /** The technical text — a status, an id — that «Copiar el error» carries. */
      detail?: string;
      /** Ask again. Present = the failure offers «Reintentar». */
      onRetry?: () => void;
    };

const READY: BoardState = { status: "ready" };

function Failure({
  heading,
  state,
}: {
  heading: string;
  state: Extract<BoardState, { status: "failed" }>;
}) {
  const copy = useUiCopy();
  return (
    <Failed
      heading={heading}
      sentence={state.sentence}
      {...(state.detail === undefined ? {} : { detail: state.detail })}
      {...(state.onRetry === undefined
        ? {}
        : {
            action: (
              <Button role="secondary" size="sm" onClick={state.onRetry}>
                {copy.failed.retry}
              </Button>
            ),
          })}
    />
  );
}

/** The headline numbers while the board reads them: the strip they will fill, quiet. */
function MetricsReading() {
  const copy = useUiCopy();
  return (
    <div className="flex min-w-0 animate-reveal-late flex-wrap gap-2">
      <span className="sr-only">{copy.failed.loading}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="h-(--size-metric) w-(--container-metric) rounded-box border border-line bg-ink/4"
        />
      ))}
    </div>
  );
}

export type BoardProps = {
  /** What the board is about: «Ventas». */
  title: string;
  description?: ReactNode;
  /** The filters that scope EVERY tile, in one row. */
  filters?: ReactNode;
  /** The headline numbers — `Metrics` — read before the tiles. */
  metrics?: ReactNode;
  /** What the board reads as a whole — its headline numbers. Reading, they are a quiet strip
   *  of their size; failed, the refusal takes their place. The tiles keep their own states. */
  state?: BoardState;
  /** The tiles: `BoardTile`s. */
  children: ReactNode;
};

export function Board({
  title,
  description,
  filters,
  metrics,
  state = READY,
  children,
}: BoardProps) {
  const copy = useUiCopy();
  return (
    /* Its own gutter: a board is a page (or a whole panel), not a piece inside one. */
    <div
      className="@container flex min-w-0 flex-col gap-5 p-4 sm:p-6"
      {...(state.status === "loading" ? { "aria-busy": true } : {})}
    >
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-display font-semibold text-ink">{title}</h1>
          {description === undefined ? null : (
            <p className="mt-1 text-body text-muted">{description}</p>
          )}
        </div>
        {filters === undefined ? null : (
          <div className="flex min-w-0 flex-wrap items-end gap-3">{filters}</div>
        )}
      </header>
      {state.status === "loading" ? (
        <MetricsReading />
      ) : state.status === "failed" ? (
        <Failure heading={copy.board.failed} state={state} />
      ) : (
        metrics
      )}
      <div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-2 @7xl:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

const SPAN = {
  1: "",
  2: "@3xl:col-span-2",
  full: "col-span-full",
} as const;

const ROWS = { 1: "", 2: "@3xl:row-span-2" } as const;

/** The skin every tile shares, a stat tile included: a panel on the ground. */
const TILE = "rounded-ui-tile border border-ui-tile-border bg-ui-tile";

/** The mark of what a tile is about: its icon in a quiet square, never in a colour of its
 *  own — the colour of a tile is its state, not its subject. */
function TileIcon({ icon: Icon, tone }: { icon: LucideIcon; tone?: Tone | undefined }) {
  return (
    <span
      aria-hidden
      className={`flex size-8 shrink-0 items-center justify-center rounded-control ${
        tone === undefined || tone === "neutral" ? "bg-ink/5 text-muted" : TONE[tone].icon
      }`}
    >
      <Icon className="size-(--size-icon-md)" strokeWidth={2} />
    </span>
  );
}

/** A tile's heading: the icon, the title and its ⓘ — what it counts, said on demand. */
function TileHeading({
  title,
  icon,
  hint,
  tone,
  size = "title",
}: {
  title: string;
  icon?: LucideIcon | undefined;
  hint?: ReactNode;
  tone?: Tone | undefined;
  size?: "title" | "label";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {icon === undefined ? null : <TileIcon icon={icon} tone={tone} />}
      <h2
        className={`min-w-0 truncate font-semibold text-ink ${size === "title" ? "text-lead" : "text-meta"}`}
      >
        {title}
      </h2>
      {hint === undefined ? null : <Hint>{hint}</Hint>}
    </div>
  );
}

export type BoardTileProps = {
  title: string;
  /** What the tile is about, beside its title: a mailbox, a shield. */
  icon?: LucideIcon;
  /** What it counts and how, behind an ⓘ: the sentence that does not fit under the title. */
  hint?: ReactNode;
  /** One line under the title: what it counts, or what a press on it does. */
  description?: ReactNode;
  /** The tile's own buttons, at its top right: open the list behind it, download. */
  actions?: ReactNode;
  /** How many columns it takes: a time series reads better wide. */
  span?: keyof typeof SPAN;
  /** How many rows: a tall tile beside two short ones stacked. From two columns up. */
  rows?: keyof typeof ROWS;
  /** Reading, ready or failed. Not ready, the body is the state, the height of a chart; the
   *  title, its description and its actions stay. */
  state?: BoardState;
  children: ReactNode;
};

/** One tile of a `Board`: a titled surface around a chart, a list or a number. */
export function BoardTile({
  title,
  icon,
  hint,
  description,
  actions,
  span = 1,
  rows = 1,
  state = READY,
  children,
}: BoardTileProps) {
  const copy = useUiCopy();
  return (
    <section
      aria-label={title}
      {...(state.status === "loading" ? { "aria-busy": true } : {})}
      data-ui="board.tile"
      className={`flex min-w-0 flex-col gap-4 p-5 ${TILE} ${SPAN[span]} ${ROWS[rows]}`}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <TileHeading title={title} icon={icon} hint={hint} />
          {description === undefined ? null : (
            <p className="mt-0.5 text-meta text-muted">{description}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </header>
      {state.status === "loading" ? (
        /* A quiet block where the chart goes. It appears late, like every skeleton: a fast
           read never shows it. */
        <div className="min-h-(--size-tile-body) animate-reveal-late rounded-control bg-ink/4">
          <span className="sr-only">{copy.failed.loading}</span>
        </div>
      ) : state.status === "failed" ? (
        <div className="flex min-h-(--size-tile-body) flex-col justify-center">
          <Failure heading={fillCopy(copy.board.tileFailed, { title })} state={state} />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/* ==================================================================== *
 *  THE STAT TILE — the headline numbers of a board.
 * ==================================================================== */

const TONE: Record<Tone, { tile: string; icon: string }> = {
  neutral: { tile: "", icon: "bg-ink/5 text-muted" },
  info: { tile: "bg-info/6 border-info/25", icon: "bg-info/12 text-info" },
  good: { tile: "bg-good/6 border-good/25", icon: "bg-good/12 text-good" },
  warn: { tile: "bg-warn/8 border-warn/30", icon: "bg-warn/14 text-warn" },
  bad: { tile: "bg-bad/6 border-bad/25", icon: "bg-bad/12 text-bad" },
  /* The gold never draws the border of a state (PRINCIPLES §3): only the wash. */
  accent: { tile: "bg-accent/12", icon: "bg-accent/20 text-ink" },
};

export type BoardStatProps = {
  /** What the figure counts: «Mensajes recibidos». Sentence case, no colon. */
  label: string;
  /** The figure, already written or a number (written in the copy's locale). Absent — and not
   *  reading — it says «Sin datos»: nothing to compute it from, which is not zero. */
  value?: number | string;
  icon?: LucideIcon;
  /** What it counts and how, behind an ⓘ beside the label. */
  hint?: ReactNode;
  /** A second reading under the figure, already formatted: «de 1.240 recibidos». */
  detail?: string;
  /** How it moved against a NAMED period — the same mark as `Metric.change`. */
  change?: MetricProps["change"];
  /** The last periods, oldest first: drawn as a sparkline beside the figure. */
  trend?: readonly (number | null)[];
  /** The ONE figure the board leads with: the hero step (≥ 48 px) in a tile that holds it
   *  (≥ 20 rem), the figure step in a narrower one. At most one per board. */
  hero?: boolean;
  /**
   * The STATE of the reading, never decoration: a share of clean mail under its floor is
   * `bad`. It tints the tile and its icon; the label, the detail or the hint has to say why
   * in words, because a colour alone is not read by everyone.
   */
  tone?: Tone;
  /** Reading or failed: the figure's place keeps its size, the label stays. */
  state?: BoardState;
  /** Columns in the row of stats. */
  span?: 1 | 2;
};

/**
 * A board's headline figure as a tile: the label (with its icon and ⓘ), the figure big, and
 * under it how it moved and the shape of the last periods.
 *
 * Context: it is NOT a `Metric`. A metric is a chip over a list that narrows it when pressed —
 * small, the size of what it filters. A stat tile is read before anything else on a board
 * and pressed for nothing; it has the width of the columns under it, so the page is one grid,
 * and the figure is in the figure step, in proportional digits (tabular digits space a lone
 * «121» like «000»; they are for columns).
 */
export function BoardStat({
  label,
  value,
  icon,
  hint,
  detail,
  change,
  trend,
  hero = false,
  tone,
  state = READY,
  span = 1,
}: BoardStatProps) {
  const copy = useUiCopy();
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(copy.locale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }),
    [copy.locale],
  );
  const loading = state.status === "loading";
  const missing = value === undefined;
  const figure = missing
    ? copy.board.noData
    : typeof value === "number"
      ? value.toLocaleString(copy.locale)
      : value;
  const shade = tone === undefined ? "" : TONE[tone].tile;
  return (
    <section
      aria-label={label}
      {...(loading ? { "aria-busy": true } : {})}
      data-ui="board.stat"
      {...(tone === undefined ? {} : { "data-tone": tone })}
      /* Its own container: the lead figure's step is the tile's width, not the window's. */
      className={`@container flex min-w-0 flex-col gap-3 p-5 ${TILE} ${shade} ${span === 2 ? "@xl:col-span-2" : ""}`}
    >
      {/* An h2 like any tile: the stats come right under the board's h1, and a heading
          that skips a level loses a screen reader's outline. Its size is the label's. */}
      <TileHeading title={label} icon={icon} hint={hint} tone={tone} size="label" />
      {state.status === "failed" ? (
        <Failure heading={fillCopy(copy.board.tileFailed, { title: label })} state={state} />
      ) : (
        /* The figure first: when it and its trend do not fit side by side the trend goes under
           it (wraps), and the lead figure (`hero`) takes its big step only in a tile that holds
           it (≥ 20 rem) — the number the tile exists for is never the part that is cut. Only a
           figure wider than its tile alone truncates. */
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            {loading ? (
              <span
                aria-hidden
                className={`inline-block w-24 animate-reveal-late rounded-control bg-ink/8 ${hero ? "h-(--text-figure) @xs:h-(--text-hero)" : "h-(--text-figure)"}`}
              />
            ) : (
              <span
                data-ui="board.stat.value"
                /* Sized to fit its tile (`figure-fit`): a long figure steps down instead of
                   being cut. The title step is the floor — past it, «…» and the whole figure
                   in the title, the last resort for a tile narrower than any number. */
                title={typeof figure === "string" ? figure : undefined}
                style={
                  {
                    ...(typeof figure === "string"
                      ? { "--figure-length": figure.length }
                      : {}),
                    ...(hero ? { "--figure-step": "var(--text-hero)" } : {}),
                  } as CSSProperties
                }
                className={`figure-fit min-w-0 truncate font-semibold text-ink ${missing ? "text-muted" : ""}`}
              >
                {figure}
              </span>
            )}
            {loading ? <span className="sr-only">{copy.failed.loading}</span> : null}
            {loading || (detail === undefined && change === undefined) ? null : (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                {change === undefined ? null : (
                  <MetricChange change={change} format={percent.format} />
                )}
                {detail === undefined ? null : (
                  <span className="min-w-0 truncate text-micro text-muted">{detail}</span>
                )}
              </div>
            )}
          </div>
          {loading || trend === undefined ? null : (
            <div className="w-2/5 max-w-40 shrink-0 pb-1">
              <Sparkline values={trend} label={label} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The row of a board's stat tiles: as wide as the grid under it, every tile the same width —
 * two per row when the board is narrow, all in one row from a wide board up. A row of
 * figures of different widths reads as figures of different kinds.
 */
export function BoardStats({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-flow-col @5xl:grid-cols-none @5xl:auto-cols-fr">
      {children}
    </div>
  );
}
