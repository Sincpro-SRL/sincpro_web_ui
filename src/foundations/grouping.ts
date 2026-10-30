import { dateLabel } from "@sincpro/web-ui/foundations/calendar";

/**
 * LA AGRUPACIÓN, en N niveles.
 *
 * Context: agrupar es partir un conjunto por lo que sus filas comparten, y eso
 * no tiene por qué ser UNA pregunta. «Por procedencia» es una; «por procedencia
 * y después por mes» es la misma pregunta hecha dos veces, y la respuesta es un
 * árbol y no una lista de montones.
 *
 * ── Qué se PIDE y qué se DIBUJA son dos cosas ──────────────────────
 *
 * `GroupLevel` es lo que alguien pidió: por qué campo partir y, si es una
 * fecha, con qué grano. `Pile` es lo que se dibuja: un montón ya armado, con su
 * rótulo, cuántas filas tiene y el nivel de abajo. Están separados porque los
 * montones no siempre los arma esta máquina: los puede armar quien tenga los
 * datos —y contar un catálogo entero es algo que sólo puede contestar quien lo
 * guarda—. Por eso `pilesFrom` es un HELPER y no el único camino: una
 * presentación recibe `piles` y no sabe ni le importa quién los contó.
 *
 * **Esto no conoce ningún motor.** Ni criteria, ni cursores, ni transporte: un
 * montón acá es rótulo, conteo, hijos y filas. Quien traduzca la respuesta de un
 * servidor a esta forma vive afuera, y por eso la misma presentación sirve para
 * un agrupado hecho en el navegador y para uno contado a mil kilómetros.
 *
 * ── La identidad de un montón es su RUTA ────────────────────────────
 *
 * Y no su clave. Con un solo nivel alcanzaba la clave, porque no había dos
 * montones que pudieran llamarse igual. Con N niveles sí: «2026-09» puede ser un
 * mes adentro de «sintético» y otro adentro de «traído», y son montones
 * distintos que se pliegan por separado. La ruta —`["sintético", "2026-09"]`—
 * es lo único que los distingue, así que es lo que se guarda.
 *
 * ── La CLAVE identifica; el RÓTULO se lee ───────────────────────────
 *
 * Y son dos textos. «2026-09» es lo que el motor escribe: lo que se compara con
 * lo que contó el servidor, lo que la ruta lleva, lo que queda plegado. Con eso
 * a la vista la interfaz habla en máquina, así que el montón lleva además su
 * rótulo —«Septiembre»— que es lo que se dibuja y lo único que cambia con el
 * idioma. Al revés no se puede: con el rótulo por identidad, dos septiembres de
 * años distintos se funden en un montón que no existe, y plegar un mes en
 * español lo dejaría abierto en inglés.
 *
 * Para un campo que no es una fecha los dos textos son el mismo —«sintético» se
 * identifica y se lee igual— y por eso el rótulo sólo se pone aparte donde hace
 * falta: en las fechas, que las nombra `system/calendar.ts`.
 */

/** El grano de un nivel de fecha. Sin grano, un campo de fecha parte por
 *  instante y cada fila termina en su propio montón, que es no agrupar. */
export type GroupGrain = "day" | "week" | "month" | "quarter" | "year";

/**
 * De GRUESO a fino. Es el orden en que se anidan los granos de un mismo campo, y
 * no es una preferencia: agrupar por día y después por mes daría montones de un
 * día dentro de meses que ya no parten nada, porque un día entero vive adentro
 * de un solo mes. La jerarquía de un calendario tiene una dirección y es ésta.
 */
export const GRAIN_ORDER: readonly GroupGrain[] = ["year", "quarter", "month", "week", "day"];

/** Un NIVEL: por qué campo se parte, y con qué grano si es una fecha. Es lo que
 *  alguien pidió, no lo que se dibuja. */
export type GroupLevel = {
  field: string;
  grain?: GroupGrain;
};

