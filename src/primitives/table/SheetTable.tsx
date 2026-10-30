"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { stickyTop, useScrollBox } from "@sincpro/web-ui/foundations/sticky";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Cell } from "@sincpro/web-ui/primitives/value/Value";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";

/* ==================================================================== *
 *  SHEET TABLE — the glance at the raw data. The spreadsheet.
 *
 *  It is the third table in the system and it does not look like the other two:
 *
 *      DataTable    N records of the same kind. The columns are declared by the
 *                   code, because the code knows what an invoice is.
 *      ReportTable  a hierarchy that ends in totals.
 *      SheetTable   a MATRIX. The columns come out of the file and the code does
 *                   not know which ones they are nor how many; there may be
 *                   forty and the rows may be a million.
 *
 *  That changes three things, and all three are structural:
 *
 *  ── 1. It is virtualized ────────────────────────────────────────────
 *
 *  Drawing 100,000 `<tr>` hangs the tab. `@tanstack/react-virtual` draws the
 *  ~30 that are visible. It is from the same family as the table we already
 *  use, so a second way of thinking about the problem never enters the project.
 *
 *  ── 2. The first column stays pinned ────────────────────────────────
 *
 *  With forty columns, scrolling to the right loses track of which row each
 *  number belongs to. The pinned row number is what lets you find your way back.
 *
 *  ── 3. The cell has SEMANTICS, not just a value ─────────────────────
 *
 *  `null` is a missing value and `""` is an empty cell: they are different
 *  things and the engine tells them apart, so the interface does too. And `tone`
 *  paints the cell —an imputed value, one out of range, one that changed with
 *  respect to the real one—, which is what looking at raw data exists for.
 *
 *  ── 4. It can be fixed in place ─────────────────────────────────────
 *
 *  With `onCommit` the spreadsheet is edited like a spreadsheet and not like a
 *  form: the arrows move the active cell, `Enter` opens and commits moving down,
 *  `Tab` commits moving right, `Escape` cancels. Typing straight away with the
 *  cell active starts editing, which is what anyone coming from a spreadsheet
 *  does.
 *
 *  It is the «I saw the missing value, I fix it here» case — which until now
 *  forced you to download the CSV, edit it outside and upload it again.
 * ==================================================================== */

export interface SheetColumn {
  id: string;
  /** The name of the column, just as it came from the file. */
  header: string;
  /** The detected type, underneath the name. It is half the value of a glance:
   *  seeing that `importe` was read as text explains the rest of the screen. */
  type?: string;
  numeric?: boolean;
  width?: number;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-ink/6",
  info: "bg-info/12",
  good: "bg-good/12",
  warn: "bg-warn/15",
  bad: "bg-bad/12",
  accent: "bg-accent/20",
};

const WIDTH = 168;
const HEIGHT = 28;

