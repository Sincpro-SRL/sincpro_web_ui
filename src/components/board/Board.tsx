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
 */
export type BoardProps = {
  /** What the board is about: «Ventas». */
  title: string;
  description?: ReactNode;
  /** The filters that scope EVERY tile, in one row. */
  filters?: ReactNode;
  /** The headline numbers — `Metrics` — read before the tiles. */
  metrics?: ReactNode;
  /** The tiles: `BoardTile`s. */
  children: ReactNode;
};

export function Board({ title, description, filters, metrics, children }: BoardProps) {
  return (
    /* Its own gutter: a board is a page (or a whole panel), not a piece inside one. */
    <div className="@container flex min-w-0 flex-col gap-5 p-4 sm:p-6">
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
      {metrics}
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
  children: ReactNode;
};

/** One tile of a `Board`: a titled surface around a chart, a list or a number. */
export function BoardTile({
  title,
  description,
  actions,
  span = 1,
  children,
}: BoardTileProps) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-4 rounded-box border border-line-strong bg-surface p-4 ${SPAN[span]}`}
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
      {children}
    </section>
  );
}
