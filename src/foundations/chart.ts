import { dateKeysBetween } from "@sincpro/web-ui/foundations/calendar";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/copy";
import { pathKey } from "@sincpro/web-ui/foundations/grouping";
import {
  axisLabels,
  type Pivot,
  type PivotAxis,
  type PivotCell,
  type PivotKey,
} from "@sincpro/web-ui/foundations/pivot";

/**
 * EL GRÁFICO: un pivote leído como marcas.
 *
 * Context: un gráfico de un ERP —el de Odoo, el de cualquiera— contesta la misma pregunta
 * que un pivote: el conjunto partido por un campo (el eje), a veces por otro más (las
 * series), y en cada cruce un número plegado. Por eso esto NO trae otra manera de plegar:
 * lee un `Pivot`. Y como un `Pivot` lo arma igual quien tiene los registros en la mano
 * (`pivotFrom`), quien lo plegó en el servidor (`pivotOf`) o quien lo armó desde las celdas
 * de un archivo, el mismo gráfico sirve para registros, para un dataset y para lo agrupado
 * a mil kilómetros. Un diccionario o un `SeriesBar[]` entran por sus dos helpers de abajo.
 *
 * ── Las filas del pivote son el EJE; sus columnas, las SERIES ───────
 *
 * Igual que en Odoo: el primer agrupado va abajo y el segundo se apila o se pone al lado.
 *
 * ── Tres reglas que vienen del pivote, y siguen valiendo ────────────
 *
 *  1. **Un agujero no es un cero.** `null` es «ahí no hay filas»: la barra no se dibuja y
 *     la línea se corta. Un cero es una barra a ras del eje.
 *  2. **No se inventan sumas.** Juntar la cola en «otros» o acumular una línea es sumar, y
 *     sólo se hace si la medida se suma (`additive`; el conteo siempre). Si no, la cola se
 *     deja afuera y se DICE (`hiddenSeries`): un promedio de promedios no es un promedio.
 *  3. **El color sigue a la serie, no a su puesto.** Las series que quedan conservan el
 *     orden del pivote; ordenar por tamaño ordena el EJE, nunca repinta.
 */

export type ChartKind = "bar" | "line" | "pie";

export type ChartOrder = "asc" | "desc";

/** El conteo de filas de cada cruce, ofrecido como una medida más: es la única que
 *  siempre se puede contestar. */
export const COUNT_MEASURE = "__count";

/** Cuántas series se distinguen por color. Es el largo de la paleta (`--color-series-*`):
 *  una novena serie sería un color generado, y bajo daltonismo ése se confunde con otro. */
export const SERIES_COLORS = 8;

/** Una clave de un eje del gráfico: su ruta en el pivote y cómo se lee. */
export type ChartPoint = {
  key: PivotKey;
  /** `pathKey(key)`: la identidad estable para React y para el color. */
  id: string;
  label: string;
  /** La cola juntada en una: «otros (12)». Se dibuja más callada y no se abre. */
  rest?: boolean;
  /** El período anterior de una comparación: se dibuja callado, detrás del actual. */
  previous?: boolean;
};

export type ChartMeasure = {
  id: string;
  header: string;
  format?: (value: number) => string;
  additive: boolean;
};

export type ChartData = {
  categories: readonly ChartPoint[];
  series: readonly ChartPoint[];
  /** `values[categoría][serie]`; `null` es un agujero. */
  values: readonly (readonly (number | null)[])[];
  /** Lo que da cada categoría entera, plegado de la base cuando el pivote lo trae. Es lo
   *  que mide una torta y lo que ordena el eje. */
  totals: readonly (number | null)[];
  measure: ChartMeasure;
  /** Cómo se llaman los cortes: «sucursal», «año · forma de pago». */
  categoryTitle: string;
  seriesTitle: string;
  /** Series que no entraron y no se pudieron juntar en «otros» (la medida no se suma). */
  hiddenSeries: number;
  /** Lo mismo, para las categorías que una torta no puede mostrar. */
  hiddenCategories: number;
  /** Las dos series son el período actual y el anterior (`chartCompare`). */
  compare?: boolean;
};

