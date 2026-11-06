"use client";

import type { RecordCalendar as EagerCalendar } from "@sincpro/web-ui/components/calendar/RecordCalendar";
import type { RecordGantt as EagerGantt } from "@sincpro/web-ui/components/gantt/RecordGantt";
import { BoardColumns } from "@sincpro/web-ui/components/listing/BoardColumns";
import type { ChartExplorer as EagerChart } from "@sincpro/web-ui/components/listing/ChartExplorer";
import { useColumnControl, visibleColumns } from "@sincpro/web-ui/components/listing/columns";
import {
  ColumnsMenu,
  specsFromColumns,
} from "@sincpro/web-ui/components/listing/ColumnsMenu";
import { Listing } from "@sincpro/web-ui/components/listing/Listing";
import { ListingBar } from "@sincpro/web-ui/components/listing/ListingBar";
import { PivotExplorer } from "@sincpro/web-ui/components/listing/PivotExplorer";
import { RecordCard } from "@sincpro/web-ui/components/listing/RecordCard";
import {
  GroupHeader,
  GroupMore,
  Row,
  RowHeader,
} from "@sincpro/web-ui/components/listing/Row";
import type { BuiltInPresent } from "@sincpro/web-ui/components/listing/set";
import {
  type SortField,
  sortItems,
  SortMenu,
} from "@sincpro/web-ui/components/listing/SortMenu";
import {
  type ViewOption,
  ViewSwitcher,
} from "@sincpro/web-ui/components/listing/ViewSwitcher";
import { Breadcrumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import { RecordTimeline } from "@sincpro/web-ui/components/timeline/RecordTimeline";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useDensity } from "@sincpro/web-ui/foundations/density";
import {
  pathKey,
  type Pile,
  pileFoot,
  pileIsOpen,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import { type Pivot, pivotFrom, pivotIsEmpty } from "@sincpro/web-ui/foundations/pivot";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Empty, Failed, Skeleton } from "@sincpro/web-ui/primitives/notice/Notice";
import { PivotTable } from "@sincpro/web-ui/primitives/table/PivotTable";
import { ReportTable } from "@sincpro/web-ui/primitives/table/ReportTable";
import { ProgressBar } from "@sincpro/web-ui/primitives/value/ProgressBar";
import { groupedColumnIds, WIDE_PRESENTS } from "@sincpro/web-ui/views/list/columns";
import {
  groupLevelsOf,
  reportColumnsOf,
  reportRowsOf,
  sheetFromColumns,
  sheetRowsOf,
} from "@sincpro/web-ui/views/list/derive";
import {
  SheetPresentation,
  TablePresentation,
} from "@sincpro/web-ui/views/list/presentations";
import type { CardWays, ListViewProps } from "@sincpro/web-ui/views/list/types";
import { useNarrowList } from "@sincpro/web-ui/views/list/useNarrowList";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarRange,
  ChartColumnBig,
  ChartGantt,
  Grid3x3,
  LayoutGrid,
  List,
  Sheet,
  Sigma,
  Table2,
} from "lucide-react";
import { Fragment, lazy, type ReactNode, Suspense, useCallback, useMemo } from "react";

/* The calendar (FullCalendar) and the gantt (SVAR) are each about a third of a list's weight,
   and most lists never show either face. Each is its own chunk, fetched the first time its
   face is SHOWN. `lazy` erases the generic, so the eager signature is put back: the props
   are checked exactly as before. */
const RecordCalendar = lazy(() =>
  import("@sincpro/web-ui/components/calendar/RecordCalendar").then((module) => ({
    default: module.RecordCalendar,
  })),
) as unknown as typeof EagerCalendar;
const RecordGantt = lazy(() =>
  import("@sincpro/web-ui/components/gantt/RecordGantt").then((module) => ({
    default: module.RecordGantt,
  })),
) as unknown as typeof EagerGantt;
/* The chart (Recharts) is its own chunk too: a list that is never drawn as a chart never
   downloads it. */
