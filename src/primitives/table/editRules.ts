/**
 * THE RULES OF AN EDITABLE TABLE that need no browser: where a column goes in a stacked
 * card, which lines a section heads, where `Tab` goes from the edge of a row. Apart from
 * `EditableTable.tsx` and without `"use client"`, so a server component — and a test —
 * reads them as plain functions.
 */

/** Where a column goes when the row is drawn as a stacked card (a narrow box).
 *  `trail` sits at the top right, beside the title — a state, the row's buttons. */
export type StackPlace = "title" | "detail" | "amount" | "trail" | "hidden";

/** The lines each section heads: the rows after it up to the next section. Notes do not
 *  cut a section, and are not lines. */
export function sectionLines<T>(
  rows: readonly T[],
  getRowId: (row: T) => string,
  kind: (row: T) => "section" | "note" | null,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  let current: T[] | null = null;
  for (const row of rows) {
    const k = kind(row);
    if (k === "section") {
      current = [];
      out.set(getRowId(row), current);
    } else if (k === null) current?.push(row);
  }
  return out;
}

/**
 * Where each column goes in the stacked card, defaults resolved: a declared `stack`
 * wins; otherwise the first undeclared column is the title (unless one was declared),
 * the last undeclared numeric one is the amount (unless one was declared), and the rest
 * are detail.
 */
export function stackPlaces(
  columns: readonly { stack?: StackPlace; numeric?: boolean }[],
): StackPlace[] {
  const titleAt = columns.some((c) => c.stack === "title")
    ? -1
    : columns.findIndex((c) => c.stack === undefined);
  const amountAt = columns.some((c) => c.stack === "amount")
    ? -1
    : columns.findLastIndex(
        (c, i) => c.stack === undefined && c.numeric === true && i !== titleAt,
      );
  return columns.map(
    (c, i) => c.stack ?? (i === titleAt ? "title" : i === amountAt ? "amount" : "detail"),
  );
}

/** Where `Tab` goes from the edge of an edited row: the next or previous row opened, a new
 *  row added, or out of the table the browser's way. */
export type TabTarget = { kind: "row"; id: string } | { kind: "add" } | { kind: "leave" };

/**
 * Where `Tab` past the last control (`next`) or `Shift+Tab` before the first (`prev`) of
 * the edited row `from` goes, over the rows in the order they are drawn.
 *
 * Past the last row it adds one when the table can — unless `from` is itself a row just
 * added and still blank: one more `Tab` there means «I am done», not «another blank line».
 */
export function tabTarget(
  order: readonly string[],
  from: string,
  direction: "next" | "prev",
  { canAdd, blank }: { canAdd: boolean; blank: boolean },
): TabTarget {
  const at = order.indexOf(from);
  if (at === -1) return { kind: "leave" };
  const to = order[direction === "next" ? at + 1 : at - 1];
  if (to !== undefined) return { kind: "row", id: to };
  return direction === "next" && canAdd && !blank ? { kind: "add" } : { kind: "leave" };
}
