import type { RecordCalendarProps } from "@sincpro/web-ui/components/calendar/RecordCalendar";
import type { RecordGanttProps } from "@sincpro/web-ui/components/gantt/RecordGantt";
import type { BoardStages } from "@sincpro/web-ui/components/listing/BoardColumns";
import type { ListIdentity } from "@sincpro/web-ui/components/listing/ListingBar";
import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import type { SortField } from "@sincpro/web-ui/components/listing/SortMenu";
import type { RecordTimelineProps } from "@sincpro/web-ui/components/timeline/RecordTimeline";
import type { GroupableField } from "@sincpro/web-ui/foundations/grouping";
import type { Grouping, GroupLevel } from "@sincpro/web-ui/foundations/grouping";
import type { Pivot, PivotKey, PivotSpec } from "@sincpro/web-ui/foundations/pivot";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import type { DataColumn, DataTableCreate } from "@sincpro/web-ui/primitives/table/DataTable";
import type { ReportColumn, ReportRow } from "@sincpro/web-ui/primitives/table/ReportTable";
import type { RowAction } from "@sincpro/web-ui/primitives/table/RowActions";
import type { SheetColumn } from "@sincpro/web-ui/primitives/table/SheetTable";
import type { SortState } from "@sincpro/web-ui/primitives/table/Table";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Las seis maneras de mirar un conjunto. La unión vive en `list/set.ts`, que
 * es donde ya vivía su copia.
 *
 * Las seis son el MISMO conjunto mirado distinto, y por eso comparten barra.
 * Lo que cambia entre ellas es qué sabe el código de las columnas — y, en el
 * pivote, que las filas de la pantalla ya no son las filas del conjunto.
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
 * El agrupado de una lista: el CONTRATO de `system/grouping.ts` más lo único que
 * una tabla necesita de más.
 *
 * Las seis presentaciones parten el conjunto con el MISMO árbol y las mismas
 * claves — la tabla incluida. Lo único que una tabla agrega es una pregunta de
 * VISIBILIDAD: agrupar por un campo cuya columna está escondida dejaría montones
 * cuyo criterio no se ve en ninguna parte, así que esa columna se repone, y para
 * reponerla hay que saber cuál es. Eso es `columnOf`, y nada más: la clave del
 * montón no sale de una columna.
 *
 * Va acá y no en el contrato para que una vista que no tenga columnas no tenga
 * que fingir que las tiene.
 */
export type ListGroup<T extends object> = Grouping<T> & {
  /** Qué COLUMNA contesta por cada nivel, para reponerla cuando está escondida.
   *  Sin esto, la que se llame como el campo o la que lo declare en `field`. */
  columnOf?: (level: GroupLevel) => string | undefined;
};

/**
 * La PLANILLA de una lista: las columnas y cómo se lee cada celda.
 *
 * Se declara cuando las columnas salen del ARCHIVO y el código no sabe cuáles
 * son. Para un conjunto de registros no hace falta: sale de las `columns` que
 * la lista ya declaró.
 */
export type ListSheet<T> = {
  columns: readonly SheetColumn[];
  /** El valor de una celda. `null` es un faltante y `""` una celda vacía: son
   *  cosas distintas y el motor las distingue, así que la interfaz también. */
  cell: (item: T, column: SheetColumn, columnIndex: number) => string | number | null;
  /** Qué celdas se pintan y con qué: un valor imputado, uno fuera de rango. */
  tone?: (item: T, column: SheetColumn, columnIndex: number) => Tone | undefined;
  note?: (item: T, column: SheetColumn, columnIndex: number) => string | undefined;
  height?: number | "auto";
  /** Qué dice la columna fija de la izquierda. Sin esto, el número de fila. */
  rowLabel?: (item: T, index: number) => string;
  /** Presente = la planilla se edita como planilla. Recibe el texto crudo;
   *  convertirlo al tipo de la columna es del dominio, no de acá. */
  onCommit?: (item: T, column: SheetColumn, columnIndex: number, next: string) => void;
  editable?: (item: T, column: SheetColumn, columnIndex: number) => boolean;
  /** Present = the sheet adds rows: «add a row» under it, and `Enter` on the last row.
   *  The consumer appends the item; the sheet lands on it. Not while grouped. */
  onAddRow?: () => void;
};

/**
 * El INFORME de una lista: los períodos y la jerarquía que termina en totales.
 *
 * Las filas van aparte de `items` y es deliberado: un balance no es la lista
 * plana agrupada —«Total Activos» es una suma de sumas— y el arquetipo no puede
 * inventar esa jerarquía. La arma quien conoce el dominio, como ya arma
 * `columns`.
 */
export type ListReport = {
  columns: readonly ReportColumn[];
  /**
   * Las líneas del informe, cuando el DOMINIO las arma.
   *
   * Un balance no es la lista plana agrupada —«Total Activos» es una suma de
   * sumas— y el arquetipo no puede inventar esa jerarquía.
   *
   * **Sin esto, el informe se arma con los montones**: cada nivel es una línea
   * con sus agregados, y el más profundo son las filas. Es el mismo conjunto que
   * ven las otras cuatro presentaciones, contado — que es lo que alguien espera
   * al pasar de «tabla» a «informe» con dos niveles puestos.
   */
  rows?: readonly ReportRow[];
  /** Qué grupos arrancan abiertos. Por omisión ninguno: un balance con todo
   *  desplegado son cuatrocientas líneas y lo que se mira primero son los
   *  totales. */
  defaultOpen?: readonly string[];
  height?: number;
};

