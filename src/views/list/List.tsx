import type { BoardStages } from "@sincpro/web-ui/components/listing/BoardColumns";
import type { ListIdentity } from "@sincpro/web-ui/components/listing/ListingBar";
import type { BuiltInPresent } from "@sincpro/web-ui/components/listing/set";
import type { SortField } from "@sincpro/web-ui/components/listing/SortMenu";
import type { ViewIcon } from "@sincpro/web-ui/components/listing/ViewSwitcher";
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
import type { SortState } from "@sincpro/web-ui/primitives/table/sorting";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import {
  type CardWays,
  type ListCalendar,
  type ListChart,
  type ListCrumb,
  type ListEmpty,
  type ListFace,
  type ListGantt,
  type ListGroup,
  type ListPivot,
  type ListPresent,
  type ListReport,
  type ListSet,
  type ListSheet,
  type ListTimeline,
  type RowOf,
} from "@sincpro/web-ui/views/list/types";
import type { ReactNode } from "react";

/**
 * ARCHETYPE 1 — N things, written as a TREE.
 *
 * Context: a list has the same kind of optional shape as a record —
 * is there a search? is there a pager? can this be seen as a table?— and a list
 * of props answers it with `pagination={undefined}` and with a SECOND prop that
 * declares which faces are offered. The two can contradict each other: asking for the table
 * without columns is offering a view that cannot be drawn, and nobody complains.
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
 * ── The faces there are, are the ones WRITTEN ───────────────────────
 *
 * The switcher offers the presentations that appear in the tree, in the order
 * they were written. There is no separate list declaring which they are, because
 * that list is the one that gets out of sync: **if there is no `<List.Table>`, there is no
 * table**, and one that cannot be drawn cannot be asked for.
 *
 * ── The face says WHAT the list is OF ───────────────────────────────
 *
 *     <List.Table<Invoice> columns={…} />
 *
 * A slot cannot inherit the parent's type —TypeScript does not link `<List>`'s
 * generic with a child's— so the face declares it, once, and everything
 * inside is inferred: `columns` is typed against `Invoice` and `row` receives
 * an `Invoice`. It is one annotation per face and it is the only one needed.
 *
 * ── What did NOT become a tree ──────────────────────────────────────
 *
 * `items`, `keyOf`, `group`, `selection`, `sort`, `state`: they are states of the
 * SET and not regions of the screen. Leaving them out changes the shape of
 * nothing — it is the same rule by which `identity` and `dirty` remain props
 * on `Record`.
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
 *
 * ── A presentation of your own: `List.Present` ──────────────────────
 *
 *     <List.Present<Store> id="map" label="Mapa" icon={MapPin}>
 *       {(set) => <StoreMap stores={set.items} pick={set.press} />}
 *     </List.Present>
 *
 * The package draws nine presentations; an application needs the tenth — a map, a
 * gallery, a floor plan. It is written in the tree like the others, takes its place in
 * the switcher in the order it was written, and draws from the SAME set (`ListSet`):
 * sorted by the bar, split by the search's grouping, with the selection and the rule of
 * what a press does. What it draws is its own — the list only hands it the set.
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
  | "pivot"
  | "chart"
  | "calendar"
  | "gantt"
  | "timeline"
  | "present";

/* ---------------------------------------------------------------- *
 *  The bar's pieces
 * ---------------------------------------------------------------- */

type BarProps = { children?: ReactNode };
type CrumbsProps = { crumbs: readonly ListCrumb[] };
type NodeProps = { children?: ReactNode };

/** The bar: everything that belongs to the SET and not to a row. Without it there is no
 *  band — which is what a list put inside a dialog wants. */
const Bar = slot("bar", (_props: BarProps): ReactNode => null);

/** Where I came from. It goes above the bar, and only when the bar is chrome. */
const Crumbs = slot("crumbs", (_props: CrumbsProps): ReactNode => null);

/** What this list is called and how much it holds. */
const Identity = slot("identity", (_props: ListIdentity): ReactNode => null);

/** The search field, already assembled: it is assembled by whoever holds the domain's
 *  declarations — the system does not know what a NIT is. */
