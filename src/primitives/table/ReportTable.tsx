"use client";

import { currentCopyLocale, fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { stickyTop, useScrollBox } from "@sincpro/web-ui/foundations/sticky";
import { ChevronRight, Info } from "lucide-react";
import { type ReactNode, useState } from "react";

/* ==================================================================== *
 *  REPORT TABLE — the table that ADDS UP. A balance sheet, an income
 *  statement, stock per warehouse, the sales per customer.
 *
 *  It is a different table from `DataTable` and the difference is not
 *  cosmetic:
 *
 *      DataTable    N records COMPARABLE with one another. You sort them, you
 *                   select them, you group them. Every row is a thing of the
 *                   same kind.
 *      ReportTable  a HIERARCHY that ends in totals. It is not sorted —the
 *                   order IS the report— and the rows are not of the same kind:
 *                   a section, a group, a line and a total read differently
 *                   because they mean different things.
 *
 *  Sorting a balance sheet by amount destroys it: «Total Activos» would end up
 *  in the middle. That is why this table has no clickable headers.
 *
 *  ── The four kinds of row, and how they are told apart without reading ──
 *
 *      section  grey band, small caps. «Activos», «Pasivos».
 *      group    bold, no band. It opens and closes.
 *      line     normal. It is an account, a warehouse, a customer.
 *      total    bold with a rule on top. It closes what comes above it.
 *
 *  The indent comes from `level` and not from the kind: there are groups of
 *  groups.
 *
 *  ── The zero dims and the negative gets painted ─────────────────────
 *
 *  A balance sheet has more zeros than numbers. Drawing them with the same ink
 *  as the amounts forces you to read forty lines to find the six that say
 *  something. Dimmed, the ones that matter jump out on their own.
 *
 *  The negative goes in red because in a financial report a minus sign in front
 *  of a seven-digit number is one pixel — and it is exactly the pixel that
 *  changes what the line means.
 * ==================================================================== */

export type ReportRowKind = "section" | "group" | "line" | "total";

export interface ReportRow {
  id: string;
  label: string;
  /** The indent. It comes from the consumer and not from the nesting, because a
   *  second-level total lives next to its siblings and not inside them. */
  level?: number;
  kind?: ReportRowKind;
  /** One value per column, in the same order. `null` is «not applicable» and is
   *  drawn empty — different from `0`, which is an amount. */
  values: readonly (number | null)[];
  /** What hangs underneath when it opens. Its presence is what puts the chevron
   *  there. */
  children?: readonly ReportRow[];
  /** The note on the line: what goes into this account, where the number comes
   *  from. */
  note?: string;
  onClick?: () => void;
}

export interface ReportColumn {
  id: string;
  header: string;
  /** For a percentage or a variation column, which is not formatted the same
   *  way. */
  format?: (value: number) => string;
}

/* `useGrouping: "always"` and not the default: without it, four-digit numbers
   lose the thousands separator —`2023.04` next to `258,015.31` in en-US, or
   `2023,04` next to `258.015,31` in es-ES— and in a column of amounts that
   inconsistency reads as a data error. */
function amountFormat(locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    /* The assertion is because of the type definitions, not because of the
       engine: `"always"` is ES2023 and TypeScript's `lib` still declares
       `useGrouping` as a boolean. The runtime understands it, and a boolean here
       is not enough — `true` still leaves four-digit numbers without a
       separator. */
    useGrouping: "always" as unknown as boolean,
  });
}

const INDENT = 1.25;

/** The look of each kind of row. It is up here and not spread across the JSX
 *  because it is THE decision table of the component: it reads in one go and it
 *  changes in one place.
 *
 *  `cell` goes on EVERY cell and not on the `<tr>`: the first column is `sticky`
 *  and needs a background of its own to cover what passes underneath, so a
 *  background on the row plus another one on the pinned cell gives two layers of
 *  the same alpha and the band comes out of two greys. The hover of a clickable
 *  row is the same: a layer inside each cell, rounded at the two ends, so the
 *  pinned name stays opaque and the mark does not run off the sheet. */
const SKIN: Record<ReportRowKind, { row: string; cell: string; text: string }> = {
  section: { row: "", cell: "bg-ink/8", text: "font-semibold text-ink" },
  group: { row: "", cell: "bg-surface", text: "font-medium text-ink" },
  line: { row: "", cell: "bg-surface", text: "text-ink" },
  total: {
    row: "border-t border-line-strong",
    cell: "bg-surface",
    text: "font-semibold text-ink",
  },
};

function Amount({ value, format }: { value: number | null; format?: (v: number) => string }) {
  if (value === null) return <span className="text-line-strong">·</span>;

  const zero = value === 0;
  const negative = value < 0;

  return (
    <span
      className={`tabular-nums ${zero ? "text-muted" : negative ? "text-bad" : "text-ink"}`}
    >
      {format === undefined ? amountFormat(currentCopyLocale()).format(value) : format(value)}
    </span>
  );
}