export type ChartReading = {
  /** El id de la medida, o `COUNT_MEASURE`. Por defecto la primera del pivote. */
  measure?: string;
  /** Ordena el EJE por lo que da cada categoría. Sin esto, el orden de sus claves. */
  order?: ChartOrder;
  /** Cada punto suma los anteriores: «cuánto llevamos». Sólo con una medida que se suma. */
  cumulative?: boolean;
  /** Más series que esto se juntan en «otros». Por defecto, los colores de la paleta. */
  maxSeries?: number;
  /** Más categorías que esto se juntan en «otros». Una torta pide seis. */
  maxCategories?: number;
  /**
   * Con un solo nivel de FECHA en el eje, completa los períodos en que no pasó nada:
   * agosto no queda pegado a octubre. El conteo de un período vacío es 0; cualquier otra
   * medida es un agujero (`null`), como cualquier cruce sin filas. Encendido por defecto.
   */
  fillDates?: boolean;
};

/** Las medidas que se pueden graficar de un pivote: el conteo y las suyas. */
export function chartMeasures(pivot: Pivot): ChartMeasure[] {
  return [
    { id: COUNT_MEASURE, header: currentCopy().chart.count, additive: true },
    ...pivot.measures.map((one) => ({
      id: one.id,
      header: one.header,
      ...(one.format === undefined ? {} : { format: one.format }),
      additive: one.additive === true,
    })),
  ];
}

function title(axis: PivotAxis): string {
  return axis.levels.map((level) => level.label).join(" · ");
}

function pointOf(axis: PivotAxis, key: PivotKey, fallback: string): ChartPoint {
  return {
    key,
    id: pathKey(key),
    label: axis.levels.length === 0 ? fallback : axisLabels(axis, key).join(" · "),
  };
}

function sum(values: readonly (number | null)[]): number | null {
  let out: number | null = null;
  for (const value of values) if (value !== null) out = (out ?? 0) + value;
  return out;
}

/** Biggest first; a hole goes last, because «nothing there» is not «less than zero». */
function byTotal(totals: readonly (number | null)[], order: ChartOrder) {
  return (a: number, b: number) => {
    const x = totals[a] ?? null;
    const y = totals[b] ?? null;
    if (x === null || y === null) return x === y ? a - b : x === null ? 1 : -1;
    return order === "asc" ? x - y || a - b : y - x || a - b;
  };
}

/**
 * Which indices stay, in their own order, when there are more than `max`: the biggest by
 * total. With an additive measure one place is left for «otros».
 */
function keep(
  totals: readonly (number | null)[],
  max: number,
  additive: boolean,
): { kept: number[]; rest: number[] } {
  const all = totals.map((_, at) => at);
  if (all.length <= max) return { kept: all, rest: [] };
  const room = additive ? Math.max(1, max - 1) : max;
  const top = new Set([...all].sort(byTotal(totals, "desc")).slice(0, room));
  return {
    kept: all.filter((at) => top.has(at)),
    rest: all.filter((at) => !top.has(at)),
  };
}

/**
 * El pivote como gráfico: las filas son el eje, las columnas las series, y en cada cruce
 * el número de la medida elegida.
 */
