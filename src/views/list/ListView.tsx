"use client";

import { useColumnControl, visibleColumns } from "@sincpro/web-ui/components/listing/columns";
import {
  ColumnsMenu,
  specsFromColumns,
} from "@sincpro/web-ui/components/listing/ColumnsMenu";
import { Listing } from "@sincpro/web-ui/components/listing/Listing";
import { ListingBar } from "@sincpro/web-ui/components/listing/ListingBar";
import { RecordCard } from "@sincpro/web-ui/components/listing/RecordCard";
import { GroupHeader, Row, RowHeader } from "@sincpro/web-ui/components/listing/Row";
import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import {
  type SortField,
  sortItems,
  SortMenu,
} from "@sincpro/web-ui/components/listing/SortMenu";
import { ViewSwitcher } from "@sincpro/web-ui/components/listing/ViewSwitcher";
import { Breadcrumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useDensity } from "@sincpro/web-ui/foundations/density";
import {
  pathKey,
  type Pile,
  pileIsOpen,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
import { type Pivot, pivotFrom, pivotIsEmpty } from "@sincpro/web-ui/foundations/pivot";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Empty, Failed, Skeleton } from "@sincpro/web-ui/primitives/notice/Notice";
import { PivotTable } from "@sincpro/web-ui/primitives/table/PivotTable";
import { ReportTable } from "@sincpro/web-ui/primitives/table/ReportTable";
import { groupedColumnIds } from "@sincpro/web-ui/views/list/columns";
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
import type { ListViewProps } from "@sincpro/web-ui/views/list/types";
import { useNarrowList } from "@sincpro/web-ui/views/list/useNarrowList";
import type { LucideIcon } from "lucide-react";
import { Grid3x3, LayoutGrid, List, Sheet, Sigma, Table2 } from "lucide-react";
import { Fragment, type ReactNode, useCallback, useMemo } from "react";

