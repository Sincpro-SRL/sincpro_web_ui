"use client";

import type {
  BuiltCondition,
  BuiltFilter,
  BuiltThrough,
  CriteriaJoin,
  ThroughMatch,
} from "@sincpro/web-ui/components/search/criteria";
import {
  FieldPath,
  useFieldPathSteps,
  useModelCache,
} from "@sincpro/web-ui/components/search/FieldPath";
import { JoinWord } from "@sincpro/web-ui/components/search/JoinWord";
import { LazyJsonEditor } from "@sincpro/web-ui/components/search/LazyJsonEditor";
import {
  type FieldDefinition,
  fieldLabel,
  filterableNames,
  isFilterable,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import {
  isToMany,
  type LoadModel,
  type ModelCache,
} from "@sincpro/web-ui/components/search/paths";
import { opLabel, sayCondition } from "@sincpro/web-ui/components/search/query";
import { currentCopy, fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

/* ====================================================================== *
 *  UN FILTRO QUE ALGUIEN ARMA, DE LO QUE EL MODELO DICE QUE ACEPTA.
 *
 *  Los recortes con nombre de al lado —«vencidas», «con entregas pendientes»— son las
 *  preguntas que alguien ya pensó. Esto es para las demás: elegir un campo, un
 *  operador, escribir un valor — agruparlos con Y o con O, anidar un grupo
 *  adentro de otro tantas veces como haga falta, o escribir directamente el
 *  JSON para copiar o pegar una criteria entera.
 *
 *  **Nada acá está escrito a mano.** Los campos salen de la definición del
 *  modelo que manda el servidor, y también los operadores de cada uno: un
 *  campo de texto ofrece «contiene», uno numérico ofrece «>», uno que admite
 *  vacío ofrece «está vacío». Agregar una columna la hace aparecer acá, con
 *  sus operadores correctos, sin tocar este archivo.
 *
 *  **Un árbol, no una lista.** Cada grupo —la raíz incluida— tiene su propio
 *  «todas / cualquiera» y sus propios hijos: una condición, o otro grupo
 *  anidado adentro. El ícono del árbol agrega un grupo nuevo al lado de la
 *  fila que se tocó; el `+` agrega otra condición.
 *
 *  **Un solo componente renderiza y construye — y siempre hay un JSON al
 *  lado.** El árbol y el editor de código son dos vistas de la MISMA
 *  criteria, sincronizadas en las dos direcciones: tocar el árbol reescribe
 *  el JSON, y escribir un JSON reconocible rehace el árbol. Lo único que el
 *  árbol no sabe construir ni mostrar es un NOT: si el filtro trae uno en
 *  cualquier nivel, se dibuja de sólo lectura con `ExpressionView` en su
 *  lugar, y el JSON sigue siendo la manera de tocarlo.
 * ====================================================================== */

/* Cómo se llama un operador para quien lo lee: `copy.ops`, que es la MISMA tabla que usa la
   barra al armar la pregunta. Dos tablas es que la misma comparación se llame de dos maneras
   en la misma pantalla. */

/** Qué operadores no llevan valor: preguntar si algo está vacío no necesita escribir nada. */
const WITHOUT_VALUE = new Set(["is null"]);

/** Qué operadores comparan contra DOS valores. «Entre el 1 y el 31» es la pregunta que todo
 *  el mundo hace sobre fechas, y escribirla como dos reglas sueltas es la forma de
 *  equivocarse con uno de los dos extremos. */
const WITH_RANGE = new Set(["between"]);

/** Qué clase de input pide un valor, leído del tipo del campo. */
function inputType(type: string): string {
  if (type === "integer" || type === "number") return "number";
  if (type === "date") return "date";
  if (type === "datetime") return "datetime-local";
  return "text";
}

function isCondition(value: unknown): value is BuiltCondition {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).field === "string" &&
    typeof (value as Record<string, unknown>).operator === "string" &&
    "value" in (value as Record<string, unknown>)
  );
}

/** Si esto es una de las formas que el filtro reconoce — condición, o grupo `all`/`any`/
 *  `negate`. Un JSON válido que no es ninguna de éstas —`{}`, `{"foo": 1}`, un array suelto—
 *  no es un filtro que este componente sepa dibujar, y se trata como error de forma en vez de
 *  intentar mostrar cualquier cosa. */
export function isRecognizedFilter(value: unknown): value is BuiltFilter {
  if (isCondition(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.all)) return true;
  if (Array.isArray(record.any)) return true;
  if ("negate" in record) return true;
  if (isThrough(record)) return true;
  return false;
}

const MATCHES: readonly ThroughMatch[] = ["any", "none", "all"];

function isThrough(value: unknown): value is BuiltThrough {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.through === "string" && "selection" in record;
}

function isNegate(value: unknown): value is { negate: BuiltFilter } {
  return typeof value === "object" && value !== null && "negate" in value;
}

