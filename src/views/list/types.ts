import type { RecordCalendarProps } from "@sincpro/web-ui/components/calendar/RecordCalendar";
import type { RecordGanttProps } from "@sincpro/web-ui/components/gantt/RecordGantt";
import type { BoardStages } from "@sincpro/web-ui/components/listing/BoardColumns";
import type { ChartComparison } from "@sincpro/web-ui/components/listing/ChartExplorer";
import type { ListIdentity } from "@sincpro/web-ui/components/listing/ListingBar";
import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import type { SortField } from "@sincpro/web-ui/components/listing/SortMenu";
import type { ViewIcon } from "@sincpro/web-ui/components/listing/ViewSwitcher";
import type { RecordTimelineProps } from "@sincpro/web-ui/components/timeline/RecordTimeline";
import type { ChartKind, ChartOrder } from "@sincpro/web-ui/foundations/chart";
import type { GroupableField } from "@sincpro/web-ui/foundations/grouping";
import type { Grouping, GroupLevel, Pile } from "@sincpro/web-ui/foundations/grouping";
import type { Pivot, PivotKey, PivotSpec } from "@sincpro/web-ui/foundations/pivot";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import type { DataColumn, DataTableCreate } from "@sincpro/web-ui/primitives/table/DataTable";
import type { ReportColumn, ReportRow } from "@sincpro/web-ui/primitives/table/ReportTable";
import type { RowAction } from "@sincpro/web-ui/primitives/table/RowActions";
import type { SheetColumn } from "@sincpro/web-ui/primitives/table/SheetTable";
import type { SortState } from "@sincpro/web-ui/primitives/table/sorting";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The six ways of looking at a set. The union lives in `list/set.ts`, which
 * is where its copy already lived.
 *
 * The six are the SAME set looked at differently, and that is why they share a bar.
 * What changes between them is what the code knows about the columns — and, in the
 * pivot, that the screen's rows are no longer the set's rows.
 */
export type { ListPresent };

/** What an item looks like when the presentation is rows. */
export type RowOf = {
  icon?: LucideIcon;
  /** A person or a company: its face in the icon's place — the photo or the initials. */
  avatar?: { name: string; src?: string };
  name: string;
  tags?: ReactNode;
  meta?: string;
  /** What this resource produced, hanging underneath. */
  children?: ReactNode;
  actions?: ReactNode;
};

/**
 * What a press on ONE card does in this list, already bound to its record.
 *
 * Context: a board's own card replaced the built-in one and lost, with it, the rule of what
 * a press does — the application had to pass it by hand. It gets the same three ways as a
 * `List.Present` (`ListSet`), so a card written by the domain answers a click like the
 * list's own: `press` is the rule (choose, look or open, as the list decided); `peek` and
 * `open` are the two ways in, absent while the list is choosing.
 */
export type CardWays = {
  press?: () => void;
  peek?: () => void;
  open?: () => void;
};

/**
 * The set as a presentation receives it — what a `List.Present` draws from.
 *
 * Context: the built-in presentations do not each sort, group and wire selection on their
 * own; the list does it once and hands them the result. A presentation the application
 * writes gets the same hand-off, so a map or a gallery is one more way of looking at the
 * SAME set: the bar's sort, the search's grouping, the selection and the rule of what a
 * press on a record does all hold, and switching to it and back loses none of them.
 */
