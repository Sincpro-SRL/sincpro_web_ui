"use client";

import { SeriesChart } from "@sincpro/web-ui/components/frame/Chart";
import {
  columnSeries,
  type Frame,
  type FramePresent,
  withColumns,
} from "@sincpro/web-ui/components/frame/model";
import { useColumnControl } from "@sincpro/web-ui/components/listing/columns";
import {
  ColumnsMenu,
  specsFromColumns,
} from "@sincpro/web-ui/components/listing/ColumnsMenu";
import { Listing } from "@sincpro/web-ui/components/listing/Listing";
import { type ListIdentity, ListingBar } from "@sincpro/web-ui/components/listing/ListingBar";
import { ViewSwitcher } from "@sincpro/web-ui/components/listing/ViewSwitcher";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  type Grouping,
  pathKey,
  type Pile,
  pileIsOpen,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { SheetTable } from "@sincpro/web-ui/primitives/table/SheetTable";
import { BarChart3, Table2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

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
  /** Which column the chart reads. Defaults to the first numeric, else the first. */
  chartColumn?: string;
  onChartColumnChange?: (id: string) => void;
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
  chartColumn: chartColumnProp,
  onChartColumnChange,
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

  const defaultChart =
    frame.columns.find((column) => column.numeric)?.id ?? frame.columns[0]?.id ?? "";
  const [ownedChart, setOwnedChart] = useState(chartColumnProp ?? defaultChart);
  const chartColumn =
    onChartColumnChange !== undefined ? (chartColumnProp ?? defaultChart) : ownedChart;
  const setChartColumn = onChartColumnChange ?? setOwnedChart;

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

  const series = useMemo(
    () => (present === "chart" ? columnSeries(shown, chartColumn) : []),
    [present, shown, chartColumn],
  );

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

  const chartMenu =
    present === "chart" ? (
      <Menu
        label={copy.frame.series}
        groups={[
          {
            label: copy.frame.column,
            options: shown.columns.map((column) => ({
              id: column.id,
              label:
                column.type === undefined
                  ? column.header
                  : `${column.header} · ${column.type}`,
              checked: column.id === chartColumn,
            })),
          },
        ]}
        onSelect={setChartColumn}
      />
    ) : null;

  const bar = (
    <ListingBar
      {...(identity?.title === undefined ? {} : { title: identity.title })}
      {...(identity?.description === undefined ? {} : { description: identity.description })}
      {...(identity?.counters === undefined ? {} : { counters: identity.counters })}
      {...(search === undefined ? {} : { search })}
      {...(pagination === undefined ? {} : { pagination })}
      views={
        <>
          <ColumnsMenu control={columns} />
          {chartMenu}
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
        <SeriesChart series={series} />
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