/** A relation crossed, with the quantifier its shape says. */
interface Crossed {
  through: string;
  match: ThroughMatch;
  /** What the records reached have to answer — already without the quantifier's `negate`. */
  selection: BuiltFilter;
}

/**
 * A relation crossed, read off criteria's shape: the quantifier is not a key, it is the
 * sentence the `negate`s around the `through` make.
 *
 *      {through, selection: s}                       «alguno»    s
 *      {negate: {through, selection: s}}             «ninguno»   s
 *      {negate: {through, selection: {negate: s}}}   «todos»     s  (none that does not)
 *
 * «Ninguno con no-s» and «todos con s» are the same filter; it reads as the second, the
 * shorter sentence, and that is also how a path of two hops comes back: «ninguna línea con
 * ningún impuesto» returns as «todas las líneas con algún impuesto», which filters the same.
 * Anything else is not a relation crossed: `null`.
 */
function crossedOf(value: unknown): Crossed | null {
  if (isThrough(value)) {
    return { through: value.through, match: "any", selection: value.selection };
  }
  if (!isNegate(value) || !isThrough(value.negate)) return null;
  const { through, selection } = value.negate;
  return isNegate(selection)
    ? { through, match: "all", selection: selection.negate }
    : { through, match: "none", selection };
}

/** The other way: a relation and its quantifier, written the way criteria reads them. */
function crossing(through: string, match: ThroughMatch, inner: BuiltFilter): BuiltFilter {
  if (match === "none") return { negate: { through, selection: inner } };
  if (match === "all") return { negate: { through, selection: { negate: inner } } };
  return { through, selection: inner };
}

/** Whether a «some» crossing reaches ONE record: a to-one relation, as the model says. Then
 *  it is said as a path («Cliente > País»), since «alguno de» would be noise. Without the
 *  model it is said as what `{through, selection}` means — «alguno de» —, never wrong. */
function reachesOne(model: ModelDefinition | undefined, crossed: Crossed): boolean {
  const field = model?.fields[crossed.through];
  return crossed.match === "any" && field !== undefined && !isToMany(field);
}

/* ---------------------------------------------------------------------- *
 *  EL ÁRBOL EDITABLE — una condición, o un grupo con sus hijos adentro.
 * ---------------------------------------------------------------------- */

/** One relation crossed on the way to a condition's field: «Líneas», and how many of the
 *  lines have to match. Whether the relation reaches many is the MODEL's to say, not the
 *  hop's: criteria's `{through, selection}` does not carry it, so a hop read back from a
 *  filter could not know it. A to-one relation keeps `"any"` — the one record it reaches. */
export interface TreeHop {
  field: string;
  match: ThroughMatch;
}

export interface TreeCondition {
  kind: "condition";
  /** The relations crossed before `field`, in order: `Líneas > Impuestos` of «Líneas >
   *  Impuestos > Monto». Absent or empty = a field of the record itself. */
  through?: TreeHop[];
  /** The LAST field of the path: the one compared. Its operators and its type decide the
   *  rest of the row. */
  field: string;
  operator: string;
  value: string;
  /** El otro extremo, para los operadores que comparan contra dos —hoy `between`—. Vacío en
   *  todos los demás, donde no significa nada. */
  upper?: string;
}

export interface TreeGroup {
  kind: "group";
  /** Todas, cualquiera, o NINGUNA. Las tres, y las mismas que la barra: negar
   *  algo se podía escribir sólo en el JSON, y una pregunta que el editor no
   *  sabe construir es una pregunta que la mayoría no va a hacer. */
  join: CriteriaJoin;
  children: TreeNode[];
}

export type TreeNode = TreeCondition | TreeGroup;

export function blankCondition(
  model: ModelDefinition,
  first: string | undefined,
): TreeCondition {
  const field = first ?? "";
  return {
    kind: "condition",
    field,
    operator: model.fields[field]?.ops[0] ?? "=",
    value: "",
  };
}

export function blankGroup(model: ModelDefinition, first: string | undefined): TreeGroup {
  return { kind: "group", join: "all", children: [blankCondition(model, first)] };
}

/** El árbol como el filtro que viaja.
 *
 *      in   condición sola
 *      out  esa condición, sin envolver
 *
 *      in   grupo con dos hijos, join «any»
 *      out  {any: [ … , … ]}
 *
 *  Un grupo de un solo hijo no se envuelve —es ese hijo—, y un grupo sin hijos desaparece: ni
 *  «todas» ni «cualquiera» vacío es un filtro que alguien pidió. La regla vale en cualquier
 *  nivel, no sólo en la raíz, así que anidar un grupo de una condición sola es lo mismo que no
 *  haberlo anidado. */