export function SheetTable({
  columns,
  rows,
  /** The value of a cell, by index. It is a function and not a prebuilt matrix
   *  so that the consumer can read from wherever they want without copying a
   *  million rows into another structure. */
  value,
  /** Which cells are painted and with what. `undefined` is unpainted, which is
   *  the normal case — a spreadsheet with everything colored highlights
   *  nothing. */
  tone,
  /** What the cell says on hover: «imputado por la mediana». */
  note,
  height = 420,
  rowLabel,
  band,
  onBandToggle,
  caption,
  onCommit,
  editable,
}: {
  columns: readonly SheetColumn[];
  rows: number;
  value: (row: number, column: SheetColumn, columnIndex: number) => string | number | null;
  tone?: (row: number, column: SheetColumn, columnIndex: number) => Tone | undefined;
  note?: (row: number, column: SheetColumn, columnIndex: number) => string | undefined;
  /** Pixel height of the scroll box. `"auto"` grows with the rows so a
   *  twenty-row glance is not a window with its own scrollbar. */
  height?: number | "auto";
  rowLabel?: (row: number) => string;
  /**
   * Esta fila no es una fila: es la cabecera del montón que empieza acá.
   *
   * Agrupar sin perder la virtualización es esto — **una banda es una fila
   * más, de otra clase**. La alternativa era una planilla por montón, y eso
   * son N cuadrículas con N encabezados y N scrolls para un solo conjunto.
   *
   * `depth` es cuán adentro está el montón. La planilla no puede recibir un
   * árbol —está virtualizada por índice, y un índice es una posición en una
   * secuencia—, así que la jerarquía la dice la sangría de cada banda y no el
   * anidamiento del marcado.
   */
  band?: (row: number) =>
    | {
        field?: string;
        label: string;
        count: number;
        open: boolean;
        depth?: number;
        /**
         * Lo que el montón suma EN CADA COLUMNA, en la posición de esa columna.
         *
         * Una banda que pone su total en un rincón obliga a buscar a qué columna
         * corresponde el número. Alineado bajo su columna no hay nada que buscar:
         * la cuadrícula ya dice qué significa, que es para lo que existe una
         * cuadrícula. `null` en una columna que no suma — que es la mayoría.
         */
        total?: (column: SheetColumn, columnIndex: number) => string | number | null;
      }
    | undefined;
  onBandToggle?: (row: number) => void;
  caption?: ReactNode;
  /** Present = the spreadsheet is editable. It receives the raw text just as it
   *  was typed; converting it to the column's type belongs to the domain, not
   *  here. */
  onCommit?: (row: number, column: SheetColumn, columnIndex: number, next: string) => void;
  /** Which cells are editable. Without this, all of them — but a computed column
   *  or an identifier is not touched. */
  editable?: (row: number, column: SheetColumn, columnIndex: number) => boolean;
}) {
  const copy = useUiCopy();
  const labelOf = rowLabel ?? ((i: number) => (i + 1).toLocaleString(copy.locale));

  /* `"auto"` es para un conjunto que ya vino CORTADO —una página de ochenta— y
     deja de virtualizar de hecho: sin scroll propio, la ventana visible es la
     caja entera y se dibujan todas las filas. Para los datos crudos —donde son
     un millón— hay que declarar un alto, y ahí sí se dibujan las ~30 que se
     ven. Cuándo la caja es un contenedor de scroll lo decide `useScrollBox`. */
  const caja = useScrollBox<HTMLDivElement>(height === "auto" ? {} : { height });
  const v = useVirtualizer({
    count: rows,
    getScrollElement: () => caja.ref.current,
    estimateSize: () => HEIGHT,
    overscan: 12,
  });

  const items = v.getVirtualItems();

  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const isEditable = onCommit !== undefined;

  function canEdit(r: number, c: number): boolean {
    if (!isEditable) return false;
    const col = columns[c];
    if (col === undefined) return false;
    return editable === undefined || editable(r, col, c);
  }

  function goTo(r: number, c: number) {
    const rr = Math.max(0, Math.min(rows - 1, r));
    const cc = Math.max(0, Math.min(columns.length - 1, c));
    setActive({ r: rr, c: cc });
    setDraft(null);
    v.scrollToIndex(rr);
  }

  function openCell(r: number, c: number, initial?: string) {
    if (!canEdit(r, c)) return;
    const col = columns[c]!;
    setActive({ r, c });
    setDraft(initial ?? String(value(r, col, c) ?? ""));
  }

  function commit(dr: number, dc: number) {
    if (active === null || draft === null) return;
    const col = columns[active.c];
    if (col !== undefined) onCommit?.(active.r, col, active.c, draft);
    setDraft(null);
    if (dr !== 0 || dc !== 0) goTo(active.r + dr, active.c + dc);
  }

  /* All the keyboard handling in one place. Splitting it between the box and
     each cell is how you end up with spreadsheets whose arrows sometimes move
     and sometimes scroll. */
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (active === null) return;
    const { r, c } = active;

    if (editing) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDraft(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        commit(e.shiftKey ? -1 : 1, 0);
      } else if (e.key === "Tab") {
        e.preventDefault();
        commit(0, e.shiftKey ? -1 : 1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        goTo(r + 1, c);
        return;
      case "ArrowUp":
        e.preventDefault();
        goTo(r - 1, c);
        return;
      case "ArrowRight":
      case "Tab":
        e.preventDefault();
        goTo(r, c + (e.shiftKey && e.key === "Tab" ? -1 : 1));
        return;
      case "ArrowLeft":
        e.preventDefault();
        goTo(r, c - 1);
        return;
      case "Enter":
      case "F2":
        e.preventDefault();
        openCell(r, c);
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        if (canEdit(r, c)) {
          const col = columns[c];
          if (col !== undefined) onCommit?.(r, col, c, "");
        }
        return;
      default:
        /* Typing with the cell active starts editing and keeps the keystroke:
           it is what anyone coming from a spreadsheet does, and losing the first
           character feels like the app is not responding. */
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          openCell(r, c, e.key);
        }
    }
  }

  return (
    <div className="flex min-w-0 flex-col">
      {caption === undefined ? null : (
        <div className="px-3 pb-2 text-meta text-muted">{caption}</div>
      )}

      {/* `grid` and not `table`: with `position: sticky` on two axes at once, a
          real table forces you to fight the stacking order of `thead` against
          the one of the first cell of each row. With a grid the header and the
          column are ordinary boxes and each one declares its own `z`. */}
      <div
        ref={caja.ref}
        style={caja.style}
        onKeyDown={isEditable ? onKey : undefined}
        tabIndex={isEditable ? 0 : undefined}
        className={`relative min-w-0 rounded-box border border-line bg-surface focus:outline-none ${caja.className}`}
        role="grid"
        aria-rowcount={rows}
        aria-colcount={columns.length + 1}
      >
        {/* `minWidth` and not `width`: with few columns, a fixed width left half
            the box empty and without lines, as if the table had been cut off.
            With a minimum, the rows reach the edge and the filler at the end
            says there are no more columns, which is something else. */}
        <div
          style={{
            minWidth: `${ROW_LABEL_WIDTH + columns.reduce((a, c) => a + (c.width ?? WIDTH), 0)}px`,
          }}
        >
          {/* The header */}
          <div
            className="sticky z-20 flex border-b border-line-strong bg-ground"
            style={stickyTop}
            role="row"
          >
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-line bg-ground"
              style={{ width: ROW_LABEL_WIDTH }}
            />
            {columns.map((c) => (
              <div
                key={c.id}
                role="columnheader"
                style={{ width: c.width ?? WIDTH }}
                className={`flex shrink-0 flex-col justify-center gap-0.5 border-r border-line px-2.5 py-1.5 ${
                  c.numeric === true ? "items-end" : "items-start"
                }`}
              >
                <span
                  className="max-w-full truncate text-meta font-medium text-ink"
                  title={c.header}
                >
                  {c.header}
                </span>
                {c.type === undefined ? null : (
                  <span className="max-w-full truncate font-mono text-micro text-muted">
                    {c.type}
                  </span>
                )}
              </div>
            ))}
            <div className="flex-1" />
          </div>

          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {items.map((item) => {
              const montón = band?.(item.index);
              if (montón !== undefined) {
                /* La banda queda pegada a la IZQUIERDA como el número de fila:
                   con cuarenta columnas, un rótulo que se va con el scroll
                   horizontal deja de decir en qué montón estás justo cuando
                   más lejos estás de él. */
                return (
                  /* La banda RESPETA la cuadrícula: rótulo en la columna fija de
                     la izquierda, y después una celda por columna —vacía, salvo
                     que esa columna sume algo—. Antes era un rótulo suelto que
                     ignoraba las columnas, y entonces un total quedaba en un
                     rincón sin decir de qué columna era. */
                  <div
                    key={item.key}
                    role="row"
                    aria-rowindex={item.index + 1}
                    className="absolute top-0 left-0 flex w-full border-b border-line-strong bg-ground"
                    style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    <button
                      type="button"
                      onClick={
                        onBandToggle === undefined
                          ? undefined
                          : () => onBandToggle(item.index)
                      }
                      aria-expanded={montón.open}
                      className="sticky left-0 z-10 flex min-w-0 shrink-0 items-center gap-1.5 border-r border-line bg-ground px-2.5 text-left"
                      style={{
                        height: "100%",
                        /* El mismo ancho que la columna del número de fila, para
                           que el rótulo no corra la cuadrícula. */
                        width: ROW_LABEL_WIDTH,
                        ...(montón.depth === undefined || montón.depth === 0
                          ? {}
                          : {
                              paddingLeft: `calc(var(--spacing-indent) * ${montón.depth} + 0.625rem)`,
                            }),
                      }}
                    >
                      {onBandToggle === undefined ? null : (
                        <ChevronRight
                          className={`size-(--size-icon-sm) shrink-0 text-muted transition-transform duration-(--duration-instant) ${
                            montón.open ? "rotate-90" : ""
                          }`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                    </button>

                    {/* El rótulo del montón ocupa la PRIMERA columna, que es
                        donde alguien lo busca; de la segunda en adelante van los
                        totales, cada uno bajo lo suyo. */}
                    {columns.map((c, ci) => {
                      const total = montón.total?.(c, ci) ?? null;
                      return (
                        <div
                          key={c.id}
                          role="gridcell"
                          style={{ width: c.width ?? WIDTH }}
                          className={`flex shrink-0 items-center overflow-hidden border-r border-line px-2.5 whitespace-nowrap ${
                            c.numeric === true ? "justify-end" : "justify-start"
                          }`}
                        >
                          {ci === 0 ? (
                            <span className="flex min-w-0 items-center gap-1.5">
                              {montón.field === undefined ? null : (
                                <span className="shrink-0 text-micro text-muted/70">
                                  {montón.field}
                                </span>
                              )}
                              <span className="truncate text-micro font-medium text-ink">
                                {montón.label}
                              </span>
                              <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro tabular-nums text-muted">
                                {montón.count.toLocaleString(copy.locale)}
                              </span>
                            </span>
                          ) : total === null ? null : (
                            <span className="truncate text-meta font-medium tabular-nums text-ink">
                              {typeof total === "number"
                                ? total.toLocaleString(copy.locale)
                                : total}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div
                  key={item.key}
                  role="row"
                  aria-rowindex={item.index + 1}
                  className="absolute top-0 left-0 flex w-full border-b border-line"
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                >
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center justify-end border-r border-line bg-surface px-2 text-micro tabular-nums text-muted"
                    style={{ width: ROW_LABEL_WIDTH }}
                  >
                    {labelOf(item.index)}
                  </div>

                  {columns.map((c, ci) => {
                    const t = tone?.(item.index, c, ci);
                    const n = note?.(item.index, c, ci);
                    const isActive =
                      active !== null && active.r === item.index && active.c === ci;
                    const isEditingHere = isActive && editing;
                    return (
                      <div
                        key={c.id}
                        role="gridcell"
                        title={n}
                        aria-selected={isActive}
                        onClick={isEditable ? () => goTo(item.index, ci) : undefined}
                        onDoubleClick={
                          isEditable ? () => openCell(item.index, ci) : undefined
                        }
                        style={{ width: c.width ?? WIDTH }}
                        className={`relative flex shrink-0 items-center overflow-hidden border-r border-line px-2.5 text-meta tabular-nums whitespace-nowrap text-ink ${
                          c.numeric === true ? "justify-end" : "justify-start"
                        } ${t === undefined ? "" : TONE[t]} ${
                          /* The outline of the active cell goes on the inside
                           (`inset-ring`) and not on the outside: a 2 px border
                           would push the content and the whole row would dance
                           as you move around with the arrows. */
                          isActive
                            ? "inset-ring-2 inset-ring-primary"
                            : isEditable
                              ? "cursor-cell"
                              : ""
                        }`}
                      >
                        {isEditingHere ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(ev) => setDraft(ev.target.value)}
                            onBlur={() => commit(0, 0)}
                            className={`absolute inset-0 w-full bg-surface px-2.5 text-meta tabular-nums text-ink outline-none ${
                              c.numeric === true ? "text-right" : "text-left"
                            }`}
                          />
                        ) : (
                          <Cell value={value(item.index, c, ci)} max={24} />
                        )}
                      </div>
                    );
                  })}
                  <div className="flex-1" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const ROW_LABEL_WIDTH = 64;
