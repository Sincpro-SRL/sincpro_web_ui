"use client";

import { stickyTop, useScrollBox } from "@sincpro/web-ui/foundations/sticky";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown } from "lucide-react";
import { createContext, type ReactNode, useContext, useId } from "react";

/* ==================================================================== *
 *  TABLE — the way this product shows N records.
 *
 *  Dense, but readable, and a single split is what makes that possible:
 *
 *      the header in PROPORTIONAL        is a word
 *      a number in TABULAR FIGURES       is a value that lines up with the one below
 *
 *  That is what makes a table readable at a glance: the eye tells the frame
 *  apart from the content without reading either of them. Everything in mono
 *  —which is where this product came from— turned the header into just another
 *  row of data, and the whole report into a terminal. Mono is now for codes
 *  only, and only when a cell asks for it.
 *
 *  ── Three sort states, not two ──────────────────────────────────────
 *
 *  Ascending, descending and **unsorted**. The third one is not a luxury: the
 *  natural order of a delivery queue is the order they arrived in, and a table that
 *  only toggles asc/desc has no way back to it. Losing the original order and
 *  not being able to get it back is the number one complaint about any
 *  sortable table.
 *
 *  ── The header stays pinned ─────────────────────────────────────────
 *
 *  It is the difference between a long table you can read and one where, by
 *  row forty, nobody knows which column they are looking at any more. It needs
 *  the box to have a height: without `height` there is no scroll of its own
 *  and nothing to stick to.
 * ==================================================================== */

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export function Table({
  children,
  /** With a height, the table scrolls on its own and the header sticks.
   *  Without a height, the page scrolls and the header goes away. */
  height,
}: {
  children: ReactNode;
  /** A number means pixels; a string goes through as is, so `26rem` follows the
   *  system scale instead of pinning a size in pixels. */
  height?: number | string;
}) {
  const caja = useScrollBox<HTMLDivElement>(height === undefined ? {} : { height });

  return (
    /* Cuándo esta caja es un contenedor de scroll y cuándo no lo decide
       `useScrollBox`: ahí vive el dilema entero y ahí vive su explicación. Las
       tres tablas del sistema lo resolvían con tres copias de la misma
       medición. */
    <div ref={caja.ref} className={`min-w-0 ${caja.className}`} style={caja.style}>
      <table className="w-full border-separate border-spacing-0 px-1 text-left">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    /* Se pega DEBAJO de lo que ya esté pegado —la barra de la aplicación y la
       de la lista— y no en `top: 0`, que lo metía atrás de las dos. Sin alto en
       `Table` el que scrollea es la página, y ahí la diferencia es justamente
       la que hacía desaparecer los nombres de columna. Ver `system/sticky.tsx`. */
    <thead className="sticky z-10 bg-ground" style={stickyTop}>
      <tr>{children}</tr>
    </thead>
  );
}

/** A column. If it gets a `sortKey`, it can be sorted.
 *
 *  The icon is ALWAYS there, dimmed when the column is not the sorted one: an
 *  indicator that only shows up once you sort does not say which columns are
 *  sortable, and then you have to try them one by one. */