const Search = slot("search", (_props: NodeProps): ReactNode => null);

/** What STARTS something new. It stays visible when there is a selection. */
const Actions = slot("actions", (_props: NodeProps): ReactNode => null);

const Pagination = slot("pagination", (_props: NodeProps): ReactNode => null);

/** The switcher's escape hatch: a selector of one's own. Almost never needed —
 *  the written faces already draw it. */
const Views = slot("views", (_props: NodeProps): ReactNode => null);

/** The metrics that also NARROW: «2 por confirmar». They go below the bar and
 *  above the rows, because they belong to the set and not to the frame. */
const Metrics = slot("metrics", (_props: NodeProps): ReactNode => null);

/* ---------------------------------------------------------------- *
 *  Las caras
 * ---------------------------------------------------------------- */

type RowsProps<T> = {
  row: (item: T) => RowOf;
  /**
   * The labels of a row's zones, above all of them. Without this there is no
   * header: a list of five files with the name and nothing else does not
   * need it.
   *
   * They are not columns. A row has a name, ONE already formatted `meta` string
   * and a column of chips: that is what is labelled.
   */
  header?: { name: string; meta?: string; tags?: string };
};

type TableProps<T extends object> = {
  columns: readonly DataColumn<T>[];
  /** Which ones are on screen. Required ones stay even if omitted. */
  visibleColumnIds?: readonly string[];
  onVisibleColumnIdsChange?: (ids: readonly string[]) => void;
  /** The footer with the aggregates of the columns that declared one. */
  totals?: boolean;
  /** What is done to ONE row without entering it. They are drawn hidden and appear
   *  on the row being pointed at. */
  rowActions?: (item: T) => readonly RowAction[];
  /** Write a new record as one more row of the table (Odoo's editable
   *  list). See `DataTable`'s header. */
  create?: DataTableCreate<T>;
};

/** The board. Without `card`, the card comes from what `List.Rows` already says: the
 *  name, the `meta` and the chips. Writing it anyway is declaring that THIS list
 *  can be seen as a board. */
type BoardProps<T> = {
  /** `ways` carries the list's rule of what a press does — call `ways.press` from the card. */
  card?: (item: T, ways: CardWays) => ReactNode;
  /** One column per stage, with drag (and Alt + ← / →) to move a card between them. */
  stages?: BoardStages<T>;
};

/** The sheet. Without columns of its own, it comes from those `List.Table` declared — the
 *  one for RAW data does bring them, because there they come from the file and the code does not know
 *  which they are. */
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

/** The pivot, drawn — Odoo's graph view (`ChartExplorer`). `unknown` in between: the
 *  comparison's records make the props invariant in `T`, and the slot never reads them. */
const ChartSlot = slot("chart", (_props: ListChart<never>): ReactNode => null) as unknown as <
  T,
>(
  props: ListChart<T>,
) => ReactNode;

/* The order in which they are OFFERED when written another way. The switcher
   respects the tree's order; this only names which presentation each slot
   corresponds to. */
const PRESENT_OF: Readonly<Record<string, BuiltInPresent>> = {
  rows: "rows",
  table: "table",
  board: "board",
  sheet: "sheet",
  report: "report",
  pivot: "pivot",
  chart: "chart",
  calendar: "calendar",
  gantt: "gantt",
  timeline: "timeline",
};

const FACES: readonly SlotName[] = [
  "rows",
  "table",
  "board",
  "sheet",
  "report",
  "pivot",
  "chart",
  "calendar",
  "gantt",
  "timeline",
];

/** Records grouped in rows across time, N per row — a planning (`RecordTimeline`). */
const TimelineSlot = slot("timeline", (_props: ListTimeline<never>): ReactNode => null) as <
  T,
>(
  props: ListTimeline<T>,
) => ReactNode;

/** When each record happens, on a month, a week, a day or an agenda (`RecordCalendar`). */
const CalendarSlot = slot("calendar", (_props: ListCalendar<never>): ReactNode => null) as <
  T,
>(
  props: ListCalendar<T>,
) => ReactNode;

