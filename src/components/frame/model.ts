import { currentCopy, currentCopyLocale, fillCopy } from "@sincpro/web-ui/foundations/copy";

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

export type SeriesBar = {
  label: string;
  count: number;
  /** A stretch of a numeric column, `[from, to)` — the last one closed. Present = the
   *  bars are a histogram: they go side by side along a number line, not ranked. */
  bin?: { from: number; to: number };
};

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

/** A cell read as a number: a number, or a text that writes one («12,5»). Anything else is
 *  `null` — not a zero. */
export function cellNumber(cell: FrameCell): number | null {
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
 * Turn one column into bars: a histogram with round edges if the values are numbers, the
 * most frequent labels otherwise — the tail gathered into «others». Twelve bars is the
 * ceiling: more than that is a table again.
 */
export function columnSeries(frame: Frame, columnId: string): SeriesBar[] {
  const columnIndex = frame.columns.findIndex((column) => column.id === columnId);
  const column = frame.columns[columnIndex];
  if (column === undefined || columnIndex < 0) return [];

  const cells: FrameCell[] = [];
  for (let row = 0; row < frame.rows; row += 1) {
    cells.push(frame.value(row, column, columnIndex));
  }

  const numbers = cells.map(cellNumber);
  const numeric = numbers.filter((n): n is number => n !== null);
  const filled = cells.filter(present).length;
  if (filled === 0) return [];

  if (column.numeric === true || numeric.length / filled >= 0.8) {
    return histogram(numeric);
  }
  return categories(cells);
}

/** A step a person reads without effort: 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Stretches with ROUND edges: 0–100, 100–200, not 1,4–35,6. How many follows the number of
 * values (Sturges: ten values make five stretches, six hundred make eleven) and never more
 * than twelve. A stretch with nothing in it stays — it is part of the shape — and counts 0.
 */
function histogram(values: number[]): SeriesBar[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ label: formatTick(min), count: values.length }];

  const target = Math.min(BINS, Math.max(2, Math.ceil(Math.log2(values.length)) + 1));
  let step = niceStep((max - min) / target);
  let start = Math.floor(min / step) * step;
  let bins = Math.max(1, Math.ceil((max - start) / step));
  while (bins > BINS) {
    step = niceStep(step * 1.01);
    start = Math.floor(min / step) * step;
    bins = Math.max(1, Math.ceil((max - start) / step));
  }
  /* Edges are rounded to the step's own precision: 0.1 × 3 is 0.30000000000000004. */
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const edge = (index: number) => Number((start + index * step).toFixed(digits));

  const counts = Array.from({ length: bins }, () => 0);
  for (const value of values) {
    const slot = Math.min(bins - 1, Math.floor((value - start) / step));
    counts[slot] = (counts[slot] ?? 0) + 1;
  }
  return counts.map((count, index) => {
    const from = edge(index);
    const to = edge(index + 1);
    return { label: `${formatTick(from)}–${formatTick(to)}`, count, bin: { from, to } };
  });
}

function categories(cells: FrameCell[]): SeriesBar[] {
  const tally = new Map<string, number>();
  for (const cell of cells) {
    if (!present(cell)) continue;
    const label = String(cell);
    tally.set(label, (tally.get(label) ?? 0) + 1);
  }
  const ranked = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label: label === "" ? currentCopy().cell.emptyBin : label,
      count,
    }));
  if (ranked.length <= TOP) return ranked;
  /* The tail is gathered, not dropped: the bars still add up to the rows that were counted,
     and «others (388)» says how long the tail is — often the finding itself. */
  const kept = ranked.slice(0, TOP - 1);
  const tail = ranked.slice(TOP - 1);
  return [
    ...kept,
    {
      label: fillCopy(currentCopy().chart.rest, { count: tail.length }),
      count: tail.reduce((total, bar) => total + bar.count, 0),
    },
  ];
}

function formatTick(n: number): string {
  return n.toLocaleString(currentCopyLocale(), { maximumFractionDigits: 2 });
}