export function treeToFilter(node: TreeNode): BuiltFilter | undefined {
  if (node.kind === "condition") {
    const leaf = conditionToFilter(node);
    return leaf === undefined ? undefined : wrapThrough(node.through ?? [], leaf);
  }
  return groupToFilter(node);
}

/** The relations of a path, as nested `through` nodes around the condition: the first hop
 *  outside, the last one next to the condition — the order the path reads in. */
function wrapThrough(hops: readonly TreeHop[], leaf: BuiltFilter): BuiltFilter {
  return hops.reduceRight<BuiltFilter>(
    (inner, hop) => crossing(hop.field, hop.match, inner),
    leaf,
  );
}

function conditionToFilter(node: TreeCondition): BuiltFilter | undefined {
  {
    if (node.field === "") return undefined;

    if (WITHOUT_VALUE.has(node.operator)) {
      return { field: node.field, operator: node.operator, value: true };
    }

    if (WITH_RANGE.has(node.operator)) {
      /* Un rango a medio escribir no es medio rango: mientras falte un extremo, la regla no
         viaja. */
      if (node.value === "" || (node.upper ?? "") === "") return undefined;
      return { field: node.field, operator: node.operator, value: [node.value, node.upper] };
    }

    /* **Una regla sin valor no filtra.** Viajaba con `value: ""`, y eso no es «todavía no
       escribí nada»: contra un `=` es «el campo es la cadena vacía», que vacía la lista
       mientras alguien sigue tipeando, y contra un `like` es «contiene nada», que la deja
       igual. Para preguntar por lo que está vacío está el operador «está vacío», que el
       modelo publica en los campos que lo admiten — explícito, y no por omisión. */
    if (node.value === "") return undefined;

    return { field: node.field, operator: node.operator, value: node.value };
  }
}

function groupToFilter(node: TreeGroup): BuiltFilter | undefined {
  const kept = node.children
    .map(treeToFilter)
    .filter((one): one is BuiltFilter => one !== undefined);

  if (kept.length === 0) return undefined;
  /* «Ninguna» niega el grupo ENTERO y no cada hijo por su cuenta: «ni vencida ni
     grande» es `no (vencida o grande)`. Y un grupo de uno tampoco se desarma
     acá —desarmarlo perdería la negación—, que es lo mismo que hace la barra. */
  if (node.join === "not") {
    return { negate: kept.length === 1 ? kept[0]! : { any: kept } };
  }
  if (kept.length === 1) return kept[0]!;
  return node.join === "any" ? { any: kept } : { all: kept };
}

/** Una condición de vuelta a una fila editable: el valor vuelve a texto, que es lo único que
 *  un `<input>` sabe mostrar. Una lista —el valor de un `in`— se escribe separada por comas. */
function conditionToTree(condition: BuiltCondition): TreeCondition {
  if (WITH_RANGE.has(condition.operator) && Array.isArray(condition.value)) {
    const [from, to] = condition.value;
    return {
      kind: "condition",
      field: condition.field,
      operator: condition.operator,
      value: String(from ?? ""),
      upper: String(to ?? ""),
    };
  }

  return {
    kind: "condition",
    field: condition.field,
    operator: condition.operator,
    value: WITHOUT_VALUE.has(condition.operator)
      ? ""
      : Array.isArray(condition.value)
        ? condition.value.join(",")
        : String(condition.value ?? ""),
  };
}

/** El filtro leído de vuelta a un árbol.
 *
 *      in   {field: "name", operator: "=", value: "labs"}
 *      out  TreeCondition
 *
 *      in   {any: [{all: [cond1, cond2]}, cond3]}       grupo adentro de grupo
 *      out  TreeGroup(any) con un TreeGroup(all) y una condición como hijos
 *
 *      in   {negate: {any: [cond1, cond2]}}
 *      out  TreeGroup(not) con las dos condiciones como hijos
 *
 *  El `negate` de un `any` se abre en el grupo «ninguna» y no queda como un grupo
 *  adentro de otro: es lo que `treeToFilter` vuelve a escribir, así que ida y
 *  vuelta dan lo mismo. Lo que NO se puede leer —un objeto que no es ni una
 *  condición ni ninguna de las tres formas— devuelve `null`, y ahí el componente
 *  lo muestra de sólo lectura sin dejar de poder tocarlo como JSON.
 */
