"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { type DataColumn, DataTable } from "@sincpro/web-ui/primitives/table/DataTable";
import type { RowAction } from "@sincpro/web-ui/primitives/table/RowActions";
import { type SheetColumn, SheetTable } from "@sincpro/web-ui/primitives/table/SheetTable";
import type { SheetEntry } from "@sincpro/web-ui/views/list/derive";
import type { ListGroup, ListSheet, ListViewProps } from "@sincpro/web-ui/views/list/types";
import { Eye, SquareArrowOutUpRight } from "lucide-react";

/**
 * Context: the two presentations whose body is an adapter between the list's vocabulary
 * (one selection that speaks one id at a time, a grouping tree, an index-addressed sequence)
 * and a primitive's (a Set, levels, indexes). They draw nothing of their own — they are
 * `ListView`'s `table` and `sheet` branches, moved out so that file reads as the decision of
 * WHICH presentation, and these as HOW the two grids are fed.
 */

type TableProps<T extends object> = {
  items: readonly T[];
  columns: readonly DataColumn<T>[];
  keyOf: (item: T) => string;
  levels: NonNullable<Parameters<typeof DataTable<T>>[0]["levels"]>;
  group?: ListGroup<T>;
  totals: boolean;
} & Pick<
  ListViewProps<T>,
  "sort" | "onSortChange" | "selection" | "rowActions" | "create" | "onPeek" | "onOpen"
> & { rowClick?: "peek" | "open"; onChoose?: (item: T) => void };

/** The table receives EVERYTHING that belongs to the set —sorting, selection, grouping,
 *  which columns are on screen— and not a trimmed down version: that was exactly the trap
 *  this archetype exists to avoid, that switching presentation loses capabilities. */
export function TablePresentation<T extends object>({
  items,
  columns,
  keyOf,
  levels,
  group,
  totals,
  sort,
  onSortChange,
  selection,
  rowActions,
  create,
  onPeek,
  onOpen,
  rowClick = "peek",
  onChoose,
}: TableProps<T>) {
  const copy = useUiCopy();
  const press = onChoose ?? (rowClick === "open" ? (onOpen ?? onPeek) : (onPeek ?? onOpen));
  /* The row's ways in go FIRST among its actions, so they are always the inline ones and
     always in the same place; the domain's actions follow (and fold into ⋯ past two). */
  const withOpeners =
    onPeek === undefined && onOpen === undefined
      ? rowActions
      : (item: T): readonly RowAction[] => [
          ...(onPeek === undefined
            ? []
            : [
                {
                  id: "peek",
                  label: copy.list.peek,
                  icon: Eye,
                  onSelect: () => onPeek(item),
                },
              ]),
          ...(onOpen === undefined
            ? []
            : [
                {
                  id: "open",
                  label: copy.list.open,
                  icon: SquareArrowOutUpRight,
                  onSelect: () => onOpen(item),
                },
              ]),
          ...(rowActions?.(item) ?? []),
        ];
  return (
    <DataTable
      data={items}
      columns={columns}
      getRowId={keyOf}
      {...(sort === undefined ? {} : { sort })}
      {...(onSortChange === undefined ? {} : { onSortChange })}
      {...(levels.length === 0 ? {} : { levels: levels })}
      {...(group?.collapsed === undefined ? {} : { collapsed: group.collapsed })}
      {...(group?.onToggle === undefined ? {} : { onGroupToggle: group.onToggle })}
      {...(selection === undefined
        ? {}
        : {
            selected: new Set(items.filter((i) => selection.has(keyOf(i))).map(keyOf)),
            onSelectedChange: (next: Set<string>) => {
              /* `DataTable` sends the whole set; the view's selection speaks
                 one at a time. It is translated here and not there because the
                 one who knows what changed is the one holding the before and
                 the after. */
              for (const item of items) {
                const id = keyOf(item);
                if (next.has(id) !== selection.has(id)) selection.toggle(id);
              }
            },
          })}
      {...(totals ? { totals: true } : {})}
      {...(withOpeners === undefined ? {} : { rowActions: withOpeners })}
      {...(create === undefined ? {} : { create })}
      /* `onPeek` con `onOpen` de reserva — ver el mismo comentario en
         `Listing.tsx`: sin vista previa encendida, un click en la fila
         tiene que abrir cuando es lo único que declararon. */
      {...(press === undefined ? {} : { onRowClick: press })}
    />
  );
}

