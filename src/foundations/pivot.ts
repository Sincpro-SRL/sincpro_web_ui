import {
  type GroupLevel,
  pathKey,
  pathLabels,
  pileLabel,
  type PileLabelOf,
  type PileOf,
} from "@sincpro/web-ui/foundations/grouping";

/**
 * EL PIVOTE: montones cruzados por montones.
 *
 * Agrupar parte un conjunto por lo que sus filas comparten. Pivotear lo parte
 * DOS VECES a la vez, por ejes distintos, y lee el número donde los dos cortes
 * se encuentran: el cliente hacia abajo, el mes hacia la derecha, y en el
 * cruce cuántas filas hay y cuánto suman.
 *
 * ── Tres reglas, y ninguna es cosmética ─────────────────────────────
 *
 *  1. **La grilla se dibuja desde los EJES, no desde los cruces.** `rows.keys` y
 *     `columns.keys` traen cada clave que apareció, en orden; los cruces se
 *     PREGUNTAN de a uno. Un pivote es mayormente agujeros —doce clientes
 *     por veinticuatro meses son 288 celdas y cuarenta con filas— y deducir la
 *     grilla recorriendo los cruces deja afuera el mes en que no pasó nada, que
 *     es justo la columna que alguien está buscando.
 *
 *  2. **Los márgenes vienen plegados de la BASE.** Un promedio de promedios no
 *     es un promedio y una mediana de medianas no es nada, así que `rowTotal`,
 *     `columnTotal` y `total` se reciben: esta capa nunca los inventa sumando la
 *     fila que acaba de dibujar. Sin ellos no hay banda de totales, que es la
 *     respuesta honesta cuando nadie los calculó.
 *
 *  3. **Un agujero no es un cero.** `undefined` es «ahí no hay ninguna fila» y
 *     `0` es «hay filas y suman cero». La grilla los dibuja distinto porque
 *     significan cosas distintas.
 *
 * ── Qué se PIDE y qué se DIBUJA ─────────────────────────────────────
 *
 * Igual que con los montones: `PivotSpec` es lo que alguien pidió —por qué
 * campos partir cada eje, qué medidas plegar— y `Pivot` es lo que se dibuja, ya
 * plegado. Están separados porque plegar no siempre lo hace esta máquina: un
 * libro de ventas de ciento ochenta y siete del que se bajaron doce lo pliega quien lo
 * guarda, y `pivotFrom` es un helper para cuando el conjunto entero está en el
 * navegador, no el único camino.
 *
 * **Esto no conoce ningún motor.** Ni criteria, ni cursores, ni transporte: un
 * eje acá es una lista de rutas legibles y un cruce es un conteo con números al
 * lado. Quien traduzca la respuesta de un servidor a esta forma vive afuera, y
 * por eso la misma grilla sirve para un pivote armado en el navegador y para uno
 * plegado a mil kilómetros.
 */

/**
 * La clave de una fila o de una columna: la RUTA por los niveles de su eje, ya
 * legible.
 *
 * Es una ruta y no un valor por la misma razón que la de un montón: con dos
 * niveles puestos, «2026-09» puede ser un mes adentro de «Ferretería Sur» y otro
 * adentro de «Distribuidora Andina», y son dos filas distintas de la grilla.
 */
export type PivotKey = readonly string[];

/**
 * UN NIVEL de un eje: por qué se partió, y cómo se lee.
 *
 * Lleva el nivel ENTERO y no sólo su rótulo porque el rótulo de un nivel no
 * alcanza para leer sus claves: con «registrado» a la vista, «2026-09» sigue
 * siendo «2026-09». El grano es lo que deja decir «Septiembre», y el campo es lo
 * que deja saber que el mes cuelga del año de más arriba y entonces no hace
 * falta repetirlo.
 */
export type PivotLevel = GroupLevel & {
  /** Cómo se llama este corte: es lo que dice la esquina de la grilla. Sin él,
   *  una columna no aclara si es cuándo se registró o cuándo se corrió. */
  label: string;
};

/** Un EJE del pivote: qué se preguntó, y qué claves aparecieron. */
export type PivotAxis = {
  /** Los niveles, de afuera hacia adentro. */
  levels: readonly PivotLevel[];
  /** Cada clave que apareció, en orden. **La grilla se dibuja desde acá.** */
  keys: readonly PivotKey[];
};

