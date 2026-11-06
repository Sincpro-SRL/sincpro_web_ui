import {
  type GroupLevel,
  pathKey,
  pathLabels,
  pileLabel,
  type PileLabelOf,
  type PileOf,
} from "@sincpro/web-ui/foundations/grouping";

/**
/**
 * THE PIVOT: piles crossed by piles.
 *
 * Grouping splits a set by what its rows share. Pivoting splits it TWICE at
 * once, along different axes, and reads the number where the two cuts meet:
 * the customer going down, the month going right, and at the crossing how many
 * rows there are and what they add up to.
 *
 * ── Three rules, none of them cosmetic ──────────────────────────────
 *
 *  1. **The grid is drawn from the AXES, not from the crossings.** `rows.keys` and
 *     `columns.keys` carry every key that appeared, in order; crossings are
 *     ASKED FOR one at a time. A pivot is mostly holes —twelve customers
 *     by twenty-four months are 288 cells and forty with rows— and deducing the
 *     grid by walking the crossings leaves out the month in which nothing happened,
 *     which is exactly the column somebody is looking for.
 *
 *  2. **Margins come folded from the BASE.** An average of averages is not an
 *     average and a median of medians is nothing, so `rowTotal`,
 *     `columnTotal` and `total` are received: this layer never invents them by adding up
 *     the row it just drew. Without them there is no totals band, which is the
 *     honest answer when nobody computed them.
 *
 *  3. **A hole is not a zero.** `undefined` is «there is no row there» and
 *     `0` is «there are rows and they add up to zero». The grid draws them differently because
 *     they mean different things.
 *
 * ── What is ASKED FOR and what is DRAWN ─────────────────────────────
 *
 * As with piles: `PivotSpec` is what somebody asked for —which fields to split
 * each axis by, which measures to fold— and `Pivot` is what is drawn, already
 * folded. They are separate because folding is not always done by this machine: a
 * sales book of a hundred and eighty-seven rows of which twelve were downloaded is folded by whoever
 * stores it, and `pivotFrom` is a helper for when the whole set is in the
 * browser, not the only path.
 *
 * **This knows no engine.** No criteria, no cursors, no transport: an
 * axis here is a list of readable paths and a crossing is a count with numbers
 * beside it. Whoever translates a server's answer into this shape lives outside, and
 * that is why the same grid serves a pivot built in the browser and one
 * folded a thousand kilometres away.
 */

/**
 * The key of a row or a column: the PATH through the levels of its axis, already
 * readable.
 *
 * It is a path and not a value for the same reason a pile's is: with two
 * levels set, «2026-09» can be a month inside «Ferretería Sur» and another
 * inside «Distribuidora Andina», and they are two different rows of the grid.
 */
export type PivotKey = readonly string[];

/**
/**
 * ONE LEVEL of an axis: what it was split by, and how it reads.
 *
 * It carries the WHOLE level and not just its label because a level's label is
 * not enough to read its keys: with «registrado» in view, «2026-09» is still
 * «2026-09». The grain is what allows saying «Septiembre», and the field is what
 * lets us know the month hangs from the year above and so there is no need
 * to repeat it.
 */
export type PivotLevel = GroupLevel & {
  /** What this cut is called: it is what the grid's corner says. Without it,
   *  a column does not make clear whether it is when it was registered or when it was run. */
  label: string;
};

/** One AXIS of the pivot: what was asked, and which keys appeared. */
export type PivotAxis = {
  /** The levels, from the outside in. */
  levels: readonly PivotLevel[];
  /** Every key that appeared, in order. **The grid is drawn from here.** */
  keys: readonly PivotKey[];
};

/**
 * HOW TO READ A KEY of the axis, segment by segment.
 *
 * The key identifies —«2026-09» is what the engine writes and what is compared
 * with what the server counted— and the label is read. They are two texts, as in
 * a pile, and for the same reason: with the label as identity, two Septembers
 * of different years would be the same one.
 *
 * `within` comes from the levels ABOVE of the same field: with the year outside, the
 * month is said «Septiembre» and not «Septiembre de 2026», because that is already written
 * two columns earlier.
 */
