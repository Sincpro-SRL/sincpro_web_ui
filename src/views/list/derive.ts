import {
  type GroupLevel,
  levelKey,
  pathKey,
  type Pile,
  pileItems,
  pileLabel,
} from "@sincpro/web-ui/foundations/grouping";
import {
  aggregateFormat,
  aggregateOf,
  aggregateText,
  type DataColumn,
} from "@sincpro/web-ui/primitives/table/DataTable";
import type { ReportColumn, ReportRow } from "@sincpro/web-ui/primitives/table/ReportTable";
import type { SheetColumn } from "@sincpro/web-ui/primitives/table/SheetTable";
import type { ListGroup, ListSheet, RowOf } from "@sincpro/web-ui/views/list/types";

/**
 * Context: what a list DERIVES from its set, as pure functions — the table's group levels,
 * the sheet drawn from the declared columns, the sheet's flattened band/row sequence and
 * the report built from the piles. `ListView` calls them inside `useMemo` with the same
 * dependencies they always had; nothing here knows React.
 */

/**
 * The levels, as the table needs them: one per LEVEL and not one per field.
 *
 * The key comes from `group.of` —the same one the other five
 * presentations build— so the table's buckets are the same and what is folded
 * holds for all of them. The label comes from the same rule as the tree: a level does not
 * repeat what the one above, of the same field, already said.
 */
export function groupLevelsOf<T extends object>(
  group: ListGroup<T> | undefined,
  columns: readonly DataColumn<T>[] | undefined,
) {
  if (group === undefined || group.levels.length === 0) return [];
  const above: GroupLevel[] = [];
  const label = group.label ?? pileLabel;
  return group.levels.map((level) => {
    const within = above.flatMap((one) =>
      one.field === level.field && one.grain !== undefined ? [one.grain] : [],
    );
    above.push(level);
    /* What the cut is called: as the column that answers for that
       field calls it, which is the only human label this layer has. */
    const column = columns?.find(
      (one) => one.id === level.field || one.field === level.field,
    );
    return {
      id: levelKey(level),
      label: column?.header ?? level.field,
      keyOf: (item: T) => group.of(item, level),
      labelOf: (key: string) => label(key, level, within),
    };
  });
}

/**
 * The sheet of a set of RECORDS comes from the columns the list
 * already declared. Without this, offering `sheet` meant writing the columns twice
 * —once as `DataColumn` and once as `SheetColumn`— and then nobody
 * offered it: the presentation existed in the archetype and was on no
 * screen.
 *
 * An explicit `sheet` remains for RAW DATA, where the columns
 * come from the file and the code does not know which they are.
 */
export function sheetFromColumns<T extends object>(
  shownColumns: readonly DataColumn<T>[] | undefined,
): ListSheet<T> | undefined {
  if (shownColumns === undefined || shownColumns.length === 0) return undefined;
  const byId = new Map(shownColumns.map((column) => [column.id, column]));
  return {
    columns: shownColumns.map((column) => ({
      id: column.id,
      header: column.header,
      ...(column.numeric === true ? { numeric: true } : {}),
      ...(column.width === undefined ? {} : { width: column.width }),
    })),
    cell: (item, column) => {
      const declared = byId.get(column.id);
      /* `text` first: `value` is the SORT key, not what is read. Without
         this the sheet showed `computed` where the table shows
         «calculado». */
      if (declared?.text !== undefined) return declared.text(item);
      const raw = declared?.value(item);
      /* A boolean is not a cell: the grid draws text or a number, and
         `false` would look like an empty cell, which means something else. */
      return typeof raw === "boolean" ? String(raw) : (raw ?? null);
    },
    tone: (item, column) => byId.get(column.id)?.tone?.(item),
    note: (item, column) => byId.get(column.id)?.note?.(item),
    /* Grows with the page instead of opening a scroll box inside another
       that already scrolls. The list already came paginated, so it is eighty rows and
       not one hundred eighty-seven — the million case is that of raw
       data, and that one declares its own height. */
    height: "auto",
  };
}

export type SheetEntry<T> = {
  band?: {
    field: string;
    label: string;
    count: number;
    open: boolean;
    key: string;
    depth: number;
    total?: (column: SheetColumn, columnIndex: number) => string | number | null;
  };
  item?: T;
  /* The row number counts ROWS, not positions in the sequence: with the
     bands taking an index, numbering by position skipped —1, 2…11, 13—
     and a row number that skips is useless. */
  n?: number;
};

/**
 * The sheet, when there are buckets: a SEQUENCE where each index is a
 * row or the header of the bucket that starts there.
 *
 * **This used to say the sheet does not group, and that was badly reasoned.** The argument
 * —a band shifts the grid and looking at raw data is following a row
 * across— holds for raw data, where the columns come from the file and
 * there is no domain axis to group by. But the DERIVED sheet
 * is the same set of records as the table, with the same axes: the table grouping
 * and it not is exactly the drift this archetype exists
 * to prevent — switching presentation lost the grouping.
 *
 * The rule stays in the view's hands, as it should: if it declares `group`,
 * it groups; if not, there are no buckets to draw.
 */