/**
 * CÓMO SE LEE UNA CLAVE del eje, tramo por tramo.
 *
 * La clave identifica —«2026-09» es lo que el motor escribe y lo que se compara
 * con lo que contó el servidor— y el rótulo se lee. Son dos textos, igual que en
 * un montón, y por la misma razón: con el rótulo por identidad, dos septiembres
 * de años distintos serían el mismo.
 *
 * `within` sale de los niveles de ARRIBA del mismo campo: con el año afuera, el
 * mes se dice «Septiembre» y no «Septiembre de 2026», porque eso ya está escrito
 * dos columnas antes.
 */
export function axisLabels(
  axis: PivotAxis,
  key: PivotKey,
  label: PileLabelOf = pileLabel,
): readonly string[] {
  return pathLabels(axis.levels, key, label);
}

/** Una MEDIDA: uno de los números que se pliegan en cada cruce. */
export type PivotMeasure = {
  id: string;
  header: string;
  /** Para un porcentaje o una variación, que no se leen como un importe. */
  format?: (value: number) => string;
  /**
   * Cómo se lee la medida en una PLANILLA: el código de formato de Excel,
   * `#,##0.00`, `0.0%`, `#,##0 "Bs."`.
   *
   * Va aparte de `format` porque son dos cosas distintas: `format` es una
   * función de JavaScript, y un archivo no se puede llevar una función adentro.
   * Sin esto el número sale con el formato general — sigue siendo un número y se
   * sigue pudiendo sumar, que es lo que no se puede perder.
   */
  numberFormat?: string;
};

/**
 * Un CRUCE ya plegado: cuántas filas hay debajo y qué dan las medidas.
 *
 * `count` va aparte de las medidas y no como una más: es la única que siempre se
 * puede contestar, y es la que dice si una celda vacía está vacía porque no hay
 * filas o porque las que hay no tienen ese número.
 */
export type PivotCell = {
  count: number;
  /** Un número por medida, por id. `null` es «esta medida no se contesta acá» y
   *  es distinto de `0`. */
  values: Readonly<Record<string, number | null>>;
};

/** EL PIVOTE, listo para dibujar. */
export type Pivot = {
  rows: PivotAxis;
  columns: PivotAxis;
  measures: readonly PivotMeasure[];
  /** El cruce donde una fila encuentra a una columna, o `undefined` cuando no
   *  hay ninguna fila ahí. Se pregunta y no se recorre: ver la regla 1. */
  cell: (row: PivotKey, column: PivotKey) => PivotCell | undefined;
  /** La fila entera, plegada de la base. Ausente = no hay banda de totales a la
   *  derecha, porque nadie los calculó y acá no se suman celdas. */
  rowTotal?: (row: PivotKey) => PivotCell | undefined;
  /** La columna entera, plegada de la base. */
  columnTotal?: (column: PivotKey) => PivotCell | undefined;
  /** Todo lo que entró, plegado una vez. */
  total?: PivotCell;
};

/* ---------------------------------------------------------------- *
 *  DESDE AFUERA: el pivote que plegó quien guarda los datos
 * ---------------------------------------------------------------- */

/** Un cruce, con sus dos claves. Es la forma en que viaja una grilla dispersa:
 *  sólo los cruces que tienen filas. */
export type PivotCrossing = PivotCell & {
  row: PivotKey;
  column: PivotKey;
};

/** Un margen: la clave de su eje y lo que da esa fila —o esa columna— entera. */
export type PivotMargin = PivotCell & { key: PivotKey };

export type PivotSource = {
  rows: PivotAxis;
  columns: PivotAxis;
  measures: readonly PivotMeasure[];
  /** Sólo los cruces con filas. Los que faltan son agujeros. */
  crossings: readonly PivotCrossing[];
  /** Uno por clave de fila. Sin esto no hay columna de totales. */
  rowMargins?: readonly PivotMargin[];
  /** Uno por clave de columna. Sin esto no hay fila de totales. */
  columnMargins?: readonly PivotMargin[];
  total?: PivotCell;
};

/**
 * El separador entre las dos rutas de un cruce.
 *
 * Es un carácter distinto del que separa los tramos de una ruta —ése es el NUL
 * de `pathKey`— porque si fuera el mismo, una fila `["a"]` cruzada con una
 * columna `["b","c"]` y una fila `["a","b"]` cruzada con `["c"]` producirían la
 * misma clave, y serían dos celdas distintas de la grilla apuntando al mismo
 * número.
 */
const CROSS = "";

function crossKey(row: PivotKey, column: PivotKey): string {
  return `${pathKey(row)}${CROSS}${pathKey(column)}`;
}

/** Sólo lo que es una celda, sin las claves con las que viajó. */
function cellOf(one: PivotCell): PivotCell {
  return { count: one.count, values: one.values };
}

