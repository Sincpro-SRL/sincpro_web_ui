import { monthName as calendarMonthName } from "@sincpro/web-ui/foundations/calendar";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/copy";

/**
 * EL FILTRO DE FECHA, como lo hace Odoo: meses, trimestres y años que se
 * combinan.
 *
 *     Fecha de orden
 *       ─ septiembre        ← los tres meses más recientes, por nombre
 *       ─ agosto
 *       ─ julio
 *       ────────────
 *       ─ Q1  Q2  Q3  Q4    ← los cuatro trimestres
 *       ────────────
 *       ─ 2026  2025  2024  ← los tres años más recientes
 *
 * ── Por qué se combinan y no se eligen ──────────────────────────────
 *
 * Porque así se contestan las preguntas que la gente tiene. «Septiembre» y
 * «agosto» juntos son los dos meses: opciones del MISMO renglón se suman con O.
 * Pero «septiembre» y «2025» no es «septiembre o 2025», es **septiembre de
 * 2025**: renglones distintos se cruzan con Y. Un selector de un solo período no
 * puede decir ninguna de las dos.
 *
 * Sin ningún año tildado, los meses y trimestres son los del año en curso — que
 * es lo que alguien quiere decir cuando tilda «septiembre» y nada más.
 *
 * ── Lo que se guarda es la INTENCIÓN ────────────────────────────────
 *
 * «Los últimos tres meses» guardado en septiembre tiene que contestar otra cosa
 * en diciembre. Por eso lo que viaja es `month:9`, no `2026-09-01`, y el
 * intervalo se calcula cada vez que se lee. Un favorito con fechas absolutas
 * miente desde el día siguiente.
 */

/** Un período tildado. El año es aparte y por eso no está acá: es el otro eje. */
export type DatePeriod =
  | { kind: "month"; month: number }
  | { kind: "quarter"; quarter: 1 | 2 | 3 | 4 }
  | { kind: "year"; year: number };

/** Un intervalo SEMIABIERTO `[from, to)`. El final queda AFUERA, y no es un
 *  detalle: con un `between` inclusivo, una fila guardada a las 00:00:00 del
 *  primero del mes siguiente cae en dos períodos contiguos y se cuenta dos
 *  veces. */
export type DateRange = { from: Date; to: Date };

export function periodId(period: DatePeriod): string {
  if (period.kind === "month") return `month:${period.month}`;
  if (period.kind === "quarter") return `quarter:${period.quarter}`;
  return `year:${period.year}`;
}

export function readPeriodId(id: string): DatePeriod | null {
  const [kind, raw] = id.split(":");
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  if (kind === "month")
    return value >= 1 && value <= 12 ? { kind: "month", month: value } : null;
  if (kind === "quarter") {
    return value >= 1 && value <= 4
      ? { kind: "quarter", quarter: value as 1 | 2 | 3 | 4 }
      : null;
  }
  if (kind === "year") return { kind: "year", year: value };
  return null;
}

/** Los tres meses más recientes, del actual hacia atrás. Cada uno con el año al
 *  que pertenece, porque en enero los tres anteriores son de dos años. */
export function recentMonths(
  now: Date = new Date(),
  howMany = 3,
): {
  month: number;
  year: number;
}[] {
  const out: { month: number; year: number }[] = [];
  for (let back = 0; back < howMany; back += 1) {
    const when = new Date(now.getFullYear(), now.getMonth() - back, 1);
    out.push({ month: when.getMonth() + 1, year: when.getFullYear() });
  }
  return out;
}

/** Los años más recientes, del actual hacia atrás. */
export function recentYears(now: Date = new Date(), howMany = 3): number[] {
  return Array.from({ length: howMany }, (_, back) => now.getFullYear() - back);
}