const ChartExplorer = lazy(() =>
  import("@sincpro/web-ui/components/listing/ChartExplorer").then((module) => ({
    default: module.ChartExplorer,
  })),
) as unknown as typeof EagerChart;

/**
 * THE DRAWING of a list. **The door is `List`**, which is written as a tree and
 * translates the slots into this — here everything comes in as props because here
 * everything has already been decided: whoever composes does not choose between two ways of writing the same thing,
 * because this is not published.
 *
 * Context: `invoices.view.tsx` has 349 lines and about 120 of them are
 * re-assembling this: the bar, the search field, the grouping and the three
 * states. Ten views with their own copy are 1,200 lines that drift apart one at
 * a time, one per week — and it already happened: Facturas had a text
 * `<input>` while the modal explorer had facets, filters and grouping. The same
 * list, in two places, with two sets of capabilities.
 *
 * **Grouping, sorting and which columns are on screen belong to the SET;
 * rows, table and board are three PRESENTATIONS of the same set.** Until now
 * grouping only existed inside `DataTable`, so switching presentation lost
 * the grouping; the columns submenu existed only on FrameView, and every
 * column could hide. Odoo splits required vs optional — that split lives in
 * `useColumnControl`. Collapse lives in `useTreeControl`.
 *
 * The escape hatch is `children`: whatever the archetype did not foresee gets
 * drawn anyway, and its appearing there is the signal that the archetype is
 * missing something.
 */

const PRESENT_ICONS: readonly { id: BuiltInPresent; icon: LucideIcon }[] = [
  { id: "rows", icon: List },
  { id: "table", icon: Table2 },
  { id: "board", icon: LayoutGrid },
  { id: "sheet", icon: Sheet },
  /* The sigma and not a table icon: what sets a report apart from the other
     four is that it SUMS. */
  { id: "report", icon: Sigma },
  /* The grid: two axes, and what matters is inside. */
  { id: "pivot", icon: Grid3x3 },
  /* El mismo pivote, dibujado. */
  { id: "chart", icon: ChartColumnBig },
  { id: "calendar", icon: CalendarDays },
  { id: "gantt", icon: ChartGantt },
  { id: "timeline", icon: CalendarRange },
];

