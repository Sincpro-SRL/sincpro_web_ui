import type { ListIdentity } from "@sincpro/web-ui/components/listing/ListingBar";
import type { SortField } from "@sincpro/web-ui/components/listing/SortMenu";
import {
  flatten,
  loose,
  pick,
  propsOf,
  slot,
  slotOf,
} from "@sincpro/web-ui/foundations/slots";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { DataColumn, DataTableCreate } from "@sincpro/web-ui/primitives/table/DataTable";
import type { RowAction } from "@sincpro/web-ui/primitives/table/RowActions";
import type { SortState } from "@sincpro/web-ui/primitives/table/Table";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import {
  type ListCrumb,
  type ListEmpty,
  type ListGroup,
  type ListPivot,
  type ListPresent,
  type ListReport,
  type ListSheet,
  type RowOf,
} from "@sincpro/web-ui/views/list/types";
import type { ReactNode } from "react";

/**
 * ARQUETIPO 1 — N cosas, escritas como un ÁRBOL.
 *
 * Context: una lista tiene la misma clase de forma opcional que un registro —
 * ¿hay buscador? ¿hay paginador? ¿esto se puede mirar como tabla?— y una lista
 * de props la contesta con `pagination={undefined}` y con una SEGUNDA prop que
 * declara qué caras se ofrecen. Las dos se pueden contradecir: pedir la tabla
 * sin columnas es ofrecer una vista que no se puede dibujar, y nadie se queja.
 *
 *     <List items={invoices} keyOf={(i) => i.id} group={grouping}>
 *       <List.Bar>
 *         <List.Crumbs crumbs={[…]} />
 *         <List.Identity title="Facturas" counters={[…]} />
 *         <List.Search>{searchBar}</List.Search>
 *         <List.Actions>…</List.Actions>
 *         <List.Pagination>{pagination}</List.Pagination>
 *       </List.Bar>
 *
 *       <List.Rows row={row} header={{ name: "número" }} />
 *       <List.Table columns={columns} totals />
 *       <List.Pivot spec={salesBySeller} />
 *     </List>
 *
 * ── Las caras que hay son las que están ESCRITAS ────────────────────
 *
 * El conmutador ofrece las presentaciones que aparecen en el árbol, en el orden
 * en que se escribieron. No hay una lista aparte que declare cuáles son, porque
 * esa lista es la que se desincroniza: **si no hay `<List.Table>`, no hay
 * tabla**, y no se puede pedir una que no se puede dibujar.
 *
 * ── La cara dice DE QUÉ es la lista ─────────────────────────────────
 *
 *     <List.Table<Invoice> columns={…} />
 *
 * Una ranura no puede heredar el tipo del padre —TypeScript no liga el genérico
 * de `<List>` con el de un hijo— así que la cara lo declara, una vez, y todo lo
 * de adentro se infiere: `columns` queda tipado contra `Invoice` y `row` recibe
 * un `Invoice`. Es una anotación por cara y es la única que hace falta.
 *
 * ── Lo que NO se volvió árbol ───────────────────────────────────────
 *
 * `items`, `keyOf`, `group`, `selection`, `sort`, `state`: son estados del
 * CONJUNTO y no regiones de la pantalla. Dejarlos afuera no cambia la forma de
 * nada — es la misma regla por la que `identity` y `dirty` siguen siendo props
 * en `Record`.
 *
 * ── A list INSIDE a record: `embedded` ──────────────────────────────
 *
 *     <Record.Page id="items" label="journal items">
 *       <List items={…} keyOf={…} embedded sortable={…} present={…}>
 *         <List.Bar>
 *           <List.Search><SearchField … /></List.Search>
 *         </List.Bar>
 *         <List.Table columns={…} totals />
 *         <List.Rows row={…} />
 *         <List.Sheet />
 *       </List>
 *     </Record.Page>
 *
 * A one2many or many2many shown as a collection is the SAME set as a module's main list —
 * it searches, sorts, chooses columns, selects and switches presentation the same way, so
 * it is the same `List` and not a smaller sibling that would drift. What changes is WHERE
 * it sits, and only the composer knows that (the same reason `Listing`'s `sticky` is
 * opt-in), so it is a prop and not a guess:
 *
 *   - Guessed from «no `List.Identity`», a full-page list that happens to have only a
 *     search would lose its sticky bar; guessed from being inside `Record`, a view would
 *     have to know another view. Neither is a fact this file can see.
 *   - Not a slot: it is not a region of the screen, it is how all of them are laid out —
 *     the rule above for `items`, `sort` and `state`.
 *
 * Embedded, the bar is ONE line (search filling, count, sort · columns · switcher,
 * actions) that does not stick and does not move into the frame's header slot — the
 * record already has its own sticky parts. Identity and crumbs are not drawn: the
 * record's tab and crumbs already say them. The reasoning for the line is in
 * `ListingBar`'s header.
 */