/** Each record as a span on a timeline, with its dependencies (`RecordGantt`). */
const GanttSlot = slot("gantt", (_props: ListGantt<never>): ReactNode => null) as <T>(
  props: ListGantt<T>,
) => ReactNode;

export type ListPresentProps<T> = {
  /** Its own name — not one of the nine the package draws. What `present` asks for. */
  id: string;
  /** Its name in the switcher: the button's `title` and accessible name. */
  label: string;
  icon: ViewIcon;
  /** It needs width — a grid of columns — so a narrow list (a phone, a panel) does not
   *  offer it. A map or a gallery reflows, and stays. */
  wide?: boolean;
  children: (set: ListSet<T>) => ReactNode;
};

/* Through `unknown`, like `TableSlot`: the set both gives a `T` (`items`) and takes one
   (`press`), so the props are invariant in `T`. */
const Present = slot(
  "present",
  (_props: ListPresentProps<never>): ReactNode => null,
) as unknown as <T>(props: ListPresentProps<T>) => ReactNode;

/** The presentations written with `List.Present`, checked once: an id that repeats or that
 *  shadows a built-in one would make the switcher offer two buttons for one thing. */
function facesOf<T>(nodes: readonly ReactNode[]): ListFace<T>[] {
  const faces = nodes
    .filter((node) => slotOf<SlotName>(node) === "present")
    .map((node) => propsOf<ListPresentProps<T>>(node)!)
    .map(({ children, ...face }) => ({ ...face, render: children }));
  for (const [at, face] of faces.entries()) {
    if (face.id in PRESENT_OF || faces.findIndex((one) => one.id === face.id) !== at) {
      throw new Error(`List.Present: «${face.id}» is already a presentation of this list`);
    }
  }
  return faces;
}

