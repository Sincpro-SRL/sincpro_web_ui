import type { GroupGrain } from "@sincpro/web-ui/foundations/grouping";

/**
 * LOS RECORTES DE FECHA, en RELATIVO.
 *
 * Context: un filtro de fecha escrito en absoluto —«desde el 2026-06-01»— es una
 * respuesta que envejece. Alguien guarda «los últimos tres meses» como favorito
 * en septiembre y en diciembre le sigue mostrando junio, julio y agosto: el
 * filtro dice lo que dijo, no lo que quiso decir. Lo que hay que guardar es la
 * INTENCIÓN —«los últimos 3 meses»— y resolverla cada vez que se lee.
 *
 * **Y por eso lo resuelve la UI.** No hace falta preguntarle a nadie cuándo
 * empieza el trimestre pasado: es aritmética de calendario sobre el reloj del
 * que mira. Mandar al servidor «relativo: últimos 3 meses» y que él decida
 * agrega un viaje y una segunda definición de «mes» — y la del servidor está en
 * su huso, no en el de la persona.
 *
 * Lo que sale de acá es un intervalo SEMIABIERTO `[desde, hasta)`. El final
 * queda AFUERA, y no es un detalle: con un `between` inclusivo, una fila guardada
 * a las 00:00:00 del primero del mes siguiente cae en los dos recortes, y dos
 * filtros contiguos devuelven la misma fila.
 */

export type DateRange = {
  /** Desde, inclusive. */
  from: Date;
  /** Hasta, EXCLUSIVE. */
  to: Date;
};

/**
 * Un recorte relativo, tal como se guarda: una unidad y cuántas.
 *
 * `last` cuenta hacia atrás desde ahora incluyendo el período en curso; `prior`
 * cuenta los períodos COMPLETOS anteriores, sin el que está corriendo. Son
 * distintos y la diferencia importa el día 2 del mes: «este mes» tiene un día y
 * «el mes pasado» tiene treinta.
 */
export type RelativeRange = {
  unit: GroupGrain | "quarter";
  count: number;
  mode: "last" | "prior";
};

/** El id con el que viaja un recorte relativo, para guardarlo y reconocerlo. */
export function rangeId(range: RelativeRange): string {
  return `${range.mode}:${range.count}:${range.unit}`;
}

export function readRangeId(id: string): RelativeRange | null {
  const [mode, count, unit] = id.split(":");
  if (mode !== "last" && mode !== "prior") return null;
  const howMany = Number(count);
  if (!Number.isInteger(howMany) || howMany < 1) return null;
  if (
    unit !== "day" &&
    unit !== "week" &&
    unit !== "month" &&
    unit !== "quarter" &&
    unit !== "year"
  ) {
    return null;
  }
  return { mode, count: howMany, unit };
}

/** El arranque del período que contiene a `when`. Es donde empieza «este mes»,
 *  «esta semana», «este trimestre». */
function startOf(unit: RelativeRange["unit"], when: Date): Date {
  const year = when.getFullYear();
  const month = when.getMonth();
  if (unit === "year") return new Date(year, 0, 1);
  if (unit === "quarter") return new Date(year, Math.floor(month / 3) * 3, 1);
  if (unit === "month") return new Date(year, month, 1);
  if (unit === "week") {
    /* La semana arranca el LUNES, que es ISO y es lo que el motor usa para
       recortar por semana. Con domingo, dos capas partirían el mismo dato en
       semanas distintas y los conteos no cerrarían. */
    const day = new Date(year, month, when.getDate());
    const weekday = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - weekday);
    return day;
  }
  return new Date(year, month, when.getDate());
}

/** Corre `count` períodos desde `from`. Negativo va para atrás. */
function shift(unit: RelativeRange["unit"], from: Date, count: number): Date {
  const out = new Date(from);
  if (unit === "year") out.setFullYear(out.getFullYear() + count);
  else if (unit === "quarter") out.setMonth(out.getMonth() + count * 3);
  else if (unit === "month") out.setMonth(out.getMonth() + count);
  else if (unit === "week") out.setDate(out.getDate() + count * 7);
  else out.setDate(out.getDate() + count);
  return out;
}

/**
 * Resuelve un recorte relativo contra un reloj.
 *
 * `now` se pasa y no se lee de adentro: una función que mira el reloj no se
 * puede probar, y la que la prueba tendría que congelar el tiempo global.
 */
export function resolveRange(range: RelativeRange, now: Date = new Date()): DateRange {
  const current = startOf(range.unit, now);
  if (range.mode === "last") {
    /* «Los últimos 3 meses» INCLUYE el que corre: termina al final del actual.
       Que termine «ahora» dejaría afuera lo que se guarde en el resto del día, y
       un filtro que esconde lo que acabás de crear se lee como un error. */
    return {
      from: shift(range.unit, current, -(range.count - 1)),
      to: shift(range.unit, current, 1),
    };
  }
  return { from: shift(range.unit, current, -range.count), to: current };
}

/** Los recortes que vale la pena ofrecer, en el orden en que se leen. Es una
 *  sugerencia con nombre y no una lista cerrada: un consumidor arma la suya con
 *  `rangeId` si su dominio mira el tiempo de otra manera. */
export const COMMON_RANGES: readonly RelativeRange[] = [
  { mode: "last", count: 7, unit: "day" },
  { mode: "last", count: 30, unit: "day" },
  { mode: "last", count: 3, unit: "month" },
  { mode: "prior", count: 1, unit: "month" },
  { mode: "last", count: 1, unit: "quarter" },
  { mode: "prior", count: 1, unit: "quarter" },
  { mode: "last", count: 1, unit: "year" },
  { mode: "last", count: 3, unit: "year" },
];
