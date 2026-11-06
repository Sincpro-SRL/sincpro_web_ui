"use client";

import { type CopyOverride, createCopy, fillCopy } from "@sincpro/web-ui/foundations/catalog";
import type { ReactNode } from "react";

/**
 * Chrome copy for the design system.
 *
 * The handbook rule: code is English; language is chosen at render. This
 * package must not bake product Spanish into buttons. English is the default
 * so a story still reads; the app installs the session's language once
 * (`installCopy(SPANISH_COPY)`), and `UiCopyProvider` changes a branch.
 *
 * Domain sentences (empty catalog, upload hint) stay out — those are the
 * product's catalogs, passed as props.
 *
 * The installed words are also what is not a component reads (`currentCopy`,
 * `currentCopyLocale`): a sentence built in a function, a month named by the
 * calendar. A provider does not change those — it is for a branch, not for the
 * session (see `catalog.tsx`).
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
    calendar: string;
    gantt: string;
    timeline: string;
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
    /** «Elegir los 187 que coinciden»: the whole result, not the page. */
    allMatching: string;
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
    /** The same mark when the record says how many fields changed. */
    unsavedOne: string;
    unsavedMany: string;
    save: string;
    saving: string;
    /** Said, briefly, once what was saved is saved. */
    saved: string;
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
    /** The labels of the paper's last line (`Record.Audit`): the person and the moment are
     *  drawn beside them as values, so they are names, not sentences with holes. */
    created: string;
    updated: string;
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
    /** Next to the label of a field whose value changed and is not saved yet. */
    changed: string;
    /** The eye button of a password: show it… */
    showSecret: string;
    /** …and hide it again. */
    hideSecret: string;
    /** Under a password while Caps Lock is on: the most common reason a right password fails. */
    capsLock: string;
    /** What a stored password says in read mode, for a screen reader: there is one, not which. */
    secretSet: string;
    /** Said after a link that leaves for another tab — a website, WhatsApp. */
    newTab: string;
    /** The unit after a duration: «8:30 h». */
    hours: string;
    /** The name of the unit (or currency) chooser inside a number field. */
    unit: string;
    /** The row of colours a colour field offers. */
    palette: string;
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
    /** The name of the list of what the bar offers for what was typed. */
    suggestions: string;
    /** The name of the panel button once something is set: it shows the count, and what
     *  the button SHOWS has to be inside its name (WCAG 2.5.3) — `{label}` is `tools`. */
    toolsSetOne: string;
    toolsSetMany: string;
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
    /** The «+N» chip that unfolds the facets the bar folded away. */
    moreFacets: string;
    /** Folds them back. */
    fewerFacets: string;
    /** The × of the grouping chain: drops every level at once. */
    removeGrouping: string;
    /** The × at the end of the bar: drops every filter and level. */
    clearAll: string;
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
    /** The set's own search over what was typed — every field it searches, at once — as it
     *  is offered («Buscar») and as the chip reads once put («Buscar «Globex»»). */
    literal: string;
    literalChip: string;
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
    /** Under a pile that holds its first page and counts them all: ask for the rest. */
    pileMore: string;
    /** The same, when whoever pages says how many one press brings: «Show 50 more of 49,950». */
    pileMoreOf: string;
    /** Under a short pile with no next page: what it shows of what it counts. */
    pileShown: string;
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
    /** A row's two ways in, named on their buttons: a look without leaving the list, and the
     *  record itself. */
    peek: string;
    open: string;
    /** Asked again while the rows stay: the name of the discreet bar over them. */
    refreshing: string;
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
    /** On an error: copies the whole report (what it said, the detail, when, where). */
    report: string;
  };
  /** The rich-text editor: its toolbar, its link form, its list of people to mention. */
  richText: {
    toolbar: string;
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    heading: string;
    subheading: string;
    bulletList: string;
    orderedList: string;
    quote: string;
    link: string;
    linkUrl: string;
    applyLink: string;
    removeLink: string;
    /** Said when the address is not a website, an email or a phone: what to write instead. */
    badLink: string;
    table: string;
    undo: string;
    redo: string;
    clear: string;
    /** The list that opens on «@»: people to mention. */
    mentions: string;
    noMatches: string;
  };
  /** Ordenar, cuando la presentación no tiene encabezados donde hacer clic. */
  sorting: {
    label: string;
    by: string;
    asc: string;
    desc: string;
    clear: string;
    /** On a sortable header: how to add it as a tie-breaker instead of replacing the order. */
    addHint: string;
    /** What a tie-breaker header says of itself: «sort 2, descending». */
    place: string;
    /** Adds one more criterion at the end of the order. */
    add: string;
    /** Where the criteria are listed when there are none: the rows go as they came. */
    none: string;
    /** The direction button of a criterion, named by its field. */
    flip: string;
    /** Takes one criterion out, named by its field. */
    remove: string;
    /** The handle a criterion is dragged by, named by its field. */
    move: string;
    /** The trigger with more than one criterion: «Fecha +2». */
    more: string;
    /** The second and later criteria: they only decide between rows the first leaves equal. */
    then: string;
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
    /** The calendar's «go to today» button: its word and its name are the same. */
    today: string;
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
    /** The grip that changes a row's place (`EditableTable onReorder`). */
    reorder: string;
    reorderHint: string;
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
    /** The option that creates a record from the typed text. `{name}` is that text. */
    create: string;
    /** The option that opens the full form of a new record, with the typed text as its name. */
    createAndEdit: string;
    /** Why an option whose name does not match is listed: the hidden code it matched. */
    matched: string;
    /** The quiet row at the end of a list that is fetching its next page. */
    loadingMore: string;
    /** Where a many2one's record opens (`OpenTarget`), on its buttons and its menu. */
    openIn: { modal: string; peek: string; page: string; side: string; window: string };
    openMore: string;
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
  /** A multi-step operation done in one sitting (`StepFlow`): where you are, what is left,
   *  and its own buttons. */
  stepFlow: {
    /** The accessible name of the strip of steps. */
    steps: string;
    /** Over the step's title: «Step 2 of 3». */
    position: string;
    /** Read by the live region on every move: `{position}` is the line above, `{title}`
     *  the step's. */
    announce: string;
    /** The state of a step on the strip, said to a screen reader — never only a colour. */
    done: string;
    pending: string;
    cancel: string;
    back: string;
    next: string;
    finish: string;
    /** Read by the live region while the operation runs. */
    working: string;
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
    /** The names of a rule's two choices — the field it asks about, and how it compares. */
    ruleField: string;
    ruleOperator: string;
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
    /** The pivot's own controls (`PivotExplorer`). */
    measures: string;
    rowsAxis: string;
    columnsAxis: string;
    addLevel: string;
    removeLevel: string;
    swap: string;
    download: string;
    fromSearch: string;
  };
  /** The chart of a set (`Chart`, `ChartExplorer`): Odoo's graph view. */
  chart: {
    /** The count of rows, offered as a measure. */
    count: string;
    /** The tail gathered into one bar or slice. */
    rest: string;
    empty: string;
    /** A pie cannot draw a negative part. */
    pieNegative: string;
    /** Series (or slices) left out because the measure does not add up. */
    hidden: string;
    kind: string;
    bar: string;
    line: string;
    pie: string;
    measure: string;
    categoriesAxis: string;
    seriesAxis: string;
    stacked: string;
    cumulative: string;
    ascending: string;
    descending: string;
    /** A legend entry is a toggle: it hides or shows its series. */
    hideSeries: string;
    showSeries: string;
    /** What a press on a bar, a point or a slice does. */
    open: string;
    /** The measures a frame offers for each numeric column. */
    sumOf: string;
    averageOf: string;
    /** The tooltip of a comparison: now against before, as a change. */
    change: string;
    /** The toggle that draws the previous period: «Comparar con {name}». */
    compareWith: string;
    /** The measure menu's label with more than one on: «importe +1». */
    moreMeasures: string;
    /** A metric's change, against a named period: «vs 2025». */
    against: string;
  };
  /** A person as a value: who is not there, and the ways to reach who is. */
  person: {
    unassigned: string;
    email: string;
    call: string;
    whatsapp: string;
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
  /** The stars of `Priority`. */
  priority: {
    label: string;
    level: string;
    none: string;
  };
  /** The board by stages (`BoardColumns`). */
  board: {
    emptyLane: string;
    moveHint: string;
    moved: string;
    quickCreate: string;
    quickPlaceholder: string;
    fold: string;
    unfold: string;
    addColumn: string;
    addColumnPlaceholder: string;
  };
  /** A timeline of records and its toolbar (`RecordTimeline`, `TimelineToolbar`). */
  timeline: {
    prev: string;
    next: string;
    today: string;
    goTo: string;
    zoom: string;
    zoomIn: string;
    zoomOut: string;
    fullscreen: string;
    exitFullscreen: string;
    scale: string;
    scales: { day: string; week: string; month: string; year: string };
    moveHint: string;
    moved: string;
    create: string;
  };
  /** Odoo's kanban state — the traffic light on a card (`KanbanState`). */
  kanbanState: {
    label: string;
    normal: string;
    done: string;
    blocked: string;
  };
  /** The planned activities of a record, on its card (`ActivityBadge`). */
  activityState: {
    none: string;
    overdue: string;
    today: string;
    planned: string;
  };
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
  /** The files of a record (`Attachments`): listing, adding, removing and their states. */
  attachments: {
    /** The accessible name of the list. */
    label: string;
    /** An empty list in read mode. */
    empty: string;
    /** The drop zone's sentence when there is no file yet… */
    emptyAdd: string;
    /** …and when there already are some. */
    add: string;
    download: string;
    remove: string;
    /** The notice after removing. `{name}` is the file. */
    removed: string;
    undo: string;
    /** The name of an upload's progress bar. `{name}` is the file. */
    uploading: string;
    cancelUpload: string;
    /** A failed upload, when the server did not say why. */
    failed: string;
    retry: string;
  };
  /** The field picker that walks relations: «Líneas > Impuestos > Monto». */
  fieldPath: {
    /** The trigger with nothing chosen. */
    choose: string;
    search: string;
    back: string;
    loading: string;
    failed: string;
    failedHint: string;
    empty: string;
    /** The first option inside a relation: choosing the relation itself. `{label}`. */
    self: string;
    /** Said after a relation's name: pressing it shows its fields. */
    opens: string;
    /** Add a column or a grouping level from a related field. */
    addColumn: string;
    addLevel: string;
    /** How many of the records reached through a to-many relation must match. */
    match: { label: string; any: string; none: string; all: string };
    /** A filter through a relation said in words. `{relation}` and `{inner}`. */
    say: { any: string; none: string; all: string; one: string };
  };
  /** The file preview a person opens from a file: the kind decides the renderer. */
  preview: {
    label: string;
    download: string;
    /** No renderer for this kind: said, with the download still there. */
    unsupported: string;
    loading: string;
    /** The renderer failed. The technical text goes in the error report. */
    failed: string;
    /** `{page}` and `{total}`. */
    page: string;
    previousPage: string;
    nextPage: string;
    fit: string;
    actualSize: string;
    /** `{size}` is the file size, already written for the locale. */
    kind: { image: string; pdf: string; text: string; markdown: string; other: string };
  };
  /** A conversation: the thread of messages and the composer under it. */
  chat: {
    thread: string;
    empty: string;
    loadOlder: string;
    loadingOlder: string;
    jumpLatest: string;
    today: string;
    yesterday: string;
    /** The composer's accessible name and its placeholder. */
    composer: string;
    placeholder: string;
    send: string;
    /** `{count}` is the number of unread messages. */
    unread: string;
    conversations: string;
    newMessages: string;
    /** A message that is written but not yet confirmed by the server. */
    sending: string;
  };
  /** A canvas of nodes and connections (a diagram, a flow). */
  canvas: {
    label: string;
    zoomIn: string;
    zoomOut: string;
    fit: string;
    readOnly: string;
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
  /** The media controls: an image chosen and cropped (`ImageInput`), a signature drawn or
   *  typed (`SignatureInput`). */
  media: {
    /** What the empty image zone says. */
    dropImage: string;
    chooseImage: string;
    changeImage: string;
    removeImage: string;
    /** A file that is not an image: what to choose instead. */
    notImage: string;
    /** The name of the crop area, and how it is moved from the keyboard. */
    crop: string;
    cropHelp: string;
    zoomIn: string;
    zoomOut: string;
    applyCrop: string;
    cancel: string;
    /** The name of the drawing pad, and what to do there. */
    signaturePad: string;
    signatureHelp: string;
    clear: string;
    /** The way in for whoever cannot draw: type the name, and it is written as the signature. */
    typeName: string;
    drawInstead: string;
    /** The label of the box the name is typed in. */
    typedName: string;
    /** The image of a signature, when the form does not say whose it is. */
    signature: string;
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
    calendar: "Calendar",
    gantt: "Gantt",
    timeline: "Planning",
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
    allMatching: "Select all {count} that match",
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
    unsavedOne: "1 change unsaved",
    unsavedMany: "{count} changes unsaved",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    discard: "Discard",
    failed: "failed",
    notices: "Notices about this record",
    noticeOne: "{count} notice",
    noticeMany: "{count} notices",
    blocking: "What is wrong with this record",
    created: "Created",
    updated: "Last changed",
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
    changed: "changed",
    showSecret: "Show password",
    hideSecret: "Hide password",
    capsLock: "Caps Lock is on",
    secretSet: "password set",
    newTab: "opens in a new tab",
    hours: "h",
    unit: "Unit",
    palette: "Palette",
  },
  choice: {
    noResults: "No results",
    search: "Search",
  },
  search: {
    tools: "Filter, group and favorites",
    suggestions: "Suggestions",
    toolsSetOne: "{label}, {count} applied",
    toolsSetMany: "{label}, {count} applied",
    editChip: "Click to edit",
    editNamed: "Edit {label}",
    removeChip: "Remove {label}: {value}",
    removeFilter: "Remove filter {label}",
    removeGroup: "Stop grouping by {label}",
    and: "and",
    or: "or",
    groupedBy: "grouped by",
    narrowedBy: "showing",
    moreFacets: "+{count}",
    fewerFacets: "show less",
    removeGrouping: "Stop grouping",
    clearAll: "Clear every filter and grouping",
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
    literal: "Search",
    literalChip: "Search “{text}”",
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
    pileMore: "Show {count} more",
    pileMoreOf: "Show {count} more of {left}",
    pileShown: "Showing {shown} of {count}",
  },
  menu: {
    empty: "Nothing matches.",
  },
  list: {
    empty: "There is nothing here yet.",
    emptyFiltered: "Nothing matches what is on.",
    countOne: "1 record",
    count: "{count} records",
    peek: "Quick look",
    open: "Open",
    refreshing: "Updating the list…",
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
    report: "Copy the error",
  },
  richText: {
    toolbar: "Text formatting",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    heading: "Heading",
    subheading: "Subheading",
    bulletList: "Bulleted list",
    orderedList: "Numbered list",
    quote: "Quote",
    link: "Link",
    linkUrl: "Link address",
    applyLink: "Apply",
    removeLink: "Remove link",
    badLink: "Write a website (example.com), an email or a phone number.",
    table: "Insert table",
    undo: "Undo",
    redo: "Redo",
    clear: "Clear formatting",
    mentions: "People",
    noMatches: "Nobody matches",
  },
  sorting: {
    label: "Sort",
    by: "sort by",
    asc: "ascending",
    desc: "descending",
    clear: "no order",
    addHint: "Shift+click to add as a tie-breaker",
    place: "sort {place}, {direction}",
    add: "Add a criterion",
    none: "No order: the rows go as they came.",
    flip: "Flip the order by {field}",
    remove: "Remove the order by {field}",
    move: "Move the order by {field}",
    more: "{label} +{count}",
    then: "then by",
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
    today: "Today",
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
    reorder: "Move the row",
    reorderHint: "Drag it, or Alt + ↑ / ↓",
  },
  picker: {
    placeholder: "pick one…",
    empty: "Nothing matches.",
    search: "filter…",
    loading: "loading…",
    more: "{count} more",
    refine: "— narrow the filter",
    open: "Open",
    browseAll: "Search more…",
    create: "Create «{name}»",
    createAndEdit: "Create and edit…",
    matched: "matches",
    loadingMore: "loading more…",
    openIn: {
      modal: "Open in a modal",
      peek: "Quick look",
      page: "Open as the page",
      side: "Open beside",
      window: "Open in a window",
    },
    openMore: "Open in…",
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
  dialog: {
    expand: "Expand to a panel",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    finish: "Finish",
    busy: "Working…",
  },
  stepFlow: {
    steps: "Steps",
    position: "Step {index} of {total}",
    announce: "{position}: {title}",
    done: "done",
    pending: "to do",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    finish: "Finish",
    working: "Working…",
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
    ruleField: "Field",
    ruleOperator: "Comparison",
    noValue: "no value",
    from: "from…",
    to: "to…",
    value: "value…",
    json: "The criteria, as JSON",
    jsonFilter: "The filter, as JSON",
    invalidJson: "this is not valid JSON",
    editor: "Code editor",
    format: "Format",
    notCriteria: "a criteria is an object with selection, order, grouping or specification",
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
    measures: "Measures",
    rowsAxis: "Rows",
    columnsAxis: "Columns",
    addLevel: "Add to {axis}",
    removeLevel: "Remove {level}",
    swap: "Swap rows and columns",
    download: "Download",
    fromSearch: "from the search's grouping",
  },
  chart: {
    count: "count",
    rest: "others ({count})",
    empty: "Nothing to chart.",
    pieNegative: "A pie cannot show negative values — try bars.",
    hidden:
      "{count} more not drawn: this measure does not add up, so they cannot be gathered into «others». The pivot shows them all.",
    kind: "Chart type",
    bar: "Bars",
    line: "Lines",
    pie: "Pie",
    measure: "Measure",
    categoriesAxis: "Axis",
    seriesAxis: "Series",
    stacked: "Stack",
    cumulative: "Cumulative",
    ascending: "Smallest first",
    descending: "Largest first",
    hideSeries: "Hide {name}",
    showSeries: "Show {name}",
    open: "Open {name}",
    sumOf: "sum of {name}",
    averageOf: "average of {name}",
    change: "change",
    compareWith: "Compare with {name}",
    moreMeasures: "{name} +{count}",
    against: "vs {name}",
  },
  person: {
    unassigned: "unassigned",
    email: "Write an email",
    call: "Call",
    whatsapp: "WhatsApp",
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
  priority: {
    label: "Priority",
    level: "{value} of {max}",
    none: "no priority",
  },
  board: {
    emptyLane: "Nothing in this stage.",
    moveHint: "Drag it, or Alt + ← / → to move it to another stage",
    moved: "{name} moved to {column}",
    quickCreate: "Quick create in {column}",
    quickPlaceholder: "Name… (Enter creates)",
    fold: "Fold {column}",
    unfold: "Unfold {column}",
    addColumn: "Add a stage",
    addColumnPlaceholder: "Stage name… (Enter adds)",
  },
  timeline: {
    prev: "Previous",
    next: "Next",
    today: "Today",
    goTo: "Go to a date",
    zoom: "Zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    scale: "Scale",
    scales: { day: "Day", week: "Week", month: "Month", year: "Year" },
    moveHint:
      "Drag it to move it, its right edge to stretch it; Alt + arrows from the keyboard",
    moved: "{name}: {range}",
    create: "Create in {row} · {at}",
  },
  kanbanState: {
    label: "State",
    normal: "In progress",
    done: "Ready for the next stage",
    blocked: "Blocked",
  },
  activityState: {
    none: "No activities",
    overdue: "Overdue",
    today: "Due today",
    planned: "Planned",
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
  attachments: {
    label: "Attachments",
    empty: "No files attached yet.",
    emptyAdd: "No files attached yet. Drop one here, or choose it.",
    add: "Drop another file here, or choose one.",
    download: "Download",
    remove: "Remove the file",
    removed: "Removed «{name}».",
    undo: "Undo",
    uploading: "Uploading {name}",
    cancelUpload: "Cancel the upload",
    failed: "The file could not be uploaded.",
    retry: "Try again",
  },
  fieldPath: {
    choose: "Choose a field",
    search: "Search a field",
    back: "Back",
    loading: "Loading the fields…",
    failed: "The fields could not be loaded.",
    failedHint: "Try again in a moment, or copy the error for whoever maintains the model.",
    empty: "No field matches.",
    self: "«{label}» itself",
    opens: "shows its fields",
    addColumn: "Add a column",
    addLevel: "Group by another field",
    match: { label: "How many of «{relation}»", any: "some", none: "none", all: "all" },
    say: {
      any: "some of {relation} with {inner}",
      none: "none of {relation} with {inner}",
      all: "all of {relation} with {inner}",
      one: "{relation} > {inner}",
    },
  },
  preview: {
    label: "Preview",
    download: "Download",
    unsupported: "There is no preview for this kind of file. You can still download it.",
    loading: "Loading the preview…",
    failed: "The file could not be shown.",
    page: "Page {page} of {total}",
    previousPage: "Previous page",
    nextPage: "Next page",
    fit: "Fit",
    actualSize: "Actual size",
    kind: { image: "Image", pdf: "PDF", text: "Text", markdown: "Document", other: "File" },
  },
  chat: {
    thread: "Conversation",
    empty: "No messages yet. Write the first one.",
    loadOlder: "Load earlier messages",
    loadingOlder: "Loading earlier messages…",
    jumpLatest: "Jump to the latest",
    today: "Today",
    yesterday: "Yesterday",
    composer: "Message",
    placeholder: "Write a message… Enter sends, Shift+Enter starts a new line",
    send: "Send",
    unread: "{count} unread",
    conversations: "Conversations",
    newMessages: "New messages",
    sending: "Sending…",
  },
  canvas: {
    label: "Canvas",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit to screen",
    readOnly: "Read only",
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
  media: {
    dropImage: "Drop an image here, paste it, or choose one.",
    chooseImage: "Choose image",
    changeImage: "Change image",
    removeImage: "Remove image",
    notImage: "That file is not an image. Choose a PNG, JPG or WebP.",
    crop: "Image crop",
    cropHelp: "Drag the image, or move it with the arrow keys; + and − zoom in and out.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    applyCrop: "Apply crop",
    cancel: "Cancel",
    signaturePad: "Signature pad",
    signatureHelp: "Sign with the mouse or a finger over the line.",
    clear: "Clear",
    typeName: "Type my name instead",
    drawInstead: "Draw the signature",
    typedName: "Name for the signature",
    signature: "Signature",
  },
};

/* The mechanism is `catalog.tsx`, the same one an application uses for its own words. */
const ui = createCopy(ENGLISH_COPY);

/** What changes of web-ui's words, at any depth: `{ search: { joins: { any: "o" } } }`. */
export type UiCopyOverride = CopyOverride<UiCopy>;

/** The installed words: for formatters and sentences that are not a component. */
export const currentCopy: () => UiCopy = ui.current;

/** BCP-47 the formatters read when they are not a component. */
export function currentCopyLocale(): string {
  return ui.current().locale;
}

/** English with `over` on top, without installing it. */
export const mergeCopy: (over?: UiCopyOverride) => UiCopy = ui.merge;

/** Sets the session's words: once, before the first draw — and the one global there is. */
export const installCopy: (over?: UiCopyOverride) => UiCopy = ui.install;

/** Changes the words for its branch, on top of what encloses it. It never writes the
 *  global: a corner in another language does not change the rest of the screen. */
export const UiCopyProvider: (props: {
  copy?: UiCopyOverride;
  children: ReactNode;
}) => ReactNode = ui.Provider;

export const useUiCopy: () => UiCopy = ui.useCopy;

export { fillCopy };