export function sheetRowsOf<T extends object>(
  piles: readonly Pile<T>[] | null,
  isOpen: (pile: Pile<T>) => boolean,
  columns: readonly DataColumn<T>[] | undefined,
): SheetEntry<T>[] | null {
  if (piles === null) return null;
  const out: SheetEntry<T>[] = [];
  let n = 0;

  /* Flattening is recursive because the tree is. The sheet cannot receive
     the tree: it is virtualised by index, and an index is a position in a
     sequence — so the hierarchy is expressed in each band's indentation. */
  const walk = (list: readonly Pile<T>[]) => {
    for (const pile of list) {
      const open = isOpen(pile);
      const inside = pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
      out.push({
        band: {
          field: pile.field,
          label: pile.label,
          count: pile.count,
          open,
          key: pathKey(pile.path),
          depth: pile.depth,
          /* The total of each column, at that column's position. It comes from
             the list's `columns` —the same ones the table's footer sums—
             so the sheet and the table do not give different numbers for
             the same bucket. The sheet declares ITS columns separately, so
             it is looked up by id. And it is WRITTEN like the footer: with the column's
             `format`, so the bucket does not say «78752,9» under «Bs.». */
          total: (column: SheetColumn) => {
            const declared = columns?.find((one) => one.id === column.id);
            const value = declared === undefined ? null : aggregateOf(declared, inside);
            return declared === undefined || value === null
              ? null
              : aggregateText(declared, value);
          },
        },
      });
      if (!open) continue;
      if (pile.piles.length > 0) {
        walk(pile.piles);
        continue;
      }
      for (const one of pile.items) {
        n += 1;
        out.push({ item: one, n });
      }
    }
  };
  walk(piles);
  return out;
}

/**
 * The report built from the buckets, when the domain did not declare
 * lines.
 *
 * Each bucket is a line with the aggregates of the columns that declared
 * one, and the deepest level hangs its rows. The report's columns are
 * set by `report.columns`; the numbers come from the list's `columns`, which
 * are the same ones the table's footer sums — so the report and the table
 * do not give different totals for the same set.
 */
export function reportRowsOf<T extends object>(
  piles: readonly Pile<T>[] | null,
  columns: readonly DataColumn<T>[] | undefined,
  row: (item: T) => RowOf,
): readonly ReportRow[] {
  if (piles === null || columns === undefined) return [];
  const numeric = columns.filter((column) => column.aggregate !== undefined);

  /* A pile is named by the HEADER of the column that answers for its field — the word the
     person reads in the table — not by the field's id: «stage · pedido» showed the
     model's name for it. */
  const fieldName = (field: string) =>
    columns.find((column) => column.id === field || column.field === field)?.header ?? field;

  const line = (pile: Pile<T>): ReportRow => {
    const inside = pile.piles.length === 0 ? pile.items : pileItems(pile.piles);
    const children =
      pile.piles.length > 0
        ? pile.piles.map(line)
        : pile.items.map((item, index) => ({
            id: `${pathKey(pile.path)}\u0000${index}`,
            label: row(item).name,
            kind: "line" as const,
            level: pile.depth + 1,
            values: numeric.map((column) => {
              const value = column.value(item);
              return typeof value === "number" ? value : null;
            }),
          }));
    return {
      id: pathKey(pile.path),
      label: `${fieldName(pile.field)} · ${pile.label}`,
      kind: pile.depth === 0 ? "section" : "group",
      level: pile.depth,
      values: numeric.map((column) => aggregateOf(column, inside)),
      children,
    };
  };

  return piles.map(line);
}

/**
 * The columns of a report built from the piles, written like the list's own columns.
 *
 * `reportRowsOf` puts in position `i` the aggregate of the `i`-th column that declared one,
 * so `report.columns[i]` is THAT column's: a report column without its own `format` takes
 * the one the list column declared — otherwise the report wrote «Bs. 78.752,90» in the
 * table's footer and «78.752,90» in its own total line. A format declared on the report
 * column wins: it is the more specific declaration. A `count` column keeps the report's own
 * number format — a count of rows is not an amount.
 */
export function reportColumnsOf<T extends object>(
  reportColumns: readonly ReportColumn[],
  columns: readonly DataColumn<T>[] | undefined,
): readonly ReportColumn[] {
  if (columns === undefined) return reportColumns;
  const numeric = columns.filter((column) => column.aggregate !== undefined);
  return reportColumns.map((column, index) => {
    const declared = numeric[index];
    const format = declared === undefined ? undefined : aggregateFormat(declared);
    return column.format !== undefined || format === undefined
      ? column
      : { ...column, format };
  });
}