export type ListSet<T> = {
  /** In the order the bar asks for. The page, when the list pages. */
  items: readonly T[];
  keyOf: (item: T) => string;
  /** Grouped: the piles, outermost level first, each with its sub-piles or its items.
   *  `null` when the list is not grouped — draw `items`. */
  piles: readonly Pile<T>[] | null;
  /** Whether a pile is open, with the same keys every presentation folds by. */
  isOpen: (pile: Pile<T>) => boolean;
  /** Folds or unfolds a pile — present when the list lets it. */
  toggle?: (pile: Pile<T>) => void;
  /** Asks for the next page of a pile that holds fewer records than it counts
   *  (`pile.items.length < pile.count`) — present when whoever keeps the data can. */
  more?: (pile: Pile<T>) => void;
  selection?: { has: (id: string) => boolean; toggle: (id: string) => void };
  /** What a press on a record does in THIS list: choose it, look at it or open it, as the
   *  list decided (`onChoose`, `rowClick`). Call this from the body of a card or a marker. */
  press?: (item: T) => void;
  /** The two ways in, for a presentation that offers both buttons (👁 and ↗). Absent while
   *  the list is choosing. */
  peek?: (item: T) => void;
  open?: (item: T) => void;
};

/** A presentation the application writes, as the list receives it from `List.Present`. */
export type ListFace<T> = {
  id: string;
  /** Its name in the switcher — the `title` and the accessible name of its button. */
  label: string;
  icon: ViewIcon;
  /** It needs width (a grid of columns): a narrow list does not offer it. */
  wide?: boolean;
  render: (set: ListSet<T>) => ReactNode;
};

/** A crumb of the list: where I came from. */
export type ListCrumb = { label: string; onClick?: () => void };

export type ListEmpty = {
  sentence: string;
  action?: ReactNode;
  /** Empty because of a filter is ANOTHER situation: content is not missing,
   *  there is an extra narrowing. Telling «importá tus facturas» to someone who has 180
   *  and mistyped a name is answering a different question. */
  whenFiltered?: { sentence: string; action?: ReactNode };
};

/**
 * A list's grouping: the CONTRACT of `system/grouping.ts` plus the only thing
 * a table needs on top.
 *
 * The six presentations split the set with the SAME tree and the same
 * keys — the table included. The only thing a table adds is a question of
 * VISIBILITY: grouping by a field whose column is hidden would leave buckets
 * whose criterion is seen nowhere, so that column is restored, and to
 * restore it we must know which one it is. That is `columnOf`, and nothing more: the bucket's
 * key does not come from a column.
 *
 * It goes here and not in the contract so that a view with no columns does not have
 * to pretend it has them.
 */
export type ListGroup<T extends object> = Grouping<T> & {
  /** Which COLUMN answers for each level, to restore it when it is hidden.
   *  Without this, the one called like the field or the one that declares it in `field`. */
  columnOf?: (level: GroupLevel) => string | undefined;
};

/**
 * A list's SHEET: the columns and how each cell is read.
 *
 * It is declared when the columns come from the FILE and the code does not know which
 * they are. For a set of records it is not needed: it comes from the `columns` the
 * list already declared.
 */
export type ListSheet<T> = {
  columns: readonly SheetColumn[];
  /** A cell's value. `null` is a missing value and `""` an empty cell: they are
   *  different things and the engine tells them apart, so the interface does too. */
  cell: (item: T, column: SheetColumn, columnIndex: number) => string | number | null;
  /** Which cells are painted and with what: an imputed value, an out-of-range one. */
  tone?: (item: T, column: SheetColumn, columnIndex: number) => Tone | undefined;
  note?: (item: T, column: SheetColumn, columnIndex: number) => string | undefined;
  height?: number | "auto";
  /** What the fixed column on the left says. Without this, the row number. */
  rowLabel?: (item: T, index: number) => string;
  /** Present = the sheet is edited as a sheet. It receives the raw text;
   *  converting it to the column's type is the domain's job, not this layer's. */
  onCommit?: (item: T, column: SheetColumn, columnIndex: number, next: string) => void;
  editable?: (item: T, column: SheetColumn, columnIndex: number) => boolean;
  /** Present = the sheet adds rows: «add a row» under it, and `Enter` on the last row.
   *  The consumer appends the item; the sheet lands on it. Not while grouped. */
  onAddRow?: () => void;
};

