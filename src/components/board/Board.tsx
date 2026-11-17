"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import type { ReactNode } from "react";

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

export type BoardTileProps = {
  title: string;
  /** One line under the title: what it counts, or what a press on it does. */
  description?: ReactNode;
  /** The tile's own buttons, at its top right: open the list behind it, download. */
  actions?: ReactNode;
  /** How many columns it takes: a time series reads better wide. */
  span?: keyof typeof SPAN;
  /** Reading, ready or failed. Not ready, the body is the state, the height of a chart; the
   *  title, its description and its actions stay. */
  state?: BoardState;
  children: ReactNode;
};

/** One tile of a `Board`: a titled surface around a chart, a list or a number. */
export function BoardTile({
  title,
  description,
  actions,
  span = 1,
  state = READY,
  children,
}: BoardTileProps) {
  const copy = useUiCopy();
  return (
    <section
      aria-label={title}
      {...(state.status === "loading" ? { "aria-busy": true } : {})}
      data-ui="board.tile"
      className={`flex min-w-0 flex-col gap-4 rounded-ui-card border border-line-strong bg-ui-card p-4 ${SPAN[span]}`}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead font-semibold text-ink">{title}</h2>
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