export function chartFromPivot(pivot: Pivot, reading: ChartReading = {}): ChartData {
  const words = currentCopy();
  const measures = chartMeasures(pivot);
  const wanted = reading.measure ?? pivot.measures[0]?.id ?? COUNT_MEASURE;
  const measure = measures.find((one) => one.id === wanted) ?? measures[0]!;
  const read = (cell: PivotCell | undefined): number | null =>
    cell === undefined
      ? null
      : measure.id === COUNT_MEASURE
        ? cell.count
        : (cell.values[measure.id] ?? null);

  let categories = pivot.rows.keys.map((key) => pointOf(pivot.rows, key, words.pivot.total));
  let series = pivot.columns.keys.map((key) => pointOf(pivot.columns, key, measure.header));
  let values = categories.map((row) =>
    series.map((column) => read(pivot.cell(row.key, column.key))),
  );
  /* Los márgenes salen de la BASE cuando el pivote los trae; sumar celdas es la salida
     honesta sólo cuando la medida se suma. */
  const margin = (cell: PivotCell | undefined, inside: readonly (number | null)[]) =>
    cell !== undefined ? read(cell) : measure.additive ? sum(inside) : null;
  let totals = categories.map((row, at) =>
    margin(pivot.rowTotal?.(row.key), values[at] ?? []),
  );

  /* 0 · El tiempo entero: los períodos vacíos entre el primero y el último. */
  const grain = pivot.rows.levels.length === 1 ? pivot.rows.levels[0]?.grain : undefined;
  if (grain !== undefined && reading.fillDates !== false) {
    const dated = categories
      .map((point, at) => ({ point, at, key: point.key[0] ?? "" }))
      .filter((one) => one.key !== "")
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const first = dated[0]?.key;
    const last = dated[dated.length - 1]?.key;
    const full =
      first === undefined || last === undefined ? null : dateKeysBetween(first, last, grain);
    if (full !== null) {
      const byKey = new Map(dated.map((one) => [one.key, one.at]));
      const empty = measure.id === COUNT_MEASURE ? 0 : null;
      const undated = categories
        .map((_, at) => at)
        .filter((at) => (categories[at]?.key[0] ?? "") === "");
      const filled = full.map((key) => {
        const at = byKey.get(key);
        return at === undefined
          ? {
              point: pointOf(pivot.rows, [key], key),
              values: series.map(() => empty),
              total: empty,
            }
          : { point: categories[at]!, values: values[at]!, total: totals[at] ?? null };
      });
      /* The records without a date stay, at the end: they are not a moment in time. */
      for (const at of undated) {
        filled.push({
          point: categories[at]!,
          values: values[at]!,
          total: totals[at] ?? null,
        });
      }
      categories = filled.map((one) => one.point);
      values = filled.map((one) => one.values);
      totals = filled.map((one) => one.total);
    }
  }

  /* 1 · Las series que no entran en la paleta. */
  let hiddenSeries = 0;
  const seriesTotals = series.map((column, at) =>
    margin(
      pivot.columnTotal?.(column.key),
      values.map((row) => row[at] ?? null),
    ),
  );
  const seriesCut = keep(seriesTotals, reading.maxSeries ?? SERIES_COLORS, measure.additive);
  if (seriesCut.rest.length > 0) {
    const kept = seriesCut.kept;
    if (measure.additive) {
      series = [
        ...kept.map((at) => series[at]!),
        {
          key: [],
          id: "\u0000rest",
          label: fillCopy(words.chart.rest, { count: seriesCut.rest.length }),
          rest: true,
        },
      ];
      values = values.map((row) => [
        ...kept.map((at) => row[at] ?? null),
        sum(seriesCut.rest.map((at) => row[at] ?? null)),
      ]);
    } else {
      hiddenSeries = seriesCut.rest.length;
      series = kept.map((at) => series[at]!);
      values = values.map((row) => kept.map((at) => row[at] ?? null));
    }
  }

  /* 2 · Las categorías que no entran (una torta). */
  let hiddenCategories = 0;
  let restCategory: {
    point: ChartPoint;
    values: (number | null)[];
    total: number | null;
  } | null = null;
  if (reading.maxCategories !== undefined) {
    const cut = keep(totals, reading.maxCategories, measure.additive);
    if (cut.rest.length > 0) {
      if (measure.additive) {
        restCategory = {
          point: {
            key: [],
            id: "\u0000rest",
            label: fillCopy(words.chart.rest, { count: cut.rest.length }),
            rest: true,
          },
          values: series.map((_, s) => sum(cut.rest.map((at) => values[at]?.[s] ?? null))),
          total: sum(cut.rest.map((at) => totals[at] ?? null)),
        };
      } else {
        hiddenCategories = cut.rest.length;
      }
      categories = cut.kept.map((at) => categories[at]!);
      values = cut.kept.map((at) => values[at]!);
      totals = cut.kept.map((at) => totals[at] ?? null);
    }
  }

  /* 3 · El orden del eje. La cola juntada va siempre al final: no es una categoría más. */
  if (reading.order !== undefined) {
    const at = categories.map((_, index) => index).sort(byTotal(totals, reading.order));
    categories = at.map((index) => categories[index]!);
    values = at.map((index) => values[index]!);
    totals = at.map((index) => totals[index] ?? null);
  }
  if (restCategory !== null) {
    categories = [...categories, restCategory.point];
    values = [...values, restCategory.values];
    totals = [...totals, restCategory.total];
  }

  /* 4 · Acumulado: un agujero arrastra lo que se llevaba, no lo corta. */
  if (reading.cumulative === true && measure.additive) {
    const running: (number | null)[] = series.map(() => null);
    values = values.map((row) =>
      row.map((value, s) => {
        if (value !== null) running[s] = (running[s] ?? 0) + value;
        return running[s] ?? null;
      }),
    );
    let total: number | null = null;
    totals = totals.map((value) => {
      if (value !== null) total = (total ?? 0) + value;
      return total;
    });
  }

  return {
    categories,
    series,
    values,
    totals,
    measure,
    categoryTitle: title(pivot.rows),
    seriesTitle: title(pivot.columns),
    hiddenSeries,
    hiddenCategories,
  };
}

