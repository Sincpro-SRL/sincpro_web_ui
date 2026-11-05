"use client";

import {
  cellNumber,
  type Frame,
  type FrameCell,
  type FramePresent,
  withColumns,
} from "@sincpro/web-ui/components/frame/model";
import type { ChartExplorer as EagerChart } from "@sincpro/web-ui/components/listing/ChartExplorer";
import { useColumnControl } from "@sincpro/web-ui/components/listing/columns";
import {
  ColumnsMenu,
  specsFromColumns,
} from "@sincpro/web-ui/components/listing/ColumnsMenu";
import { Listing } from "@sincpro/web-ui/components/listing/Listing";
import { type ListIdentity, ListingBar } from "@sincpro/web-ui/components/listing/ListingBar";
import { ViewSwitcher } from "@sincpro/web-ui/components/listing/ViewSwitcher";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  type Grouping,
  pathKey,
  type Pile,
  pileIsOpen,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import type { PivotFold } from "@sincpro/web-ui/foundations/pivot";
import { Empty, Skeleton } from "@sincpro/web-ui/primitives/notice/Notice";
import { SheetTable } from "@sincpro/web-ui/primitives/table/SheetTable";
import { BarChart3, Table2 } from "lucide-react";
import { lazy, type ReactNode, Suspense, useMemo, useState } from "react";

/* The chart (Recharts) is fetched the first time a frame is drawn as one. */
const ChartExplorer = lazy(() =>
  import("@sincpro/web-ui/components/listing/ChartExplorer").then((module) => ({
    default: module.ChartExplorer,
  })),
) as unknown as typeof EagerChart;

/**
 * ARCHETYPE 3 — a FRAME: the cells of a payload, as a table or as a chart.
 *
 * Context: ListView is N records of a kind. Record is ONE record. Neither
 * is the glance at the raw matrix an imported file carries — that was being drawn as
 * a naked SheetTable, so it could not change presentation, hide a column or
 * chart one, which is exactly what looking at a table is for.
 *
 * Columns use the same `useColumnControl` as ListView. Payload columns default
 * to optional; pin one with `optional: false`.
 *
 * The app maps a preview (or any rectangle) onto a `Frame`. This archetype
 * does not know what an invoice is.
 */

const PRESENT_ICONS = [
  { id: "table" as const, icon: Table2 },
  { id: "chart" as const, icon: BarChart3 },
];

export type FrameViewProps = {
  frame: Frame;
  identity?: ListIdentity;
  caption?: ReactNode;
  present?: FramePresent;
  presents?: readonly FramePresent[];
  onPresentChange?: (next: FramePresent) => void;
  /** Where the chart starts: a text column goes along its axis, a numeric one is the measure
   *  (its sum). By default, the first text column by the sum of the first numeric one. */
  chartColumn?: string;
  visibleColumnIds?: readonly string[];
  onVisibleColumnIdsChange?: (ids: readonly string[]) => void;
  /** Search, filters, pagination: the same slots as a list. A frame inside a
   *  form is still a SET of rows, and a set without a narrowing line is a
   *  dump. Assembled by whoever holds the domain — this file does not know
   *  what a column name is. */
  search?: ReactNode;
  pagination?: ReactNode;
  /**
   * El agrupado, con el mismo contrato que usa la lista.
   *
   * Acá lo que se agrupa son ÍNDICES de fila y no registros: un marco es una
   * matriz y sus filas no tienen identidad propia —son la fila 12 del archivo—,
   * así que `T` es `number` y `of(fila, nivel)` lee la celda que corresponda. El
   * contrato no cambia, que es exactamente la prueba de que no es restrictivo.
   */
  grouping?: Grouping<number>;
};