/** Un campo por el que SE PUEDE agrupar, para que el control ofrezca algo. Los
 *  granos se declaran acá y no se adivinan del tipo: quién sabe si una fecha se
 *  mira por semana o por trimestre es el dominio, y ofrecer los cuatro siempre
 *  es ofrecer tres que a nadie le sirven. */
export type GroupableField = {
  field: string;
  label: string;
  /** Presentes = es una fecha y estos son los cortes que tienen sentido. */
  grains?: readonly GroupGrain[];
};

/**
 * Un MONTÓN ya armado: lo que sus filas comparten, cuántas son, y el nivel de
 * abajo.
 */
export type Pile<T> = {
  /** La ruta desde la raíz, en CLAVES. Es la identidad del montón: lo que lo
   *  pliega y lo que lo distingue de un hermano homónimo en otra rama. */
  path: readonly string[];
  /** Cuán adentro está. `0` es el primer nivel. Lo usa la sangría. */
  depth: number;
  /** Por qué campo se partió acá. Lo dibuja el encabezado a la izquierda del
   *  valor: sin él, «2026-09» no dice si es cuándo se registró o cuándo se
   *  corrió. */
  field: string;
  /** Lo que las filas COMPARTEN, en el idioma del motor: «2026-09». Es el último
   *  tramo de la ruta, y lo que se compara con lo que contó el servidor. */
  key: string;
  /** El mismo valor, ya legible y en el idioma activo: «Septiembre». Es lo que
   *  se dibuja, y lo único de un montón que cambia con el idioma. */
  label: string;
  /**
   * Cuántas filas hay en el montón — TODAS, no las de la página.
   *
   * Es la diferencia entre «hay 187 sintéticos» y «se ven 12»: un conteo que
   * cambia al pasar de página no es un conteo, es un largo de array. Cuando los
   * montones los cuenta quien guarda los datos, este número viene de allá.
   */
  count: number;
  /** Las filas, en el nivel MÁS PROFUNDO. Vacío en los de arriba: un montón que
   *  tiene montones adentro no tiene filas propias. */
  items: readonly T[];
  /** El nivel de abajo. Vacío en el más profundo. */
  piles: readonly Pile<T>[];
};

/**
 * La identidad de un NIVEL: el campo y, si es fecha, su grano.
 *
 * El campo solo no alcanza desde que un mismo campo puede estar puesto con
 * varios granos —«por mes y adentro por día» son dos niveles del mismo
 * `registered_at`— y dos niveles que se llaman igual no se pueden ni sacar ni
 * mover por separado.
 */
export function levelKey(level: GroupLevel): string {
  return level.grain === undefined ? level.field : `${level.field}:${level.grain}`;
}

/**
 * Los niveles, acomodados.
 *
 * Dos reglas, y las dos son del calendario y no del gusto de nadie:
 *
 *  1. Los niveles de un MISMO campo quedan juntos. Partir por mes, después por
 *     procedencia y después por día del mismo campo deja dos cortes de la misma
 *     fecha separados por otra cosa, y eso no es una jerarquía, es un tropiezo.
 *  2. Adentro de un campo van de GRUESO a FINO. Tildar «día» y después «mes»
 *     tiene que dar «mes › día», porque al revés el mes no parte nada: un día
 *     entero ya vive adentro de un solo mes.
 *
 * El orden ENTRE campos lo decide quien agrupa —es una pregunta del dominio, no
 * del calendario— así que se respeta el de primera aparición y se puede mover.
 */
export function normalizeLevels(levels: readonly GroupLevel[]): GroupLevel[] {
  const byField = new Map<string, GroupLevel[]>();
  for (const level of levels) {
    const here = byField.get(level.field);
    if (here === undefined) byField.set(level.field, [level]);
    else here.push(level);
  }
  return [...byField.values()].flatMap((group) =>
    group.length === 1
      ? group
      : [...group].sort(
          (a, b) =>
            GRAIN_ORDER.indexOf(a.grain ?? "year") - GRAIN_ORDER.indexOf(b.grain ?? "year"),
        ),
  );
}