export function treeFromFilter(filter: unknown): TreeNode | null {
  if (isCondition(filter)) return conditionToTree(filter);

  /* A chain of relations ending in ONE condition is one row with its path. A chain that ends
     in a group («alguna línea con impuesto > 10 Y cantidad > 2», both about the SAME line)
     cannot be a row: the tree shows it read-only and the JSON stays the way to edit it.
     Read before `negate`: «ninguna línea con…» is a `negate` around a `through`, and it is
     one row with its quantifier, not a group. */
  const hops: TreeHop[] = [];
  let node: unknown = filter;
  for (let crossed = crossedOf(node); crossed !== null; crossed = crossedOf(node)) {
    hops.push({ field: crossed.through, match: crossed.match });
    node = crossed.selection;
  }
  if (hops.length > 0) {
    return isCondition(node) ? { ...conditionToTree(node), through: hops } : null;
  }

  if (typeof filter !== "object" || filter === null) return null;
  const record = filter as Record<string, unknown>;

  if ("negate" in record) {
    const inside = record.negate;
    /* Un `negate` de un `any` son los hijos del grupo negado; cualquier otra cosa
       es un solo hijo. */
    const raws =
      typeof inside === "object" &&
      inside !== null &&
      Array.isArray((inside as Record<string, unknown>).any)
        ? ((inside as Record<string, unknown>).any as unknown[])
        : [inside];
    const children = readChildren(raws);
    return children === null ? null : { kind: "group", join: "not", children };
  }

  const join: CriteriaJoin | null = Array.isArray(record.all)
    ? "all"
    : Array.isArray(record.any)
      ? "any"
      : null;
  if (join === null) return null;

  const children = readChildren(record[join] as unknown[]);
  return children === null ? null : { kind: "group", join, children };
}

/** Los hijos de un grupo, o `null` si alguno no se puede leer: medio árbol es
 *  peor que ninguno, porque dibuja algo que no es lo que filtra. */
function readChildren(raws: readonly unknown[]): TreeNode[] | null {
  const children: TreeNode[] = [];
  for (const raw of raws) {
    const child = treeFromFilter(raw);
    if (child === null) return null;
    children.push(child);
  }
  return children;
}

function stringifyFilter(filter: BuiltFilter | undefined): string {
  return filter === undefined ? "" : JSON.stringify(filter, null, 2);
}

/** Un valor de condición, legible: una lista se junta con comas, y lo que no tiene nada se
 *  dice en palabras en vez de mostrar `true`/`undefined` sueltos. */
function describeValue(value: unknown, operator?: string): string {
  const copy = currentCopy();
  if (Array.isArray(value)) {
    return operator !== undefined && WITH_RANGE.has(operator)
      ? value.join(` ${copy.search.and} `)
      : value.join(", ");
  }
  /* Las mismas dos palabras que la tabla pone en una celda booleana: un `sí` que
     no es el `sí` de al lado es una segunda manera de decir lo mismo. */
  if (typeof value === "boolean") return value ? copy.table.yes : copy.table.no;
  return String(value ?? "");
}

/** El filtro dicho en una línea, para una ficha o un rótulo.
 *
 *      in   {field: "row_count", operator: ">", value: 1000}, con el modelo
 *      out  'filas mayor que 1000'
 *
 *      in   {all: [cond1, cond2]}
 *      out  'el nombre contiene labs y filas mayor que 1000'
 *
 *      in   {any: [cond1, cond2]}
 *      out  'el nombre es a o el nombre es b'
 *
 *  Cada condición la dice `sayCondition`, que es la misma que usa la barra: sin
 *  eso, lo escrito en la barra y lo armado en el diálogo se leen distinto aunque
 *  filtren igual, y nadie sabe cuál de las dos frases es la que manda.
 *
 *  **El modelo es el que sabe cómo se llama un campo.** Sin él queda el nombre
 *  crudo —`row_count`—, que es lo mejor que se puede decir sin preguntarle a
 *  nadie.
 *
 *  Un grupo anidado se encierra entre paréntesis, que es lo que evita que «a y (b o c)» se
 *  lea como «(a y b) o c». Para más de tres condiciones se corta: una ficha que no entra en
 *  la barra no dice nada — para eso está abrir el constructor y verlo entero. */
export function describeFilter(
  node: BuiltFilter,
  model?: ModelDefinition,
  /** The model at the end of a path of relations, when it already arrived: it names the
   *  fields of a `through`. Without it they keep their raw names. */
  modelAt?: (path: readonly string[]) => ModelDefinition | undefined,
): string {
  return say(node, model, 0, [], modelAt);
}

