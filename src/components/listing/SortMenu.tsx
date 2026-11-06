"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Menu, menuTriggerClasses } from "@sincpro/web-ui/primitives/menu/Menu";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  compareBy,
  flipSort,
  moveSort,
  type SortState,
} from "@sincpro/web-ui/primitives/table/sorting";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  GridList,
  GridListItem,
  useDragAndDrop,
} from "react-aria-components";

/**
 * SORT — by one or several fields, from the bar.
 *
 * Context: sorting was a capability of `DataTable` and of nothing else. You
 * clicked the column header, which is the right way **when there are
 * headers**. In rows, board and sheet there are none, so
 * changing presentation lost not only the order set: it lost the ability
 * to sort.
 *
 * The order belongs to the SET and not to the presentation, like the levels and
 * the folding. That is why the control lives in the bar and not inside the table, and
 * why the table still has its headers as well: they are two doors to the
 * same thing, and the headers' one is faster when it exists.
 *
 * ── Several criteria, and so a panel and not a menu ─────────────────
 *
 * It used to be said that sorting by two fields was «a tie-break done by the engine» and
 * that choosing one was enough. People asked for the opposite on screen: by
 * date, and within the same date by customer, and then by product. The engine
 * already accepted it (`order: [...]`); what was missing was being able to say it. An order of N fields
 * has an ORDER among them —the second only decides between the rows the
 * first left equal—, and a menu of ticks cannot express that: it takes a
 * list that reorders. It is React Aria's (`GridList` + `useDragAndDrop`):
 * dragged with the mouse, and with the keyboard from the handle (Enter, arrows,
 * Enter), announced.
 */

export type SortField<T = unknown> = {
  field: string;
  label: string;
  /**
   * What value it is sorted by, when the BROWSER sorts.
   *
   * Absent = it already comes sorted from where it came. It is the same split the
   * grouping has with `piles`: a set the server paginates cannot be
   * sorted here —sorting twelve rows out of a hundred and eighty-seven gives a false
   * order— so there the order travels in the read and this only reflects it.
   */
  value?: (item: T) => string | number | null | undefined;
  /** What «ascendente» means for this field. Without this, «ascendente».
   *  A date ascends from old to new and an amount from small to large, and
   *  saying so avoids the trial click. */
  ascLabel?: string;
  descLabel?: string;
};

export type SortMenuProps = {
  /** Which fields it can be sorted by. With none, the control is not drawn. */
  fields: readonly SortField<never>[];
  /** The order, from outside in. Empty is «as they arrived». */
  sort: readonly SortState[];
  onSortChange: (next: SortState[]) => void;
  surface?: Surface;
};

/**
 * The rows, sorted here, by each criterion in its order.
 *
 * Only by the fields that declare `value`; the rest are skipped —sorting a
 * page of a set paginated elsewhere produces an order that is a lie,
 * because it sorts the twelve that arrived and not the hundred and eighty-seven. With
 * no readable criterion, they are returned as is.
 *
 * The missing ones go ALWAYS at the end, whether the order goes up or down (see `compareBy`).
 */
export function sortItems<T>(
  items: readonly T[],
  fields: readonly SortField<T>[],
  sort: readonly SortState[] | undefined,
): readonly T[] {
  if (sort === undefined || sort.length === 0) return items;
  const read = (key: string) => fields.find((one) => one.field === key)?.value;
  if (!sort.some((one) => read(one.key) !== undefined)) return items;
  return [...items].sort(compareBy(sort, read));
}