/**
 * Ordena el EJE de un gráfico ya armado por lo que da cada categoría. La cola juntada
 * («otros») queda al final. Es lo mismo que `order` en `chartFromPivot`, para un gráfico
 * que se armó de otra manera —una comparación, un diccionario—.
 */
export function orderChart(data: ChartData, order: ChartOrder | undefined): ChartData {
  if (order === undefined) return data;
  const at = data.categories
    .map((_, index) => index)
    .filter((index) => data.categories[index]?.rest !== true)
    .sort(byTotal(data.totals, order));
  const tail = data.categories
    .map((_, index) => index)
    .filter((index) => data.categories[index]?.rest === true);
  const all = [...at, ...tail];
  return {
    ...data,
    categories: all.map((index) => data.categories[index]!),
    values: all.map((index) => data.values[index]!),
    totals: all.map((index) => data.totals[index] ?? null),
  };
}

/**
 * EL PERÍODO ANTERIOR al lado del actual — el «comparar con» de Odoo.
 *
 * Cada gráfico se arma por su lado (`chartFromPivot` sobre los registros de cada período)
 * y esto los junta en dos series: el actual y el anterior, que se dibuja callado. Lo que se
 * compara es lo que da cada categoría entera.
 *
 * `by` dice cómo se encuentran: por CLAVE cuando el eje es una cosa —La Paz con La Paz— y
 * por POSICIÓN cuando es tiempo —el primer mes con el primer mes—, porque «2026-09» y
 * «2025-09» son claves distintas y lo que se compara es «el mismo momento del período».
 * Una categoría del anterior que no está en el actual no se dibuja: el eje es el de ahora.
 */
export function chartCompare(
  current: ChartData,
  previous: ChartData,
  labels: { current: string; previous: string },
  by: "key" | "position" = "key",
): ChartData {
  const whole = (data: ChartData, at: number) =>
    data.series.length === 1 ? (data.values[at]?.[0] ?? null) : (data.totals[at] ?? null);
  const index = new Map(previous.categories.map((point, at) => [point.id, at]));
  const before = (point: ChartPoint, at: number): number | null => {
    const found = by === "position" ? at : index.get(point.id);
    return found === undefined || found >= previous.categories.length
      ? null
      : whole(previous, found);
  };
  return {
    ...current,
    series: [
      { key: [], id: "\u0000current", label: labels.current },
      { key: [], id: "\u0000previous", label: labels.previous, previous: true },
    ],
    values: current.categories.map((point, at) => [whole(current, at), before(point, at)]),
    totals: current.categories.map((_, at) => whole(current, at)),
    hiddenSeries: 0,
    compare: true,
  };
}

/**
 * Un DICCIONARIO como gráfico: `{ "La Paz": 120, "Oruro": 40 }`, o sus pares. Es lo que
 * devuelve un endpoint de resumen, y no hace falta armarle un pivote.
 */
export function chartFromRecord(
  entries:
    Readonly<Record<string, number | null>> | readonly (readonly [string, number | null])[],
  measure: { header: string; format?: (value: number) => string; additive?: boolean },
): ChartData {
  const pairs: readonly (readonly [string, number | null])[] = Array.isArray(entries)
    ? entries
    : Object.entries(entries);
  return {
    categories: pairs.map(([label]) => ({ key: [label], id: label, label })),
    series: [{ key: [], id: "", label: measure.header }],
    values: pairs.map(([, value]) => [value]),
    totals: pairs.map(([, value]) => value),
    measure: {
      id: "value",
      header: measure.header,
      ...(measure.format === undefined ? {} : { format: measure.format }),
      additive: measure.additive ?? true,
    },
    categoryTitle: "",
    seriesTitle: "",
    hiddenSeries: 0,
    hiddenCategories: 0,
  };
}