/* ---------------------------------------------------------------- *
 *  EL CONTRATO: qué tiene que aceptar algo que dibuja N cosas
 * ---------------------------------------------------------------- */

/**
 * LO QUE HACE AGRUPABLE A UNA VISTA.
 *
 * Cualquier componente que dibuje N cosas —filas, tarjetas, celdas, líneas de un
 * informe, puntos de una serie— puede agrupar aceptando ESTO y nada más. Es
 * deliberadamente corto: cinco campos, ninguno opcional por capricho.
 *
 * ── Lo que el contrato SÍ fija ──────────────────────────────────────
 *
 *     levels     qué se pregunta, y en qué orden
 *     of         a qué montón va cada cosa, ya legible
 *     piles      el árbol ya armado, si lo contó alguien con el conjunto entero
 *     collapsed  qué está plegado, por ruta
 *     onToggle   cómo se pliega
 *
 * ── Lo que NO fija, y es el punto ───────────────────────────────────
 *
 * **Cómo se dibuja un montón.** La lista pone un encabezado con filete; la
 * planilla, una banda pegada a la izquierda porque está virtualizada por índice
 * y no puede anidar el marcado; la tabla usa una fila con `colSpan`; el informe
 * hace una línea con sus subtotales; una serie haría una serie por montón. Las
 * cinco son correctas y ninguna sirve para las otras — un contrato que además
 * dictara el dibujo obligaría a todas a parecerse a la primera que se escribió.
 *
 * Por eso lo que se comparte es el ÁRBOL y no el render: quien implementa recibe
 * `Pile[]` de `pilesOf()` y lo recorre como su presentación necesite.
 *
 * ── Cómo se implementa ──────────────────────────────────────────────
 *
 *     function MiVista<T>({ items, grouping }: { items: readonly T[]; grouping?: Grouping<T> }) {
 *       const piles = pilesOf(items, grouping);
 *       if (piles === null) return <>{items.map(dibujar)}</>;
 *       return recorrer(piles);          // ← acá manda la presentación
 *     }
 */
export type Grouping<T> = {
  /**
   * Los niveles pedidos, de afuera hacia adentro. Vacío = sin agrupar.
   *
   * El ORDEN es la jerarquía: `[origen, mes]` y `[mes, origen]` son dos lecturas
   * distintas del mismo conjunto.
   */
  levels: readonly GroupLevel[];
  /** A qué montón va cada cosa, en cada nivel: la CLAVE. Recortar una fecha a su
   *  grano es de quien conoce el dato, no del sistema. */
  of: PileOf<T>;
  /** Cómo se lee una clave. Sin esto, una fecha la nombra el calendario del
   *  sistema en el idioma activo y lo demás se dibuja tal cual. */
  label?: PileLabelOf;
  /**
   * El árbol YA armado, cuando lo contó quien tiene el conjunto entero.
   *
   * Existe porque un conteo que sólo conoce la página no es un conteo: «187
   * sintéticos» no lo pueden contestar las doce filas que se trajeron. Quién
   * cuenta no es asunto de esta capa — dibuja el mismo árbol en los dos casos.
   *
   * Un árbol contado afuera llega con sus rótulos PUESTOS, y esta capa no se los
   * toca: quien lo tradujo sabe cuál de sus claves es una fecha y cuál es un
   * código con nombre propio. `dateLabel` está exportado para que los ponga con
   * las mismas palabras que el árbol armado acá.
   */
  piles?: readonly Pile<T>[];
  /** Qué montones están plegados, por `pathKey(pile.path)`. */
  collapsed?: readonly string[];
  onToggle?: (key: string) => void;
};

/**
 * El árbol que hay que dibujar, o `null` si no se agrupa.
 *
 * Es la única línea que un componente necesita escribir para volverse agrupable:
 * decide entre el árbol que le pasaron y el que arma con las cosas en la mano, y
 * contesta `null` cuando no hay nada que partir — que es distinto de un árbol
 * vacío, porque un árbol vacío significa «se agrupó y no quedó nada».
 */