function say(
  node: BuiltFilter,
  model: ModelDefinition | undefined,
  depth: number,
  at: readonly string[],
  modelAt: ((path: readonly string[]) => ModelDefinition | undefined) | undefined,
): string {
  const copy = currentCopy();
  const crossed = crossedOf(node);
  if (crossed !== null) {
    /* «alguno de Líneas con alguno de Impuestos con Monto mayor que 10». The quantifier
       is a separate word and not «algún impuesto» because the model publishes the label,
       not its gender or its singular: «algún Impuestos» would be worse than neutral. */
    const relation =
      model === undefined ? crossed.through : fieldLabel(model, crossed.through, copy.locale);
    const next = [...at, crossed.through];
    const inner = say(crossed.selection, modelAt?.(next), depth + 1, next, modelAt);
    const template = reachesOne(model, crossed)
      ? copy.fieldPath.say.one
      : copy.fieldPath.say[crossed.match];
    return fillCopy(template, { relation, inner });
  }
  if ("all" in node || "any" in node) {
    const items = "all" in node ? node.all : node.any;
    const glue = "all" in node ? copy.search.and : copy.search.or;
    const said = items.slice(0, 3).map((child) => say(child, model, depth + 1, at, modelAt));
    if (items.length > 3) {
      said.push(fillCopy(copy.search.andMore, { count: items.length - 3 }));
    }
    const joined = said.join(` ${glue} `);
    return depth === 0 || said.length === 1 ? joined : `(${joined})`;
  }

  if ("negate" in node) {
    return `${copy.search.notWord} ${say(node.negate, model, depth + 1, at, modelAt)}`;
  }

  /* Every `through` was said above; anything still not a condition is not a shape of the
     grammar, and it is shown as it came rather than as a sentence it is not. */
  if (!isCondition(node)) return JSON.stringify(node);
  const label = model === undefined ? node.field : fieldLabel(model, node.field, copy.locale);
  return sayCondition(label, node.operator, describeValue(node.value, node.operator));
}

/** El filtro dibujado tal como es, recursivo: una condición es una línea, `all`/`any` son un
 *  grupo con su rótulo y sus hijos adentro, `negate` es «no» envolviendo al que niega.
 *
 *  Es la mitad de sólo lectura de este archivo, y también sirve sola: mostrar qué dice un
 *  filtro que ya está puesto no necesita abrir el constructor. */
