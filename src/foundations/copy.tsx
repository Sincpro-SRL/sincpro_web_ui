"use client";

import { createContext, type ReactNode, useContext } from "react";

/**
 * Chrome copy for the design system.
 *
 * The handbook rule: code is English; language is chosen at render. This
 * package must not bake product Spanish into buttons. English is the default
 * so a story still reads; the app overlays the session locale via
 * `UiCopyProvider`.
 *
 * Domain sentences (empty catalog, upload hint) stay out — those are the
 * product's catalogs, passed as props.
 *
 * `locale` is also a module store so `formatCount` — called from modules that
 * are not components — tracks the same BCP-47 the provider just set. A React
 * context cannot be read from `shared/format.ts`.
 */

export type UiCopy = {
  /** BCP-47 for `toLocaleString` and `Intl`. */
  locale: string;
  present: {
    rows: string;
    table: string;
    board: string;
    /** La planilla: los datos crudos, con las columnas del archivo. */
    sheet: string;
    /** El que SUMA: una jerarquía que termina en totales. */
    report: string;
    /** Dos preguntas a la vez: montones cruzados por montones. */
    pivot: string;
    chart: string;
    group: string;
  };
  frame: {
    columns: string;
    show: string;
    series: string;
    column: string;
    empty: string;
    noSeries: string;
    required: string;
    optional: string;
  };
  selection: {
    chosen: string;
    clear: string;
    all: string;
    row: string;
    named: string;
    more: string;
    moreOf: string;
  };
  pager: {
    size: string;
    sizeHint: string;
    prev: string;
    next: string;
  };
  record: {
    prev: string;
    next: string;
    location: string;
    status: string;
    faces: string;
    /** The mark of a record with changes that are not saved yet. */
    unsaved: string;
    save: string;
    saving: string;
    discard: string;
    /** Read aloud next to a stage that failed: the red fill alone says nothing to a
     *  screen reader. */
    failed: string;
    /** The title of the list of the record's notices, opened from the rail. */
    notices: string;
    /** The rail's indicator: how many notices, singular and plural. */
    noticeOne: string;
    noticeMany: string;
    /** The accessible name of the band of what is wrong with the record. */
    blocking: string;
  };
  shell: {
    modules: string;
    menus: string;
    close: string;
    notices: string;
    closeNotice: string;
    preview: string;
    previewTag: string;
    closePreview: string;
    account: string;
    openAsPanel: string;
    /** The accessible name of the command palette's dialog. */
    commandPalette: string;
  };
  field: {
    drop: string;
    chooseFile: string;
    cancel: string;
    uploadProgress: string;
    fileUnreadable: string;
    tryAnother: string;
    /** The word next to a required label. The asterisk is the mark; this is
     *  what a screen reader says, because a star is not a word. */
    required: string;
    /** The name of the button that opens a field's longer explanation. */
    help: string;
    /** What a field with no value says when it is read: an answer, not a blank. */
    unset: string;
    /** A list of checks read with nothing chosen. */
    none: string;
  };
  /** The choice controls: combo boxes, selects, suggestion lists. */
  choice: {
    /** What an open list says when what was typed matches nothing. */
    noResults: string;
    /** The name of a search box nobody labelled — no `Field`, no `aria-label`, no
     *  placeholder. A field a screen reader announces as «edit text» is a field nobody
     *  can find. */
    search: string;
  };
  search: {
    tools: string;
    editChip: string;
    editNamed: string;
    removeChip: string;
    removeFilter: string;
    removeGroup: string;
    and: string;
    or: string;
    /** Lo que encabeza las fichas del agrupado: «agrupado por». No lleva el
     *  nivel adentro porque los niveles son N y van como fichas aparte. */
    groupedBy: string;
    /** Lo que encabeza el corchete de los recortes. */
    narrowedBy: string;
    /** Cambiar la conjunción entre búsquedas: todas a la vez, o cualquiera. */
    switchJoin: string;
    /**
     * Cómo se juntan las búsquedas, en palabras y no en símbolos.
     *
     * «Y» y «O» son de quien escribe consultas; «todas» y «cualquiera» son de
     * quien busca — y son las mismas tres que el constructor pone arriba de un
     * grupo, así que la barra y el árbol dicen lo mismo.
     */
    joins: { all: string; any: string; none: string };
    /** El grupo negado, que el constructor sabe mostrar y la barra dibuja. */
    notWord: string;
    /** Lo que dice un nodo recién abierto, que todavía no tiene nada adentro: lo
     *  próximo que se escriba cae ahí. Sin esto, un corchete vacío se lee como un
     *  error y no como una invitación. */
    landsHere: string;
    /** Cerrar el nodo abierto: lo que siga vuelve a caer afuera. */
    closeGroup: string;
    /** Sacar del borrador el campo o la comparación ya elegidos. */
    /** El aviso del campo cuando lo que falta es el valor. */
    typeValue: string;
    dropField: string;
    dropOp: string;
    /** Abrir el constructor con TODO lo que la barra tiene puesto. */
    openBuilder: string;
    /** Abrir el constructor SOBRE esta condición. */
    openBuilderHere: string;
    /** El encabezado de cada paso de la pregunta: contra qué campo, con qué
     *  comparación, contra qué valor. Sin él, una lista de operadores arriba de
     *  una de campos son dos listas iguales que no dicen qué se está eligiendo. */
    askField: string;
    /** Cuando se escribió `#`: lo que sigue es el nombre de un campo. */
    askAttribute: string;
    askOp: string;
    /** El encabezado de un nodo del árbol: cómo se juntan las reglas de abajo. */
    askJoin: string;
    /** Lo que se dice cuando el filtro no se puede leer como árbol: se muestra
     *  como está y se sigue editando en el JSON. */
    unreadable: string;
    askValue: string;
    /** Cómo se lee una pregunta ya hecha: «el nombre · contiene · test». */
    condition: string;
    /** El corte de una frase larga: una ficha que no entra en la barra no dice
     *  nada, y para verlo entero está el constructor. */
    andMore: string;
    placeholder: string;
    /** The titles of the three columns of the tools panel. */
    filters: string;
    groupBy: string;
    favorites: string;
  };
  failed: {
    operation: string;
    list: string;
    loading: string;
    /** The button that asks again after a list could not be read. */
    retry: string;
  };
  table: {
    /** Under an editable list: write a new record as one more row. */
    add: string;
    row: string;
    rows: string;
    yes: string;
    no: string;
    mean: string;
    min: string;
    max: string;
    distinct: string;
  };
  menu: {
    empty: string;
  };
  /**
   * Una lista sin nada que mostrar.
   *
   * Existe porque declarar el aviso es OPCIONAL y una lista vacía que no lo
   * declaró no dibujaba nada: un panel en blanco, sin filas y sin explicación,
   * que no dice si no hay nada o si el recorte se comió todo.
   *
   * Lo declarado gana siempre: «importá tus facturas» es mejor que cualquier frase
   * general, porque sabe qué se puede hacer. Esto es lo que se dice cuando nadie
   * sabía qué decir.
   */
  list: {
    empty: string;
    /** Vacía POR EL RECORTE es otra situación: no falta contenido, sobra un
     *  filtro. Decir «todavía no hay nada» a quien tiene ciento ochenta y
     *  escribió mal un nombre es contestar otra pregunta. */
    emptyFiltered: string;
    /** How many records an embedded list holds, on its one-line bar. Two keys and not
     *  one: «1 records» is wrong in every language this ships in. */
    countOne: string;
    count: string;
  };
  /** La historia de un registro: eventos y mensajes. */
  /** The panel of everything around a record: its notices, its conversation and its
   *  history (`Activity`). */
  activity: {
    /** Quién hizo algo que no hizo nadie. Es una respuesta, no un hueco. */
    bySystem: string;
    /** Abrir y cerrar el error completo. */
    more: string;
    less: string;
    /** La marca de una nota que no sale de acá, y lo que explica la marca. Van
     *  juntas porque la palabra sola no dice qué implica. */
    internal: string;
    internalNote: string;
    /** Escribir una nota: cómo se llama la manera, y qué dice su campo vacío. */
    writeNote: string;
    notePlaceholder: string;
    /** A quiénes les llega lo que se escriba, y qué se dice cuando a nadie. */
    recipients: string;
    noRecipients: string;
    /** El campo vacío de un mensaje que sí sale. */
    messagePlaceholder: string;
    /** Nobody wrote yet, and nothing was logged yet: two different answers. */
    emptyMessages: string;
    emptyEvents: string;
    /** The panel's name, and what its fold and unfold buttons say about it. */
    title: string;
    open: string;
    fold: string;
    /** The parts of the timeline: what is true now, what people wrote, what the system
     *  logged. */
    alerts: string;
    conversation: string;
    history: string;
    /** The name of the history, under the notices. */
    viewTimeline: string;
    /** The notices beyond the first three, folded: «Ver 4 más». */
    moreAlerts: string;
    fewerAlerts: string;
    /** The timeline's filters: everything, or one kind of entry. */
    filters: string;
    filterAll: string;
    filterConversation: string;
    filterNotes: string;
    filterEvents: string;
    /** The day separators of the timeline that are not a date. */
    today: string;
    yesterday: string;
    /** A filter that leaves nothing. */
    emptyFilter: string;
    /** A note in the timeline takes you to what it belongs to. `{owner}` is that field or
     *  line. */
    goTo: string;
    /** The composer's buttons. */
    send: string;
    sending: string;
    cancel: string;
  };
  /** Copiar un valor al portapapeles. */
  copyable: {
    label: string;
    done: string;
    /** Sin portapapeles —contexto no seguro, permiso negado— se dice. */
    failed: string;
    /** The copy button of a field, named by the field: «Copiar «Cliente»». */
    field: string;
    /** A field with nothing in it: said, not a silent success. */
    empty: string;
  };
  /** Ordenar, cuando la presentación no tiene encabezados donde hacer clic. */
  sorting: {
    label: string;
    by: string;
    asc: string;
    desc: string;
    clear: string;
  };
  /** Los recortes de fecha RELATIVOS. Las unidades van en singular y plural
   *  porque «1 mes» y «3 meses» no se resuelven con una `s` en todos los
   *  idiomas, y una interfaz que dice «3 mes» se lee como un borrador. */
  dates: {
    last: string;
    prior: string;
    day: string;
    days: string;
    week: string;
    weeks: string;
    month: string;
    months: string;
    quarter: string;
    quarters: string;
    year: string;
    years: string;
  };
  /**
   * Las dos piezas de calendario que ningún idioma nombra solo.
   *
   * Los meses y los días de la semana los dice `Intl` con este mismo `locale`,
   * así que no están acá: una tabla de doce meses en dos idiomas es una tabla
   * que hay que escribir de nuevo para el tercero. La semana y el trimestre sí,
   * porque «W38» no es una palabra en ningún lado.
   *
   * `OfYear` es la variante que se planta sola, cuando no hay un año arriba que
   * ya lo haya dicho.
   */
  calendar: {
    week: string;
    weekOfYear: string;
    quarter: string;
    quarterOfYear: string;
  };
  /**
   * CÓMO SE LLAMA UN OPERADOR para quien lo lee.
   *
   * Está acá y no en el constructor de filtros porque lo hablan los dos: la
   * barra ofrece «contiene» al armar una pregunta y el árbol lo dibuja al
   * mostrarla. Dos tablas es que la misma comparación se llame de dos maneras en
   * la misma pantalla.
   *
   * Un operador que el servidor agregue y que no esté acá se dibuja con su
   * SÍMBOLO, no desaparece: verlo crudo es un rótulo que falta, y no verlo es
   * una pregunta que no se puede hacer.
   */
  ops: Record<string, string>;
  /** «Agrupar por», que es una LISTA de niveles y no una opción. */
  grouping: {
    label: string;
    /** Cuando no hay ningún nivel puesto. */
    none: string;
    add: string;
    remove: string;
    up: string;
    down: string;
    clear: string;
    /** El corte de un nivel de fecha: día, semana, mes, año. */
    grain: string;
  };
  editable: {
    add: string;
    /** The spreadsheet's: a row, not a line of a document. */
    addRow: string;
    empty: string;
    remove: string;
  };
  picker: {
    placeholder: string;
    empty: string;
    search: string;
    loading: string;
    more: string;
    refine: string;
    open: string;
    browseAll: string;
    /** The quiet row at the end of a list that is fetching its next page. */
    loadingMore: string;
  };
  cell: {
    missing: string;
    empty: string;
    emptyBin: string;
  };
  time: {
    justNow: string;
    invalid: string;
    noDate: string;
  };
  /** The dialog that holds a stack of contexts opened from a record (`Drill`). */
  drill: {
    /** Up one level. `{name}` is the context it goes back to. */
    back: string;
    /** The accessible name of the trail of contexts this one was opened from. */
    trail: string;
  };
  dialog: {
    expand: string;
    /** The wizard's own buttons: leave, go back, go on, end — and what the main
     *  button says while the last step is being done. */
    cancel: string;
    back: string;
    next: string;
    finish: string;
    busy: string;
  };
  report: {
    open: string;
    close: string;
    /** El encabezado de la primera columna, que se lee en voz alta y no se
     *  dibuja: sin él, un lector de pantalla anuncia una columna sin nombre. */
    concept: string;
  };
  /**
   * EL CONSTRUCTOR de criteria: las palabras de sus secciones y sus controles.
   *
   * Van acá y no adentro del componente por la misma razón que las de la barra:
   * un archivo que dibuja no es el lugar donde se decide en qué idioma habla el
   * producto, y con el texto adentro cambiarlo es tocar el que arma la pregunta.
   */
  builder: {
    /** Los títulos de cada sección, en el orden en que se leen. */
    filter: string;
    order: string;
    groupBy: string;
    totals: string;
    filterPiles: string;
    pileOrder: string;
    pilePage: string;
    fields: string;
    /** Lo que se dice cuando una sección no tiene nada puesto: qué pasa
     *  entonces. «Vacío» no dice si no ordena o si ordena por algo. */
    noOrder: string;
    noGrouping: string;
    noTotals: string;
    noPileOrder: string;
    allFields: string;
    someFields: string;
    /** Los «+» que abren la lista de lo que todavía se puede elegir. */
    addOrder: string;
    addGroup: string;
    addPileOrder: string;
    /** Lo que hace una ficha al tocarla, en su `title`. */
    ascending: string;
    descending: string;
    flip: string;
    changeGrain: string;
    /** Sacar, uno por clase: el `aria-label` tiene que decir qué se saca. */
    dropOrder: string;
    dropTotal: string;
    dropRule: string;
    dropGroup: string;
    /** Agregar, en el árbol de condiciones. */
    addRule: string;
    addNested: string;
    /** Lo que explica una sección que no se entiende sola. */
    pilesNote: string;
    pilePageNote: string;
    limitPiles: string;
    /** El árbol de condiciones. */
    noValue: string;
    from: string;
    to: string;
    value: string;
    /** El editor de JSON y los botones del pie. */
    json: string;
    jsonFilter: string;
    invalidJson: string;
    /** El editor de código: cómo se llama cuando nadie le puso nombre, y el
     *  botón que acomoda lo escrito. */
    editor: string;
    format: string;
    notCriteria: string;
    notFilter: string;
    apply: string;
    add: string;
    cancel: string;
    /** The name a total travels under, next to its select. */
    totalAs: string;
    addTotal: string;
    /** Removing one sort or one grouping level: the label names which one. */
    dropOrderBy: string;
    dropLevel: string;
  };
  /** La grilla de dos ejes. */
  pivot: {
    /** El borde: la fila y la columna que pliegan todo. */
    total: string;
    /** El conteo, que es lo que un pivote mide cuando nadie le pidió otra cosa. */
    rows: string;
    /** Abrir un cruce: qué filas cayeron ahí. */
    open: string;
  };
  /** A person as a value: who is not there, and the ways to reach who is. */
  person: {
    unassigned: string;
    /** The title of the contact card that opens from a person. */
    contact: string;
    email: string;
    call: string;
    whatsapp: string;
    /** Go to the person's own record. */
    open: string;
  };
  /** The sub-list of lines inside a record: the lines of an order, of an entry. */
  lines: {
    add: string;
    search: string;
    edit: string;
    remove: string;
    /** A record with no lines yet: said, not a blank box. */
    empty: string;
    /** Closing the line being edited. */
    done: string;
    /** Sections and notes among the lines (Odoo's `display_type`). */
    addSection: string;
    addNote: string;
    /** The names of their text field, for a screen reader. */
    section: string;
    note: string;
  };
  /** `LineItems`, beyond the `lines` keys: counting, the editor of a new line, removing. */
  lineItems: {
    /** How many lines, singular and plural. */
    one: string;
    many: string;
    /** While searching: how many of all of them match. */
    shown: string;
    /** The title of the editor for a line that does not exist yet. */
    newLine: string;
    /** The search found nothing — said, with what was searched. */
    noMatch: string;
    /** The notice after a removal, and its way back. */
    removed: string;
    undo: string;
    /** The accessible name of the lines table. */
    table: string;
  };
  /** A field that points to another record: going there, and pointing nowhere. */
  relation: {
    open: string;
    /** No record chosen. It is an answer, not a hole. */
    none: string;
  };
  /** The floating summary of a related record, opened next to its link. */
  relationCard: {
    /** The name of the button that opens it, and of the card. `{name}` is the record. */
    summary: string;
  };
  /** The money summary of a document once something is applied against it. */
  totals: {
    /** Read, not shown, before a deducted amount: «Pagado el 12/10/2026, menos Bs. 100». */
    less: string;
    /** The name of a deduction's `i`. `{label}` is the deduction — «Pagado el 12/10/2026». */
    details: string;
    /** Go to the applied record, from its detail. */
    open: string;
    /** Take a deduction back off the document, from its detail. */
    unlink: string;
    /** The title of what could still be applied. */
    credits: string;
    /** The visible word on each available credit's button. */
    apply: string;
    /** Its accessible name, which says WHICH. `{label}` is the credit — «NC/2026/0012». */
    applyCredit: string;
  };
  /** Changing a value where it is drawn: one more tag of a many2many, one cell of a list. */
  inlineEdit: {
    /** The inline input of a tags field, while it holds no tag yet. */
    addTag: string;
    /** The option that creates a tag from the typed text. `{name}` is that text. */
    createTag: string;
    /** The accessible name of an editable cell. `{column}` is the column's header. */
    editCell: string;
  };
  /** The theme switch: the three choices an app offers for the palette. */
  theme: {
    /** The name of the control — what a screen reader says for the group. */
    label: string;
    system: string;
    light: string;
    dark: string;
  };
  /** A hierarchy of records — a chart of accounts, product categories, locations. */
  tree: {
    /** What an empty tree says, unless the screen says something closer to its domain. */
    empty: string;
  };
  /** The assistant acting inside a screen: what it suggests, what it proposes to change,
   *  what it set, and what it is still working on. */
  assist: {
    /** The assistant's name as people see it. A product renames it here: «Sincpro IA». */
    assistant: string;
    /** The verb after the name, before the suggested value: «Asistente sugiere 30 días». */
    suggests: string;
    /** The accessible name of a suggestion. */
    suggestion: string;
    /** What the suggestion or the change comes from, before its link. */
    source: string;
    accept: string;
    /** The accessible name of the × of a suggestion. */
    dismiss: string;
    /** The notice after accepting, without and with the field's name. */
    accepted: string;
    acceptedIn: string;
    undo: string;
    /** The pending state when the screen does not say what the assistant is doing. */
    working: string;
    cancel: string;
    /** The marker next to a value the assistant set: its tooltip and its card's title. */
    madeBy: string;
    /** Who accepted what the assistant proposed. `{name}` is the person. */
    acceptedBy: string;
    /** The default title of a review of proposed changes. */
    review: string;
    applyOne: string;
    applyMany: string;
    discard: string;
    /** The check that chooses every change at once. */
    all: string;
    /** How many of the proposed changes are chosen. */
    chosen: string;
    /** Why «Apply» is off. */
    noneChosen: string;
    /** The notice after applying, singular and plural. */
    appliedOne: string;
    appliedMany: string;
    /** The kind of a change, written, so it never rests on color alone. */
    added: string;
    removed: string;
    changed: string;
    /** Read between the two values of a change: «de 15 días a 30 días». Visually an arrow. */
    from: string;
    to: string;
    /** A value that was empty before the change. */
    empty: string;
  };
};