/**
 * El PIVOTE de una lista: los dos ejes y las medidas que se pliegan en el cruce.
 *
 * Es la presentación en la que **las filas de la pantalla dejan de ser los
 * registros**: una fila es un montón y una columna también, así que no hay nada
 * que elegir ni que abrir, y lo que se lee está en el cruce.
 *
 * De ahí que venga plegado de dos lugares posibles, igual que los montones de
 * una lista agrupada:
 *
 *     folded   lo plegó quien guarda los datos. Es el caso normal en cuanto el
 *              conjunto no entra en el navegador: contar 187 vencidas no lo
 *              pueden contestar las doce filas que se bajaron.
 *     spec     lo pliega esta máquina, con las filas en la mano.
 *
 * Los dos dibujan igual porque dibujan el mismo tipo.
 */
export type ListPivot<T> = {
  /** El pivote ya plegado. Gana sobre `spec` cuando están los dos: si alguien
   *  con el conjunto entero ya contestó, no hay nada que recalcular. */
  folded?: Pivot;
  /**
   * Cómo armarlo acá adentro. Las medidas traen su pliegue, y los márgenes salen
   * de la BASE y no de sumar celdas — ver `system/pivot.ts`.
   *
   * Quien además necesite la grilla EN LA MANO —para bajarla como planilla con
   * `downloadPivot`, por ejemplo— la pliega él con `pivotFrom` y la pasa por
   * `folded`: así la que se dibuja y la que se baja son el mismo objeto, y no
   * dos que podrían no coincidir.
   */
  spec?: PivotSpec<T>;
  /** Qué pasa al tocar un cruce: abrir las filas que cayeron ahí. */
  onCell?: (row: PivotKey, column: PivotKey) => void;
  height?: number | string;
  /** The fields the person may pivot by. With them (and `spec`) the pivot is EXPLORED — axes,
   *  measures and download on the grid (`PivotExplorer`) — and its rows follow the search
   *  bar's grouping while there is one; `spec.rows` / `spec.columns` are where it starts. */
  fields?: readonly GroupableField[];
  /** Which of `spec.measures` start on. The first one by default. */
  defaultMeasures?: readonly string[];
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
   * Los rótulos de las zonas de una fila, arriba de todas. Sin esto no hay
   * encabezado: `rows` no es una tabla y no toda lista tiene algo que rotular
   * —una lista de cinco archivos con el nombre y nada más no lo necesita.
   *
   * No son columnas. Una fila tiene un nombre, UNA cadena de `meta` ya
   * formateada y una columna de fichas: eso es lo que se rotula, y por eso los
   * rótulos los escribe la vista y no salen de `columns`.
   */
  rowHeader?: { name: string; meta?: string; tags?: string };
  /** The table presentation. With this, `present="table"` draws a `DataTable`. */
  columns?: readonly DataColumn<T>[];
  /** Which table columns are on screen. Required columns stay even if omitted.
   *  Owned by the view when omitted — catalog filters must not reset them. */
  visibleColumnIds?: readonly string[];
  onVisibleColumnIdsChange?: (ids: readonly string[]) => void;
  /** The sorting of the table. It lives outside because it belongs to the SET
   *  and not to the presentation: switching from table to rows has no reason to
   *  lose it. */
  sort?: SortState | null;
  onSortChange?: (next: SortState | null) => void;
  /**
   * Por qué campos se puede ordenar, para las presentaciones que NO tienen
   * encabezados donde hacer clic.
   *
   * Sin esto, ordenar existe sólo en la tabla — y entonces pasar a filas o a
   * tablero no pierde el orden puesto, pierde la posibilidad de ordenar. La
   * tabla sigue teniendo además sus encabezados: son dos puertas a lo mismo, y
   * la de los encabezados es más rápida donde existe.
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
  /** The board presentation. */
  card?: (item: T) => ReactNode;
  /** The board by stages: one column each, cards moved between them. */
  boardStages?: BoardStages<T>;
  /** The calendar presentation: when each record happens. */
  calendar?: ListCalendar<T>;
  /** The Gantt presentation: each record as a span on a timeline. */
  gantt?: ListGantt<T>;
  /** The planning presentation: records grouped in rows across time (Odoo's Gantt). */
  timeline?: ListTimeline<T>;

  /**
   * La PLANILLA. Con esto, `present="sheet"` dibuja un `SheetTable`.
   *
   * Es la presentación de los datos crudos, y por eso no recibe `DataColumn`:
   * las columnas salen del archivo y el código no sabe cuáles son ni cuántas.
   * El valor se pide por índice —igual que `SheetTable`, que está virtualizado—
   * así que un millón de filas no se copia a ninguna otra estructura.
   */
  sheet?: ListSheet<T>;

  /**
   * El INFORME: una jerarquía que termina en totales. Con esto,
   * `present="report"` dibuja un `ReportTable`.
   *
   * Las filas van aparte de `items` y es deliberado: un balance NO es la lista
   * plana agrupada —«Total Activos» no es un montón de cuentas, es una suma de
   * sumas— y el arquetipo no puede inventar esa jerarquía a partir del
   * conjunto. La arma quien conoce el dominio, como ya arma `columns`.
   */
  report?: ListReport;

  /**
   * El PIVOTE: dos ejes a la vez. Con esto, `present="pivot"` dibuja un
   * `PivotTable`.
   *
   * Va aparte de `group` y no derivado de él aunque los dos partan el conjunto,
   * porque un pivote parte por DOS ejes y una lista agrupada por uno: los
   * niveles de `group` no dicen cuál de ellos sería el eje horizontal, y
   * elegirlo acá sería adivinar la pregunta.
   */
  pivot?: ListPivot<T>;
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
  state?: { loading?: boolean; error?: string | null };
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
