import type {
  BuiltCondition,
  BuiltFilter,
} from "@sincpro/web-ui/components/search/FilterBuilder";
import type { GroupGrain, GroupLevel } from "@sincpro/web-ui/foundations/grouping";

/* ==================================================================== *
 *  LO QUE LA BARRA TIENE PUESTO: instancias de criteria.
 *
 *  Context: la barra manejaba tres cosas distintas —búsquedas, filtros
 *  declarados y niveles de agrupado— y las tres terminaban en el mismo lugar
 *  recién al final, cada una por su camino. Por eso una se podía editar y otra
 *  no, y por eso el anidado no se podía dibujar: no existía hasta que alguien
 *  armaba el `where`.
 *
 *  Acá hay UNA sola cosa. Todo lo que la barra tiene puesto es una INSTANCIA, y
 *  una instancia es de una de dos clases:
 *
 *      group    cómo se amontona lo que quedó — va SIEMPRE a la izquierda
 *      filter   qué filas quedan — va a la derecha, y puede anidarse
 *
 *  ── Esto NO es la criteria del motor ────────────────────────────────
 *
 *  Es lo que la UI sabe de ella: de qué clase es, cómo se llama, y qué lleva
 *  adentro. El objeto del motor —`{field, operator, value}`, `{all}`, `{any}`—
 *  viaja ADENTRO, intacto, y sale sin una sola clave de más. Mezclar las dos
 *  cosas es lo que obliga a elegir entre un rótulo que se lee y un objeto que el
 *  servidor acepta; separadas, se tienen las dos.
 *
 *      instancia de la UI            lo que viaja
 *      ────────────────────          ────────────
 *      id, clase, rótulo       →     (nada)
 *      where                   →     {field, operator, value}
 *      level                   →     {field, grain}
 *
 *  ── Un rótulo es lo ÚNICO que distingue a un filtro de código ───────
 *
 *  «Sólo vencidas» y «estado = vencida» son la misma instancia; una trae su
 *  nombre puesto porque alguien la pensó antes y la otra se describe sola. No
 *  hay dos mecanismos: hay uno, con o sin nombre.
 * ==================================================================== */

/** Cómo se juntan las instancias de un nodo. `not` niega lo que tiene adentro. */
export type CriteriaJoin = "all" | "any" | "not";

/**
 * UNA INSTANCIA de lo que la barra tiene puesto.
 *
 * Tres formas y ninguna de más: un nivel de agrupado, un filtro, o un nodo que
 * junta filtros. Un nodo NO junta grupos — «año y mes» no se cruza con Y, se
 * anida, y para eso el orden de la lista ya es la jerarquía.
 */
export type SearchCriteria =
  | {
      id: string;
      kind: "group";
      /** Cómo se lee: «registrado · mes». Lo pone quien conoce el modelo. */
      label: string;
      /** Lo que viaja: por qué campo se parte y con qué grano. */
      level: GroupLevel;
    }
  | {
      id: string;
      kind: "filter";
      /** Cómo se lee. Un filtro declarado trae el suyo; uno escrito en la barra
       *  se describe solo, con las palabras del modelo. */
      label: string;
      /**
       * Lo que viaja, en la forma del motor y sin una clave de más.
       *
       * FALTA cuando el recorte no se puede preguntar: «con entregas pendientes» se define
       * con datos de otro contexto y ningún `where` sobre esta tabla lo
       * contesta. La instancia existe igual —se ve, se cuenta, se saca— y lo
       * contesta quien la declaró. Sin esto, un recorte así no era una instancia
       * de nada: se dibujaba en el menú y tildarlo no hacía nada.
       */
      where?: BuiltCondition | BuiltFilter;
    }
  | {
      id: string;
      kind: "join";
      join: CriteriaJoin;
      of: readonly SearchCriteria[];
    };

/** El camino hasta una instancia, por índice desde la raíz. Es su identidad: dos
 *  instancias pueden decir lo mismo en ramas distintas, y tocar una no puede
 *  abrir la otra. */
export type CriteriaPath = readonly number[];

/** Una instancia de agrupado, ya estrechada: los de grupo nunca son un nodo, así
 *  que quien los dibuja no tiene que preguntarse si tienen rótulo. */
export type GroupCriteria = Extract<SearchCriteria, { kind: "group" }>;

/** Las instancias de agrupado, en orden. Van SIEMPRE a la izquierda y no se
 *  cruzan con nada: el orden ES la jerarquía. */
export function groupsOf(all: readonly SearchCriteria[]): GroupCriteria[] {
  return all.filter((one): one is GroupCriteria => one.kind === "group");
}

/** Las de filtro, que son las que se anidan. */
export function filtersOf(all: readonly SearchCriteria[]): SearchCriteria[] {
  return all.filter((one) => one.kind !== "group");
}

/** La instancia que hay en esa ruta, si hay alguna. */
export function at(
  all: readonly SearchCriteria[],
  path: CriteriaPath,
): SearchCriteria | undefined {
  const [head, ...rest] = path;
  if (head === undefined) return undefined;
  const here = all[head];
  if (here === undefined) return undefined;
  if (rest.length === 0) return here;
  return here.kind === "join" ? at(here.of, rest) : undefined;
}

/** El mismo árbol con una instancia cambiada. Devolver uno nuevo y no tocar el
 *  viejo es lo que deja comparar antes y después —y deshacer. */
export function replaceAt(
  all: readonly SearchCriteria[],
  path: CriteriaPath,
  next: SearchCriteria,
): SearchCriteria[] {
  const [head, ...rest] = path;
  if (head === undefined) return [...all];
  return all.map((one, index) => {
    if (index !== head) return one;
    if (rest.length === 0) return next;
    return one.kind === "join" ? { ...one, of: replaceAt(one.of, rest, next) } : one;
  });
}