export function ExpressionView({
  node,
  model,
  depth = 0,
  modelAt,
  at = [],
}: {
  node: BuiltFilter;
  /** Quién sabe cómo se llama un campo. Sin él queda el nombre crudo. */
  model?: ModelDefinition;
  depth?: number;
  /** El modelo al final de un camino de relaciones, si ya llegó: nombra los campos de un
   *  `through`. */
  modelAt?: (path: readonly string[]) => ModelDefinition | undefined;
  /** El camino hasta acá (por los `through` de afuera). */
  at?: readonly string[];
}) {
  const surface = useSurface();
  const copy = useUiCopy();
  const box = surface === "chrome" ? "border-chrome-ink/20" : "border-ink/15";
  const indent = depth === 0 ? "" : "ml-4";

  const crossed = crossedOf(node);
  if (crossed !== null) {
    const relation =
      model === undefined ? crossed.through : fieldLabel(model, crossed.through, copy.locale);
    const next = [...at, crossed.through];
    const inner = modelAt?.(next);
    return (
      <div className={`flex flex-col gap-1 border-l-2 pl-2 ${box} ${indent}`}>
        <p className="text-micro text-muted">
          {reachesOne(model, crossed)
            ? relation
            : `${copy.fieldPath.match[crossed.match]} · ${relation}`}
        </p>
        <ExpressionView
          node={crossed.selection}
          {...(inner === undefined ? {} : { model: inner })}
          {...(modelAt === undefined ? {} : { modelAt })}
          at={next}
          depth={depth + 1}
        />
      </div>
    );
  }

  if ("all" in node || "any" in node) {
    /* LAS MISMAS TRES PALABRAS QUE LA BARRA. Un grupo que acá se llama «coincide
       con alguna» y en la ficha «cualquiera» son dos vocabularios para una sola
       cosa, y el que los lee tiene que aprender los dos. */
    const label = "all" in node ? copy.search.joins.all : copy.search.joins.any;
    const items = "all" in node ? node.all : node.any;
    return (
      <div className={`flex flex-col gap-1 border-l-2 pl-2 ${box} ${indent}`}>
        <p className="text-micro text-muted">{label}</p>
        {/* `modelAt` and the path go down with every child: a `through` inside a group
            names its fields by the model at the end of its path, not by their raw names. */}
        {items.map((child, index) => (
          <ExpressionView
            key={index}
            node={child}
            {...(model === undefined ? {} : { model })}
            {...(modelAt === undefined ? {} : { modelAt })}
            at={at}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  if ("negate" in node) {
    return (
      <div className={`flex flex-col gap-1 border-l-2 pl-2 ${box} ${indent}`}>
        <p className="text-micro text-muted">{copy.search.joins.none}</p>
        <ExpressionView
          node={node.negate}
          {...(model === undefined ? {} : { model })}
          {...(modelAt === undefined ? {} : { modelAt })}
          at={at}
          depth={depth + 1}
        />
      </div>
    );
  }

  /* Y la misma frase que la ficha: una condición se lee igual esté donde esté. */
  return <p className={`text-meta ${indent}`}>{describeFilter(node, model)}</p>;
}

/* ---------------------------------------------------------------------- *
 *  UN GRUPO, DIBUJADO — la pieza que se llama a sí misma para anidar.
 * ---------------------------------------------------------------------- */

export function SelectionTree({
  model,
  group,
  onChange,
  depth = 0,
  focus,
  loadModel,
  models: shared,
}: {
  model: ModelDefinition;
  group: TreeGroup;
  onChange: (next: TreeGroup) => void;
  depth?: number;
  /**
   * El campo de la condición que hay que mostrar PRIMERO: la que alguien tocó en
   * la barra.
   *
   * Sin esto, tocar una ficha abría el constructor en la regla uno y había que
   * buscar entre doce la que uno venía mirando — que es la manera más rápida de
   * editar la equivocada. Se marca y se lleva a la vista; no se abre en un modo
   * distinto, porque el constructor es el mismo.
   *
   * Marca a CUALQUIER profundidad: el árbol se lo pasa a los grupos que anida.
   *
   * **Es un nombre de campo, no una ruta**, así que dos condiciones sobre el
   * mismo campo en ramas distintas se marcan las dos y la vista va a la primera.
   * Distinguirlas pide que el árbol y las instancias de la barra compartan la
   * identidad, y hoy no la comparten: `selectionOf` arma el filtro salteándose los
   * niveles y lo que no viaja, así que la posición en uno no es la posición en
   * el otro.
   */
  focus?: string;
  /** El modelo al final de un camino de relaciones. Con esto, el campo de cada regla puede
   *  ser uno de un registro relacionado («Líneas > Impuestos > Monto»). */
  loadModel?: LoadModel;
  /** La caché de modelos que comparten las reglas. La arma el árbol de afuera. */
  models?: ModelCache;
}) {
  const names = filterableNames(model);
  const copy = useUiCopy();
  const surface = useSurface();
  const models = useModelCache(model, loadModel, shared);
  const box =
    surface === "chrome"
      ? "border-chrome-ink/20 bg-chrome text-chrome-ink"
      : "border-ink/15 bg-surface text-ink";

  function setChild(index: number, next: TreeNode) {
    onChange({
      ...group,
      children: group.children.map((c, at) => (at === index ? next : c)),
    });
  }

  function addConditionAfter(index: number) {
    onChange({
      ...group,
      children: [
        ...group.children.slice(0, index + 1),
        blankCondition(model, names[0]),
        ...group.children.slice(index + 1),
      ],
    });
  }

  function addGroupAfter(index: number) {
    onChange({
      ...group,
      children: [
        ...group.children.slice(0, index + 1),
        blankGroup(model, names[0]),
        ...group.children.slice(index + 1),
      ],
    });
  }

  function removeAt(index: number) {
    onChange({ ...group, children: group.children.filter((_, at) => at !== index) });
  }

  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-control border p-2 ${box}`}>
      {/* LA MISMA PALABRA QUE LA BARRA, y el mismo control: un `<select>` acá y
          una lista de fichas allá son dos maneras de decidir lo mismo, y el que
          aprendió una no reconoce la otra. */}
      <p className="flex flex-wrap items-baseline gap-1 text-meta">
        {copy.search.askJoin}
        <JoinWord join={group.join} onChange={(join) => onChange({ ...group, join })} />
      </p>

      {group.children.map((child, index) =>
        child.kind === "group" ? (
          <div key={index} className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <SelectionTree
                model={model}
                group={child}
                onChange={(next) => setChild(index, next)}
                depth={depth + 1}
                models={models}
                {...(focus === undefined ? {} : { focus })}
              />
            </div>
            <button
              type="button"
              aria-label={copy.builder.dropGroup}
              disabled={group.children.length === 1}
              onClick={() => removeAt(index)}
              className="mt-2 text-muted disabled:opacity-30"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <ConditionRow
            key={index}
            model={model}
            models={models}
            child={child}
            box={box}
            focused={focus !== undefined && child.field === focus}
            onChange={(next) => setChild(index, next)}
            actions={
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={copy.builder.addRule}
                  onClick={() => addConditionAfter(index)}
                  className="text-muted hover:text-ink"
                >
                  <Plus className="size-4" />
                </button>

                <button
                  type="button"
                  aria-label={copy.builder.addNested}
                  onClick={() => addGroupAfter(index)}
                  className="text-muted hover:text-ink"
                >
                  <FolderTree className="size-4" />
                </button>

                <button
                  type="button"
                  aria-label={copy.builder.dropRule}
                  disabled={group.children.length === 1}
                  onClick={() => removeAt(index)}
                  className="text-muted disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </span>
            }
          />
        ),
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- *
 *  UNA REGLA — el camino hasta el campo, cuántos de cada relación, el operador y el valor.
 * ---------------------------------------------------------------------- */

function ConditionRow({
  model,
  models,
  child,
  box,
  focused,
  onChange,
  actions,
}: {
  model: ModelDefinition;
  models: ModelCache;
  child: TreeCondition;
  box: string;
  focused: boolean;
  onChange: (next: TreeCondition) => void;
  actions: ReactNode;
}) {
  const copy = useUiCopy();
  const hops = child.through ?? [];
  const path = child.field === "" ? [] : [...hops.map((hop) => hop.field), child.field];
  const steps = useFieldPathSteps(models, path);
  /* El operador y el valor salen del ÚLTIMO campo del camino: «Monto», alcanzado por dos
     relaciones, se compara como un número y no como la relación por la que se llegó. Una
     regla de la raíz lo sabe sin esperar a nadie. */
  const leaf =
    steps?.at(-1)?.field ?? (hops.length === 0 ? model.fields[child.field] : undefined);
  const ops = leaf?.ops ?? [];
  const type = leaf?.type ?? "text";

  function choosePath(
    next: readonly string[],
    found: readonly { name: string; field: FieldDefinition }[],
  ) {
    const last = found.at(-1);
    if (last === undefined) return;
    const nextHops = found.slice(0, -1).map((step, at) => ({
      field: step.name,
      /* Cambiar el campo final no reinicia la ficha de una relación que sigue en el camino. */
      match: hops[at]?.field === step.name ? hops[at]!.match : ("any" as ThroughMatch),
    }));
    onChange({
      ...child,
      through: nextHops.length === 0 ? undefined : nextHops,
      field: next[next.length - 1] ?? "",
      operator: last.field.ops.includes(child.operator)
        ? child.operator
        : (last.field.ops[0] ?? "="),
    });
  }

  function setMatch(at: number, match: ThroughMatch) {
    onChange({
      ...child,
      through: hops.map((hop, i) => (i === at ? { ...hop, match } : hop)),
    });
  }

  return (
    <div
      /* La que se vino a ver se marca y se trae a la vista. El anillo y no
         un fondo: el fondo compite con el `select` que hay que tocar. */
      ref={focused ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
      className={`flex min-w-0 flex-wrap items-center gap-2 rounded-control ${
        focused ? "-m-1 p-1 ring-1 ring-primary/60" : ""
      }`}
    >
      <FieldPath
        model={model}
        models={models}
        value={path}
        label={copy.builder.ruleField}
        filter={(field) => isFilterable(field)}
        onChange={choosePath}
      />

      {/* UNA FICHA POR CADA RELACIÓN A MUCHOS del camino: «alguna línea», «ninguna línea»,
          «todas las líneas» son tres preguntas distintas y el camino solo no dice cuál. Si la
          relación llega a muchos lo dice el modelo; un cuantificador que no es «alguno» se ve
          aunque el modelo no haya llegado, porque esconderlo es esconder lo que la regla
          pregunta. */}
      {hops.map((hop, at) => {
        const step = steps?.[at];
        const many = step !== undefined && isToMany(step.field);
        return hop.match !== "any" || many ? (
          <label
            key={`${hop.field}-${at}`}
            className={`flex min-w-0 shrink-0 items-center gap-1 rounded-control border px-2 py-0.5 text-micro ${box}`}
          >
            <span className="max-w-32 truncate text-muted">{step?.label ?? hop.field}</span>
            <select
              aria-label={fillCopy(copy.fieldPath.match.label, {
                relation: step?.label ?? hop.field,
              })}
              value={hop.match}
              onChange={(event) => setMatch(at, event.target.value as ThroughMatch)}
              className="bg-transparent text-micro font-medium"
            >
              {MATCHES.map((match) => (
                <option key={match} value={match}>
                  {copy.fieldPath.match[match]}
                </option>
              ))}
            </select>
          </label>
        ) : null;
      })}

      <select
        aria-label={copy.builder.ruleOperator}
        value={child.operator}
        onChange={(event) => onChange({ ...child, operator: event.target.value })}
        className={`min-w-0 flex-1 basis-36 rounded-control border px-2 py-1 text-meta ${box}`}
      >
        {ops.map((operator) => (
          <option key={operator} value={operator}>
            {opLabel(operator)}
          </option>
        ))}
      </select>

      {WITHOUT_VALUE.has(child.operator) ? (
        <span className="flex-1 text-meta text-muted">{copy.builder.noValue}</span>
      ) : WITH_RANGE.has(child.operator) ? (
        <span className="flex min-w-0 flex-1 basis-40 items-center gap-1">
          <input
            type={inputType(type)}
            value={child.value}
            onChange={(event) => onChange({ ...child, value: event.target.value })}
            placeholder={copy.builder.from}
            className={`min-w-0 flex-1 rounded-control border px-2 py-1 text-meta ${box}`}
          />
          <span className="shrink-0 text-micro text-muted">{copy.search.and}</span>
          <input
            type={inputType(type)}
            value={child.upper ?? ""}
            onChange={(event) => onChange({ ...child, upper: event.target.value })}
            placeholder={copy.builder.to}
            className={`min-w-0 flex-1 rounded-control border px-2 py-1 text-meta ${box}`}
          />
        </span>
      ) : (
        <input
          type={inputType(type)}
          value={child.value}
          onChange={(event) => onChange({ ...child, value: event.target.value })}
          placeholder={copy.builder.value}
          className={`min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`}
        />
      )}

      {actions}
    </div>
  );
}

export function FilterBuilder({
  model,
  initial,
  onApply,
  onCancel,
  loadModel,
  models: shared,
}: {
  model: ModelDefinition;
  /** El modelo al final de un camino de relaciones. Con esto, una regla puede preguntar por
   *  un campo de un registro relacionado: «alguna línea con algún impuesto con monto > 10».
   *  web-ui no pide nada: quien dibuja el constructor sabe de dónde salen los modelos. */
  loadModel?: LoadModel;
  /** Una caché de modelos compartida con quien dibuja el constructor —la misma que usa para
   *  describir el filtro aplicado con `describeFilter(…, modelAt)`—. Sin esto, una propia. */
  models?: ModelCache;
  /** El filtro que ya estaba puesto, si había uno. Reabrir el constructor con esto adentro
   *  tiene que seguir donde quedó, no empezar en blanco. */
  initial?: BuiltFilter;
  onApply: (selection: BuiltFilter | undefined) => void;
  onCancel?: () => void;
}) {
  const names = filterableNames(model);
  const models = useModelCache(model, loadModel, shared);

  const copy = useUiCopy();
  const decomposed = initial === undefined ? null : treeFromFilter(initial);
  const [tree, setTree] = useState<TreeGroup>(() =>
    decomposed !== null && decomposed.kind === "group"
      ? decomposed
      : decomposed !== null
        ? { kind: "group", join: "all", children: [decomposed] }
        : blankGroup(model, names[0]),
  );
  const [lockedView, setLockedView] = useState<BuiltFilter | null>(
    initial !== undefined && decomposed === null ? initial : null,
  );
  const [rawText, setRawText] = useState<string>(() =>
    stringifyFilter(initial ?? treeToFilter(tree)),
  );
  const [rawError, setRawError] = useState<string | null>(null);

  /* Tocar el árbol reescribe el JSON para que muestre exactamente lo que el árbol ahora dice,
     y suelta cualquier vista de sólo lectura que hubiera quedado. */
  function updateTree(next: TreeGroup) {
    setTree(next);
    setLockedView(null);
    setRawText(stringifyFilter(treeToFilter(next)));
    setRawError(null);
  }

  /* Escribir en el JSON intenta lo mismo al revés: si lo tipeado no trae un `negate` en
     ningún nivel, el árbol se rehace para mostrarlo — Y y O, a cualquier profundidad. Si trae
     uno, se dibuja de sólo lectura, pero el JSON sigue siendo lo que se va a aplicar. Si no
     es ninguna de las dos —a medio escribir, o no es un filtro— no se toca lo que ya había. */
  function updateRaw(text: string) {
    setRawText(text);
    if (text.trim() === "") {
      setRawError(null);
      setLockedView(null);
      setTree(blankGroup(model, names[0]));
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setRawError(copy.builder.invalidJson);
      return;
    }

    if (!isRecognizedFilter(parsed)) {
      setRawError(copy.builder.notFilter);
      return;
    }
    setRawError(null);

    const node = treeFromFilter(parsed);
    if (node !== null) {
      setTree(
        node.kind === "group" ? node : { kind: "group", join: "all", children: [node] },
      );
      setLockedView(null);
    } else {
      setLockedView(parsed);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      {/* El árbol tiene su propio alto y su propio scroll: anidar seis niveles no puede
          empujar al editor de código fuera del diálogo. */}
      <div className="max-h-80 min-w-0 overflow-auto">
        {lockedView !== null ? (
          <>
            <p className="text-meta text-muted">{copy.search.unreadable}</p>
            <ExpressionView node={lockedView} model={model} modelAt={models.peek} />
          </>
        ) : (
          <SelectionTree model={model} group={tree} onChange={updateTree} models={models} />
        )}
      </div>

      {/* El filtro real, en JSON: se reescribe solo mientras se toca el árbol de arriba, y se
          puede escribir o pegar acá en vez de armarlo con él — las dos vistas se mantienen
          iguales mientras lo que haya sea reconocible como filtro. */}
      <LazyJsonEditor
        value={rawText}
        onChange={updateRaw}
        error={rawError}
        label={copy.builder.jsonFilter}
      />

      <div className="flex gap-2">
        <Button
          role="primary"
          disabled={rawError !== null}
          onClick={() => onApply(rawText.trim() === "" ? undefined : JSON.parse(rawText))}
        >
          {copy.builder.add}
        </Button>
        {onCancel === undefined ? null : (
          <Button role="ghost" onClick={onCancel}>
            {copy.builder.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