export function pilesOf<T>(
  items: readonly T[],
  grouping: Grouping<T> | undefined,
): readonly Pile<T>[] | null {
  if (grouping === undefined || grouping.levels.length === 0) return null;
  return grouping.piles ?? pilesFrom(items, grouping.levels, grouping.of, grouping.label);
}

/** Si un montón está abierto, según lo plegado. Abierto es el default: agrupar y
 *  después tener que abrir cada montón son dos gestos para lo que se pidió en
 *  uno. */
export function pileIsOpen<T>(pile: Pile<T>, grouping: Grouping<T> | undefined): boolean {
  return grouping?.collapsed?.includes(pathKey(pile.path)) !== true;
}

/** La clave de plegado de una ruta. El separador es un carácter que no aparece
 *  en un valor real, así que dos rutas distintas no pueden producir la misma
 *  clave por concatenación — `["a", "b"]` y `["a b"]` sí podrían con un
 *  separador escribible. */
export function pathKey(path: readonly string[]): string {
  return path.join(" ");
}

/** Qué montón le toca a cada fila en cada nivel: su CLAVE. Recortar una fecha a
 *  su grano es cosa de quien conoce el dato —`dateKey` la recorta con el mismo
 *  texto que el motor— y ponerle nombre es cosa del rótulo. */
export type PileOf<T> = (item: T, level: GroupLevel) => string;

/**
 * Cómo se lee la clave de un montón.
 *
 * `within` son los granos que los montones de ARRIBA, del mismo campo, ya
 * dijeron: con el año afuera, un mes se rotula «Septiembre» y no «Septiembre de
 * 2026». Decirlo dos veces llena la sangría con lo que está dos renglones más
 * arriba.
 */
export type PileLabelOf = (
  key: string,
  level: GroupLevel,
  within: readonly GroupGrain[],
) => string;

/** El rótulo por default: una fecha la nombra el calendario en el idioma activo,
 *  y lo que no es una fecha se dibuja tal cual —«sintético» se identifica y se
 *  lee con la misma palabra, y traducirlo sería inventar un valor que nadie
 *  guardó. */
export function pileLabel(
  key: string,
  level: GroupLevel,
  within: readonly GroupGrain[],
): string {
  return level.grain === undefined ? key : dateLabel(key, level.grain, within);
}

/**
 * CÓMO SE LEE UNA RUTA de claves, tramo por tramo.
 *
 * La clave identifica y el rótulo se lee: «2026-09» es lo que el motor escribe y
 * «Septiembre» lo que se dibuja. Cualquiera que tenga una ruta —el eje de un
 * pivote, el título de un montón, una miga— la dice con esto, porque una ruta
 * que se lee distinta según quién la dibuje es el mismo corte con dos caras.
 *
 * `within` sale de los niveles de ARRIBA del mismo campo: con el año afuera, el
 * mes se dice «Septiembre» y no «Septiembre de 2026», porque eso ya está escrito
 * un tramo antes.
 */
export function pathLabels(
  levels: readonly GroupLevel[],
  path: readonly string[],
  label: PileLabelOf = pileLabel,
): string[] {
  return path.map((part, at) => {
    const level = levels[at];
    if (level === undefined) return part;
    const within = levels
      .slice(0, at)
      .filter((one) => one.field === level.field)
      .map((one) => one.grain)
      .filter((grain): grain is GroupGrain => grain !== undefined);
    return label(part, level, within);
  });
}

/**
 * Arma el árbol de montones a partir de las filas que hay EN LA MANO.
 *
 * Sirve cuando el conjunto entero está en el navegador. Cuando no lo está —un
 * catálogo de ciento ochenta y siete del que se bajaron doce—, los montones los
 * cuenta quien los guarda y esto no se usa: la presentación recibe `piles` ya
 * hechos. Las dos formas dibujan igual porque dibujan el mismo tipo.
 *
 * El orden de los montones es el de PRIMERA APARICIÓN de cada valor, en cada
 * nivel. No se ordena alfabéticamente: el orden de las filas ya lo decidió
 * alguien —una columna, un criterio, el motor— y reordenar los montones acá lo
 * contradiría.
 */