export const ENGLISH_COPY: UiCopy = {
  locale: "en-US",
  present: {
    rows: "Rows",
    table: "Table",
    board: "Board",
    sheet: "Sheet",
    report: "Report",
    pivot: "Pivot",
    chart: "Chart",
    group: "How to view",
  },
  frame: {
    columns: "columns",
    show: "show",
    series: "series",
    column: "column",
    empty: "No cells to show.",
    noSeries: "This column has no values to chart.",
    required: "always shown",
    optional: "optional",
  },
  selection: {
    chosen: "chosen",
    clear: "Clear selection",
    all: "Select all",
    row: "Select row",
    named: "Select {name}",
    more: "More actions",
    moreOf: "More actions for {name}",
  },
  pager: {
    size: "Rows per page",
    sizeHint: "{size} per page — click to change",
    prev: "Previous page",
    next: "Next page",
  },
  record: {
    prev: "Previous record",
    next: "Next record",
    location: "Location",
    status: "Status",
    faces: "Record faces",
    unsaved: "unsaved",
    save: "Save",
    saving: "Saving…",
    discard: "Discard",
    failed: "failed",
    notices: "Notices about this record",
    noticeOne: "{count} notice",
    noticeMany: "{count} notices",
    blocking: "What is wrong with this record",
  },
  shell: {
    modules: "All modules",
    menus: "Module menus",
    close: "Close",
    notices: "Notices",
    closeNotice: "Dismiss notice",
    preview: "Preview",
    previewTag: "preview",
    closePreview: "Close preview",
    account: "My account",
    openAsPanel: "Open as panel",
    commandPalette: "Command palette",
  },
  field: {
    drop: "Drop a file here, or choose one.",
    chooseFile: "Choose file",
    cancel: "Cancel",
    uploadProgress: "upload progress",
    fileUnreadable: "We could not read the file",
    tryAnother: "Try another one",
    required: "required",
    help: "Help",
    unset: "not set",
    none: "None",
  },
  choice: {
    noResults: "No results",
    search: "Search",
  },
  search: {
    tools: "Filter, group and favorites",
    editChip: "Click to edit",
    editNamed: "Edit {label}",
    removeChip: "Remove {label}: {value}",
    removeFilter: "Remove filter {label}",
    removeGroup: "Stop grouping by {label}",
    and: "and",
    or: "or",
    groupedBy: "grouped by",
    narrowedBy: "showing",
    switchJoin: "All of them, or any of them",
    joins: { all: "all", any: "any", none: "none" },
    notWord: "not",
    landsHere: "the next one lands here",
    closeGroup: "Close this group",
    typeValue: "value…",
    dropField: "Ask about another field",
    dropOp: "Compare another way",
    openBuilder: "Open all of this in the builder",
    openBuilderHere: "Open this condition in the builder",
    askField: "ask about",
    askAttribute: "pick an attribute",
    askOp: "compared how",
    askJoin: "these rules match",
    unreadable:
      "We cannot read this filter as a tree — here it is as it stands. It can still be edited as JSON below.",
    askValue: "to what",
    condition: "{field} {op} {value}",
    andMore: "and {count} more",
    placeholder: "search…",
    filters: "filters",
    groupBy: "group by",
    favorites: "favorites",
  },
  failed: {
    operation: "We could not complete the operation",
    list: "We could not read the list",
    loading: "Loading…",
    retry: "Try again",
  },
  table: {
    add: "Add",
    row: "row",
    rows: "rows",
    yes: "yes",
    no: "no",
    mean: "mean {value}",
    min: "min {value}",
    max: "max {value}",
    distinct: "{value} distinct",
  },
  menu: {
    empty: "Nothing matches.",
  },
  list: {
    empty: "There is nothing here yet.",
    emptyFiltered: "Nothing matches what is on.",
    countOne: "1 record",
    count: "{count} records",
  },
  activity: {
    bySystem: "the system",
    more: "show the whole error",
    less: "show less",
    internal: "internal",
    internalNote: "Internal note: it stays in here",
    writeNote: "Log a note",
    notePlaceholder: "A note that stays in here…",
    recipients: "Who receives it",
    noRecipients: "nobody to send it to yet",
    messagePlaceholder: "Write a message…",
    emptyMessages: "Nobody has written here yet.",
    emptyEvents: "Nothing has been logged yet.",
    title: "Activity",
    open: "Open the {label}",
    fold: "Fold the {label}",
    alerts: "Notices",
    conversation: "Conversation",
    history: "History",
    viewTimeline: "Timeline",
    moreAlerts: "Show {count} more",
    fewerAlerts: "Show fewer",
    filters: "Show",
    filterAll: "All",
    filterConversation: "Messages",
    filterNotes: "Notes",
    filterEvents: "Events",
    today: "Today",
    yesterday: "Yesterday",
    emptyFilter: "Nothing of this kind yet.",
    goTo: "Go to {owner}",
    send: "Send",
    sending: "Sending…",
    cancel: "Cancel",
  },
  copyable: {
    label: "Copy",
    done: "Copied",
    failed: "Could not copy",
    field: "Copy «{label}»",
    empty: "Nothing to copy",
  },
  sorting: {
    label: "Sort",
    by: "sort by",
    asc: "ascending",
    desc: "descending",
    clear: "no order",
  },
  dates: {
    last: "last {count} {unit}",
    prior: "previous {unit}",
    day: "day",
    days: "days",
    week: "week",
    weeks: "weeks",
    month: "month",
    months: "months",
    quarter: "quarter",
    quarters: "quarters",
    year: "year",
    years: "years",
  },
  ops: {
    "=": "is",
    "!=": "is not",
    like: "contains",
    in: "is one of",
    "not in": "is none of",
    ">": "greater than",
    ">=": "at least",
    "<": "less than",
    "<=": "at most",
    "is null": "is empty",
    "is not null": "is not empty",
    contains: "includes",
    "not contains": "does not include",
    between: "is between",
  },
  calendar: {
    week: "Week {n}",
    weekOfYear: "Week {n}, {year}",
    quarter: "Q{n}",
    quarterOfYear: "Q{n} {year}",
  },
  grouping: {
    label: "Group by",
    none: "Not grouped.",
    add: "add a level",
    remove: "remove this level",
    up: "one level out",
    down: "one level in",
    clear: "stop grouping",
    grain: "how finely",
  },
  editable: {
    add: "Add a line",
    addRow: "Add a row",
    empty: "No lines yet.",
    remove: "Remove the line",
  },
  picker: {
    placeholder: "pick one…",
    empty: "Nothing matches.",
    search: "filter…",
    loading: "loading…",
    more: "{count} more",
    refine: "— narrow the filter",
    open: "Open",
    browseAll: "see all…",
    loadingMore: "loading more…",
  },
  cell: {
    missing: "missing",
    empty: "(empty)",
    emptyBin: "(empty)",
  },
  time: {
    justNow: "just now",
    invalid: "invalid date",
    noDate: "no date",
  },
  drill: {
    back: "Back to {name}",
    trail: "Opened from",
  },
  dialog: {
    expand: "Expand to a panel",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    finish: "Finish",
    busy: "Working…",
  },
  report: {
    open: "Open {name}",
    close: "Close {name}",
    concept: "Item",
  },
  builder: {
    filter: "Filter",
    order: "Order",
    groupBy: "Group by",
    totals: "Totals per pile",
    filterPiles: "Filter the piles",
    pileOrder: "Pile order",
    pilePage: "Pile page",
    fields: "Fields",
    noOrder: "No order of its own: the model's.",
    noGrouping: "Not grouped: the whole list.",
    noTotals: "No totals: just how many rows there are.",
    noPileOrder: "No order of its own: by each level's field, ascending.",
    allFields: "All of the model's.",
    someFields: "{shown} of {total} — the identity always travels.",
    addOrder: "order by…",
    addGroup: "group by…",
    addPileOrder: "Order the piles by another field",
    ascending: "ascending",
    descending: "descending",
    flip: "tap to flip",
    changeGrain: "tap to change the cut",
    dropOrder: "remove this sort",
    dropTotal: "remove this total",
    dropRule: "remove this rule",
    dropGroup: "remove this group",
    addRule: "add a rule after this one",
    addNested: "add a nested group after this one",
    pilesNote:
      "Over what they folded — the totals above, and «count» — not over the rows: that is the filter above.",
    pilePageNote:
      "Only the first level: once a page is asked for, the deeper levels answer only for the piles that survived.",
    limitPiles: "Limit how many piles come back",
    noValue: "no value",
    from: "from…",
    to: "to…",
    value: "value…",
    json: "The criteria, as JSON",
    jsonFilter: "The filter, as JSON",
    invalidJson: "this is not valid JSON",
    editor: "Code editor",
    format: "Format",
    notCriteria: "a criteria is an object with where, order, grouping or specification",
    notFilter: "this is not a filter: it needs a condition or an all/any/negate",
    apply: "Apply",
    add: "Add",
    cancel: "Cancel",
    totalAs: "as «{name}»",
    addTotal: "Add a total",
    dropOrderBy: "remove the order by {field}",
    dropLevel: "remove the level {field}",
  },
  pivot: {
    total: "Total",
    rows: "rows",
    open: "Open {row} × {column}",
  },
  person: {
    unassigned: "unassigned",
    contact: "Contact",
    email: "Write an email",
    call: "Call",
    whatsapp: "WhatsApp",
    open: "Open profile",
  },
  lines: {
    add: "Add a line",
    search: "Search the lines…",
    edit: "Edit line",
    remove: "Remove line",
    empty: "No lines yet.",
    done: "Done",
    addSection: "Add a section",
    addNote: "Add a note",
    section: "Section",
    note: "Note",
  },
  lineItems: {
    one: "{count} line",
    many: "{count} lines",
    shown: "{shown} of {count} lines",
    newLine: "New line",
    noMatch: "No line matches «{query}».",
    removed: "Removed «{name}».",
    undo: "Undo",
    table: "Lines",
  },
  relation: {
    open: "Open",
    none: "Not set",
  },
  relationCard: {
    summary: "Summary of {name}",
  },
  totals: {
    less: "less",
    details: "Details: {label}",
    open: "Open",
    unlink: "Unlink",
    credits: "Outstanding credits",
    apply: "Apply",
    applyCredit: "Apply {label}",
  },
  inlineEdit: {
    addTag: "Add…",
    createTag: "Create «{name}»",
    editCell: "Edit {column}",
  },
  theme: {
    label: "Theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },
  tree: {
    empty: "Nothing here yet.",
  },
  assist: {
    assistant: "Assistant",
    suggests: "suggests",
    suggestion: "Assistant's suggestion",
    source: "Source",
    accept: "Accept",
    dismiss: "Dismiss the suggestion",
    accepted: "Applied the assistant's suggestion.",
    acceptedIn: "Applied the assistant's suggestion to «{field}».",
    undo: "Undo",
    working: "The assistant is working…",
    cancel: "Cancel",
    madeBy: "Set by the assistant",
    acceptedBy: "Accepted by {name}",
    review: "Proposed changes",
    applyOne: "Apply 1 change",
    applyMany: "Apply {count} changes",
    discard: "Discard",
    all: "All the changes",
    chosen: "{count} of {total} chosen",
    noneChosen: "Choose at least one change.",
    appliedOne: "Applied 1 change from the assistant.",
    appliedMany: "Applied {count} changes from the assistant.",
    added: "new",
    removed: "removed",
    changed: "changes",
    from: "from",
    to: "to",
    empty: "empty",
  },
};

let activeCopy = ENGLISH_COPY;

/** The merged catalog the formatters read when they are not a component. */
export function currentCopy(): UiCopy {
  return activeCopy;
}

/** BCP-47 the formatters read when they are not a component. */
export function currentCopyLocale(): string {
  return activeCopy.locale;
}

function rememberCopy(copy: UiCopy) {
  activeCopy = copy;
}

/**
 * La copia del árbol, cuando alguien la puso.
 *
 * Arranca en `null` y NO en el inglés de fábrica: un contexto se queda con el
 * valor que tenía cuando se creó, así que con el inglés adentro un componente
 * sin provider ignoraba `installCopy` y seguía diciendo «grouped by» aunque la
 * aplicación entera estuviera en castellano. Dos verdades sobre la misma cosa.
 *
 * Con `null`, sin provider se lee la instalada, que es la única.
 */
const CopyContext = createContext<UiCopy | null>(null);

export type UiCopyOverride = {
  locale?: string;
  present?: Partial<UiCopy["present"]>;
  frame?: Partial<UiCopy["frame"]>;
  selection?: Partial<UiCopy["selection"]>;
  pager?: Partial<UiCopy["pager"]>;
  record?: Partial<UiCopy["record"]>;
  shell?: Partial<UiCopy["shell"]>;
  field?: Partial<UiCopy["field"]>;
  choice?: Partial<UiCopy["choice"]>;
  search?: Partial<UiCopy["search"]>;
  failed?: Partial<UiCopy["failed"]>;
  table?: Partial<UiCopy["table"]>;
  menu?: Partial<UiCopy["menu"]>;
  list?: Partial<UiCopy["list"]>;
  grouping?: Partial<UiCopy["grouping"]>;
  dates?: Partial<UiCopy["dates"]>;
  calendar?: Partial<UiCopy["calendar"]>;
  ops?: Record<string, string>;
  sorting?: Partial<UiCopy["sorting"]>;
  copyable?: Partial<UiCopy["copyable"]>;
  activity?: Partial<UiCopy["activity"]>;
  editable?: Partial<UiCopy["editable"]>;
  picker?: Partial<UiCopy["picker"]>;
  cell?: Partial<UiCopy["cell"]>;
  time?: Partial<UiCopy["time"]>;
  drill?: Partial<UiCopy["drill"]>;
  dialog?: Partial<UiCopy["dialog"]>;
  report?: Partial<UiCopy["report"]>;
  builder?: Partial<UiCopy["builder"]>;
  pivot?: Partial<UiCopy["pivot"]>;
  person?: Partial<UiCopy["person"]>;
  lines?: Partial<UiCopy["lines"]>;
  lineItems?: Partial<UiCopy["lineItems"]>;
  relation?: Partial<UiCopy["relation"]>;
  relationCard?: Partial<UiCopy["relationCard"]>;
  totals?: Partial<UiCopy["totals"]>;
  inlineEdit?: Partial<UiCopy["inlineEdit"]>;
  theme?: Partial<UiCopy["theme"]>;
  tree?: Partial<UiCopy["tree"]>;
  assist?: Partial<UiCopy["assist"]>;
};

export function mergeCopy(over?: UiCopyOverride): UiCopy {
  if (over === undefined) return ENGLISH_COPY;
  return {
    locale: over.locale ?? ENGLISH_COPY.locale,
    present: { ...ENGLISH_COPY.present, ...over.present },
    frame: { ...ENGLISH_COPY.frame, ...over.frame },
    selection: { ...ENGLISH_COPY.selection, ...over.selection },
    pager: { ...ENGLISH_COPY.pager, ...over.pager },
    record: { ...ENGLISH_COPY.record, ...over.record },
    shell: { ...ENGLISH_COPY.shell, ...over.shell },
    field: { ...ENGLISH_COPY.field, ...over.field },
    choice: { ...ENGLISH_COPY.choice, ...over.choice },
    search: { ...ENGLISH_COPY.search, ...over.search },
    failed: { ...ENGLISH_COPY.failed, ...over.failed },
    table: { ...ENGLISH_COPY.table, ...over.table },
    menu: { ...ENGLISH_COPY.menu, ...over.menu },
    list: { ...ENGLISH_COPY.list, ...over.list },
    grouping: { ...ENGLISH_COPY.grouping, ...over.grouping },
    dates: { ...ENGLISH_COPY.dates, ...over.dates },
    calendar: { ...ENGLISH_COPY.calendar, ...over.calendar },
    ops: { ...ENGLISH_COPY.ops, ...over.ops },
    sorting: { ...ENGLISH_COPY.sorting, ...over.sorting },
    copyable: { ...ENGLISH_COPY.copyable, ...over.copyable },
    activity: { ...ENGLISH_COPY.activity, ...over.activity },
    editable: { ...ENGLISH_COPY.editable, ...over.editable },
    picker: { ...ENGLISH_COPY.picker, ...over.picker },
    cell: { ...ENGLISH_COPY.cell, ...over.cell },
    time: { ...ENGLISH_COPY.time, ...over.time },
    drill: { ...ENGLISH_COPY.drill, ...over.drill },
    dialog: { ...ENGLISH_COPY.dialog, ...over.dialog },
    report: { ...ENGLISH_COPY.report, ...over.report },
    builder: { ...ENGLISH_COPY.builder, ...over.builder },
    pivot: { ...ENGLISH_COPY.pivot, ...over.pivot },
    person: { ...ENGLISH_COPY.person, ...over.person },
    lines: { ...ENGLISH_COPY.lines, ...over.lines },
    lineItems: { ...ENGLISH_COPY.lineItems, ...over.lineItems },
    relation: { ...ENGLISH_COPY.relation, ...over.relation },
    relationCard: { ...ENGLISH_COPY.relationCard, ...over.relationCard },
    totals: { ...ENGLISH_COPY.totals, ...over.totals },
    inlineEdit: { ...ENGLISH_COPY.inlineEdit, ...over.inlineEdit },
    theme: { ...ENGLISH_COPY.theme, ...over.theme },
    tree: { ...ENGLISH_COPY.tree, ...over.tree },
    assist: { ...ENGLISH_COPY.assist, ...over.assist },
  };
}

/** For tests and non-React callers that need a locale before a provider mounts. */
export function installCopy(over?: UiCopyOverride): UiCopy {
  const merged = mergeCopy(over);
  rememberCopy(merged);
  return merged;
}

export function UiCopyProvider({
  copy,
  children,
}: {
  copy?: UiCopyOverride;
  children: ReactNode;
}) {
  const merged = mergeCopy(copy);
  rememberCopy(merged);
  return <CopyContext.Provider value={merged}>{children}</CopyContext.Provider>;
}

export function useUiCopy(): UiCopy {
  return useContext(CopyContext) ?? currentCopy();
}

/** `{name}` → value. A missing key stays visible in the template. */
export function fillCopy(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}