type SlotName =
  | "bar"
  | "crumbs"
  | "identity"
  | "search"
  | "actions"
  | "pagination"
  | "views"
  | "metrics"
  | "rows"
  | "table"
  | "board"
  | "sheet"
  | "report"
  | "pivot";

/* ---------------------------------------------------------------- *
 *  Las piezas de la barra
 * ---------------------------------------------------------------- */

type BarProps = { children?: ReactNode };
type CrumbsProps = { crumbs: readonly ListCrumb[] };
type NodeProps = { children?: ReactNode };

/** La barra: todo lo que es del CONJUNTO y no de una fila. Sin ella no hay
 *  banda — que es lo que quiere una lista metida adentro de un diálogo. */
const Bar = slot("bar", (_props: BarProps): ReactNode => null);

/** De dónde vengo. Va arriba de la barra, y sólo cuando la barra es cromo. */
const Crumbs = slot("crumbs", (_props: CrumbsProps): ReactNode => null);

/** Cómo se llama esta lista y cuánto tiene. */
const Identity = slot("identity", (_props: ListIdentity): ReactNode => null);

/** El campo de búsqueda, ya armado: lo arma quien tiene las declaraciones del
 *  dominio — el sistema no sabe qué es un NIT. */
const Search = slot("search", (_props: NodeProps): ReactNode => null);

/** Lo que EMPIEZA algo nuevo. Sigue visible cuando hay una selección. */
const Actions = slot("actions", (_props: NodeProps): ReactNode => null);

const Pagination = slot("pagination", (_props: NodeProps): ReactNode => null);

/** La escotilla del conmutador: un selector propio. Casi nunca hace falta —
 *  las caras escritas ya lo dibujan. */
const Views = slot("views", (_props: NodeProps): ReactNode => null);

/** Las medidas que además RECORTAN: «2 por confirmar». Van debajo de la barra y
 *  arriba de las filas, porque son del conjunto y no del marco. */
const Metrics = slot("metrics", (_props: NodeProps): ReactNode => null);

/* ---------------------------------------------------------------- *
 *  Las caras
 * ---------------------------------------------------------------- */

type RowsProps<T> = {
  row: (item: T) => RowOf;
  /**
   * Los rótulos de las zonas de una fila, arriba de todas. Sin esto no hay
   * encabezado: una lista de cinco archivos con el nombre y nada más no lo
   * necesita.
   *
   * No son columnas. Una fila tiene un nombre, UNA cadena de `meta` ya formateada
   * y una columna de fichas: eso es lo que se rotula.
   */
  header?: { name: string; meta?: string; tags?: string };
};

type TableProps<T extends object> = {
  columns: readonly DataColumn<T>[];
  /** Cuáles están en pantalla. Las obligatorias se quedan aunque se omitan. */
  visibleColumnIds?: readonly string[];
  onVisibleColumnIdsChange?: (ids: readonly string[]) => void;
  /** El pie con los agregados de las columnas que declararon uno. */
  totals?: boolean;
  /** Lo que se le hace a UNA fila sin entrar. Se dibujan escondidas y aparecen
   *  sobre la fila que se está apuntando. */
  rowActions?: (item: T) => readonly RowAction[];
  /** Escribir un registro nuevo como una fila más de la tabla (la lista editable de
   *  Odoo). Ver la cabecera de `DataTable`. */
  create?: DataTableCreate<T>;
};

/** El tablero. Sin `card`, la tarjeta sale de lo que ya dice `List.Rows`: el
 *  nombre, el `meta` y las fichas. Escribirla igual es declarar que ESTA lista
 *  se puede ver como tablero. */
type BoardProps<T> = { card?: (item: T) => ReactNode };