function ReportLine({
  row,
  columns,
  open,
  onToggle,
  compact,
}: {
  row: ReportRow;
  columns: readonly ReportColumn[];
  open: ReadonlySet<string>;
  onToggle: (id: string) => void;
  compact: boolean;
}): ReactNode {
  const copy = useUiCopy();
  const kind = row.kind ?? "line";
  const skin = SKIN[kind];
  const level = row.level ?? 0;
  const collapsible = row.children !== undefined && row.children.length > 0;
  const isOpen = open.has(row.id);

  const clickable = row.onClick !== undefined;

  return (
    <>
      <tr
        className={`group/row ${skin.row} ${clickable ? "cursor-pointer" : ""}`}
        onClick={row.onClick}
      >
        <th
          scope="row"
          /* `sticky left-0` so that the account name does not go away when you
             scroll twelve comparison columns to the right. An amount without its
             line is a loose number. */
          className={`sticky left-0 z-10 text-left font-normal ${skin.cell} ${
            compact ? "py-1 pr-4 pl-2" : "py-1.5 pr-6 pl-3"
          }`}
          style={{ paddingLeft: `${(compact ? 0.5 : 0.75) + level * INDENT}rem` }}
        >
          {clickable ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-l-control group-hover/row:bg-primary/5"
            />
          ) : null}
          <span
            className={`relative flex min-w-0 items-center gap-1.5 text-meta ${skin.text}`}
          >
            {collapsible ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(row.id);
                }}
                aria-expanded={isOpen}
                aria-label={fillCopy(isOpen ? copy.report.close : copy.report.open, {
                  name: row.label,
                })}
                className="-ml-1 inline-flex size-4 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-(--duration-instant) hover:bg-ink/8 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                <ChevronRight
                  className={`size-(--size-icon-sm) transition-transform duration-(--duration-instant) ${isOpen ? "rotate-90" : ""}`}
                  strokeWidth={2}
                />
              </button>
            ) : (
              /* The slot for the chevron is reserved anyway: without it, a leaf
                 account and a collapsible one would start on different
                 verticals and the hierarchy would stop reading. */
              <span className="-ml-1 size-4 shrink-0" aria-hidden />
            )}
            <span className="truncate">{row.label}</span>
          </span>
        </th>

        {columns.map((c, i) => (
          <td
            key={c.id}
            className={`text-right text-meta whitespace-nowrap ${clickable ? "relative" : ""} ${skin.cell} ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
          >
            {clickable ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 group-hover/row:bg-primary/5"
              />
            ) : null}
            {/* A section has no amounts: it is a label that covers what is
                below. Drawing the «not applicable» `·` on it across three
                columns is three marks that say nothing. */}
            {kind === "section" ? null : (
              <span className="relative">
                <Amount
                  value={row.values[i] ?? null}
                  {...(c.format === undefined ? {} : { format: c.format })}
                />
              </span>
            )}
          </td>
        ))}

        <td
          className={`w-0 ${clickable ? "relative" : ""} ${skin.cell} ${compact ? "pr-2" : "pr-3"}`}
        >
          {clickable ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-r-control group-hover/row:bg-primary/5"
            />
          ) : null}
          {row.note === undefined ? null : (
            <span
              title={row.note}
              className="relative inline-flex text-muted transition-colors duration-(--duration-instant) hover:text-ink"
            >
              <Info className="size-(--size-icon-sm)" strokeWidth={2} aria-label={row.note} />
            </span>
          )}
        </td>
      </tr>

      {!collapsible || !isOpen
        ? null
        : row.children?.map((child) => (
            <ReportLine
              key={child.id}
              row={child}
              columns={columns}
              open={open}
              onToggle={onToggle}
              compact={compact}
            />
          ))}
    </>
  );
}

export function ReportTable({
  columns,
  rows,
  /** Which groups start open. By default, none: a balance sheet with everything
   *  expanded is four hundred lines, and what gets looked at first are the
   *  totals. */
  defaultOpen,
  caption,
  height,
}: {
  columns: readonly ReportColumn[];
  rows: readonly ReportRow[];
  defaultOpen?: readonly string[];
  /** What says what this report is about. It is read out loud and it is drawn. */
  caption?: string;
  height?: number;
}) {
  const copy = useUiCopy();
  const d = useDensity();
  const compact = d === "compact";
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(defaultOpen ?? []));
  const caja = useScrollBox<HTMLDivElement>(height === undefined ? {} : { height });

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    /* Misma decisión que las otras dos tablas, en el mismo lugar: con alto la
       caja scrollea y la pila arranca de cero adentro; sin alto y entrando, no
       hay caja y el encabezado se pega debajo de la barra de la lista. Antes
       esto era `overflow-auto` siempre, así que el encabezado heredaba el
       desplazamiento de la barra y quedaba empujado 68 px hacia adentro de su
       propia caja — banda en blanco arriba y títulos de columna cayendo entre
       las filas. */
    <div ref={caja.ref} className={`min-w-0 ${caja.className}`} style={caja.style}>
      <table className="w-full border-collapse px-1">
        {caption === undefined ? null : (
          <caption
            className={`text-left text-meta text-muted ${byDensity(d, "px-3 pb-2", "px-2 pb-1.5")}`}
          >
            {caption}
          </caption>
        )}
        <thead className="sticky z-20 bg-ground" style={stickyTop}>
          <tr className="border-b border-line-strong">
            <th
              className={`sticky left-0 z-10 bg-ground text-left ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
            >
              <span className="sr-only">{copy.report.concept}</span>
            </th>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={`text-right text-meta font-medium whitespace-nowrap text-muted ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
              >
                {c.header}
              </th>
            ))}
            <th className="w-0" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ReportLine
              key={r.id}
              row={r}
              columns={columns}
              open={open}
              onToggle={toggle}
              compact={compact}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