/**
 * Indexa un pivote que ya viene plegado.
 *
 * Los cruces viajan como lista —es lo que sabe serializar cualquier transporte—
 * y se dibujan preguntando de a uno, así que en el medio hace falta un índice.
 * Se arma una vez acá y no en cada celda de cada render: una grilla de 288
 * celdas buscando en una lista de 40 son 11.520 comparaciones por pintada.
 */
export function pivotOf(source: PivotSource): Pivot {
  const crossings = new Map<string, PivotCell>();
  for (const one of source.crossings)
    crossings.set(crossKey(one.row, one.column), cellOf(one));

  const rowMargins = new Map<string, PivotCell>();
  for (const one of source.rowMargins ?? []) rowMargins.set(pathKey(one.key), cellOf(one));

  const columnMargins = new Map<string, PivotCell>();
  for (const one of source.columnMargins ?? [])
    columnMargins.set(pathKey(one.key), cellOf(one));

  return {
    rows: source.rows,
    columns: source.columns,
    measures: source.measures,
    cell: (row, column) => crossings.get(crossKey(row, column)),
    /* Los márgenes se ofrecen sólo si vinieron. La alternativa —contestar
       siempre y devolver `undefined` adentro— haría que la grilla dibujara una
       banda de totales entera llena de agujeros. */
    ...(source.rowMargins === undefined
      ? {}
      : { rowTotal: (row: PivotKey) => rowMargins.get(pathKey(row)) }),
    ...(source.columnMargins === undefined
      ? {}
      : { columnTotal: (column: PivotKey) => columnMargins.get(pathKey(column)) }),
    ...(source.total === undefined ? {} : { total: source.total }),
  };
}

/* ---------------------------------------------------------------- *
 *  ACÁ ADENTRO: el pivote armado con las filas en la mano
 * ---------------------------------------------------------------- */

/** Una medida y cómo se pliega. El pliegue recibe las filas de la BASE —las del
 *  cruce, las de la fila entera, las de todo—, que es lo que hace que el margen
 *  salga del mismo lugar que la celda y no de sumar celdas. */
export type PivotFold<T> = PivotMeasure & {
  fold: (items: readonly T[]) => number | null;
};

export type PivotSpec<T> = {
  /** Los niveles del eje vertical, de afuera hacia adentro. */
  rows: readonly GroupLevel[];
  /** Los niveles del eje horizontal. */
  columns: readonly GroupLevel[];
  /** A qué montón va cada fila, en cada nivel de cada eje, ya legible. Es el
   *  mismo contrato que agrupa una lista: recortar una fecha a su grano es de
   *  quien conoce el dato. */
  of: PileOf<T>;
  measures: readonly PivotFold<T>[];
  /** Cómo se llama cada nivel. Sin esto se muestra el nombre del campo. */
  labelOf?: (level: GroupLevel) => string;
};

/** Las filas de un eje, agrupadas por su clave, en orden de primera aparición.
 *  El orden de las filas ya lo decidió alguien —una columna, un criterio, el
 *  motor— y reordenar los ejes acá lo contradiría. */
function axisBuckets<T>(
  items: readonly T[],
  levels: readonly GroupLevel[],
  of: PileOf<T>,
): Map<string, { key: PivotKey; items: T[] }> {
  const out = new Map<string, { key: PivotKey; items: T[] }>();
  for (const item of items) {
    const key = levels.map((level) => of(item, level));
    const id = pathKey(key);
    const bucket = out.get(id);
    if (bucket === undefined) out.set(id, { key, items: [item] });
    else bucket.items.push(item);
  }
  return out;
}

function fold<T>(measures: readonly PivotFold<T>[], items: readonly T[]): PivotCell {
  const values: Record<string, number | null> = {};
  for (const measure of measures) values[measure.id] = measure.fold(items);
  return { count: items.length, values };
}

/**
 * Arma el pivote con las filas que hay EN LA MANO.
 *
 * Sirve cuando el conjunto entero está en el navegador. Cuando no lo está, el
 * pivote lo pliega quien guarda los datos y esto no se usa: la grilla recibe un
 * `Pivot` de `pivotOf` y dibuja igual, porque dibuja el mismo tipo.
 *
 * **Los márgenes se pliegan sobre las filas de la base y no sobre los cruces**,
 * que es la regla 2 escrita en código: el margen de «Ferretería Sur» pliega sus 187
 * facturas de una, no los doce números mensuales que ya se dibujaron. Es
 * lo único que hace que una medida que no sea una suma —un promedio, una
 * mediana, un distintos— diga la verdad en el borde.
 */
