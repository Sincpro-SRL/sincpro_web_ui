"use client";

import { fillCopy, type UiCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { pathKey } from "@sincpro/web-ui/foundations/grouping";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { CellEditor } from "@sincpro/web-ui/primitives/table/CellEditor";
import { type RowAction, RowActions } from "@sincpro/web-ui/primitives/table/RowActions";
import {
  SelectBox,
  type SortState,
  Table,
  Td,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui/primitives/table/Table";
import {
  aggregationFns,
  type ColumnDef,
  columnGroupingFeature,
  createColumnHelper,
  createExpandedRowModel,
  createGroupedRowModel,
  createSortedRowModel,
  rowAggregationFeature,
  rowExpandingFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useMemo } from "react";

/* ==================================================================== *
 *  DATATABLE — grouping, sorting and expanding, without writing it ourselves.
 *
 *  The logic comes from `@tanstack/react-table`; the presentation, from our own
 *  primitives. That split is the important decision in this file:
 *
 *      `Table` / `Th` / `Td`   are OURS and are used without this library —
 *                              glancing at invoice lines does not need grouping.
 *      `DataTable`             is the wiring, and it lives in ONE file.
 *
 *  If tomorrow TanStack is not enough —or rewrites its API again, the way it did
 *  from v8 to v9— this file changes and the visual system never finds out.
 *
 *  ── Why we do not write the grouping ourselves ──────────────────────
 *
 *  Because grouping is not splitting an array. It is grouping, aggregating per
 *  column (count, sum, average), keeping the order WITHIN each group, expanding
 *  and collapsing, and making a column sort reorder the groups and not the
 *  loose rows. Each one of those is simple and the six together are a month.
 *
 *  ── The API is OURS, not the library's ──────────────────────────────
 *
 *  `DataColumn` is not `ColumnDef`. The consumer declares what to show and how
 *  to aggregate it; the translation to the library happens here. Exposing
 *  `ColumnDef` would make every screen in the product depend on a TanStack
 *  version, which is exactly what this layer exists to avoid.
 * ==================================================================== */

/** How a column is aggregated when its rows are pulled together into a group.
 *
 *  **`count` is the default and it is the right one almost always**: summing
 *  identifiers or averaging file sizes produces numbers that look like data and
 *  mean nothing. An aggregate has to be chosen on purpose. */
export type Aggregate = "count" | "sum" | "mean" | "min" | "max" | "unique";

function aggregateLabel(copy: UiCopy, kind: Aggregate, v: number): string {
  const n = v.toLocaleString(copy.locale);
  switch (kind) {
    case "sum":
      return n;
    case "count":
      return `${n} ${v === 1 ? copy.table.row : copy.table.rows}`;
    case "mean":
      return fillCopy(copy.table.mean, {
        value: v.toLocaleString(copy.locale, { maximumFractionDigits: 2 }),
      });
    case "min":
      return fillCopy(copy.table.min, { value: n });
    case "max":
      return fillCopy(copy.table.max, { value: n });
    case "unique":
      return fillCopy(copy.table.distinct, { value: n });
  }
}

function raw(copy: UiCopy, v: string | number | boolean | null): string {
  if (v === null) return "—";
  if (typeof v === "number") return v.toLocaleString(copy.locale);
  if (typeof v === "boolean") return v ? copy.table.yes : copy.table.no;
  return v;
}

/** What a cell draws: its `cell`, or the raw value. */
function drawCell<T>(copy: UiCopy, column: DataColumn<T>, row: T): ReactNode {
  return column.cell === undefined ? raw(copy, column.value(row)) : column.cell(row);
}

export interface DataColumn<T> {
  id: string;
  header: string;
  /** Qué campo del MODELO muestra esta columna, cuando no se llama igual que
   *  él: «filas» muestra `row_count`. Lo lee `columnsFromModel` para no volver
   *  a agregar, en crudo, un campo que esta columna ya contesta. */
  field?: string;
  /** The raw value: this is what sorting and grouping run on. */
  value: (row: T) => string | number | boolean | null;
  /** How it is drawn. Without this the raw value is drawn. */
  cell?: (row: T) => ReactNode;
  /** A column of CODES — a SKU, a hash, a key — set in the monospaced face. Numbers do not
   *  need it: they align with tabular figures in the same face as the rest of the row. */
  mono?: boolean;
  /**
   * Cómo se LEE la columna donde no se puede dibujar: la planilla, que es una
   * cuadrícula de texto y números y no puede recibir un nodo.
   *
   * Context: sin esto, la planilla caía a `value`, que es la clave de ORDEN y
   * no lo que una persona lee. La columna «estado» de Facturas mostraba
   * `posted` y `paid` —los valores del contrato— en vez de «publicada» y
   * «pagada», que es lo que dice la ficha de al lado en la tabla. Dos
   * presentaciones del mismo conjunto diciendo cosas distintas.
   */
  text?: (row: T) => string;
  /** Paints the BACKGROUND of the cell, row by row. It is what turns a table
   *  into something you look at: «this amount is out of range», «this value was
   *  imputed by the engine». Returning `undefined` leaves the cell unpainted,
   *  which is the normal case — a table with everything colored highlights
   *  nothing. */
  tone?: (row: T) => Tone | undefined;
  /** Why it is painted, on hover. */
  note?: (row: T) => string | undefined;
  numeric?: boolean;
  width?: number;
  aggregate?: Aggregate;
  sortable?: boolean;
  /** Odoo: fields without `optional` cannot leave the view. When true, the
   *  column appears in the columns submenu and can be hidden. */
  optional?: boolean;
  /** Odoo `optional="hide"`: start off. Only with `optional`. */
  defaultHidden?: boolean;
  /**
   * Edit this cell IN the list, through a small popover anchored to it: the salesperson of
   * an invoice, its due date, its stage. The cell becomes a button (with a pencil on hover
   * and focus) and `render` draws the editor inside the popover.
   *
   * Context: one function and not a kind of editor, because the editor is the system's own
   * control — a `Picker`, a `Calendar`, a `Select` — written by whoever knows the field.
   * The editor commits with its own gesture and then calls `done`, which closes the popover
   * and returns the focus to the cell. Escape and a click outside close without committing.
   * Do not draw links in an editable column: the cell is already a button.
   */
  edit?: {
    render: (row: T, done: () => void) => ReactNode;
    /** Which rows can be changed — a paid invoice cannot. All of them by default. */
    when?: (row: T) => boolean;
  };
}

/* The features are declared once. In v9 they are opt-in: asking only for what
   is used is what keeps the bundle down to what is actually needed. */
const FEATURES = tableFeatures({
  rowSortingFeature,
  columnGroupingFeature,
  rowExpandingFeature,
  // `rowAggregationFeature` is what enables `aggregationFn` on a column.
  // Without it, grouping pulls rows together but each column does not know what
  // to show in the group row — which is half of the reason for grouping.
  rowAggregationFeature,
  sortedRowModel: createSortedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns,
  aggregationFns,
});

/**
 * El agregado de una columna sobre un conjunto de filas.
 *
 * Vive afuera del componente porque lo preguntan tres lugares: el pie de la
 * tabla, la banda de un montón en la planilla, y la línea de un informe armado
 * a partir de los montones. Tres implementaciones de «cuánto suma esto» es que
 * el pie diga un número y el montón otro.
 *
 * `null` cuando la columna no declaró agregado, no es numérica, o no hay ningún
 * número que sumar — que es distinto de sumar cero.
 */
export function aggregateOf<T extends object>(
  column: DataColumn<T>,
  rows: readonly T[],
): number | null {
  if (column.aggregate === undefined || column.numeric !== true) return null;
  const numbers = rows
    .map((row) => column.value(row))
    .filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) return null;
  switch (column.aggregate) {
    case "sum":
      return numbers.reduce((a, b) => a + b, 0);
    case "mean":
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    case "min":
      return Math.min(...numbers);
    case "max":
      return Math.max(...numbers);
    case "unique":
      return new Set(numbers).size;
    default:
      return numbers.length;
  }
}

/**
 * UN NIVEL, como lo necesita una tabla.
 *
 * La identidad es la del NIVEL y no la del campo: un mismo `registered_at`
 * puesto por mes y por día son dos cortes, y con el nombre del campo serían el
 * mismo repetido. `keyOf` da la clave del motor —la misma que arman las otras
 * presentaciones, así que lo plegado vale para todas— y `labelOf` la lee en el
 * idioma activo.
 */
export type GroupColumn<T> = {
  /** La identidad del nivel: `levelKey(level)`. */
  id: string;
  /** Cómo se llama el corte, a la izquierda del valor. Sin él, «Septiembre» no
   *  dice si es cuándo se registró o cuándo se corrió. */
  label: string;
  /** A qué montón va cada fila en este nivel. */
  keyOf: (item: T) => string;
  /** Cómo se lee esa clave. */
  labelOf: (key: string) => string;
};

export function DataTable<T extends object>({
  data,
  columns,
  getRowId,
  sort,
  onSortChange,
  levels,
  selected,
  onSelectedChange,
  height,
  onRowClick,
  rowActions,
  totals = false,
  collapsed,
  onGroupToggle,
}: {
  data: readonly T[];
  columns: readonly DataColumn<T>[];
  getRowId: (row: T) => string;
  sort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  /**
   * Los NIVELES por los que se parte, de afuera hacia adentro. Vacío o ausente
   * es «sin agrupar».
   *
   * Varios, porque agrupar no es una pregunta: «por cliente y después por
   * mes» es un árbol y no una lista de montones. El orden ES la jerarquía.
   */
  levels?: readonly GroupColumn<T>[];
  selected?: ReadonlySet<string>;
  onSelectedChange?: (next: Set<string>) => void;
  height?: number;
  onRowClick?: (row: T) => void;
  /** What you do to ONE row without going into it. They are drawn hidden and
   *  show up on the hovered row — see `RowActions.tsx`. */
  rowActions?: (row: T) => readonly RowAction[];
  /** The footer with the aggregate of every column that declared one.
   *
   *  Context: up to now the aggregate only existed INSIDE a group, so an
   *  ungrouped table had no way to say how much it adds up to — and «how much
   *  does it add up to» is the question that makes a table of amounts a report
   *  and not a list. It stays pinned at the bottom: in a four-hundred-row table,
   *  a total you have to scroll to is a total nobody sees. */
  totals?: boolean;
  /** Group keys that are closed. Same keys as `ListGroup.collapsed`, so the
   *  table does not reopen what rows just folded. */
  collapsed?: readonly string[];
  onGroupToggle?: (key: string) => void;
}) {
  const copy = useUiCopy();
  // In v9 the helper is bound to the features AND to the data type: that is what
  // makes the compiler know about `enableGrouping` only if we ask for the
  // feature.
  const helper = useMemo(() => createColumnHelper<typeof FEATURES, T>(), []);

  const defs = useMemo(
    () => [
      ...columns.map((c) =>
        helper.accessor((row) => c.value(row), {
          id: c.id,
          header: c.header,
          enableSorting: c.sortable !== false,
          /* Ninguna columna agrupa. Lo que parte el conjunto son los NIVELES, y
             cada uno entra como una columna suya —abajo— que existe sólo para
             eso: nadie la dibuja y nadie la ordena. */
          enableGrouping: false,
          aggregationFn: c.aggregate ?? "count",
        }),
      ),
      /* Una columna por NIVEL, no por campo. Es la única forma de que «por mes y
         adentro por día» sea dos cortes: con el id de la columna, los dos niveles
         de `registered_at` eran el mismo id repetido, y un mismo id no se puede
         agrupar dos veces.

         Y la clave la pone el nivel, no la columna: `value` es la clave de
         ORDEN —para una fecha, los milisegundos— y agrupar por ella deja un
         montón por instante, con «1789294903895» de rótulo. Acá entra la misma
         clave que arman las otras cinco presentaciones, así que los montones de
         la tabla son LOS MISMOS y lo plegado vale para todas. */
      ...(levels ?? []).map((level) =>
        helper.accessor((row) => level.keyOf(row), {
          id: level.id,
          header: level.label,
          enableSorting: false,
          enableGrouping: true,
        }),
      ),
    ],
    [columns, helper, levels],
  ) as unknown as ColumnDef<typeof FEATURES, T, unknown>[];
  /* The assertion, and why it is safe: `ColumnDef` is INVARIANT in its value
     type (`in out TValue`), so an array of columns with concrete values is not
     assignable to the one of `unknown` even though each one on its own is. The
     library solves this with `helper.columns([...])`, which needs a literal
     tuple — and here the columns come out of a `map` over what the consumer
     declared, which is not literal.

     It is safe because that value is only used by the library to sort and
     group; it is never read with its type from our side. What gets drawn comes
     from `c.cell(row)` or from `c.value(row)`, both typed against `T`. */

  const table = useTable({
    features: FEATURES,
    data,
    columns: defs,
    getRowId: (row) => getRowId(row),
    state: {
      sorting:
        sort === null || sort === undefined
          ? []
          : [{ id: sort.key, desc: sort.direction === "desc" }],
      grouping: (levels ?? []).map((level) => level.id),
    },
    // Groups start open: grouping and then having to open each group is two
    // gestures for what the user asked for in one.
    initialState: { expanded: true },
  });

  const rows = table.getRowModel().rows;

  /**
   * The PATH of a row: the values of every group it hangs from, outermost
   * first.
   *
   * The identity of a pile is its route and not its value, because with several
   * levels two piles can be called the same — «2026-09» inside «Ferretería Sur» and
   * «2026-09» inside «Distribuidora Andina» are different piles, and folding one must not
   * fold the other. It walks up because that is where TanStack keeps the
   * ancestry; a leaf contributes nothing, since `groupingColumnId` is only set
   * on grouped rows.
   */
  function pathOf(row: (typeof rows)[number]): string[] {
    const path: string[] = [];
    let node: typeof row | undefined = row;
    while (node !== undefined) {
      const columnId = node.groupingColumnId;
      if (columnId !== undefined && columnId !== null) {
        path.unshift(String(node.getGroupingValue(columnId) ?? "—"));
      }
      node = node.getParentRow();
    }
    return path;
  }

  /* TanStack keeps every leaf in the model when `expanded: true`. Folding is
     ours: the same path keys as the rows presentation, so switching present
     does not reopen a group.

     It checks EVERY ancestor and not just the parent. With one level they were
     the same thing; with several, folding the outer pile has to take the inner
     ones with it — otherwise closing «Ferretería Sur» leaves its months on screen,
     orphaned under a header that says it is closed. */
  const drawn =
    collapsed === undefined
      ? rows
      : rows.filter((row) => {
          let node = row.getParentRow();
          while (node !== undefined) {
            if (collapsed.includes(pathKey(pathOf(node)))) return false;
            node = node.getParentRow();
          }
          return true;
        });
  const selecting = onSelectedChange !== undefined;

  const leaves = useMemo(() => rows.filter((r) => r.subRows.length === 0), [rows]);

  /* The aggregates are computed by the component and not by TanStack: its
     `aggregationFn` lives in the GROUP model, and a footer exists precisely when
     there are no groups. */
  const footer = useMemo(
    () => (totals ? columns.map((c) => aggregateOf(c, data)) : null),
    [totals, columns, data],
  );
  const all = leaves.length > 0 && leaves.every((r) => selected?.has(r.id) === true);
  const some = leaves.some((r) => selected?.has(r.id) === true);

  function toggle(id: string, on: boolean) {
    const n = new Set(selected ?? []);
    if (on) n.add(id);
    else n.delete(id);
    onSelectedChange?.(n);
  }

  return (
    <Table height={height}>
      <THead>
        {selecting ? (
          <Th width={36}>
            <SelectBox
              label={copy.selection.all}
              checked={all}
              indeterminate={some}
              onChange={(v) =>
                onSelectedChange?.(v ? new Set(leaves.map((r) => r.id)) : new Set())
              }
            />
          </Th>
        ) : null}
        {columns.map((c) => (
          <Th
            key={c.id}
            sortKey={c.sortable === false ? undefined : c.id}
            sort={sort}
            onSort={onSortChange}
            numeric={c.numeric}
            width={c.width}
          >
            {c.header}
          </Th>
        ))}
        {/* The actions column carries no label: naming a column that is empty
            until the pointer arrives is labelling the void. */}
        {rowActions === undefined ? null : <Th width={1}>{""}</Th>}
      </THead>

      <tbody>
        {drawn.map((row) => {
          const isGroup = row.subRows.length > 0;

          if (isGroup) {
            const path = pathOf(row);
            const key = pathKey(path);
            const depth = path.length - 1;
            const id = row.groupingColumnId ?? undefined;
            const level = levels?.find((one) => one.id === id);
            /* La CLAVE del montón —la del motor— y el rótulo, que lo pone el
               nivel: son dos textos y sólo el segundo cambia con el idioma. */
            const value = path[depth] ?? key;
            const open =
              collapsed === undefined
                ? row.getIsExpanded()
                : collapsed.includes(key) !== true;
            return (
              /* The group row: it spans the whole width, says which value it
                 groups by and how many are inside. The counter is what makes it
                 useful without opening it. */
              <tr key={row.id} className="border-b border-line bg-ground">
                <td
                  colSpan={
                    columns.length + (selecting ? 1 : 0) + (rowActions === undefined ? 0 : 1)
                  }
                  className="px-3 py-1.5"
                  style={
                    depth === 0
                      ? undefined
                      : { paddingLeft: `calc(var(--spacing-indent) * ${depth} + 0.75rem)` }
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      onGroupToggle === undefined ? row.toggleExpanded() : onGroupToggle(key)
                    }
                    aria-expanded={open}
                    className="inline-flex items-center gap-1.5 rounded-control text-meta font-medium text-ink transition-colors duration-(--duration-instant) hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  >
                    <ChevronRight
                      className={`size-(--size-icon-sm) text-muted transition-transform duration-(--duration-instant) ${
                        open ? "rotate-90" : ""
                      }`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    {/* Which field this pile was cut by. With a single level
                        everyone knew; with several, a bare «2026-09» does not
                        say whether it is the month it was registered or the one
                        it ran. */}
                    {level === undefined ? null : (
                      <span className="text-micro font-normal text-muted/70">
                        {level.label}
                      </span>
                    )}
                    <span>{level === undefined ? value : level.labelOf(value)}</span>
                    <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro tabular-nums text-muted">
                      {/* Las FILAS de adentro, no los subgrupos. `subRows` de un
                          montón con niveles abajo son los montones del nivel
                          siguiente, así que contarlos decía «2» donde hay
                          cuarenta filas. */}
                      {row.getLeafRows().length.toLocaleString(copy.locale)}
                    </span>
                  </button>
                </td>
              </tr>
            );
          }

          const original = row.original;
          return (
            <Tr
              key={row.id}
              selected={selected?.has(row.id) === true}
              onClick={onRowClick === undefined ? undefined : () => onRowClick(original)}
            >
              {selecting ? (
                <Td>
                  <SelectBox
                    label={copy.selection.row}
                    checked={selected?.has(row.id) === true}
                    onChange={(v) => toggle(row.id, v)}
                  />
                </Td>
              ) : null}
              {columns.map((c) => {
                const t = c.tone?.(original);
                const n = c.note?.(original);
                const edit = c.edit?.when?.(original) === false ? undefined : c.edit;
                return (
                  <Td
                    key={c.id}
                    numeric={c.numeric}
                    mono={c.mono === true}
                    {...(t === undefined ? {} : { tone: t })}
                    {...(n === undefined ? {} : { title: n })}
                  >
                    {edit !== undefined ? (
                      <CellEditor
                        label={fillCopy(copy.inlineEdit.editCell, { column: c.header })}
                        numeric={c.numeric === true}
                        editor={(done) => edit.render(original, done)}
                      >
                        {drawCell(copy, c, original)}
                      </CellEditor>
                    ) : (
                      drawCell(copy, c, original)
                    )}
                  </Td>
                );
              })}
              {rowActions === undefined ? null : (
                <RowActions actions={rowActions(original)} />
              )}
            </Tr>
          );
        })}
      </tbody>

      {footer === null ? null : (
        <tfoot className="sticky bottom-0 z-10 bg-ground">
          <tr className="border-t border-line-strong">
            {selecting ? <td /> : null}
            {columns.map((c, i) => {
              const value = footer[i] ?? null;
              return (
                <td
                  key={c.id}
                  className={`px-3 py-1.5 text-meta font-semibold text-ink ${
                    c.numeric === true ? "text-right tabular-nums" : ""
                  }`}
                >
                  {/* The label goes in the FIRST column and not in a separate
                      row: a footer that does not say what it is about is five
                      loose numbers. */}
                  {i === 0 && value === null ? (
                    <span className="text-muted">
                      {data.length.toLocaleString(copy.locale)}{" "}
                      {data.length === 1 ? copy.table.row : copy.table.rows}
                    </span>
                  ) : value === null ? null : (
                    aggregateLabel(copy, c.aggregate ?? "count", value)
                  )}
                </td>
              );
            })}
            {rowActions === undefined ? null : <td />}
          </tr>
        </tfoot>
      )}
    </Table>
  );
}