/**
 * EL DIBUJO de una lista. **La puerta es `List`**, que se escribe como árbol y
 * traduce las ranuras a esto — acá todo entra como props porque acá ya se
 * decidió todo: quién compone no elige entre dos maneras de escribir lo mismo,
 * porque esto no se publica.
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

const PRESENT_ICONS: readonly { id: ListPresent; icon: LucideIcon }[] = [
  { id: "rows", icon: List },
  { id: "table", icon: Table2 },
  { id: "board", icon: LayoutGrid },
  { id: "sheet", icon: Sheet },
  /* La sigma y no un ícono de tabla: lo que distingue a un informe de las otras
     cuatro es que SUMA. */
  { id: "report", icon: Sigma },
  /* La cuadrícula: dos ejes, y lo que importa está adentro. */
  { id: "pivot", icon: Grid3x3 },
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
  sheet,
  report,
  pivot,
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
  state,
  filtered = false,
  empty,
  children,
}: ListViewProps<T>) {
  const { frame, offered, present } = useNarrowList(presents, requested);
  /* Embedded, the list sits on the record's paper: there is no dark band to inherit, and a
     navy switcher inside a white sheet would be a second chrome on the screen. */
  const surface = embedded ? undefined : requestedSurface;

  const density = useDensity();
  const copy = useUiCopy();
  const loading = state?.loading === true;
  const error = state?.error ?? null;

  const columnSpecs = useMemo(() => specsFromColumns(columns ?? [], false), [columns]);
  const columnControl = useColumnControl(columnSpecs, {
    ...(visibleColumnIds === undefined ? {} : { visibleIds: visibleColumnIds }),
    /* El nombre tiene que ser el que `useColumnControl` lee. Decía
       `onVisibleColumnIdsChange` —el nombre de la prop de ACÁ— y el hook busca
       `onVisibleIdsChange`, así que nunca entraba en modo controlado: la lista
       ignoraba en silencio las columnas que le pasaran. */
    ...(onVisibleColumnIdsChange === undefined
      ? {}
      : { onVisibleIdsChange: onVisibleColumnIdsChange }),
  });
  /* Agrupar por una columna escondida dejaría montones cuyo criterio no se ve.
     Con N niveles son N columnas, y se reponen todas. Es lo ÚNICO para lo que
     hace falta saber qué columna contesta por un campo: la tabla ya no agrupa
     por columnas, agrupa por niveles. */
  const groupedIds = group === undefined ? [] : groupedColumnIds(group, columns);
  const tableIds = groupedIds.every((id) => columnControl.visibleIds.includes(id))
    ? columnControl.visibleIds
    : [
        ...columnControl.visibleIds,
        ...groupedIds.filter((id) => !columnControl.visibleIds.includes(id)),
      ];
  const shownColumns = columns === undefined ? undefined : visibleColumns(columns, tableIds);

  const groupLevels = useMemo(() => groupLevelsOf(group, columns), [group, columns]);

  const switcher =
    views ??
    (offered.length > 1 ? (
      <ViewSwitcher
        options={PRESENT_ICONS.filter((option) => offered.includes(option.id)).map(
          (option) => ({
            id: option.id,
            label: copy.present[option.id],
            icon: option.icon,
          }),
        )}
        current={present}
        {...(onPresentChange === undefined
          ? {}
          : { onSelect: (id: string) => onPresentChange(id as ListPresent) })}
        {...(surface === undefined ? {} : { surface })}
      />
    ) : undefined);

  const sheetFromDeclared = useMemo(() => sheetFromColumns(shownColumns), [shownColumns]);

  const sheetSpec = sheet ?? sheetFromDeclared;

  /* El menú de columnas vale en `table` y en la planilla DERIVADA —las dos
     dibujan las columnas que declaró el código—, y no en la planilla de datos
     crudos ni en el informe: ahí las columnas salen del archivo o son los
     períodos, y no hay ninguna que el código pueda ofrecer esconder. */
  const columnsMenu =
    (present === "table" || (present === "sheet" && sheet === undefined)) &&
    columnControl.hasOptional ? (
      <ColumnsMenu control={columnControl} {...(surface === undefined ? {} : { surface })} />
    ) : null;
  /* ORDENAR. El control va en la barra y no adentro de la tabla porque el orden
     es del CONJUNTO, igual que los niveles y que lo plegado: cambiar de
     presentación no puede perderlo, y en filas, tablero y planilla no hay
     encabezados donde hacer clic.

     Lo único que NO se ordena es un informe cuyas filas DECLARÓ el dominio: ahí
     el orden es el informe —«Total activos» tiene que quedar después de los
     activos— y reordenarlo por importe lo destruye.

     Un informe armado a partir de los montones sí se ordena, porque no es una
     jerarquía que alguien escribió: es este mismo conjunto, contado. La regla
     mira `report.rows` y no la presentación, que era la versión gruesa de esto y
     le sacaba el orden a un informe que sí podía tenerlo. */
  const declaredReport = present === "report" && report?.rows !== undefined;
  /* El pivote tampoco se ordena desde la barra, y por una razón propia: sus
     filas no son las filas del conjunto. Cada eje está en el orden de sus
     claves, y ordenar los registros de abajo no ordena los montones de arriba —
     ofrecerlo sería un control que se mueve y no cambia nada. */
  const sortMenu =
    sortable === undefined ||
    sortable.length === 0 ||
    declaredReport ||
    present === "pivot" ? null : (
      <SortMenu
        fields={sortable as readonly SortField<never>[]}
        sort={sort ?? null}
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
            },
          })}
      {...(search === undefined ? {} : { search })}
      {...(pagination === undefined ? {} : { pagination })}
      {...(viewsSlot === undefined ? {} : { views: viewsSlot })}
    />
  );

  const renderRow = (item: T) => {
    const d = row(item);
    const id = keyOf(item);
    return (
      <Row
        key={id}
        {...(d.icon === undefined ? {} : { icon: d.icon })}
        name={d.name}
        {...(d.tags === undefined ? {} : { tags: d.tags })}
        {...(d.meta === undefined ? {} : { meta: d.meta })}
        {...(d.actions === undefined ? {} : { actions: d.actions })}
        {...(onOpen === undefined ? {} : { onOpen: () => onOpen(item) })}
        {...(onPeek === undefined ? {} : { onPeek: () => onPeek(item) })}
        {...(selection === undefined
          ? {}
          : { selected: selection.has(id), onSelectedChange: () => selection.toggle(id) })}
      >
        {d.children}
      </Row>
    );
  };

  /* El orden va ANTES de agrupar y no después, y no es indistinto: agrupar
     preserva el orden de aparición dentro de cada montón, así que ordenar
     primero ordena las filas de cada montón. Al revés habría que reordenar N
     montones y el orden entre ellos quedaría al azar.

     La tabla ordena adentro —es TanStack— así que ahí se deja pasar: ordenar dos
     veces no rompe nada, pero es trabajo al pedo sobre cada render. */
  const ordered = useMemo(
    () =>
      present === "table" || sortable === undefined
        ? items
        : sortItems(items, sortable, sort ?? null),
    [items, present, sortable, sort],
  );

  /**
   * La grilla que hay que dibujar: la que le pasaron plegada, o la que se arma
   * con las filas en la mano.
   *
   * Es la misma decisión que `pilesOf` toma para los montones, y por el mismo
   * motivo: quién plegó no es asunto de esta capa.
   */
  const pivotShown = useMemo<Pivot | undefined>(() => {
    if (pivot?.folded !== undefined) return pivot.folded;
    if (pivot?.spec === undefined) return undefined;
    return pivotFrom(ordered, pivot.spec);
  }, [pivot, ordered]);

  /**
   * Vacío es no tener NADA que dibujar, y en el pivote eso no se pregunta
   * contando `items`: cuando la grilla la plegó quien guarda los datos, las
   * filas de la pantalla son montones y el conjunto puede no haber bajado
   * nunca. Contar los registros ahí es tapar una grilla entera con «todavía no
   * hay datos».
   */
  const isEmpty =
    !loading &&
    error === null &&
    (present === "pivot" && pivotShown !== undefined
      ? pivotIsEmpty(pivotShown)
      : items.length === 0) &&
    /* The first record of an empty list is written in the table, not under a sentence
       saying there is nothing. */
    !(present === "table" && create?.draft != null);

  /* La única línea que hace agrupable a una vista: el árbol que le pasaron, o el
     que se arma con las filas en la mano. */
  const piles = useMemo(() => pilesOf(ordered, group), [group, ordered]);
  const isOpen = useCallback((pile: Pile<T>) => pileIsOpen(pile, group), [group]);

  const sheetRows = useMemo(
    () => sheetRowsOf(piles, isOpen, columns),
    [piles, isOpen, columns],
  );

  /* La forma de una fila de ESTA lista, para que el encabezado reserve los
     mismos espaciadores. Se mira la primera y no todas: el ícono y las acciones
     los decide la vista para la lista entera. */
  const first = items[0];
  const firstRow = first === undefined ? undefined : row(first);

  /** Los montones, con sus filas adentro. Se llama a sí misma porque el árbol
   *  tiene N niveles: un montón dibuja su encabezado y, adentro, o bien los
   *  montones de abajo o bien las filas — nunca las dos cosas. */
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
        </Fragment>
      );
    });
  }

  const reportRows = useMemo(() => reportRowsOf(piles, columns, row), [piles, columns, row]);

  function wrapGroups(nodes: (inside: readonly T[]) => ReactNode) {
    if (piles === null) return nodes(ordered);
    return renderPiles(piles, nodes);
  }

  const renderCard = (item: T) => {
    if (card !== undefined) {
      return <Fragment key={keyOf(item)}>{card(item)}</Fragment>;
    }
    const d = row(item);
    return (
      <RecordCard
        key={keyOf(item)}
        title={d.name}
        {...(d.tags === undefined ? {} : { tags: d.tags })}
        {...(d.meta === undefined ? {} : { meta: d.meta })}
        {...(onOpen === undefined ? {} : { onOpen: () => onOpen(item) })}
      />
    );
  };

  const body =
    present === "table" && shownColumns !== undefined ? (
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
        {...(onPeek === undefined ? {} : { onPeek })}
        {...(onOpen === undefined ? {} : { onOpen })}
      />
    ) : present === "sheet" && sheetSpec !== undefined ? (
      /* La planilla recibe el conjunto por ÍNDICE y no una matriz ya armada: ver `SheetPresentation`. */
      <SheetPresentation
        spec={sheetSpec}
        entries={sheetRows}
        ordered={ordered}
        {...(group === undefined ? {} : { group })}
      />
    ) : present === "report" && report !== undefined ? (
      /* El informe declarado por el dominio no se ORDENA desde la barra: el
         orden ES el informe, y ordenar un balance por importe deja «Total
         Activos» en el medio. Pero sí se AGRUPA cuando las líneas no vienen
         declaradas: ahí el informe es este conjunto contado por los niveles que
         estén puestos. */
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
    ) : present === "pivot" && pivotShown !== undefined ? (
      /* El pivote recibe la grilla y nada más: no hay selección que pasarle
         —una casilla por montón elegiría cosas que no son registros—, no hay
         orden —cada eje viene en el orden de sus claves— y no hay menú de
         columnas, porque las columnas son un eje y no una lista de campos que
         se puedan esconder de a uno. */
      <PivotTable
        pivot={pivotShown}
        {...(pivot?.onCell === undefined ? {} : { onCell: pivot.onCell })}
        {...(pivot?.height === undefined ? {} : { height: pivot.height })}
      />
    ) : present === "board" ? (
      <div className="flex flex-col">
        {wrapGroups((inside) => (
          <div className="grid gap-3 p-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {inside.map(renderCard)}
          </div>
        ))}
      </div>
    ) : (
      /* El encabezado va ANTES de los montones y no adentro de cada uno:
         rotula la fila, y la fila es la misma en los cinco montones. */
      <>
        {rowHeader === undefined || items.length === 0 ? null : (
          <RowHeader
            name={rowHeader.name}
            {...(rowHeader.meta === undefined ? {} : { meta: rowHeader.meta })}
            {...(rowHeader.tags === undefined ? {} : { tags: rowHeader.tags })}
            withSelection={selection !== undefined}
            /* Los espaciadores se preguntan por la PRIMERA fila: el ícono y las
               acciones son de la lista entera, no de una fila — si la primera no
               tiene ícono, ninguna lo tiene. */
            withIcon={firstRow?.icon !== undefined}
            withActions={onOpen !== undefined || firstRow?.actions !== undefined}
          />
        )}
        {wrapGroups((inside) => inside.map(renderRow))}
      </>
    );

  return (
    /* The list is its own container (`@container`: the presentations adapt to the width
       the LIST has, not the window) and fills the space it is given. Before, every page
       wrapped it in a `div` to get both. */
    <div ref={frame} className="@container flex min-w-0 flex-1 flex-col bg-surface">
      <Listing
        bar={bar}
        /* La barra se queda arriba: con 187 filas, scrollear para ver la última
           dejaba sin buscador, sin paginador y sin el conmutador.
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

        {/* VACÍA. Lo declarado gana —«importá tus facturas» sabe qué se puede hacer— y
            si no se declaró nada igual se dice algo: un panel en blanco, sin
            filas y sin explicación, no dice si no hay nada o si el recorte se
            comió todo. */}
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

        {loading || isEmpty ? null : body}
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
