import { currentCopy, currentCopyLocale, fillCopy } from "@sincpro/web-ui/foundations/copy";
import type { GroupGrain } from "@sincpro/web-ui/foundations/grouping";

/**
 * EL CALENDARIO: de una fecha a una CLAVE, y de una clave a un RÓTULO.
 *
 * Context: un montón de fecha tiene dos textos y no son el mismo. «2026-09» es
 * lo que el motor escribe —lo que identifica al montón, lo que se compara con lo
 * que contó el servidor, lo que se guarda plegado— y «Septiembre» es lo que se
 * lee. Escribir uno solo obliga a elegir cuál se pierde: con la clave a la vista
 * la interfaz habla en máquina, y con el rótulo por identidad dos septiembres de
 * años distintos se funden en un montón que no existe.
 *
 * Por eso son dos funciones y no una:
 *
 *     dateKey(when, "month")      → «2026-09»     la identidad, en un solo idioma
 *     dateLabel("2026-09", …)     → «Septiembre»  el rótulo, en el idioma activo
 *
 * ── El idioma no se traduce: se PIDE ────────────────────────────────
 *
 * Los meses y los días de la semana los dice `Intl` con el `locale` que la copia
 * tiene puesto, así que no hay acá ninguna tabla de doce meses en español ni en
 * inglés — ni la habría que escribir para un tercer idioma. Lo único que sí es
 * copia son la semana y el trimestre, porque ningún calendario los nombra: «W38»
 * no es una palabra y `Intl` no la tiene.
 *
 * ── Un rótulo dice lo que el de arriba NO dijo ──────────────────────
 *
 * Un árbol de fechas se lee de arriba hacia abajo, y repetir el año en cada mes
 * y el mes en cada día llena la sangría de texto que ya está dos renglones más
 * arriba:
 *
 *     2026                        ← el año lo dice una vez
 *       Septiembre                ← no «Septiembre de 2026»
 *         Semana 38               ← no «Semana 38 de 2026»
 *           Martes                ← no «martes, 15 sept 2026»
 *
 * De eso se ocupa `within`: los granos que los montones de arriba —del mismo
 * campo— ya dijeron. Sin nadie arriba, el rótulo se planta solo y dice la fecha
 * entera, porque un «Martes» suelto no es ningún día.
 */

/**
 * La forma de la clave de cada grano. Es `GroupGrain` entero: un grano que el
 * calendario no supiera cortar sería un nivel que no parte nada.
 *
 * Los rangos van en la expresión y no en un `if` porque `new Date(2026, 12, 1)`
 * no falla: se corre a enero de 2027. Una clave «2026-13» dibujada como «Enero»
 * es un mes que nadie contó, y eso es peor que un rótulo ilegible.
 */