/** La planilla. Sin columnas propias, sale de las que declaró `List.Table` — la
 *  de datos CRUDOS sí las trae, porque ahí salen del archivo y el código no sabe
 *  cuáles son. */
type SheetProps<T> = Partial<ListSheet<T>>;

const Rows = slot("rows", (_props: RowsProps<never>): ReactNode => null) as <T>(
  props: RowsProps<T>,
) => ReactNode;

/* Through `unknown`: `create` both receives and hands back a `T` (`onChange`, `draft`),
   so `TableProps` is invariant in `T` and `TableProps<never>` no longer narrows to it. The
   slot only carries the props; `List` reads them back typed against the list's `T`. */
const TableSlot = slot(
  "table",
  (_props: TableProps<never>): ReactNode => null,
) as unknown as <T extends object>(props: TableProps<T>) => ReactNode;

const Board = slot("board", (_props: BoardProps<never>): ReactNode => null) as <T>(
  props: BoardProps<T>,
) => ReactNode;

const SheetSlot = slot("sheet", (_props: SheetProps<never>): ReactNode => null) as <T>(
  props: SheetProps<T>,
) => ReactNode;

const Report = slot("report", (_props: ListReport): ReactNode => null);

const Pivot = slot("pivot", (_props: ListPivot<never>): ReactNode => null) as <T>(
  props: ListPivot<T>,
) => ReactNode;

/* El orden en que se OFRECEN cuando están escritas de otra manera. El conmutador
   respeta el orden del árbol; esto sólo nombra a qué presentación corresponde
   cada ranura. */
const PRESENT_OF: Readonly<Record<string, ListPresent>> = {
  rows: "rows",
  table: "table",
  board: "board",
  sheet: "sheet",
  report: "report",
  pivot: "pivot",
};

const FACES: readonly SlotName[] = ["rows", "table", "board", "sheet", "report", "pivot"];

export type ListProps<T extends object> = {
  items: readonly T[];
  keyOf: (item: T) => string;

  /** The list is a FIELD of a record — a one2many / many2many — and not a screen: a
   *  one-line bar that does not stick. See «A list INSIDE a record» above. */
  embedded?: boolean;

  /** En qué superficie se apoya la BARRA. `canvas` (el default) es una barra
   *  de control clara; `chrome` la convierte en una banda oscura, una opción
   *  explícita: la barra de la aplicación es la única banda oscura de la
   *  pantalla, igual que el riel de un registro. */
  surface?: Surface;

  /** Cómo se parte el conjunto. Es del CONJUNTO y no de una cara: cambiar de
   *  presentación no puede perderlo. */
  group?: ListGroup<T>;
  selection?: {
    has: (id: string) => boolean;
    toggle: (id: string) => void;
    count: number;
    clear: () => void;
    actions?: ReactNode;
  };

  /** El orden, que también es del conjunto. */
  sort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  /** Por qué campos se puede ordenar en las caras que NO tienen encabezados
   *  donde hacer clic. */
  sortable?: readonly SortField<T>[];

  /** Cuál cara se está mirando. Sin esto, la primera que esté escrita. */
  present?: ListPresent;
  onPresentChange?: (next: ListPresent) => void;

  onOpen?: (item: T) => void;
  onPeek?: (item: T) => void;
  isPeeked?: (item: T) => boolean;

  /** Los tres estados, en un solo lugar. */
  state?: { loading?: boolean; error?: string | null };
  /** Vacía POR UN FILTRO es otra situación: no falta contenido, sobra un
   *  recorte. */
  filtered?: boolean;
  empty?: ListEmpty;

  children?: ReactNode;
};