/**
 * A list's REPORT: the periods and the hierarchy that ends in totals.
 *
 * The rows go apart from `items` and that is deliberate: a balance is not the flat
 * grouped list —«Total Activos» is a sum of sums— and the archetype cannot
 * invent that hierarchy. Whoever knows the domain builds it, as they already build
 * `columns`.
 */
export type ListReport = {
  columns: readonly ReportColumn[];
  /**
   * The report's lines, when the DOMAIN builds them.
   *
   * A balance is not the flat grouped list —«Total Activos» is a sum of
   * sums— and the archetype cannot invent that hierarchy.
   *
   * **Without this, the report is built from the buckets**: each level is a line
   * with its aggregates, and the deepest are the rows. It is the same set the
   * other four presentations see, counted — which is what someone expects
   * when going from «tabla» to «informe» with two levels set.
   */
  rows?: readonly ReportRow[];
  /** Which groups start open. None by default: a balance with everything
   *  unfolded is four hundred lines and what is looked at first is the
   *  totals. */
  defaultOpen?: readonly string[];
  height?: number;
};

/**
 * A list's PIVOT: the two axes and the measures folded at the crossing.
 *
 * It is the presentation in which **the screen's rows stop being the
 * records**: a row is a bucket and so is a column, so there is nothing
 * to choose or to open, and what is read is at the crossing.
 *
 * Hence it comes folded from two possible places, just like the buckets of
 * a grouped list:
 *
 *     folded   folded by whoever keeps the data. It is the normal case as soon as the
 *              set does not fit in the browser: counting 187 overdue ones cannot be
 *              answered by the twelve rows that were downloaded.
 *     spec     folded by this machine, with the rows in hand.
 *
 * Both draw the same because they draw the same type.
 */
export type ListPivot<T> = {
  /** The already folded pivot. It wins over `spec` when both are present: if someone
   *  with the whole set already answered, there is nothing to recompute. */
  folded?: Pivot;
  /**
   * How to build it in here. The measures bring their fold, and the margins come
   * from the BASE and not from summing cells — see `system/pivot.ts`.
   *
   * Whoever also needs the grid IN HAND —to download it as a sheet with
   * `downloadPivot`, for example— folds it with `pivotFrom` and passes it through
   * `folded`: that way the one drawn and the one downloaded are the same object, and not
   * two that might not match.
   */
  spec?: PivotSpec<T>;
  /** What happens when a crossing is pressed: open the rows that fell there. */
  onCell?: (row: PivotKey, column: PivotKey) => void;
  height?: number | string;
  /** The fields the person may pivot by. With them (and `spec`) the pivot is EXPLORED — axes,
   *  measures and download on the grid (`PivotExplorer`) — and its rows follow the search
   *  bar's grouping while there is one; `spec.rows` / `spec.columns` are where it starts. */
  fields?: readonly GroupableField[];
  /** Which of `spec.measures` start on. The first one by default. */
  defaultMeasures?: readonly string[];
};

/**
 * A list's CHART: Odoo's graph view. It reads the same as the pivot —a
 * `Pivot`, folded here with `spec` or outside with `folded`— and draws it as bars, lines or
 * a pie. Its levels FOLLOW the search's grouping: the first goes on the axis and the rest
 * are the series, as in Odoo.
 */
export type ListChart<T> = {
  /** Folded by whoever keeps the data. Its axes are its own and are not edited here. */
  folded?: Pivot;
  /** How to fold it here, with the rows in hand: `rows` is the axis, `columns` the series. */
  spec?: PivotSpec<T>;
  /** Which fields it can be split by. With this the axes are chosen on the chart. */
  fields?: readonly GroupableField[];
  /** The measure it opens with. The first of `spec.measures`; `COUNT_MEASURE` for the count. */
  defaultMeasure?: string;
  /** Several measures, each its own chart (never two scales on one axis). */
  defaultMeasures?: readonly string[];
  kind?: ChartKind;
  /** How it opens: stacked (the default, as in Odoo), cumulative, ordered. */
  stacked?: boolean;
  cumulative?: boolean;
  order?: ChartOrder;
  /** The previous period, to draw beside it: the records of then and their names. */
  compare?: ChartComparison<T>;
  /** A bar, a point or a slice: open the records that fell there. */
  onPoint?: (category: PivotKey, series?: PivotKey) => void;
  height?: number | string;
  /** The name it is downloaded under. */
  fileName?: string;
};