export function FrameView({
  frame,
  identity,
  caption,
  present: presentProp,
  presents = ["table", "chart"],
  onPresentChange,
  chartColumn,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  search,
  pagination,
  grouping,
}: FrameViewProps) {
  const copy = useUiCopy();
  const [ownedPresent, setOwnedPresent] = useState<FramePresent>(presentProp ?? "table");
  const present = onPresentChange !== undefined ? (presentProp ?? "table") : ownedPresent;
  const setPresent = onPresentChange ?? setOwnedPresent;

  const columnSpecs = useMemo(() => specsFromColumns(frame.columns, true), [frame.columns]);
  const columns = useColumnControl(columnSpecs, {
    ...(visibleColumnIds === undefined ? {} : { visibleIds: visibleColumnIds }),
    ...(onVisibleColumnIdsChange === undefined ? {} : { onVisibleColumnIdsChange }),
  });

  const shown = useMemo(
    () =>
      columns.visibleIds.length === frame.columns.length
        ? frame
        : withColumns(frame, columns.visibleIds),
    [frame, columns.visibleIds],
  );

  /* Los montones aplanados a una SECUENCIA: la planilla está virtualizada por
     índice, así que la jerarquía la dice la sangría de cada banda y no el
     anidamiento. Es el mismo aplanado que hace la lista, sobre índices en vez de
     registros. */
  const bands = useMemo(() => {
    const piles = pilesOf(
      Array.from({ length: shown.rows }, (_, index) => index),
      grouping,
    );
    if (piles === null) return null;
    const out: {
      band?: {
        field: string;
        label: string;
        count: number;
        open: boolean;
        depth: number;
        key: string;
      };
      row?: number;
    }[] = [];
    const walk = (list: readonly Pile<number>[]) => {
      for (const pile of list) {
        const open = pileIsOpen(pile, grouping);
        out.push({
          band: {
            field: pile.field,
            label: pile.label,
            count: pile.count,
            open,
            depth: pile.depth,
            key: pathKey(pile.path),
          },
        });
        if (!open) continue;
        if (pile.piles.length > 0) walk(pile.piles);
        else for (const row of pile.items) out.push({ row });
      }
    };
    walk(piles);
    return out;
  }, [shown.rows, grouping]);

  /* The chart folds ROW INDICES, the same way the grouping does: a text column splits them
     (along the axis or into series) and a numeric one is summed or averaged. All the
     columns, hidden ones too — hiding is about the table, not about what can be asked. */
  const chart = useMemo(() => {
    const indexOf = new Map(frame.columns.map((column, index) => [column.id, index]));
    const cell = (row: number, id: string): FrameCell => {
      const at = indexOf.get(id);
      const column = at === undefined ? undefined : frame.columns[at];
      return column === undefined || at === undefined ? null : frame.value(row, column, at);
    };
    const texts = frame.columns.filter((column) => column.numeric !== true);
    const numbers = frame.columns.filter((column) => column.numeric === true);
    const fields = (texts.length > 0 ? texts : frame.columns).map((column) => ({
      field: column.id,
      label: column.header,
    }));
    const values = (rows: readonly number[], id: string) =>
      rows.map((row) => cellNumber(cell(row, id))).filter((n): n is number => n !== null);
    const measures: PivotFold<number>[] = numbers.flatMap((column) => [
      {
        id: `sum:${column.id}`,
        header: fillCopy(copy.chart.sumOf, { name: column.header }),
        additive: true,
        fold: (rows) => {
          const found = values(rows, column.id);
          return found.length === 0 ? null : found.reduce((a, b) => a + b, 0);
        },
      },
      {
        id: `avg:${column.id}`,
        header: fillCopy(copy.chart.averageOf, { name: column.header }),
        fold: (rows) => {
          const found = values(rows, column.id);
          return found.length === 0 ? null : found.reduce((a, b) => a + b, 0) / found.length;
        },
      },
    ]);
    /* Where the axis starts: the text column that GROUPS — the fewest distinct values, two
       at least. An identifier (one value per row) charts a bar per row, which is the table
       again; a column with one value charts a single bar. */
    const distinct = (id: string) => {
      const seen = new Set<string>();
      for (let row = 0; row < frame.rows; row += 1) seen.add(String(cell(row, id)));
      return seen.size;
    };
    const splits = fields
      .map((field) => ({ field: field.field, count: distinct(field.field) }))
      .filter((one) => one.count >= 2 && one.count < frame.rows)
      .sort((a, b) => a.count - b.count)[0]?.field;
    const start = frame.columns.find((column) => column.id === chartColumn);
    const axis =
      start !== undefined && start.numeric !== true ? start.id : (splits ?? fields[0]?.field);
    const measure =
      start?.numeric === true ? `sum:${start.id}` : (measures[0]?.id ?? undefined);
    return {
      items: Array.from({ length: frame.rows }, (_, index) => index),
      of: (row: number, level: { field: string }) => {
        const value = cell(row, level.field);
        return value === null || value === "" ? copy.cell.emptyBin : String(value);
      },
      fields,
      measures,
      axis,
      measure,
    };
  }, [frame, chartColumn, copy]);

  const switcher =
    presents.length > 1 ? (
      <ViewSwitcher
        options={PRESENT_ICONS.filter((option) => presents.includes(option.id)).map(
          (option) => ({
            id: option.id,
            label: option.id === "table" ? copy.present.table : copy.present.chart,
            icon: option.icon,
          }),
        )}
        current={present}
        onSelect={(id) => setPresent(id as FramePresent)}
      />
    ) : undefined;

  const bar = (
    <ListingBar
      {...(identity?.title === undefined ? {} : { title: identity.title })}
      {...(identity?.description === undefined ? {} : { description: identity.description })}
      {...(identity?.counters === undefined ? {} : { counters: identity.counters })}
      {...(search === undefined ? {} : { search })}
      {...(pagination === undefined ? {} : { pagination })}
      views={
        <>
          {present === "chart" ? null : <ColumnsMenu control={columns} />}
          {switcher}
        </>
      }
    />
  );

  if (frame.rows === 0 || frame.columns.length === 0) {
    return (
      <Listing bar={bar}>
        <Empty sentence={copy.frame.empty} />
      </Listing>
    );
  }

  return (
    <Listing bar={bar}>
      {present === "chart" ? (
        <div className="p-3">
          <Suspense fallback={<Skeleton label={copy.failed.loading} />}>
            <ChartExplorer<number>
              items={chart.items}
              /* Following the frame's grouping, its levels are read the way it reads them. */
              of={
                grouping !== undefined && grouping.levels.length > 0 ? grouping.of : chart.of
              }
              fields={chart.fields}
              measures={chart.measures}
              {...(chart.axis === undefined
                ? {}
                : { defaultCategories: [{ field: chart.axis }] })}
              {...(chart.measure === undefined ? {} : { defaultMeasure: chart.measure })}
              {...((grouping?.levels.length ?? 0) > 0 ? { levels: grouping!.levels } : {})}
              {...(identity?.title === undefined ? {} : { label: identity.title })}
            />
          </Suspense>
        </div>
      ) : (
        <SheetTable
          columns={shown.columns}
          rows={bands === null ? shown.rows : bands.length}
          value={(index, column, columnIndex) => {
            const row = bands === null ? index : bands[index]?.row;
            return row === undefined ? null : shown.value(row, column, columnIndex);
          }}
          height="auto"
          {...(bands === null
            ? {}
            : {
                band: (index: number) => bands[index]?.band,
                ...(grouping?.onToggle === undefined
                  ? {}
                  : {
                      onBandToggle: (index: number) => {
                        const key = bands[index]?.band?.key;
                        if (key !== undefined) grouping.onToggle?.(key);
                      },
                    }),
              })}
          {...(caption === undefined ? {} : { caption })}
        />
      )}
    </Listing>
  );
}
