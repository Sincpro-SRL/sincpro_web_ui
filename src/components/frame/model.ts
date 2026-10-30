import { currentCopy, currentCopyLocale } from "@sincpro/web-ui/foundations/copy";

/**
 * A FRAME is a rectangle of values: columns × rows.
 *
 * It is not a domain record and it is not a set of records. ListView talks
 * about N entities of the same kind (the Facturas list, a queue). Record talks
 * about ONE entity. The frame talks about the PAYLOAD — the cells that a
 * record carries, or that a glance extracted from a file — so they can be
 * shown as a table or as a chart, and so a column can be hidden, without the
 * design system knowing what an invoice is.
 *
 * The value is a function, not a copied matrix: the consumer already has the
 * bytes somewhere and this layer only reads them.
 */

export type FrameCell = string | number | null;

export type FrameColumn = {
  id: string;
  header: string;
  type?: string;
  numeric?: boolean;
  width?: number;
  /** Payload columns default to optional. Set `false` to pin a column. */
  optional?: boolean;
  defaultHidden?: boolean;
};

export type Frame = {
  columns: readonly FrameColumn[];
  rows: number;
  value: (row: number, column: FrameColumn, columnIndex: number) => FrameCell;
};

export type FramePresent = "table" | "chart";

export type SeriesBar = { label: string; count: number };

const BINS = 12;
const TOP = 12;

export function frameFromRows(
  columns: readonly FrameColumn[],
  rows: readonly (readonly FrameCell[])[],
): Frame {
  return {
    columns,
    rows: rows.length,
    value: (row, _column, columnIndex) => rows[row]?.[columnIndex] ?? null,
  };
}

/** Keep only some columns. The cells still come from the original frame. */
export function withColumns(frame: Frame, ids: readonly string[]): Frame {
  const wanted = new Set(ids);
  const columns = frame.columns.filter((column) => wanted.has(column.id));
  const indexOf = new Map(frame.columns.map((column, index) => [column.id, index]));
  return {
    columns,
    rows: frame.rows,
    value: (row, column) => {
      const index = indexOf.get(column.id) ?? 0;
      return frame.value(row, column, index);
    },
  };
}

function asNumber(cell: FrameCell): number | null {
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (typeof cell === "string" && cell.trim() !== "") {
    const n = Number(cell.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function present(cell: FrameCell): boolean {
  return cell !== null && cell !== "";
}

/**
 * Turn one column into bars: a histogram if the values are numbers, the
 * most frequent labels otherwise. Twelve bars is the ceiling — more than
 * that is a table again.
 */
export function columnSeries(frame: Frame, columnId: string): SeriesBar[] {
  const columnIndex = frame.columns.findIndex((column) => column.id === columnId);
  const column = frame.columns[columnIndex];
  if (column === undefined || columnIndex < 0) return [];

  const cells: FrameCell[] = [];
  for (let row = 0; row < frame.rows; row += 1) {
    cells.push(frame.value(row, column, columnIndex));
  }

  const numbers = cells.map(asNumber);
  const numeric = numbers.filter((n): n is number => n !== null);
  const filled = cells.filter(present).length;
  if (filled === 0) return [];

  if (column.numeric === true || numeric.length / filled >= 0.8) {
    return histogram(numeric);
  }
  return categories(cells);
}

function histogram(values: number[]): SeriesBar[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ label: String(min), count: values.length }];

  const width = (max - min) / BINS;
  const counts = Array.from({ length: BINS }, () => 0);
  for (const value of values) {
    const slot = Math.min(BINS - 1, Math.floor((value - min) / width));
    counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return counts.map((count, index) => {
    const from = min + index * width;
    const to = index === BINS - 1 ? max : from + width;
    return { label: `${formatTick(from)}–${formatTick(to)}`, count };
  });
}

function categories(cells: FrameCell[]): SeriesBar[] {
  const tally = new Map<string, number>();
  for (const cell of cells) {
    if (!present(cell)) continue;
    const label = String(cell);
    tally.set(label, (tally.get(label) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP)
    .map(([label, count]) => ({
      label: label === "" ? currentCopy().cell.emptyBin : label,
      count,
    }));
}

function formatTick(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100 || Number.isInteger(n)) return String(Math.round(n));
  return n.toLocaleString(currentCopyLocale(), { maximumFractionDigits: 1 });
}