const KEY_SHAPES: Readonly<Record<GroupGrain, RegExp>> = {
  year: /^(\d{4})$/,
  quarter: /^(\d{4})-Q([1-4])$/,
  month: /^(\d{4})-(0[1-9]|1[0-2])$/,
  week: /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/,
  day: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

/**
 * Una fecha recortada a la CLAVE de su grano.
 *
 * El texto es el que produce el motor —«2026», «2026-Q3», «2026-09», «2026-W38»,
 * «2026-09-15»—, y que los dos lados lo escriban igual es lo que deja comparar
 * un agrupado hecho en el navegador con uno contado a mil kilómetros. Sin fecha
 * la clave es vacía: un montón que existe —el de los que no tienen— y que se
 * dibuja con las palabras de la copia.
 */
export function dateKey(
  when: Date | string | number | null | undefined,
  grain: GroupGrain,
): string {
  if (when === null || when === undefined || when === "") return "";
  const date = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (grain === "year") return String(year);
  if (grain === "quarter") return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  if (grain === "month") return `${year}-${pad(month)}`;
  if (grain === "week") {
    const [weekYear, week] = isoWeek(date);
    return `${weekYear}-W${pad(week)}`;
  }
  return `${year}-${pad(month)}-${pad(date.getDate())}`;
}

/**
 * El RÓTULO de una clave de fecha, en el idioma activo.
 *
 * `within` son los granos que los montones de arriba ya dijeron: con el año
 * arriba, un mes es «Septiembre» y no «Septiembre de 2026». Una clave que no
 * tiene la forma de su grano se dibuja TAL CUAL —es lo que hace que un montón
 * contado afuera, con una clave que esta capa no escribió, siga siendo legible
 * en vez de desaparecer detrás de una fecha inventada.
 */
export function dateLabel(
  key: string,
  grain: GroupGrain,
  within: readonly GroupGrain[] = [],
): string {
  const copy = currentCopy();
  if (key === "") return copy.time.noDate;

  const parts = KEY_SHAPES[grain].exec(key);
  if (parts === null) return key;

  const locale = currentCopyLocale();
  const year = Number(parts[1]);
  const said = (one: GroupGrain) => within.includes(one);

  if (grain === "year") return String(year);

  if (grain === "quarter") {
    const quarter = Number(parts[2]);
    return said("year")
      ? fillCopy(copy.calendar.quarter, { n: quarter })
      : fillCopy(copy.calendar.quarterOfYear, { n: quarter, year });
  }

  if (grain === "week") {
    const week = Number(parts[2]);
    /* El mes también alcanza: una semana adentro de septiembre ya sabe de qué
       año es, porque el mes lo dijo. */
    return said("year") || said("quarter") || said("month")
      ? fillCopy(copy.calendar.week, { n: week })
      : fillCopy(copy.calendar.weekOfYear, { n: week, year });
  }

  if (grain === "month") {
    const when = new Date(year, Number(parts[2]) - 1, 1);
    return capitalized(
      said("year")
        ? format(locale, { month: "long" }).format(when)
        : format(locale, { month: "long", year: "numeric" }).format(when),
    );
  }

  const day = Number(parts[3]);
  const when = new Date(year, Number(parts[2]) - 1, day);
  /* El 31 de febrero tiene la forma de un día y no es ninguno: `Date` lo corre
     al 3 de marzo en vez de quejarse, así que se pregunta si volvió el mismo. */
  if (when.getDate() !== day) return key;
  /* Adentro de una semana, el día es su NOMBRE: son siete y ninguno se repite,
     así que «Martes» alcanza y el número de día sería ruido. Afuera no: un
     «Martes» suelto no dice cuál de los cincuenta y dos. */
  if (said("week")) return capitalized(format(locale, { weekday: "long" }).format(when));
  return capitalized(
    format(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      ...(said("year") ? {} : { year: "numeric" }),
    }).format(when),
  );
}

/** El nombre de un mes —1 a 12— en el idioma activo. Lo usa el que ofrece meses
 *  sin tener ninguna fecha en la mano, como el recorte por período. */
export function monthName(month: number): string {
  return capitalized(
    format(currentCopyLocale(), { month: "long" }).format(new Date(2000, month - 1, 1)),
  );
}

/** Cómo se llama un GRANO —«día», «semana»—, que es distinto de cómo se llama un
 *  montón suyo: el grano nombra el corte y el rótulo nombra lo cortado. Sale de
 *  la copia, que es donde ya viven las unidades de tiempo en singular. */
export function grainName(grain: GroupGrain): string {
  return capitalized(currentCopy().dates[grain]);
}

/**
 * El año y la semana ISO de una fecha.
 *
 * La semana 1 es la que tiene el primer jueves del año, así que se calcula con
 * el jueves de la semana del dato: es él quien decide a qué año pertenece, y por
 * eso una semana de fin de diciembre puede ser la 1 del año siguiente. El año
 * que sale de acá es el de ESA semana y no el de la fecha.
 */
function isoWeek(date: Date): [year: number, week: number] {
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  thursday.setDate(thursday.getDate() + 3 - ((thursday.getDay() + 6) % 7));
  const first = new Date(thursday.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getDay() + 6) % 7)) /
        7,
    );
  return [thursday.getFullYear(), week];
}

function format(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, options);
}

/** Un rótulo encabeza un montón, y en español `Intl` devuelve «septiembre» con
 *  minúscula. Se sube la primera letra con el idioma activo, que es el que sabe
 *  cuál es la mayúscula de esa letra. */
function capitalized(text: string): string {
  const first = text.charAt(0);
  return first === "" ? text : first.toLocaleUpperCase(currentCopyLocale()) + text.slice(1);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