export function List<T extends object>({
  items,
  keyOf,
  embedded,
  surface,
  group,
  selection,
  sort,
  onSortChange,
  sortable,
  present,
  onPresentChange,
  onOpen,
  onPeek,
  isPeeked,
  state,
  filtered,
  empty,
  children,
}: ListProps<T>) {
  const top = flatten(children);

  const bar = flatten(propsOf<BarProps>(pick(top, "bar"))?.children);
  const crumbs = propsOf<CrumbsProps>(pick(bar, "crumbs"))?.crumbs;
  const identity = propsOf<ListIdentity>(pick(bar, "identity"));
  const search = propsOf<NodeProps>(pick(bar, "search"))?.children;
  const actions = propsOf<NodeProps>(pick(bar, "actions"))?.children;
  const pagination = propsOf<NodeProps>(pick(bar, "pagination"))?.children;
  const views = propsOf<NodeProps>(pick(bar, "views"))?.children;
  const metrics = propsOf<NodeProps>(pick(top, "metrics"))?.children;

  const rows = propsOf<RowsProps<T>>(pick(top, "rows"));
  const table = propsOf<TableProps<T>>(pick(top, "table"));
  const board = propsOf<BoardProps<T>>(pick(top, "board"));
  const sheet = propsOf<SheetProps<T>>(pick(top, "sheet"));
  const report = propsOf<ListReport>(pick(top, "report"));
  const pivot = propsOf<ListPivot<T>>(pick(top, "pivot"));

  /* Las caras que hay son las que están escritas, EN ESE ORDEN. El conmutador
     no puede ofrecer una que no se pueda dibujar, porque la que se dibuja y la
     que se ofrece son el mismo nodo. */
  const presents = top
    .map((node) => FACES.find((face) => slotOf<SlotName>(node) === face))
    .filter((face): face is SlotName => face !== undefined)
    .map((face) => PRESENT_OF[face]!);

  /* La escotilla: lo que el arquetipo no previó se dibuja igual, debajo. Que
     aparezca algo acá es la señal de que al arquetipo le falta una pieza. */
  const rest = loose(top, ["bar", "metrics", ...FACES]);

  return (
    <ListView<T>
      items={items}
      keyOf={keyOf}
      row={rows?.row ?? (() => ({ name: "" }))}
      {...(rows?.header === undefined ? {} : { rowHeader: rows.header })}
      {...(identity === undefined ? {} : { identity })}
      {...(crumbs === undefined ? {} : { crumbs })}
      {...(embedded === undefined ? {} : { embedded })}
      {...(surface === undefined ? {} : { surface })}
      {...(search === undefined ? {} : { search })}
      {...(actions === undefined ? {} : { actions })}
      {...(pagination === undefined ? {} : { pagination })}
      {...(views === undefined ? {} : { views })}
      {...(metrics === undefined ? {} : { metrics })}
      {...(table === undefined
        ? {}
        : {
            columns: table.columns,
            ...(table.totals === undefined ? {} : { totals: table.totals }),
            ...(table.rowActions === undefined ? {} : { rowActions: table.rowActions }),
            ...(table.create === undefined ? {} : { create: table.create }),
            ...(table.visibleColumnIds === undefined
              ? {}
              : { visibleColumnIds: table.visibleColumnIds }),
            ...(table.onVisibleColumnIdsChange === undefined
              ? {}
              : { onVisibleColumnIdsChange: table.onVisibleColumnIdsChange }),
          })}
      {...(board?.card === undefined ? {} : { card: board.card })}
      {...(sheet?.columns === undefined || sheet.cell === undefined
        ? {}
        : { sheet: sheet as ListSheet<T> })}
      {...(report === undefined ? {} : { report })}
      {...(pivot === undefined ? {} : { pivot })}
      {...(presents.length === 0 ? {} : { presents })}
      {...(present === undefined ? {} : { present })}
      {...(onPresentChange === undefined ? {} : { onPresentChange })}
      {...(group === undefined ? {} : { group })}
      {...(selection === undefined ? {} : { selection })}
      {...(sort === undefined ? {} : { sort })}
      {...(onSortChange === undefined ? {} : { onSortChange })}
      {...(sortable === undefined ? {} : { sortable })}
      {...(onOpen === undefined ? {} : { onOpen })}
      {...(onPeek === undefined ? {} : { onPeek })}
      {...(isPeeked === undefined ? {} : { isPeeked })}
      {...(state === undefined ? {} : { state })}
      {...(filtered === undefined ? {} : { filtered })}
      {...(empty === undefined ? {} : { empty })}
    >
      {rest.length === 0 ? undefined : rest}
    </ListView>
  );
}

List.Bar = Bar;
List.Crumbs = Crumbs;
List.Identity = Identity;
List.Search = Search;
List.Actions = Actions;
List.Pagination = Pagination;
List.Views = Views;
List.Metrics = Metrics;
List.Rows = Rows;
List.Table = TableSlot;
List.Board = Board;
List.Sheet = SheetSlot;
List.Report = Report;
List.Pivot = Pivot;