export type ListViewProps<T extends object> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  identity?: ListIdentity;

  /** Where I came from. It goes above the bar, and only when the bar is chrome. */
  crumbs?: readonly ListCrumb[];
  /** The metrics that also NARROW: «2 por confirmar», «41 por entregar». They go
   *  below the bar and above the rows — they belong to the set, not to the frame. */
  metrics?: ReactNode;
  /** The list is a FIELD of a record (a one2many / many2many) and not a screen: the bar
   *  is one line — search, count, sort, columns, switcher, actions —, it does not stick
   *  and it does not move into the frame's header. Identity and crumbs are not drawn: the
   *  record around it already says them. See `ListingBar`'s header. */
  embedded?: boolean;
  /** Which surface the BAR sits on. `canvas` (the default) is a light control bar;
   *  `chrome` turns it into a dark band — an explicit choice, since the application bar
   *  is the screen's one dark band (same as the rail of a record). */
  surface?: Surface;

  /** The search field, already assembled. It is assembled by whoever holds the
   *  domain declarations — the system does not know what a provenance is. */
  search?: ReactNode;
  pagination?: ReactNode;
  /** Escape hatch: a custom switcher. Prefer `presents` so the archetype draws it. */
  views?: ReactNode;
  actions?: ReactNode;

  row: (item: T) => RowOf;
  /**
   * The labels of a row's zones, above all of them. Without this there is no
   * header: `rows` is not a table and not every list has something to label
   * —a list of five files with the name and nothing else does not need it.
   *
   * They are not columns. A row has a name, ONE already formatted `meta`
   * string and a column of chips: that is what is labelled, and that is why the
   * labels are written by the view and do not come from `columns`.
   */
  rowHeader?: { name: string; meta?: string; tags?: string };
  /** The table presentation. With this, `present="table"` draws a `DataTable`. */
  columns?: readonly DataColumn<T>[];
  /** Which table columns are on screen. Required columns stay even if omitted.
   *  Owned by the view when omitted — catalog filters must not reset them. */
  visibleColumnIds?: readonly string[];
  onVisibleColumnIdsChange?: (ids: readonly string[]) => void;
  /** The order of the set, outermost first: «by date, then by customer». It lives outside
   *  because it belongs to the SET and not to the presentation: switching from table to
   *  rows has no reason to lose it. Empty or absent is «as they came». */
  sort?: readonly SortState[];
  onSortChange?: (next: SortState[]) => void;
  /**
   * Which fields it can be sorted by, for the presentations that do NOT have
   * headers to click on.
   *
   * Without this, sorting exists only in the table — and then switching to rows or to
   * a board does not lose the order set, it loses the ability to sort. The
   * table also keeps its headers: they are two doors to the same thing, and
   * the headers' one is faster where it exists.
   */
  sortable?: readonly SortField<T>[];
  /** The footer with the aggregates of the columns that declared one. */
  totals?: boolean;
  /** What gets done to ONE row without entering it, in the table presentation.
   *  They are drawn hidden and appear on the row being pointed at. */
  rowActions?: (item: T) => readonly RowAction[];
  /** Write a new record as a row of the table presentation — Odoo's editable list. The
   *  columns that declare `input` get a control in that row. See `DataTable`'s header.
   *  While a record is being written the table shows even if the set is empty. */
  create?: DataTableCreate<T>;
  /** The board presentation: the card of one record, with what a press on it does. */
  card?: (item: T, ways: CardWays) => ReactNode;
  /** The board by stages: one column each, cards moved between them. */
  boardStages?: BoardStages<T>;
  /** The calendar presentation: when each record happens. */
  calendar?: ListCalendar<T>;
  /** The Gantt presentation: each record as a span on a timeline. */
  gantt?: ListGantt<T>;
  /** The planning presentation: records grouped in rows across time (Odoo's Gantt). */
  timeline?: ListTimeline<T>;

  /**
   * The SHEET. With this, `present="sheet"` draws a `SheetTable`.
   *
   * It is the presentation of raw data, and that is why it does not receive `DataColumn`:
   * the columns come from the file and the code does not know which they are or how many.
   * The value is requested by index —like `SheetTable`, which is virtualised—
   * so a million rows are not copied into any other structure.
   */
  sheet?: ListSheet<T>;

  /**
   * The REPORT: a hierarchy that ends in totals. With this,
   * `present="report"` draws a `ReportTable`.
   *
   * The rows go apart from `items` and that is deliberate: a balance is NOT the flat
   * grouped list —«Total Activos» is not a bucket of accounts, it is a sum of
   * sums— and the archetype cannot invent that hierarchy from the
   * set. Whoever knows the domain builds it, as they already build `columns`.
   */
  report?: ListReport;

  /**
   * The PIVOT: two axes at once. With this, `present="pivot"` draws a
   * `PivotTable`.
   *
   * It goes apart from `group` and not derived from it although both split the set,
   * because a pivot splits by TWO axes and a grouped list by one: the
   * levels of `group` do not say which of them would be the horizontal axis, and
   * choosing it here would be guessing the question.
   */
  pivot?: ListPivot<T>;
  /** The CHART: the pivot drawn. With this, `present="chart"` draws a `ChartExplorer`. */
  chart?: ListChart<T>;
  /** The presentations the application wrote (`List.Present`), by id. */
  faces?: readonly ListFace<T>[];
  present?: ListPresent;
  /** Which presentations this list offers. Two or more draw the switcher. */
  presents?: readonly ListPresent[];
  onPresentChange?: (next: ListPresent) => void;

  group?: ListGroup<T>;
  selection?: {
    has: (id: string) => boolean;
    toggle: (id: string) => void;
    count: number;
    clear: () => void;
    actions?: ReactNode;
    /** Every record that matches, not just the page: «Elegir los 187 que coinciden». The total
     *  is the server's; `onSelect` makes the selection mean «all of them». */
    matching?: { total: number; onSelect: () => void };
  };

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

  /** The three states, in a single place. Every view used to re-assemble them
   *  with three nested ternaries, and that is why «empty because of a filter»
   *  and «really empty» got mixed up in half the screens. */
  /** The set's states, in a single place.
   *
   *  `loading` is the FIRST reading: there are no rows yet, and the skeleton is drawn.
   *  `refreshing` is asking again with rows in hand —something was typed in the search, the
   *  page changed—: the rows stay and a discreet bar says that a question is
   *  being asked. Swapping them for a skeleton on every question made the table flicker, and a
   *  click could land on a row that was no longer there. */
  state?: { loading?: boolean; refreshing?: boolean; error?: string | null };
  filtered?: boolean;
  empty?: ListEmpty;

  /** The escape hatch. */
  children?: ReactNode;
};

/** `List.Calendar`: the calendar's own props; the records, their key and «open» are the list's. */
export type ListCalendar<T> = Omit<RecordCalendarProps<T>, "items" | "keyOf" | "onOpen">;

/** `List.Gantt`: the chart's own props; the records, their key and «open» are the list's. */
export type ListGantt<T> = Omit<RecordGanttProps<T>, "items" | "keyOf" | "onOpen">;

/** `List.Timeline`: the planning's own props; the records, their key and «open» are the list's. */
export type ListTimeline<T> = Omit<RecordTimelineProps<T>, "items" | "keyOf" | "onOpen">;