export type ListProps<T extends object> = {
  items: readonly T[];
  keyOf: (item: T) => string;

  /** The list is a FIELD of a record — a one2many / many2many — and not a screen: a
   *  one-line bar that does not stick. See «A list INSIDE a record» above. */
  embedded?: boolean;

  /** Which surface the BAR sits on. `canvas` (the default) is a light control
   *  bar; `chrome` turns it into a dark band, an explicit choice: the
   *  application bar is the screen's only dark band, same as a record's
   *  rail. */
  surface?: Surface;

  /** How the set is split. It belongs to the SET and not to a face: switching
   *  presentation cannot lose it. */
  group?: ListGroup<T>;
  selection?: {
    has: (id: string) => boolean;
    toggle: (id: string) => void;
    count: number;
    clear: () => void;
    actions?: ReactNode;
    /** Every record that matches, not just the page — see `ListViewProps`. */
    matching?: { total: number; onSelect: () => void };
  };

  /** The order, which also belongs to the set: a list of criteria, the first rules and the
   *  rest break ties. Empty is «como llegaron». */
  sort?: readonly SortState[];
  onSortChange?: (next: SortState[]) => void;
  /** Which fields can be sorted by in the faces that do NOT have headers
   *  to click on. */
  sortable?: readonly SortField<T>[];

  /** Which face is being looked at. Without this, the first one written. */
  present?: ListPresent;
  onPresentChange?: (next: ListPresent) => void;

  onOpen?: (item: T) => void;
  onPeek?: (item: T) => void;
  isPeeked?: (item: T) => boolean;
  /** What a press on the row's body does when both ways in exist. `peek` (the default) looks
   *  without leaving the list; `open` goes to the record — a workspace whose rule is «a row
   *  opens the page» (the composer's) says `open`, and 👁 stays for the look. */
  rowClick?: "peek" | "open";
  /** The list CHOOSES instead of opening — a «Buscar más…», a chooser a workspace asked for:
   *  a press on a row (its body, its name, a card) calls this, and the row offers no 👁 / ↗.
   *  For several at once, give `selection` too and toggle it here. */
  onChoose?: (item: T) => void;

  /** Nothing in it can be acted on: no opening, peeking, selecting, creating nor row
   *  actions — a list to read, like the lines of a record in view mode. One switch, so whoever
   *  passes the handlers generically does not have to strip them one by one. */
  readOnly?: boolean;

  /** The set's states, in a single place.
   *
   *  `loading` is the FIRST reading: there are no rows yet, and the skeleton is drawn.
   *  `refreshing` is asking again with rows in hand —something was typed in the search, the
   *  page changed—: the rows stay and a discreet bar says that a question is
   *  being asked. Swapping them for a skeleton on every question made the table flicker, and a
   *  click could land on a row that was no longer there. */
  state?: { loading?: boolean; refreshing?: boolean; error?: string | null };
  /** Empty BECAUSE OF A FILTER is another situation: content is not missing, a
   *  cut is in excess. */
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
  selection: selectWith,
  sort,
  onSortChange,
  sortable,
  present,
  onPresentChange,
  onOpen: openWith,
  onPeek: peekWith,
  isPeeked,
  readOnly = false,
  rowClick,
  onChoose,
  state,
  filtered,
  empty,
  children,
}: ListProps<T>) {
  const top = flatten(children);
  const onOpen = readOnly ? undefined : openWith;
  const onPeek = readOnly ? undefined : peekWith;
  const selection = readOnly ? undefined : selectWith;

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
  const chart = propsOf<ListChart<T>>(pick(top, "chart"));
  const calendar = propsOf<ListCalendar<T>>(pick(top, "calendar"));
  const gantt = propsOf<ListGantt<T>>(pick(top, "gantt"));
  const timeline = propsOf<ListTimeline<T>>(pick(top, "timeline"));

  /* The faces there are, are the ones written, IN THAT ORDER. The switcher
     cannot offer one that cannot be drawn, because the one drawn and the
     one offered are the same node. */
  const faces = facesOf<T>(top);
  const presents = top.flatMap((node): ListPresent[] => {
    const name = slotOf<SlotName>(node);
    if (name === "present") return [propsOf<ListPresentProps<T>>(node)!.id];
    const builtIn = name === undefined ? undefined : PRESENT_OF[name];
    return builtIn === undefined ? [] : [builtIn];
  });

  /* The escape hatch: what the archetype did not foresee is drawn anyway, below.
     Something showing up here is the sign that the archetype is missing a piece. */
  const rest = loose(top, ["bar", "metrics", "present", ...FACES]);

  return (
    <ListView<T>
      items={items}
      keyOf={keyOf}
      row={
        rows === undefined
          ? () => ({ name: "" })
          : readOnly
            ? (item: T) => {
                const { actions: _actions, ...rest } = rows.row(item);
                return rest;
              }
            : rows.row
      }
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
            /* Read-only: a cell that opens an editor is an action too. */
            columns: readOnly
              ? table.columns.map(({ edit: _edit, ...c }) => c)
              : table.columns,
            ...(table.totals === undefined ? {} : { totals: table.totals }),
            ...(table.rowActions === undefined || readOnly
              ? {}
              : { rowActions: table.rowActions }),
            ...(table.create === undefined || readOnly ? {} : { create: table.create }),
            ...(table.visibleColumnIds === undefined
              ? {}
              : { visibleColumnIds: table.visibleColumnIds }),
            ...(table.onVisibleColumnIdsChange === undefined
              ? {}
              : { onVisibleColumnIdsChange: table.onVisibleColumnIdsChange }),
          })}
      {...(board?.card === undefined ? {} : { card: board.card })}
      {...(board?.stages === undefined ? {} : { boardStages: board.stages })}
      {...(sheet?.columns === undefined || sheet.cell === undefined
        ? {}
        : { sheet: sheet as ListSheet<T> })}
      {...(report === undefined ? {} : { report })}
      {...(pivot === undefined ? {} : { pivot })}
      {...(chart === undefined ? {} : { chart })}
      {...(calendar === undefined ? {} : { calendar })}
      {...(gantt === undefined ? {} : { gantt })}
      {...(timeline === undefined ? {} : { timeline })}
      {...(faces.length === 0 ? {} : { faces })}
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
      {...(rowClick === undefined ? {} : { rowClick })}
      {...(onChoose === undefined || readOnly ? {} : { onChoose })}
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
List.Chart = ChartSlot;
List.Calendar = CalendarSlot;
List.Gantt = GanttSlot;
List.Timeline = TimelineSlot;
List.Present = Present;