const QUARTERS: readonly (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

/**
 * Las opciones que se ofrecen, en tres renglones y en este orden: meses,
 * trimestres, años. Es el orden de Odoo y el de la pregunta — de lo fino a lo
 * grueso, porque «este mes» se pide mucho más seguido que «2024».
 */
export function datePeriodOptions(
  now: Date = new Date(),
  /** Cómo se llama un mes. Sin esto, como lo llama el calendario del sistema en
   *  el idioma activo — una lista de doce meses escrita a mano es una lista que
   *  hay que volver a escribir para el idioma siguiente. */
  monthName: (month: number) => string = calendarMonthName,
): {
  months: { id: string; label: string }[];
  quarters: { id: string; label: string }[];
  years: { id: string; label: string }[];
} {
  return {
    months: recentMonths(now).map(({ month }) => ({
      id: periodId({ kind: "month", month }),
      label: monthName(month),
    })),
    quarters: QUARTERS.map((quarter) => ({
      id: periodId({ kind: "quarter", quarter }),
      label: fillCopy(currentCopy().calendar.quarter, { n: quarter }),
    })),
    years: recentYears(now).map((year) => ({
      id: periodId({ kind: "year", year }),
      label: String(year),
    })),
  };
}

/** Un mes de un año, como intervalo semiabierto. */
function monthRange(year: number, month: number): DateRange {
  return { from: new Date(year, month - 1, 1), to: new Date(year, month, 1) };
}

function quarterRange(year: number, quarter: number): DateRange {
  const first = (quarter - 1) * 3;
  return { from: new Date(year, first, 1), to: new Date(year, first + 3, 1) };
}

function yearRange(year: number): DateRange {
  return { from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) };
}

/**
 * Los intervalos que un juego de períodos tildados representa.
 *
 * Devuelve VARIOS y no uno: «septiembre y julio» son dos tramos con un agujero
 * en el medio, y aplastarlos en un solo `[julio, octubre)` metería agosto, que
 * nadie pidió. Quien los use los cruza con O.
 *
 * La regla es la de Odoo: los años multiplican, los meses y trimestres recortan.
 * Sin años tildados se usa el año en curso; sin meses ni trimestres, el año
 * entero.
 */
export function resolvePeriods(
  periods: readonly DatePeriod[],
  now: Date = new Date(),
): DateRange[] {
  if (periods.length === 0) return [];

  const years = periods.filter((one) => one.kind === "year").map((one) => one.year);
  const months = periods.filter((one) => one.kind === "month").map((one) => one.month);
  const quarters = periods.filter((one) => one.kind === "quarter").map((one) => one.quarter);

  /* Sin año tildado, el año en curso. Es lo que alguien quiere decir cuando
     tilda «septiembre» y nada más — y no «todos los septiembres de la
     historia», que además nadie sabría escribir. */
  const overYears = years.length > 0 ? years : [now.getFullYear()];

  if (months.length === 0 && quarters.length === 0) {
    return overYears.map(yearRange);
  }

  return overYears.flatMap((year) => [
    ...months.map((month) => monthRange(year, month)),
    ...quarters.map((quarter) => quarterRange(year, quarter)),
  ]);
}

/**
 * El recorte de una fecha como GRUPO del panel de filtros: plegable, con su
 * nombre, y los tres renglones separados por una línea.
 *
 * Es una función y no un componente porque los filtros del panel son datos —el
 * panel dibuja, el dominio declara—, y así una fecha no necesita una ranura
 * aparte ni un camino propio adentro de `SearchBar`.
 */
export function datePeriodGroup(options: {
  /** Cómo se llama el campo: «Fecha de pedido». */
  label: string;
  /** Los ids tildados, de `periodId`. */
  active: readonly string[];
  now?: Date;
  /** Cómo se llama un mes, cuando el producto lo dice con otras palabras. Sin
   *  esto, como lo llama el calendario del sistema en el idioma activo. */
  monthName?: (month: number) => string;
}): {
  label: string;
  collapsible: true;
  options: { id: string; label: string; checked: boolean; divider?: boolean }[];
} {
  /* Se REENVÍA lo que llegó, sin default propio: con `?? String` acá, el panel
     de filtros dibujaba «9 · 8 · 7» en vez de «Septiembre · Agosto · Julio»
     —este `String` pisaba el default del calendario— y nadie veía por qué. Un
     default repetido en dos lugares es un default que dice dos cosas. */
  const { months, quarters, years } = datePeriodOptions(
    options.now ?? new Date(),
    options.monthName,
  );
  const mark = (one: { id: string; label: string }, divider?: boolean) => ({
    ...one,
    checked: options.active.includes(one.id),
    ...(divider === true ? { divider: true } : {}),
  });
  return {
    label: options.label,
    collapsible: true,
    options: [
      ...months.map((one) => mark(one)),
      ...quarters.map((one, index) => mark(one, index === 0)),
      ...years.map((one, index) => mark(one, index === 0)),
    ],
  };
}