export function Th({
  children,
  sortKey,
  sort,
  onSort,
  numeric = false,
  align,
  width,
}: {
  children: ReactNode;
  sortKey?: string;
  sort?: SortState | null;
  onSort?: (next: SortState | null) => void;
  /** Numbers align to the right: that is what lets you compare orders of
   *  magnitude without reading the figures. */
  numeric?: boolean;
  /** The alignment, when it is NOT because it is a number. They are two
   *  different things: `numeric` says «this is a figure» and drags along the
   *  right alignment and the tabular figures; `align` only pushes. A status
   *  label on the right is not a number. */
  align?: "left" | "right";
  /** A number means pixels; a string goes through as is, so `6rem` follows the
   *  system scale instead of pinning a size in pixels. */
  width?: number | string;
}) {
  const active = sortKey !== undefined && sort?.key === sortKey;
  const dir = active ? sort.direction : undefined;

  function nextSort() {
    if (sortKey === undefined || onSort === undefined) return;
    // asc → desc → unsorted. The third click puts the table back the way it was.
    if (!active) onSort({ key: sortKey, direction: "asc" });
    else if (dir === "asc") onSort({ key: sortKey, direction: "desc" });
    else onSort(null);
  }

  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <th
      scope="col"
      style={width === undefined ? undefined : { width }}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`border-b border-line-strong px-3 py-2 text-meta font-medium whitespace-nowrap text-muted ${
        (align ?? (numeric ? "right" : "left")) === "right" ? "text-right" : "text-left"
      }`}
    >
      {sortKey === undefined ? (
        children
      ) : (
        <button
          type="button"
          onClick={nextSort}
          className={`inline-flex items-center gap-1 rounded-control transition-colors duration-(--duration-instant) hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
            (align ?? (numeric ? "right" : "left")) === "right" ? "flex-row-reverse" : ""
          } ${active ? "text-ink" : ""}`}
        >
          {children}
          <Icon
            className={`size-(--size-icon-sm) shrink-0 ${active ? "text-primary" : "text-line-strong"}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      )}
    </th>
  );
}

/** The wash of a row lives on the cells, not on the `<tr>`. A background on the
 *  row paints edge to edge; on the cells the ends can round and the table's
 *  padding keeps the mark off the card. */
const RowMark = createContext(false);

const ROW_WASH = "group-hover/row:bg-ink/4";
const ROW_ON = "bg-primary/8";

function rowWash(selected: boolean): string {
  return selected ? ROW_ON : ROW_WASH;
}

export function Tr({
  children,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <RowMark.Provider value={selected}>
      <tr
        onClick={onClick}
        className={`group/row ${onClick === undefined ? "" : "cursor-pointer"}`}
      >
        {children}
      </tr>
    </RowMark.Provider>
  );
}

/**
 * A row that opens its own detail underneath.
 *
 * Context: `DataTable` expands GROUPS —TanStack takes care of that— and that is
 * not enough for the most common case in this product: a column that opens up
 * to show its distribution. That is not a group, it is the detail of ONE row,
 * and every view was writing it by hand with its own `colSpan` and its own
 * chevron.
 *
 * The trigger is the first cell and not a column of chevrons: a whole column
 * for a 12 px control is width that a twelve-column table needs.
 */
export function TrDetail({
  children,
  detail,
  open,
  onToggle,
  columns,
  label,
  selected = false,
}: {
  children: ReactNode;
  detail: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** How many columns the table has, so the detail spans all of them. */
  columns: number;
  /** What is being opened, for the screen reader: «distribución de importe». */
  label: string;
  selected?: boolean;
}) {
  const id = useId();
  return (
    <RowMark.Provider value={selected}>
      <>
        <tr onClick={onToggle} className="group/row cursor-pointer">
          <td
            className={`border-b border-line py-1.5 pr-0 pl-2.5 align-middle first:rounded-l-control ${rowWash(selected)}`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-expanded={open}
              aria-controls={id}
              aria-label={label}
              className="inline-flex size-5 items-center justify-center rounded-pill text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ChevronRight
                className={`size-(--size-icon-sm) transition-transform duration-(--duration-instant) ${
                  open ? "rotate-90" : ""
                }`}
                strokeWidth={2}
              />
            </button>
          </td>
          {children}
        </tr>

        {/* The detail row stays in the DOM ALWAYS and just hides: if it went away,
          React would unmount what is inside and reopening it would lose its
          state —a recomputed chart, a scroll position—. It is the same rule as
          the composer's maximized panel. */}
        <tr id={id} hidden={!open}>
          <td colSpan={columns + 1} className="border-b border-line bg-ground px-3 py-3">
            {detail}
          </td>
        </tr>
      </>
    </RowMark.Provider>
  );
}
/** The background of a cell, by tone. It replaces the row wash on that cell:
 *  a hovered row and a painted cell are two signals, and stacking them reads
 *  as a third color. */
export const CELL_TONE: Record<Tone, string> = {
  neutral: "bg-ink/6",
  info: "bg-info/12",
  good: "bg-good/12",
  warn: "bg-warn/15",
  bad: "bg-bad/12",
  accent: "bg-accent/20",
};

export function Td({
  children,
  numeric = false,
  align,
  /** A CODE — an id, a hash, a key — set in the monospaced face. Off by default: a
   *  number does not need it (a numeric cell gets tabular figures on its own), and a
   *  name in mono reads like a log, not like a report. */
  mono = false,
  /** Paints the whole cell. For what the eye has to find without reading: an
   *  imputed value, one out of range, a row that changed.
   *
   *  Context: it is the CELL and not the text. Tinting the text says «this
   *  number is of another kind»; tinting the cell says «look here», which is
   *  something else — and in a table of forty rows by six columns, colored text
   *  gets lost. */
  tone,
  title,
}: {
  children: ReactNode;
  numeric?: boolean;
  /** Pushes without saying it is a number. See the note on `Th`. */
  align?: "left" | "right";
  mono?: boolean;
  tone?: Tone;
  /** Why it is painted. A colored cell with no explanation is a question. */
  title?: string;
}) {
  const selected = useContext(RowMark);
  return (
    <td
      title={title}
      className={`border-b border-line px-3 py-1.5 text-meta text-ink first:rounded-l-control last:rounded-r-control ${
        (align ?? (numeric ? "right" : "left")) === "right" ? "text-right" : "text-left"
      } ${mono ? "font-mono tabular-nums" : numeric ? "tabular-nums" : ""} ${
        tone === undefined ? rowWash(selected) : CELL_TONE[tone]
      }`}
    >
      {children}
    </td>
  );
}

/** The selection checkbox, with its third state.
 *
 *  «some» is not an ornament: without it, the header checkbox of a table with
 *  three of forty rows selected lies in both directions — empty says «none»
 *  and filled says «all». */
export function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      ref={(el) => {
        if (el !== null) el.indeterminate = indeterminate && !checked;
      }}
      onChange={(e) => onChange?.(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="size-3.5 shrink-0 cursor-pointer accent-primary"
    />
  );
}

/* `BulkBar` used to live here and was deleted: selection now transforms the
   `ListingBar` in its place, which is better for one concrete reason — a bar
   that APPEARS pushes the list down right when somebody is ticking checkboxes,
   and the row they were about to tick is no longer where it was.

   It gets deleted instead of kept «just in case»: a piece with no consumers is
   one that somebody will use tomorrow without knowing it was replaced. */