export function axisLabels(
  axis: PivotAxis,
  key: PivotKey,
  label: PileLabelOf = pileLabel,
): readonly string[] {
  return pathLabels(axis.levels, key, label);
}

/** A MEASURE: one of the numbers folded at each crossing. */
export type PivotMeasure = {
  id: string;
  header: string;
  /** For a percentage or a variation, which are not read like an amount. */
  format?: (value: number) => string;
  /**
   * How the measure reads in a SPREADSHEET: the Excel format code,
   * `#,##0.00`, `0.0%`, `#,##0 "Bs."`.
   *
   * It is separate from `format` because they are two different things: `format` is a
   * JavaScript function, and a file cannot carry a function inside.
   * Without this the number comes out in the general format — it is still a number and can
   * still be summed, which is what must not be lost.
   */
  numberFormat?: string;
  /**
   * The measure IS SUMMED: the fold of two piles together is the sum of their folds —an
   * amount, a count—. An average is not, and neither is a median.
   *
   * The chart reads it, since it sometimes has to gather a tail into «otros» or accumulate a
   * line: with this the sum tells the truth, and without it the tail is left out and flagged,
   * because adding averages invents a number nobody folded (rule 2 above).
   */
  additive?: boolean;
};

/**
 * A crossing already folded: how many rows are underneath and what the measures give.
 *
 * `count` is separate from the measures and not one more of them: it is the only one that can
 * always be answered, and it is the one that says whether an empty cell is empty because there are no
 * rows or because the ones there are do not have that number.
 */
export type PivotCell = {
  count: number;
  /** One number per measure, by id. `null` is «this measure is not answered here» and
   *  it is different from `0`. */
  values: Readonly<Record<string, number | null>>;
};

/** THE PIVOT, ready to draw. */
export type Pivot = {
  rows: PivotAxis;
  columns: PivotAxis;
  measures: readonly PivotMeasure[];
  /** The crossing where a row meets a column, or `undefined` when there is
   *  no row there. It is asked for and not walked: see rule 1. */
  cell: (row: PivotKey, column: PivotKey) => PivotCell | undefined;
  /** The whole row, folded from the base. Absent = no totals band on the
   *  right, because nobody computed them and cells are not summed here. */
  rowTotal?: (row: PivotKey) => PivotCell | undefined;
  /** The whole column, folded from the base. */
  columnTotal?: (column: PivotKey) => PivotCell | undefined;
  /** Everything that came in, folded once. */
  total?: PivotCell;
};

/* ---------------------------------------------------------------- *
 *  FROM OUTSIDE: the pivot folded by whoever stores the data
 * ---------------------------------------------------------------- */

/** A crossing, with its two keys. It is the shape in which a sparse grid travels:
 *  only the crossings that have rows. */
export type PivotCrossing = PivotCell & {
  row: PivotKey;
  column: PivotKey;
};

/** A margin: the key of its axis and what that whole row —or column— gives. */
export type PivotMargin = PivotCell & { key: PivotKey };

export type PivotSource = {
  rows: PivotAxis;
  columns: PivotAxis;
  measures: readonly PivotMeasure[];
  /** Only the crossings with rows. The missing ones are holes. */
  crossings: readonly PivotCrossing[];
  /** One per row key. Without this there is no totals column. */
  rowMargins?: readonly PivotMargin[];
  /** One per column key. Without this there is no totals row. */
  columnMargins?: readonly PivotMargin[];
  total?: PivotCell;
};

/**
 * The separator between the two paths of a crossing.
 *
 * It is a different character from the one that separates a path's segments —that is the NUL
 * of `pathKey`— because if it were the same, a row `["a"]` crossed with a
 * column `["b","c"]` and a row `["a","b"]` crossed with `["c"]` would produce the
 * same key, and they would be two different cells of the grid pointing at the same
 * number.
 */
const CROSS = "";

function crossKey(row: PivotKey, column: PivotKey): string {
  return `${pathKey(row)}${CROSS}${pathKey(column)}`;
}

/** Only what a cell is, without the keys it traveled with. */
function cellOf(one: PivotCell): PivotCell {
  return { count: one.count, values: one.values };
}