export function ListView<T extends object>({
  items,
  keyOf,
  identity,
  crumbs,
  embedded = false,
  surface: requestedSurface,
  metrics,
  search,
  pagination,
  views,
  actions,
  row,
  rowHeader,
  columns,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  card,
  boardStages,
  calendar,
  gantt,
  timeline,
  sheet,
  report,
  pivot,
  chart,
  faces,
  present: requested = "rows",
  presents,
  onPresentChange,
  sort,
  onSortChange,
  sortable,
  totals = false,
  rowActions,
  create,
  group,
  selection,
  onOpen,
  onPeek,
  rowClick = "peek",
  onChoose,
  state,
  filtered = false,
  empty,
  children,
}: ListViewProps<T>) {
  const wide = useMemo(
    () => [
      ...WIDE_PRESENTS,
      ...(faces ?? []).filter((f) => f.wide === true).map((f) => f.id),
    ],
    [faces],
  );
  const { frame, offered, present } = useNarrowList(presents, requested, wide);
  const face = faces?.find((one) => one.id === present);
  /* Embedded, the list sits on the record's paper: there is no dark band to inherit, and a
     navy switcher inside a white sheet would be a second chrome on the screen. */
  const surface = embedded ? undefined : requestedSurface;

  const density = useDensity();
  const copy = useUiCopy();
  const loading = state?.loading === true;
  const refreshing = state?.refreshing === true && !loading;
  const error = state?.error ?? null;

  const columnSpecs = useMemo(() => specsFromColumns(columns ?? [], false), [columns]);
  const columnControl = useColumnControl(columnSpecs, {
    ...(visibleColumnIds === undefined ? {} : { visibleIds: visibleColumnIds }),
    /* The name has to be the one `useColumnControl` reads. It said
       `onVisibleColumnIdsChange` —the name of the prop HERE— and the hook looks for
       `onVisibleIdsChange`, so it never entered controlled mode: the list
       silently ignored the columns it was given. */
    ...(onVisibleColumnIdsChange === undefined
      ? {}
      : { onVisibleIdsChange: onVisibleColumnIdsChange }),
  });
  /* Grouping by a hidden column would leave buckets whose criterion is not seen.
     With N levels there are N columns, and all are restored. It is the ONLY thing for which
     we need to know which column answers for a field: the table no longer groups
     by columns, it groups by levels. */
  const groupedIds = group === undefined ? [] : groupedColumnIds(group, columns);
  const tableIds = groupedIds.every((id) => columnControl.visibleIds.includes(id))
    ? columnControl.visibleIds
    : [
        ...columnControl.visibleIds,
        ...groupedIds.filter((id) => !columnControl.visibleIds.includes(id)),
      ];
  const shownColumns = columns === undefined ? undefined : visibleColumns(columns, tableIds);

  const groupLevels = useMemo(() => groupLevelsOf(group, columns), [group, columns]);

  /* In the order the tree wrote them — the application's own among the package's. */
  const options = offered.flatMap((id): ViewOption[] => {
    const own = faces?.find((one) => one.id === id);
    if (own !== undefined) return [{ id, label: own.label, icon: own.icon }];
    const builtIn = PRESENT_ICONS.find((option) => option.id === id);
    return builtIn === undefined
      ? []
      : [{ id, label: copy.present[builtIn.id], icon: builtIn.icon }];
  });
  const switcher =
    views ??
    (options.length > 1 ? (
      <ViewSwitcher
        options={options}
        current={present}
        {...(onPresentChange === undefined ? {} : { onSelect: onPresentChange })}
        {...(surface === undefined ? {} : { surface })}
      />
    ) : undefined);

  const sheetFromDeclared = useMemo(() => sheetFromColumns(shownColumns), [shownColumns]);

  const sheetSpec = sheet ?? sheetFromDeclared;

  /* The columns menu applies in `table` and in the DERIVED sheet —both
     draw the columns the code declared—, and not in the raw-data sheet
     nor in the report: there the columns come from the file or are the
     periods, and there is none the code could offer to hide. */
  const columnsMenu =
    (present === "table" || (present === "sheet" && sheet === undefined)) &&
    columnControl.hasOptional ? (
      <ColumnsMenu control={columnControl} {...(surface === undefined ? {} : { surface })} />
    ) : null;
  /* SORTING. The control goes in the bar and not inside the table because the order
     belongs to the SET, like the levels and what is folded: switching
     presentation cannot lose it, and in rows, board and sheet there are no
     headers to click on.

     The only thing that is NOT sorted is a report whose rows the domain DECLARED: there
     the order is the report —«Total activos» has to come after the
     assets— and reordering it by amount destroys it.

     A report built from the buckets is sorted, because it is not a
     hierarchy someone wrote: it is this same set, counted. The rule
     looks at `report.rows` and not at the presentation, which was the coarse version of this and
     took the sorting away from a report that could have it. */
  const declaredReport = present === "report" && report?.rows !== undefined;
  /* The pivot is not sorted from the bar either, for its own reason: its
     rows are not the set's rows. Each axis is in the order of its
     keys, and sorting the records below does not sort the buckets above —
     offering it would be a control that moves and changes nothing. */
  const sortMenu =
    sortable === undefined ||
    sortable.length === 0 ||
    declaredReport ||
    present === "pivot" ||
    present === "chart" ? null : (
      <SortMenu
        fields={sortable as readonly SortField<never>[]}
        sort={sort ?? []}
        onSortChange={(next) => onSortChange?.(next)}
        {...(surface === undefined ? {} : { surface })}
      />
    );
  const rightViews = views ?? switcher;
  const viewsSlot =
    columnsMenu === null && sortMenu === null && rightViews === undefined ? undefined : (
      <>
        {sortMenu}
        {columnsMenu}
        {rightViews}
      </>
    );

  /* Embedded, the line is drawn only if it has something to OFFER: a count alone repeats
     what the rows (and the footer) already say. */
  const barHasControls =
    !embedded ||
    identity?.title !== undefined ||
    search !== undefined ||
    viewsSlot !== undefined ||
    actions !== undefined ||
    pagination !== undefined ||
    (selection?.count ?? 0) > 0;

  const bar = !barHasControls ? undefined : (
    <ListingBar
      surface={surface}
      {...(embedded ? { inline: true, count: items.length } : {})}
      {...(embedded || crumbs === undefined || crumbs.length === 0 || density === "compact"
        ? {}
        : {
            crumbs: (
              <Breadcrumb crumbs={crumbs} {...(surface === undefined ? {} : { surface })} />
            ),
          })}
      {...(actions === undefined ? {} : { actions })}
      {...(identity?.title === undefined ? {} : { title: identity.title })}
      {...(identity?.description === undefined ? {} : { description: identity.description })}
      {...(identity?.counters === undefined ? {} : { counters: identity.counters })}
      {...(selection === undefined
        ? {}
        : {
            selection: {
              count: selection.count,
              onClear: selection.clear,
              ...(selection.actions === undefined ? {} : { actions: selection.actions }),
              ...(selection.matching === undefined ? {} : { matching: selection.matching }),
            },
          })}
      {...(search === undefined ? {} : { search })}
      {...(pagination === undefined ? {} : { pagination })}
      {...(viewsSlot === undefined ? {} : { views: viewsSlot })}
    />
  );

  /* The body of a row, a card: the look first unless the list says the page. */
  /* Choosing, the press chooses and the ways in (👁 ↗) are not offered: a chooser's row answers. */
  const choosing = onChoose !== undefined;
  const press = choosing
    ? onChoose
    : rowClick === "open"
      ? (onOpen ?? onPeek)
      : (onPeek ?? onOpen);

  const renderRow = (item: T) => {
    const d = row(item);
    const id = keyOf(item);
    return (
      <Row
        key={id}
        {...(d.icon === undefined ? {} : { icon: d.icon })}
        {...(d.avatar === undefined ? {} : { avatar: d.avatar })}
        name={d.name}
        {...(d.tags === undefined ? {} : { tags: d.tags })}
        {...(d.meta === undefined ? {} : { meta: d.meta })}
        {...(d.actions === undefined ? {} : { actions: d.actions })}
        {...(choosing
          ? { onOpen: () => onChoose(item), openers: false }
          : {
              ...(onOpen === undefined ? {} : { onOpen: () => onOpen(item) }),
              ...(onPeek === undefined ? {} : { onPeek: () => onPeek(item) }),
            })}
        click={rowClick}
        {...(selection === undefined
          ? {}
          : { selected: selection.has(id), onSelectedChange: () => selection.toggle(id) })}
      >
        {d.children}
      </Row>
    );
  };

  /* Sorting goes BEFORE grouping and not after, and it is not indifferent: grouping
     preserves the order of appearance within each bucket, so sorting
     first sorts the rows of each bucket. The other way round N
     buckets would have to be reordered and the order among them would be left to chance.

     The table sorts inside —it is TanStack— so there it is let through: sorting twice
     breaks nothing, but it is pointless work on every render. */
  const ordered = useMemo(
    () =>
      present === "table" || sortable === undefined
        ? items
        : sortItems(items, sortable, sort),
    [items, present, sortable, sort],
  );

  /**
   * The grid to draw: the one handed in folded, or the one built
   * with the rows in hand.
   *
   * It is the same decision `pilesOf` takes for the buckets, and for the same
   * reason: who folded is not this layer's business.
   */
  const pivotShown = useMemo<Pivot | undefined>(() => {
    if (pivot?.folded !== undefined) return pivot.folded;
    if (pivot?.spec === undefined) return undefined;
    return pivotFrom(ordered, pivot.spec);
  }, [pivot, ordered]);

  /**
   * Empty is having NOTHING to draw, and in the pivot that is not asked
   * by counting `items`: when the grid was folded by whoever keeps the data, the
   * screen's rows are buckets and the set may never have been
   * downloaded. Counting the records there is covering a whole grid with «todavía no
   * hay datos».
   */
  const isEmpty =
    !loading &&
    error === null &&
    (present === "pivot" && pivotShown !== undefined
      ? pivotIsEmpty(pivotShown)
      : present === "chart" && chart?.folded !== undefined
        ? pivotIsEmpty(chart.folded)
        : items.length === 0) &&
    /* The first record of an empty list is written in the table, not under a sentence
       saying there is nothing. */
    !(present === "table" && create?.draft != null);

  /* The one line that makes a view groupable: the tree it was handed, or the
     one built with the rows in hand. */
  const piles = useMemo(() => pilesOf(ordered, group), [group, ordered]);
  const isOpen = useCallback((pile: Pile<T>) => pileIsOpen(pile, group), [group]);

  const sheetRows = useMemo(
    () => sheetRowsOf(piles, isOpen, columns),
    [piles, isOpen, columns],
  );

  /* The shape of a row of THIS list, so that the header reserves the
     same spacers. The first is looked at and not all: the icon and the actions
     are decided by the view for the whole list. */
  const first = items[0];
  const firstRow = first === undefined ? undefined : row(first);

  /* The same foot the table draws: «Ver 50 más de 49.950», or «Se muestran 500 de …». */
  function footOf(pile: Pile<T>) {
    const foot = pileFoot(pile, group?.onMore !== undefined);
    return foot === null ? null : (
      <GroupMore foot={foot} depth={pile.depth} onMore={() => group?.onMore?.(pile)} />
    );
  }

  /** The buckets, with their rows inside. It calls itself because the tree
   *  has N levels: a bucket draws its header and, inside, either the buckets
   *  below or the rows — never both. */
  function renderPiles(
    list: readonly Pile<T>[],
    nodes: (inside: readonly T[]) => ReactNode,
  ): ReactNode {
    return list.map((pile) => {
      const key = pathKey(pile.path);
      const open = isOpen(pile);
      return (
        <Fragment key={key}>
          <GroupHeader
            field={pile.field}
            label={pile.label}
            count={pile.count}
            {...(pile.detail === undefined ? {} : { detail: pile.detail })}
            depth={pile.depth}
            open={open}
            {...(group?.onToggle === undefined
              ? {}
              : { onToggle: () => group.onToggle?.(key) })}
          />
          {!open
            ? null
            : pile.piles.length > 0
              ? renderPiles(pile.piles, nodes)
              : nodes(pile.items)}
          {open ? footOf(pile) : null}
        </Fragment>
      );
    });
  }

  const reportRows = useMemo(() => reportRowsOf(piles, columns, row), [piles, columns, row]);

  function wrapGroups(nodes: (inside: readonly T[]) => ReactNode) {
    if (piles === null) return nodes(ordered);
    return renderPiles(piles, nodes);
  }

  const waysOf = (item: T): CardWays => ({
    ...(press === undefined ? {} : { press: () => press(item) }),
    ...(onPeek === undefined || choosing ? {} : { peek: () => onPeek(item) }),
    ...(onOpen === undefined || choosing ? {} : { open: () => onOpen(item) }),
  });

  const renderCard = (item: T) => {
    if (card !== undefined) {
      return <Fragment key={keyOf(item)}>{card(item, waysOf(item))}</Fragment>;
    }
    const d = row(item);
    return (
      <RecordCard
        key={keyOf(item)}
        title={d.name}
        {...(d.tags === undefined ? {} : { tags: d.tags })}
        {...(d.meta === undefined ? {} : { meta: d.meta })}
        /* A card answers a click like a row does: a look first when there is one. */
        {...(press === undefined ? {} : { onOpen: () => press(item) })}
      />
    );
  };

  const body =
    face !== undefined ? (
      face.render({
        items: ordered,
        keyOf,
        piles,
        isOpen,
        ...(group?.onToggle === undefined
          ? {}
          : { toggle: (pile: Pile<T>) => group.onToggle?.(pathKey(pile.path)) }),
        ...(group?.onMore === undefined ? {} : { more: group.onMore }),
        ...(selection === undefined
          ? {}
          : { selection: { has: selection.has, toggle: selection.toggle } }),
        ...(press === undefined ? {} : { press }),
        ...(onPeek === undefined || choosing ? {} : { peek: onPeek }),
        ...(onOpen === undefined || choosing ? {} : { open: onOpen }),
      })
    ) : present === "table" && shownColumns !== undefined ? (
      /* The table receives EVERYTHING that belongs to the set: see `TablePresentation`. */
      <TablePresentation
        items={items}
        columns={shownColumns}
        keyOf={keyOf}
        levels={groupLevels}
        {...(sort === undefined ? {} : { sort })}
        {...(onSortChange === undefined ? {} : { onSortChange })}
        {...(group === undefined ? {} : { group })}
        {...(selection === undefined ? {} : { selection })}
        totals={totals}
        {...(rowActions === undefined ? {} : { rowActions })}
        {...(create === undefined ? {} : { create })}
        {...(onPeek === undefined || choosing ? {} : { onPeek })}
        {...(onOpen === undefined || choosing ? {} : { onOpen })}
        {...(choosing ? { onChoose } : {})}
        rowClick={rowClick}
      />
    ) : present === "sheet" && sheetSpec !== undefined ? (
      /* The sheet receives the set by INDEX and not an already built matrix: see `SheetPresentation`. */
      <SheetPresentation
        spec={sheetSpec}
        entries={sheetRows}
        ordered={ordered}
        {...(group === undefined ? {} : { group })}
      />
    ) : present === "report" && report !== undefined ? (
      /* The report declared by the domain is not SORTED from the bar: the
         order IS the report, and sorting a balance by amount leaves «Total
         Activos» in the middle. But it is GROUPED when the lines do not come
         declared: there the report is this set counted by the levels that
         are set. */
      <ReportTable
        /* Built from the piles, the numbers are the list's columns' — and so is how they
           are written. Declared by the domain, the columns are the domain's. */
        columns={
          report.rows === undefined
            ? reportColumnsOf(report.columns, columns)
            : report.columns
        }
        rows={report.rows ?? reportRows}
        {...(report.defaultOpen === undefined ? {} : { defaultOpen: report.defaultOpen })}
        {...(report.height === undefined ? {} : { height: report.height })}
      />
    ) : present === "pivot" && pivot?.spec !== undefined && pivot.fields !== undefined ? (
      /* Explored: the person moves the axes. Its rows follow the search bar's grouping. */
      <div className="p-3">
        <PivotExplorer
          items={ordered}
          of={pivot.spec.of}
          fields={pivot.fields}
          measures={pivot.spec.measures}
          {...(pivot.defaultMeasures === undefined
            ? {}
            : { defaultMeasures: pivot.defaultMeasures })}
          {...((group?.levels.length ?? 0) > 0 ? { rows: group!.levels } : {})}
          defaultRows={pivot.spec.rows}
          defaultColumns={pivot.spec.columns}
          {...(pivot.onCell === undefined ? {} : { onCell: pivot.onCell })}
          {...(pivot.height === undefined ? {} : { height: pivot.height })}
        />
      </div>
    ) : present === "pivot" && pivotShown !== undefined ? (
      /* The pivot receives the grid and nothing else: there is no selection to pass it
         —a checkbox per bucket would choose things that are not records—, no
         order —each axis comes in the order of its keys— and no columns
         menu, because the columns are an axis and not a list of fields that
         can be hidden one by one. */
      <PivotTable
        pivot={pivotShown}
        {...(pivot?.onCell === undefined ? {} : { onCell: pivot.onCell })}
        {...(pivot?.height === undefined ? {} : { height: pivot.height })}
      />
    ) : present === "chart" &&
      chart !== undefined &&
      (chart.folded !== undefined || chart.spec !== undefined) ? (
      /* Odoo's graph view. Its levels follow the search bar's grouping, like the pivot's
         rows: the first along the axis, the rest as series. */
      <div className="p-3">
        <Suspense fallback={<Skeleton label={copy.failed.loading} />}>
          <ChartExplorer<T>
            {...(chart.folded === undefined ? {} : { folded: chart.folded })}
            {...(chart.spec === undefined
              ? {}
              : {
                  items: ordered,
                  of: chart.spec.of,
                  measures: chart.spec.measures,
                  defaultCategories: chart.spec.rows,
                  defaultSeries: chart.spec.columns,
                  ...(chart.spec.labelOf === undefined
                    ? {}
                    : { labelOf: chart.spec.labelOf }),
                })}
            {...(chart.fields === undefined ? {} : { fields: chart.fields })}
            {...(chart.defaultMeasure === undefined
              ? {}
              : { defaultMeasure: chart.defaultMeasure })}
            {...(chart.kind === undefined ? {} : { defaultKind: chart.kind })}
            {...(chart.defaultMeasures === undefined
              ? {}
              : { defaultMeasures: chart.defaultMeasures })}
            {...(chart.stacked === undefined ? {} : { defaultStacked: chart.stacked })}
            {...(chart.cumulative === undefined
              ? {}
              : { defaultCumulative: chart.cumulative })}
            {...(chart.order === undefined ? {} : { defaultOrder: chart.order })}
            {...(chart.compare === undefined ? {} : { compare: chart.compare })}
            {...((group?.levels.length ?? 0) > 0 ? { levels: group!.levels } : {})}
            {...(chart.onPoint === undefined ? {} : { onPoint: chart.onPoint })}
            {...(chart.height === undefined ? {} : { height: chart.height })}
            {...(chart.fileName === undefined ? {} : { fileName: chart.fileName })}
            {...(identity?.title === undefined ? {} : { label: identity.title })}
          />
        </Suspense>
      </div>
    ) : present === "calendar" && calendar !== undefined ? (
      <div className="p-3">
        <Suspense fallback={<Skeleton label={copy.failed.loading} />}>
          <RecordCalendar
            {...calendar}
            items={ordered}
            keyOf={keyOf}
            {...(press === undefined ? {} : { onOpen: press })}
          />
        </Suspense>
      </div>
    ) : present === "gantt" && gantt !== undefined ? (
      <div className="p-3">
        <Suspense fallback={<Skeleton label={copy.failed.loading} />}>
          <RecordGantt
            {...gantt}
            items={ordered}
            keyOf={keyOf}
            {...(press === undefined ? {} : { onOpen: press })}
          />
        </Suspense>
      </div>
    ) : present === "timeline" && timeline !== undefined ? (
      <div className="p-3">
        <RecordTimeline
          {...timeline}
          items={ordered}
          keyOf={keyOf}
          {...(press === undefined ? {} : { onOpen: press })}
        />
      </div>
    ) : present === "board" && boardStages !== undefined ? (
      <BoardColumns items={ordered} keyOf={keyOf} stages={boardStages} card={renderCard} />
    ) : present === "board" ? (
      <div className="flex flex-col">
        {wrapGroups((inside) => (
          <div className="grid gap-3 p-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {inside.map(renderCard)}
          </div>
        ))}
      </div>
    ) : (
      /* The header goes BEFORE the buckets and not inside each one:
         it labels the row, and the row is the same in all five buckets. */
      <>
        {rowHeader === undefined || items.length === 0 ? null : (
          <RowHeader
            name={rowHeader.name}
            {...(rowHeader.meta === undefined ? {} : { meta: rowHeader.meta })}
            {...(rowHeader.tags === undefined ? {} : { tags: rowHeader.tags })}
            withSelection={selection !== undefined}
            /* The spacers are asked about the FIRST row: the icon and the
               actions belong to the whole list, not to a row — if the first has
               no icon, none has. */
            withIcon={firstRow?.icon !== undefined}
            withAvatar={firstRow?.avatar !== undefined}
            trail={{
              ...(firstRow?.actions === undefined ? {} : { actions: firstRow.actions }),
              peek: onPeek !== undefined && !choosing,
              open: onOpen !== undefined && !choosing,
            }}
          />
        )}
        {wrapGroups((inside) => inside.map(renderRow))}
      </>
    );

  return (
    /* The list is its own container (`@container`: the presentations adapt to the width
       the LIST has, not the window) and fills the space it is given. Before, every page
       wrapped it in a `div` to get both. */
    <div
      ref={frame}
      aria-busy={refreshing || loading}
      className="@container flex min-w-0 flex-1 flex-col bg-surface"
    >
      <Listing
        bar={bar}
        /* The bar stays on top: with 187 rows, scrolling to see the last one
           left you without search, without pager and without the switcher.
           Embedded it does NOT: the record has its own sticky parts (its rail, its tabs),
           and a second band stuck under them — or carried up into the frame's header slot,
           which is what a sticky list bar does under a sidebar — would cover the record
           for a collection of a dozen rows. */
        sticky={!embedded}
        {...(surface === undefined ? {} : { surface })}
        {...(metrics === undefined
          ? {}
          : {
              metrics: <div className="px-3.5">{metrics}</div>,
            })}
      >
        {loading ? <Skeleton label={copy.failed.loading} /> : null}

        {/* EMPTY. What is declared wins —«importá tus facturas» knows what can be done— and
            if nothing was declared something is said anyway: a blank panel, with no
            rows and no explanation, does not say whether there is nothing or the cut
            ate everything. */}
        {isEmpty ? (
          filtered ? (
            <Empty
              sentence={empty?.whenFiltered?.sentence ?? copy.list.emptyFiltered}
              {...(empty?.whenFiltered?.action === undefined
                ? {}
                : { action: empty.whenFiltered.action })}
            />
          ) : (
            <Empty
              sentence={empty?.sentence ?? copy.list.empty}
              {...(empty?.action === undefined ? {} : { action: empty.action })}
            />
          )
        ) : null}

        {/* ALWAYS wrapped, refreshing or not: a wrapper that came and went with the state
            would remount the body on every question — the rows, an open editor, the focus. */}
        <div className="relative min-w-0">
          {refreshing ? (
            /* Over the top edge of the rows, not above them: the rows do not move. */
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
              <ProgressBar label={copy.list.refreshing} width="w-full" />
            </div>
          ) : null}
          {loading || isEmpty ? null : body}
        </div>
      </Listing>

      {error === null ? null : (
        <div className="px-3 pt-(--spacing-block)">
          <Failed heading={copy.failed.list} sentence={error} />
        </div>
      )}

      {children}
    </div>
  );
}

/** What a list offers when it fails and can be retried. */
export function RetryAction({ onRetry }: { onRetry: () => void }) {
  const copy = useUiCopy();
  return (
    <Button role="secondary" size="sm" onClick={onRetry}>
      {copy.failed.retry}
    </Button>
  );
}