export function pivotFrom<T>(items: readonly T[], spec: PivotSpec<T>): Pivot {
  const label = (level: GroupLevel) => spec.labelOf?.(level) ?? level.field;

  const rowBuckets = axisBuckets(items, spec.rows, spec.of);
  const columnBuckets = axisBuckets(items, spec.columns, spec.of);

  const crossings = new Map<string, PivotCell>();
  for (const row of rowBuckets.values()) {
    const inside = axisBuckets(row.items, spec.columns, spec.of);
    for (const [columnId, column] of inside) {
      crossings.set(
        `${pathKey(row.key)}${CROSS}${columnId}`,
        fold(spec.measures, column.items),
      );
    }
  }

  const rowMargins = new Map<string, PivotCell>();
  for (const [id, row] of rowBuckets) rowMargins.set(id, fold(spec.measures, row.items));

  const columnMargins = new Map<string, PivotCell>();
  for (const [id, column] of columnBuckets) {
    columnMargins.set(id, fold(spec.measures, column.items));
  }

  return {
    rows: {
      levels: spec.rows.map((one) => ({ ...one, label: label(one) })),
      keys: [...rowBuckets.values()].map((one) => one.key),
    },
    columns: {
      levels: spec.columns.map((one) => ({ ...one, label: label(one) })),
      keys: [...columnBuckets.values()].map((one) => one.key),
    },
    measures: spec.measures.map((one) => ({
      id: one.id,
      header: one.header,
      ...(one.format === undefined ? {} : { format: one.format }),
      ...(one.numberFormat === undefined ? {} : { numberFormat: one.numberFormat }),
    })),
    cell: (row, column) => crossings.get(crossKey(row, column)),
    rowTotal: (row) => rowMargins.get(pathKey(row)),
    columnTotal: (column) => columnMargins.get(pathKey(column)),
    total: fold(spec.measures, items),
  };
}

/** Si el pivote no tiene ni una fila que cruzar. Un eje vacío no es un pivote
 *  chico: es la vista vacía, y se dice con la frase del conjunto y no con una
 *  grilla de un renglón. */
export function pivotIsEmpty(pivot: Pivot): boolean {
  return pivot.rows.keys.length === 0 || pivot.columns.keys.length === 0;
}

/**
 * Los tramos de una clave que hay que ESCRIBIR, comparada con la anterior.
 *
 * En el área de filas de un pivote, el valor de un nivel se escribe sólo cuando
 * cambia: repetir «Ferretería Sur» en las doce filas de sus doce meses convierte la
 * jerarquía en una columna de ruido y hace desaparecer justamente el corte que
 * se pidió. Devuelve, por nivel, si ese tramo arranca acá.
 */
export function keyStarts(key: PivotKey, previous: PivotKey | undefined): readonly boolean[] {
  let broken = previous === undefined;
  return key.map((part, level) => {
    if (broken) return true;
    /* Una vez que un nivel de arriba cambió, todos los de abajo arrancan de
       nuevo aunque digan lo mismo: el «2026-09» de «Distribuidora Andina» no es la
       continuación del «2026-09» de «Ferretería Sur». */
    if (part !== previous?.[level]) {
      broken = true;
      return true;
    }
    return false;
  });
}

/**
 * Cuánto abarca cada tramo del eje horizontal, nivel por nivel.
 *
 * El encabezado de un pivote es una jerarquía acostada: un renglón por nivel, y
 * cada rótulo cubriendo las columnas que cuelgan de él. Esto lo resuelve una vez
 * —de a tramos consecutivos iguales, que es lo que hace que «2026» cubra sus
 * cuatro trimestres— y la grilla sólo lo dibuja.
 */
export function axisSpans(
  axis: PivotAxis,
  level: number,
): readonly { label: string; span: number; at: number }[] {
  const keys = axis.keys;
  const out: { label: string; span: number; at: number }[] = [];
  keys.forEach((key, at) => {
    const label = axisLabels(axis, key)[level] ?? "";
    const last = out[out.length - 1];
    /* Se compara el PREFIJO entero y no el rótulo: dos «2026-09» debajo de dos
       clientes distintos son dos tramos, y fundirlos en uno dibujaría una
       celda que abarca columnas que no son hermanas. */
    const samePrefix =
      last !== undefined &&
      last.label === label &&
      key.slice(0, level).join(CROSS) === (keys[at - 1]?.slice(0, level).join(CROSS) ?? null);
    if (samePrefix) last.span += 1;
    else out.push({ label, span: 1, at });
  });
  return out;
}
