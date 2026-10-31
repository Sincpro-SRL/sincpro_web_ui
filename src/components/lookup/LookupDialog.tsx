"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { SearchField } from "@sincpro/web-ui/primitives/choice/SearchField";
import { Dialog } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { type DataColumn, DataTable } from "@sincpro/web-ui/primitives/table/DataTable";
import { type ReactNode, useEffect, useState } from "react";

/* ==================================================================== *
 *  «BUSCAR MÁS…» — the record a field points at, chosen from a table.
 *
 *  Context: a many2one or a many2many offers eight names in its dropdown. When the one wanted
 *  is not among them — or two «Almacén Central» need their city and their stock to tell apart
 *  — the field opens a table: the same search, the record's columns, and one or several
 *  picked. Odoo calls it «Search More…»; it is the bridge between a field and a list.
 *
 *  Two pieces, because WHERE it opens is not this package's decision:
 *
 *  - `Lookup` — the search and the table, on any surface: a composer window that answers a
 *    `api.pick`, a side panel, a page.
 *  - `LookupDialog` — `Lookup` in a `Dialog` that can be dragged by its header (`movable`, on
 *    by default: the form it was opened from has to stay readable) and docked into the
 *    workspace (`onExpand`), with «Cancelar» and «Elegir N» at its foot.
 *
 *  The search is the consumer's when a server answers it (`remote`, or a whole `SearchBar` in
 *  `search`); otherwise the rows are filtered here, by every column.
 * ==================================================================== */

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

function byAnyColumn<T extends object>(columns: readonly DataColumn<T>[]) {
  return (item: T, query: string) => {
    const wanted = fold(query.trim());
    return columns.some((column) => {
      const value = column.value?.(item);
      return value !== undefined && value !== null && fold(String(value)).includes(wanted);
    });
  };
}

/** The rows the table shows: all of them when a server answered, else those matching. */
export function lookupRows<T extends object>(
  items: readonly T[],
  columns: readonly DataColumn<T>[],
  query: string,
  { remote, matches }: { remote: boolean; matches?: (item: T, query: string) => boolean },
): readonly T[] {
  if (remote || query.trim() === "") return items;
  const test = matches ?? byAnyColumn(columns);
  return items.filter((item) => test(item, query));
}

export type LookupProps<T extends object> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  columns: readonly DataColumn<T>[];
  /** `one` (a many2one): a press on a row picks it. `many` (a many2many): a press ticks it, and
   *  whoever holds the lookup confirms with `ticked`. */
  pick?: "one" | "many";
  /** `one`: the chosen row. */
  onPick?: (id: string) => void;
  /** `many`: what is ticked, controlled — it starts with what the field holds. */
  ticked?: ReadonlySet<string>;
  onTickedChange?: (next: Set<string>) => void;
  /** The typed search, controlled — it starts with what was typed in the field. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** A server answers the search: `items` are already its answer and are not filtered here. */
  remote?: boolean;
  /** Replaces the search box: a whole `SearchBar` with its facets and filters. */
  search?: ReactNode;
  /** How a row matches the typed text when filtering here. Defaults to any column's value. */
  matches?: (item: T, query: string) => boolean;
  /** «Crear «lo escrito»», offered when nothing matches. */
  onCreate?: (query: string) => void;
  /** Its own margin, for a bare surface — a composer window, a side panel. A `Dialog` already
   *  has one, so `LookupDialog` leaves it off. */
  inset?: boolean;
};