/**
 * Indexes a pivot that arrives already folded.
 *
 * Crossings travel as a list —it is what any transport knows how to serialize— and
 * are drawn by asking one at a time, so an index is needed in between.
 * It is built once here and not in every cell of every render: a grid of 288
 * cells searching a list of 40 is 11,520 comparisons per paint.
 */
export function pivotOf(source: PivotSource): Pivot {
  const crossings = new Map<string, PivotCell>();
  for (const one of source.crossings)
    crossings.set(crossKey(one.row, one.column), cellOf(one));

  const rowMargins = new Map<string, PivotCell>();
  for (const one of source.rowMargins ?? []) rowMargins.set(pathKey(one.key), cellOf(one));

  const columnMargins = new Map<string, PivotCell>();
  for (const one of source.columnMargins ?? [])
    columnMargins.set(pathKey(one.key), cellOf(one));

  return {
    rows: source.rows,
    columns: source.columns,
    measures: source.measures,
    cell: (row, column) => crossings.get(crossKey(row, column)),
    /* Margins are offered only if they came. The alternative —always answering
       and returning `undefined` inside— would make the grid draw a whole
       totals band full of holes. */
    ...(source.rowMargins === undefined
      ? {}
      : { rowTotal: (row: PivotKey) => rowMargins.get(pathKey(row)) }),
    ...(source.columnMargins === undefined
      ? {}
      : { columnTotal: (column: PivotKey) => columnMargins.get(pathKey(column)) }),
    ...(source.total === undefined ? {} : { total: source.total }),
  };
}

/* ---------------------------------------------------------------- *
 *  IN HERE: the pivot built with the rows in hand
 * ---------------------------------------------------------------- */

/** A measure and how it folds. The fold receives the rows of the BASE —the crossing's,
 *  the whole row's, everything's—, which is what makes the margin
 *  come from the same place as the cell and not from summing cells. */
export type PivotFold<T> = PivotMeasure & {
  fold: (items: readonly T[]) => number | null;
};

export type PivotSpec<T> = {
  /** The levels of the vertical axis, from the outside in. */
  rows: readonly GroupLevel[];
  /** The levels of the horizontal axis. */
  columns: readonly GroupLevel[];
  /** Which pile each row goes to, at each level of each axis, already readable. It is the
   *  same contract that groups a list: trimming a date to its grain belongs to
   *  whoever knows the datum. */
  of: PileOf<T>;
  measures: readonly PivotFold<T>[];
  /** What each level is called. Without it the field name is shown. */
  labelOf?: (level: GroupLevel) => string;
};

/** The rows of an axis, grouped by their key, in order of first appearance.
 *  The order of the rows was already decided by somebody —a column, a criterion, the
 *  engine— and reordering the axes here would contradict it. */
function axisBuckets<T>(
  items: readonly T[],
  levels: readonly GroupLevel[],
  of: PileOf<T>,
): Map<string, { key: PivotKey; items: T[] }> {
  const out = new Map<string, { key: PivotKey; items: T[] }>();
  for (const item of items) {
    const key = levels.map((level) => of(item, level));
    const id = pathKey(key);
    const bucket = out.get(id);
    if (bucket === undefined) out.set(id, { key, items: [item] });
    else bucket.items.push(item);
  }
  return out;
}

function fold<T>(measures: readonly PivotFold<T>[], items: readonly T[]): PivotCell {
  const values: Record<string, number | null> = {};
  for (const measure of measures) values[measure.id] = measure.fold(items);
  return { count: items.length, values };
}

/**
 * Builds the pivot with the rows IN HAND.
 *
 * It serves when the whole set is in the browser. When it is not, the
 * pivot is folded by whoever stores the data and this is not used: the grid receives a
 * `Pivot` from `pivotOf` and draws the same, because it draws the same type.
 *
 * **Margins are folded over the rows of the base and not over the crossings**,
 * which is rule 2 written as code: the margin of «Ferretería Sur» folds its 187
 * invoices at once, not the twelve monthly numbers already drawn. It is
 * the only thing that makes a measure that is not a sum —an average, a
 * median, a distinct count— tell the truth at the edge.
 */