type SheetProps<T extends object> = {
  spec: ListSheet<T>;
  /** The flattened bands and rows when the set is grouped; `null` when it is not. */
  entries: readonly SheetEntry<T>[] | null;
  ordered: readonly T[];
  group?: ListGroup<T>;
};

/** The sheet receives the set by INDEX and not a ready-made matrix: `SheetTable` is
 *  virtualized precisely so as not to materialize a million rows, and handing it copies
 *  would throw that away.
 *
 *  It groups like the other three —grouping belongs to the SET, not to the presentation—
 *  and the piles enter as rows of another kind, so virtualization is not lost. What it still
 *  lacks is selection: a checkbox per row in a forty-column grid competes with the frozen
 *  row-number column, the one that lets you know which row you are on. */
export function SheetPresentation<T extends object>({
  spec,
  entries,
  ordered,
  group,
}: SheetProps<T>) {
  const copy = useUiCopy();
  /** Qué ítem hay en este índice de la planilla. Con montones, un índice puede
   *  ser una banda y no una fila — y entonces no hay ítem. Una sola vez, porque
   *  las seis funciones que la planilla recibe hacen la misma pregunta. */
  const sheetItemAt = (index: number): T | undefined =>
    entries === null ? ordered[index] : entries[index]?.item;

  return (
    <SheetTable
      columns={spec.columns}
      rows={entries === null ? ordered.length : entries.length}
      value={(index, column, columnIndex) => {
        const item = sheetItemAt(index);
        return item === undefined ? null : spec.cell(item, column, columnIndex);
      }}
      {...(entries === null
        ? {}
        : {
            band: (index: number) => entries[index]?.band,
            ...(group?.onToggle === undefined
              ? {}
              : {
                  onBandToggle: (index: number) => {
                    const key = entries[index]?.band?.key;
                    if (key !== undefined) group.onToggle?.(key);
                  },
                }),
          })}
      {...(spec.tone === undefined
        ? {}
        : {
            tone: (index: number, column: SheetColumn, columnIndex: number) => {
              const item = sheetItemAt(index);
              return item === undefined ? undefined : spec.tone?.(item, column, columnIndex);
            },
          })}
      {...(spec.note === undefined
        ? {}
        : {
            note: (index: number, column: SheetColumn, columnIndex: number) => {
              const item = sheetItemAt(index);
              return item === undefined ? undefined : spec.note?.(item, column, columnIndex);
            },
          })}
      {...(spec.height === undefined ? {} : { height: spec.height })}
      {...(spec.rowLabel !== undefined
        ? {
            rowLabel: (index: number) => {
              const item = sheetItemAt(index);
              return item === undefined ? "" : (spec.rowLabel?.(item, index) ?? "");
            },
          }
        : entries === null
          ? {}
          : {
              rowLabel: (index: number) => {
                const n = entries[index]?.n;
                return n === undefined ? "" : n.toLocaleString(copy.locale);
              },
            })}
      {...(spec.onCommit === undefined
        ? {}
        : {
            onCommit: (
              index: number,
              column: SheetColumn,
              columnIndex: number,
              next: string,
            ) => {
              const item = sheetItemAt(index);
              if (item !== undefined) spec.onCommit?.(item, column, columnIndex, next);
            },
          })}
      {...(spec.editable === undefined
        ? {}
        : {
            editable: (index: number, column: SheetColumn, columnIndex: number) => {
              const item = sheetItemAt(index);
              return item === undefined
                ? false
                : (spec.editable?.(item, column, columnIndex) ?? false);
            },
          })}
      {
        /* Only ungrouped: a new row lands at the end of the sheet, and in a grouped one
           the end is the last group — not where the new record belongs. */
        ...(spec.onAddRow === undefined || entries !== null
          ? {}
          : { onAddRow: spec.onAddRow })
      }
    />
  );
}