/**
 * El mismo árbol sin esa instancia.
 *
 * Un nodo que se queda con un solo hijo se DESARMA: «cualquiera de: (a)» es un
 * paréntesis alrededor de nada, y dejarlo obliga a leer un grupo que no agrupa.
 */
export function removeAt(
  all: readonly SearchCriteria[],
  path: CriteriaPath,
): SearchCriteria[] {
  const [head, ...rest] = path;
  if (head === undefined) return [...all];
  if (rest.length === 0) return all.filter((_, index) => index !== head);
  return all.flatMap((one, index) => {
    if (index !== head || one.kind !== "join") return [one];
    const inside = removeAt(one.of, rest);
    if (inside.length === 0) return [];
    if (inside.length === 1 && one.join !== "not") return inside;
    return [{ ...one, of: inside }];
  });
}

/** Cómo se juntan los de un nodo: `all` → `any` → `not` y vuelta a empezar. Es
 *  la misma rueda que el selector muestra abierta, para quien prefiera el
 *  atajo. */
export function nextJoin(join: CriteriaJoin): CriteriaJoin {
  return join === "all" ? "any" : join === "any" ? "not" : "all";
}

/** Un id que no choca con otro. Corto, porque se lee en el DOM. */
export function criteriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Una instancia de agrupado, a partir de un nivel ya legible. */
export function groupCriteria(level: GroupLevel, label: string): SearchCriteria {
  return { id: criteriaId("g"), kind: "group", label, level };
}

/** Una instancia de filtro. `label` es lo único que distingue a uno declarado en
 *  código de uno escrito en la barra; sin `where`, es uno que sólo contesta
 *  quien lo declaró. */
export function filterCriteria(
  where: BuiltCondition | BuiltFilter | undefined,
  label: string,
  id?: string,
): SearchCriteria {
  return {
    id: id ?? criteriaId("f"),
    kind: "filter",
    label,
    ...(where === undefined ? {} : { where }),
  };
}

/**
 * Lo que VIAJA: el `where` del motor, armado con las instancias de filtro.
 *
 * Es lo único que sale de acá hacia afuera, y sale sin rótulos, sin ids y sin
 * clases: la UI se queda con lo que la UI necesita.
 */
export function whereOf(all: readonly SearchCriteria[]): BuiltFilter | undefined {
  const parts = filtersOf(all)
    .map(expressionOf)
    .filter((one): one is BuiltFilter => one !== undefined);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return { all: parts };
}

function expressionOf(one: SearchCriteria): BuiltFilter | undefined {
  if (one.kind === "group") return undefined;
  /* Una instancia sin `where` no viaja: no hay manera de preguntarla, y mandar
     algo parecido sería contestar otra cosa. La contesta quien la declaró. */
  if (one.kind === "filter") return one.where;
  const inside = one.of
    .map(expressionOf)
    .filter((each): each is BuiltFilter => each !== undefined);
  if (inside.length === 0) return undefined;
  if (one.join === "not") {
    const only = inside.length === 1 ? inside[0]! : { any: inside };
    return { negate: only };
  }
  if (inside.length === 1) return inside[0];
  return one.join === "all" ? { all: inside } : { any: inside };
}

/** Los niveles que viajan, en orden. */
export function levelsOf(all: readonly SearchCriteria[]): GroupLevel[] {
  return groupsOf(all).flatMap((one) => (one.kind === "group" ? [one.level] : []));
}

export type { GroupGrain, GroupLevel };

/* ---------------------------------------------------------------- *
 *  Las dos operaciones que todo consumidor necesita
 * ---------------------------------------------------------------- */

/**
 * Los niveles de agrupado, puestos al día.
 *
 * Reemplaza TODAS las instancias de grupo por las que salen de `levels`, y no
 * toca ninguna de filtro. Existe porque el control de niveles es una lista
 * ordenada que se edita entera —se agrega, se saca, se mueve— y reconciliarla
 * instancia por instancia desde afuera es el mismo bucle escrito en cada
 * pantalla.
 *
 * Los de grupo quedan ADELANTE, que es donde se dibujan.
 */
export function withLevels(
  all: readonly SearchCriteria[],
  levels: readonly GroupLevel[],
  labelOf: (level: GroupLevel) => string,
): SearchCriteria[] {
  return [...levels.map((level) => groupCriteria(level, labelOf(level))), ...filtersOf(all)];
}

/**
 * Un filtro CON NOMBRE, puesto o sacado.
 *
 * Es lo único que hace un filtro declarado en código: traer su rótulo y su
 * condición ya pensadas. Tildarlo lo agrega, destildarlo lo saca, y se reconoce
 * por su `id` — el mismo que declaró quien lo escribió, así que sobrevive a
 * guardarlo como favorito y volver a leerlo.
 */
export function toggleNamed(
  all: readonly SearchCriteria[],
  named: { id: string; label: string; where?: BuiltCondition | BuiltFilter },
): SearchCriteria[] {
  const at = all.findIndex((one) => one.id === named.id);
  if (at >= 0) return all.filter((_, index) => index !== at);
  return [...all, filterCriteria(named.where, named.label, named.id)];
}

/** Si ese filtro con nombre está puesto. Lo usa el panel para dibujar la marca:
 *  la marca sale de lo PUESTO y no de un estado aparte que podría discrepar. */
export function hasNamed(all: readonly SearchCriteria[], id: string): boolean {
  return all.some((one) => one.id === id);
}