export function pilesFrom<T>(
  items: readonly T[],
  levels: readonly GroupLevel[],
  of: PileOf<T>,
  label: PileLabelOf = pileLabel,
): readonly Pile<T>[] {
  if (levels.length === 0) return [];
  return build(items, levels, of, label, [], []);
}

function build<T>(
  items: readonly T[],
  levels: readonly GroupLevel[],
  of: PileOf<T>,
  label: PileLabelOf,
  prefix: readonly string[],
  /* Los niveles que quedaron arriba, para que un rótulo no repita lo que ya se
     dijo. Van enteros y no sólo sus granos porque el campo importa: un año de
     `registrado` no explica un mes de `corrido`. */
  above: readonly GroupLevel[],
): readonly Pile<T>[] {
  const [level, ...deeper] = levels;
  if (level === undefined) return [];

  /* Un Map y no un objeto: preserva el orden de inserción para claves que
     parecen números —«2026» entraría antes que «sintético» en un objeto, porque
     las claves enteras se ordenan solas— y eso rompería el orden de aparición
     justo en los campos de fecha, que son los que más se agrupan. */
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = of(item, level);
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [item]);
    else bucket.push(item);
  }

  const within = above.flatMap((one) =>
    one.field === level.field && one.grain !== undefined ? [one.grain] : [],
  );

  return [...buckets].map(([key, inside]) => {
    const path = [...prefix, key];
    const piles =
      deeper.length === 0 ? [] : build(inside, deeper, of, label, path, [...above, level]);
    return {
      path,
      depth: prefix.length,
      field: level.field,
      key,
      label: label(key, level, within),
      count: inside.length,
      /* Las filas viven en el nivel más profundo y en ninguno de arriba. Un
         montón que tiene montones adentro no las repite: dibujarlas dos veces es
         cómo un total termina contando el doble. */
      items: deeper.length === 0 ? inside : [],
      piles,
    };
  });
}

/**
 * La ruta de UNA fila: el montón que le toca en cada nivel.
 *
 * Es la identidad del montón más profundo que la contiene, sin armar el árbol.
 * Sirve para preguntar «¿estas dos filas son vecinas?», que con un solo nivel se
 * contestaba comparando una clave y con N hay que comparar la ruta entera: dos
 * datasets del mismo mes son vecinos sólo si además comparten la procedencia,
 * porque si no están en montones distintos aunque el último tramo coincida.
 */
export function itemPath<T>(item: T, levels: readonly GroupLevel[], of: PileOf<T>): string[] {
  return levels.map((level) => of(item, level));
}

/** Las filas de un árbol, en el orden en que se dibujan. Lo usan las
 *  presentaciones que necesitan la secuencia y no el árbol —la planilla
 *  virtualizada, que cuenta índices— y el que quiera saber qué quedó visible. */
export function pileItems<T>(piles: readonly Pile<T>[]): readonly T[] {
  return piles.flatMap((pile) =>
    pile.piles.length === 0 ? pile.items : pileItems(pile.piles),
  );
}

/** Cuántas filas hay en total. Suma los conteos del primer nivel, que ya
 *  incluyen los de abajo — no recorre las filas, porque puede no tenerlas. */
export function pileCount<T>(piles: readonly Pile<T>[]): number {
  return piles.reduce((total, pile) => total + pile.count, 0);
}

/** Mueve un nivel `delta` lugares. Se queda en los bordes en vez de dar la
 *  vuelta: llegar al primero y volver al último no es lo que nadie espera de una
 *  flecha «subir». El orden de los niveles ES la jerarquía, así que esto cambia
 *  la pregunta y no sólo la lista. */
export function moveLevel(
  levels: readonly GroupLevel[],
  field: string,
  delta: number,
): GroupLevel[] {
  const from = levels.findIndex((one) => one.field === field);
  if (from < 0) return [...levels];
  const to = Math.min(Math.max(from + delta, 0), levels.length - 1);
  if (to === from) return [...levels];
  const next = [...levels];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}