export function pivotFrom<T>(items: readonly T[], spec: PivotSpec<T>): Pivot {
  const label = (level: GroupLevel) => spec.labelOf?.(level) ?? level.field;

  const rowBuckets = axisBuckets(items, spec.rows, spec.of);
  const columnBuckets = axisBuckets(items, spec.columns, spec.of);

  const crossings = new Map<string, PivotCell>();
  for (const row of rowBuckets.values()) {
    const inside = axisBuckets(row.items, spec.columns, spec.of);
    for (const [columnId, column] of inside) {
      crossings.set(
        `${pathKey(row.key)}${CROSS}${columnId}`,
        fold(spec.measures, column.items),
      );
    }
  }

  const rowMargins = new Map<string, PivotCell>();
  for (const [id, row] of rowBuckets) rowMargins.set(id, fold(spec.measures, row.items));

  const columnMargins = new Map<string, PivotCell>();
  for (const [id, column] of columnBuckets) {
    columnMargins.set(id, fold(spec.measures, column.items));
  }

  return {
    rows: {
      levels: spec.rows.map((one) => ({ ...one, label: label(one) })),
      keys: [...rowBuckets.values()].map((one) => one.key),
    },
    columns: {
      levels: spec.columns.map((one) => ({ ...one, label: label(one) })),
      keys: [...columnBuckets.values()].map((one) => one.key),
    },
    measures: spec.measures.map((one) => ({
      id: one.id,
      header: one.header,
      ...(one.format === undefined ? {} : { format: one.format }),
      ...(one.numberFormat === undefined ? {} : { numberFormat: one.numberFormat }),
      ...(one.additive === undefined ? {} : { additive: one.additive }),
    })),
    cell: (row, column) => crossings.get(crossKey(row, column)),
    rowTotal: (row) => rowMargins.get(pathKey(row)),
    columnTotal: (column) => columnMargins.get(pathKey(column)),
    total: fold(spec.measures, items),
  };
}

/** Whether the pivot has not a single row to cross. An empty axis is not a small
 *  pivot: it is the empty view, and it is said with the set's phrase and not with a
 *  one-line grid. */
export function pivotIsEmpty(pivot: Pivot): boolean {
  return pivot.rows.keys.length === 0 || pivot.columns.keys.length === 0;
}

/**
 * The segments of a key that must be WRITTEN, compared with the previous one.
 *
 * In a pivot's row area, a level's value is written only when it
 * changes: repeating «Ferretería Sur» in the twelve rows of its twelve months turns the
 * hierarchy into a column of noise and makes disappear precisely the cut that
 * was asked for. Returns, per level, whether that segment starts here.
 */
export function keyStarts(key: PivotKey, previous: PivotKey | undefined): readonly boolean[] {
  let broken = previous === undefined;
  return key.map((part, level) => {
    if (broken) return true;
    /* Once a level above has changed, all those below start
       anew even if they say the same: the «2026-09» of «Distribuidora Andina» is not the
       continuation of the «2026-09» of «Ferretería Sur». */
    if (part !== previous?.[level]) {
      broken = true;
      return true;
    }
    return false;
  });
}

/**
 * How much each segment of the horizontal axis spans, level by level.
 *
 * A pivot's header is a hierarchy lying on its side: one row per level, and
 * each label covering the columns that hang from it. This resolves it once
 * —in runs of consecutive equal segments, which is what makes «2026» cover its
 * four quarters— and the grid only draws it.
 */
export function axisSpans(
  axis: PivotAxis,
  level: number,
): readonly { label: string; span: number; at: number }[] {
  const keys = axis.keys;
  const out: { label: string; span: number; at: number }[] = [];
  keys.forEach((key, at) => {
    const label = axisLabels(axis, key)[level] ?? "";
    const last = out[out.length - 1];
    /* The whole PREFIX is compared and not the label: two «2026-09» under two
       different customers are two spans, and merging them into one would draw a
       cell spanning columns that are not siblings. */
    const samePrefix =
      last !== undefined &&
      last.label === label &&
      key.slice(0, level).join(CROSS) === (keys[at - 1]?.slice(0, level).join(CROSS) ?? null);
    if (samePrefix) last.span += 1;
    else out.push({ label, span: 1, at });
  });
  return out;
}