/** The search and the table of a «Buscar más…», on whatever surface holds them. */
export function Lookup<T extends object>({
  items,
  keyOf,
  columns,
  pick = "one",
  onPick,
  ticked,
  onTickedChange,
  query: outerQuery,
  onQueryChange,
  remote = false,
  search,
  matches,
  onCreate,
  inset = false,
}: LookupProps<T>) {
  const copy = useUiCopy();
  const [ownQuery, setOwnQuery] = useState(outerQuery ?? "");
  const query = outerQuery ?? ownQuery;
  const setQuery = (next: string) => {
    if (outerQuery === undefined) setOwnQuery(next);
    onQueryChange?.(next);
  };
  const shown = lookupRows(items, columns, query, {
    remote: remote || search !== undefined,
    ...(matches === undefined ? {} : { matches }),
  });
  const typed = query.trim();

  const toggle = (id: string) => {
    const next = new Set(ticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onTickedChange?.(next);
  };

  return (
    <div className={`flex min-w-0 flex-col gap-3 ${inset ? "p-3" : ""}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          {search ?? (
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={copy.lookup.search}
              aria-label={copy.lookup.search}
            />
          )}
        </div>
        <span role="status" className="shrink-0 text-meta text-muted tabular-nums">
          {shown.length === 1
            ? copy.list.countOne
            : fillCopy(copy.list.count, { count: shown.length.toLocaleString(copy.locale) })}
        </span>
      </div>
      {shown.length === 0 ? (
        <Empty
          sentence={
            typed === "" ? copy.list.empty : fillCopy(copy.lookup.none, { query: typed })
          }
          {...(onCreate === undefined || typed === ""
            ? {}
            : {
                action: (
                  <Button role="secondary" size="sm" onClick={() => onCreate(typed)}>
                    {fillCopy(copy.lookup.create, { name: typed })}
                  </Button>
                ),
              })}
        />
      ) : (
        <DataTable
          data={shown}
          columns={columns}
          getRowId={keyOf}
          copyable={false}
          {...(pick === "many"
            ? {
                selected: ticked ?? new Set<string>(),
                ...(onTickedChange === undefined ? {} : { onSelectedChange: onTickedChange }),
                onRowClick: (item: T) => toggle(keyOf(item)),
              }
            : onPick === undefined
              ? {}
              : { onRowClick: (item: T) => onPick(keyOf(item)) })}
        />
      )}
    </div>
  );
}

export type LookupDialogProps<T extends object> = Omit<
  LookupProps<T>,
  "onPick" | "ticked" | "onTickedChange"
> & {
  open: boolean;
  title: string;
  subtitle?: string;
  /** What the field already holds: ticked in `many`, so confirming keeps it. */
  value?: readonly string[];
  onPick: (ids: string[]) => void;
  onClose: () => void;
  /** At the foot, on the left: a `Pagination`, «mostrando 80 de 1.204». */
  footerStart?: ReactNode;
  /** Dock into the workspace — a composer opens it as a panel. */
  onExpand?: () => void;
  movable?: boolean;
};

/** `Lookup` in a window: «Buscar más…» opened from a field. */
export function LookupDialog<T extends object>({
  open,
  title,
  subtitle,
  value = [],
  onPick,
  onClose,
  footerStart,
  onExpand,
  movable = true,
  ...lookup
}: LookupDialogProps<T>) {
  const copy = useUiCopy();
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(value));
  /* Each opening starts from what the field holds, not from what was ticked and cancelled. */
  const holds = value.join("\u0000");
  useEffect(() => {
    if (open) setTicked(new Set(holds === "" ? [] : holds.split("\u0000")));
  }, [open, holds]);
  const many = lookup.pick === "many";

  return (
    <Dialog
      open={open}
      title={title}
      {...(subtitle === undefined ? {} : { subtitle })}
      width="lg"
      movable={movable}
      onClose={onClose}
      {...(onExpand === undefined ? {} : { onExpand })}
      footer={
        <>
          {footerStart === undefined ? null : <div className="mr-auto">{footerStart}</div>}
          <Button role="secondary" size="sm" onClick={onClose}>
            {copy.dialog.cancel}
          </Button>
          {many ? (
            <Button
              role="primary"
              size="sm"
              disabled={ticked.size === 0}
              onClick={() => onPick([...ticked])}
            >
              {ticked.size === 0
                ? copy.lookup.pick
                : fillCopy(copy.lookup.pickCount, { count: ticked.size })}
            </Button>
          ) : null}
        </>
      }
    >
      <Lookup<T>
        {...lookup}
        {...(many
          ? { ticked, onTickedChange: setTicked }
          : { onPick: (id: string) => onPick([id]) })}
      />
    </Dialog>
  );
}