export function SortMenu({ fields, sort, onSortChange, surface }: SortMenuProps) {
  const copy = useUiCopy();
  const fieldOf = (key: string) => fields.find((one) => one.field === key);
  const labelOf = (key: string) => fieldOf(key)?.label ?? key;

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": labelOf(String(key)) })),
    onReorder: (event) =>
      onSortChange(
        moveSort(
          sort,
          new Set([...event.keys].map(String)),
          String(event.target.key),
          event.target.dropPosition === "before" ? "before" : "after",
        ),
      ),
  });

  if (fields.length === 0) return null;

  const first = sort[0];
  const label =
    first === undefined
      ? copy.sorting.label
      : sort.length === 1
        ? labelOf(first.key)
        : fillCopy(copy.sorting.more, { label: labelOf(first.key), count: sort.length - 1 });
  const TriggerIcon =
    first === undefined
      ? ArrowDownUp
      : first.direction === "asc"
        ? ArrowUpNarrowWide
        : ArrowDownWideNarrow;
  const left = fields.filter((one) => !sort.some((s) => s.key === one.field));

  return (
    <DialogTrigger>
      <AriaButton
        className={({ isPressed, isFocusVisible }) =>
          menuTriggerClasses({
            ...(surface === undefined ? {} : { surface }),
            active: sort.length > 0,
            open: isPressed,
            focusVisible: isFocusVisible,
          })
        }
      >
        <TriggerIcon className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
        {label}
        <ChevronDown className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
      </AriaButton>
      <Popover placement="bottom start" className="w-80">
        <Dialog aria-label={copy.sorting.label} className="flex flex-col gap-1 p-2 outline-0">
          {sort.length === 0 ? (
            <p className="px-1 py-1 text-meta text-muted">{copy.sorting.none}</p>
          ) : (
            <GridList
              aria-label={copy.sorting.label}
              items={sort.map((one, index) => ({ ...one, id: one.key, index }))}
              dragAndDropHooks={dragAndDropHooks}
              className="flex flex-col outline-0"
            >
              {(item) => {
                const field = fieldOf(item.key);
                const name = labelOf(item.key);
                const direction =
                  item.direction === "asc"
                    ? (field?.ascLabel ?? copy.sorting.asc)
                    : (field?.descLabel ?? copy.sorting.desc);
                const DirectionIcon =
                  item.direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow;
                return (
                  <GridListItem
                    id={item.id}
                    textValue={`${item.index + 1}. ${name}, ${direction}`}
                    className="flex min-w-0 items-center gap-1.5 rounded-control px-1 py-1 outline-0 transition-colors duration-(--duration-instant) data-dragging:opacity-50 data-drop-target:bg-primary/8 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-primary data-hovered:bg-ink/4"
                  >
                    <AriaButton
                      slot="drag"
                      aria-label={fillCopy(copy.sorting.move, { field: name })}
                      className="inline-flex shrink-0 cursor-grab items-center rounded-mark p-0.5 text-muted outline-0 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <GripVertical className="size-(--size-icon-sm)" strokeWidth={2} />
                    </AriaButton>
                    {/* The first decides; the rest only break its ties — said, not left to
                        the number. */}
                    <span className="w-16 shrink-0 text-micro text-muted">
                      {item.index === 0 ? copy.sorting.by : copy.sorting.then}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-meta text-ink">{name}</span>
                    <AriaButton
                      aria-label={`${fillCopy(copy.sorting.flip, { field: name })}: ${direction}`}
                      onPress={() => onSortChange(flipSort(sort, item.index))}
                      className="inline-flex shrink-0 items-center gap-1 rounded-mark px-1 py-0.5 text-micro text-primary outline-0 hover:bg-primary/8 data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <DirectionIcon
                        className="size-(--size-icon-sm)"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {direction}
                    </AriaButton>
                    <AriaButton
                      aria-label={fillCopy(copy.sorting.remove, { field: name })}
                      onPress={() => onSortChange(sort.filter((_, i) => i !== item.index))}
                      className="inline-flex shrink-0 items-center rounded-mark p-0.5 text-muted outline-0 hover:bg-ink/6 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
                    >
                      <X className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
                    </AriaButton>
                  </GridListItem>
                );
              }}
            </GridList>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            {left.length === 0 ? (
              <span />
            ) : (
              <Menu
                label={copy.sorting.add}
                icon={Plus}
                variant="text"
                chevron={false}
                width="sm"
                groups={[
                  { options: left.map((one) => ({ id: one.field, label: one.label })) },
                ]}
                onSelect={(id) => onSortChange([...sort, { key: id, direction: "asc" }])}
              />
            )}
            {sort.length === 0 ? null : (
              <AriaButton
                onPress={() => onSortChange([])}
                className="rounded-mark px-1.5 py-0.5 text-micro text-muted outline-0 hover:bg-ink/6 hover:text-ink data-focus-visible:outline-2 data-focus-visible:outline-primary"
              >
                {copy.sorting.clear}
              </AriaButton>
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
