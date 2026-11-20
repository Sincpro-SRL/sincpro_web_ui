import type {
  BuiltCondition,
  BuiltFilter,
  BuiltThrough,
  CriteriaJoin,
  RecordKey,
  RecordOption,
  ThroughMatch,
} from "@sincpro/web-ui/components/search/criteria";
import { fieldLabel, type ModelDefinition } from "@sincpro/web-ui/components/search/model";
import { isToMany } from "@sincpro/web-ui/components/search/paths";
import { sayCondition } from "@sincpro/web-ui/components/search/query";
import {
  recordsFilter,
  recordsOf,
  type RecordTarget,
  recordTarget,
} from "@sincpro/web-ui/components/search/records";
import { currentCopy, fillCopy } from "@sincpro/web-ui/foundations/uiCopy";

/* ====================================================================== *
 *  THE FILTER AS A TREE — the model `FilterBuilder` draws, without React.
 *
 *  What the builder edits (`TreeNode`: groups of conditions, nested), how it goes to the
 *  engine's JSON and back (`treeToFilter`, `treeFromFilter`), which records a rule names
 *  (`liftRecords`, `namesOf`) and the filter said in one line (`describeFilter`).
 *
 *  Context: it lived inside `FilterBuilder.tsx`, which carries `"use client"`, and a React
 *  Server Components bundler turns every export of a client module into a client reference:
 *  a server component could not say a saved filter in words. Here, without the directive, it
 *  is plain logic — the same functions the builder and the tests call. See the long note at
 *  the top of `FilterBuilder.tsx` for what the builder is.
 * ====================================================================== */

/* What an operator is called for whoever reads it: `copy.ops`, which is the SAME table the
   bar uses when building the question. Two tables means the same comparison is called two ways
   on the same screen. */

/** Which operators take no value: asking whether something is empty needs nothing written. */
export const WITHOUT_VALUE = new Set(["is null", "is not null"]);

/** Which operators compare against TWO values. «Entre el 1 y el 31» is the question everybody
 *  asks about dates, and writing it as two loose rules is the way to
 *  get one of the two ends wrong. */
export const WITH_RANGE = new Set(["between"]);

/** The comparisons that take several values. */
export function takesMany(operator: string): boolean {
  return operator === "in" || operator === "not in";
}

/** What kind of input asks for a value, read from the field's type. */
export function inputType(type: string): string {
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

/** Whether this is one of the shapes the filter recognises — condition, or `all`/`any`/
 *  `negate` group. A valid JSON that is none of these —`{}`, `{"foo": 1}`, a loose array—
 *  is not a filter this component knows how to draw, and is treated as a shape error instead of
 *  trying to show anything at all. */
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

export const MATCHES: readonly ThroughMatch[] = ["any", "none", "all"];

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
export function crossedOf(value: unknown): Crossed | null {
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
export function reachesOne(model: ModelDefinition | undefined, crossed: Crossed): boolean {
  const field = model?.fields[crossed.through];
  return crossed.match === "any" && field !== undefined && !isToMany(field);
}

/* ---------------------------------------------------------------------- *
 *  THE EDITABLE TREE — a condition, or a group with its children inside.
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
  /** The other end, for the operators that compare against two —today `between`—. Empty in
   *  all the others, where it means nothing. */
  upper?: string;
  /** The value as it travels when it is not the text: `true`, `7`, a list read back — kept so
   *  a rule read from a filter goes back out the same, not as the string it is drawn with.
   *  Writing in the box drops it: what is written is then the value. */
  raw?: unknown;
  /** The values CHOSEN, with the names they are read by — records of a relation, words of an
   *  enum, «está en» a list. What travels is their `id`. */
  values?: RecordOption[];
  /** The rule asks about RECORDS of a relation: `field` is the relation itself, chosen by
   *  name and compared by key (`recordsFilter`). */
  target?: RecordTarget;
}

export interface TreeGroup {
  kind: "group";
  /** All, any, or NONE. All three, and the same as the bar's: negating
   *  something could only be written in the JSON, and a question the editor does not
   *  know how to build is a question most people will not ask. */
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

/** The tree as the filter that travels.
 *
 *      in   a lone condition
 *      out  that condition, unwrapped
 *
 *      in   group with two children, join «any»
 *      out  {any: [ … , … ]}
 *
 *  A group with a single child is not wrapped —it is that child—, and a group with no children disappears: neither
 *  an empty «todas» nor «cualquiera» is a filter anybody asked for. The rule holds at any
 *  level, not only at the root, so nesting a single-condition group is the same as not
 *  having nested it. */
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
  if (node.field === "") return undefined;

  /* A rule about records: by key, the way the relation is compared — directly by its column
     (a many2one) or crossing it (a to-many). «Está vacío» asks the column. */
  if (node.target !== undefined) {
    if (WITHOUT_VALUE.has(node.operator)) {
      return node.target.column === undefined
        ? undefined
        : { field: node.target.column, operator: node.operator, value: true };
    }
    const keys = (node.values ?? []).map((one) => one.id);
    if (keys.length === 0) return undefined;
    return recordsFilter(
      node.target,
      keys,
      node.operator === "!=" || node.operator === "not in",
    );
  }

  if (WITHOUT_VALUE.has(node.operator)) {
    return { field: node.field, operator: node.operator, value: true };
  }

  if (WITH_RANGE.has(node.operator)) {
    /* A half-written range is not half a range: while one end is missing, the rule does not
       travel. */
    if (node.value === "" || (node.upper ?? "") === "") return undefined;
    return { field: node.field, operator: node.operator, value: [node.value, node.upper] };
  }

  /* Chosen values travel as what they are —a list for «está en», the one for «es»—, by key. */
  if (node.values !== undefined && node.values.length > 0) {
    const keys = node.values.map((one) => one.id);
    return {
      field: node.field,
      operator: node.operator,
      value: node.operator === "in" || node.operator === "not in" ? keys : keys[0],
    };
  }
  if (node.raw !== undefined) {
    return { field: node.field, operator: node.operator, value: node.raw };
  }

  /* **A rule with no value does not filter.** It used to travel with `value: ""`, and that is not «not
     written anything yet»: against an `=` it is «the field is the empty string», which empties the list
     while somebody is still typing, and against a `like` it is «contains nothing», which leaves it
     the same. To ask for what is empty there is the «está vacío» operator, which the
     model publishes on the fields that admit it — explicit, and not by omission. */
  if (node.value === "") return undefined;

  return { field: node.field, operator: node.operator, value: node.value };
}

function groupToFilter(node: TreeGroup): BuiltFilter | undefined {
  const kept = node.children
    .map(treeToFilter)
    .filter((one): one is BuiltFilter => one !== undefined);

  if (kept.length === 0) return undefined;
  /* «Ninguna» negates the WHOLE group and not each child on its own: «ni vencida ni
     grande» is `not (vencida or grande)`. And a group of one is not dismantled
     here either —dismantling it would lose the negation—, which is what the bar does. */
  if (node.join === "not") {
    return { negate: kept.length === 1 ? kept[0]! : { any: kept } };
  }
  if (kept.length === 1) return kept[0]!;
  return node.join === "any" ? { any: kept } : { all: kept };
}

/** A condition back to an editable row: the value goes back to text, which is what an
 *  `<input>` shows — and stays as it came (`raw`), so the rule goes back out the same. A list
 *  —an `in`'s value— is written separated by commas, and kept as chosen values. */
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

  if (WITHOUT_VALUE.has(condition.operator)) {
    return {
      kind: "condition",
      field: condition.field,
      operator: condition.operator,
      value: "",
    };
  }

  const value = condition.value;
  return {
    kind: "condition",
    field: condition.field,
    operator: condition.operator,
    value: Array.isArray(value) ? value.join(",") : String(value ?? ""),
    ...(Array.isArray(value)
      ? { values: value.map((id) => ({ id: id as RecordKey, name: "" })) }
      : value === undefined
        ? {}
        : { raw: value }),
  };
}

/** The filter read back into a tree.
 *
 *      in   {field: "name", operator: "=", value: "labs"}
 *      out  TreeCondition
 *
 *      in   {any: [{all: [cond1, cond2]}, cond3]}       group inside a group
 *      out  TreeGroup(any) with a TreeGroup(all) and a condition as children
 *
 *      in   {negate: {any: [cond1, cond2]}}
 *      out  TreeGroup(not) with the two conditions as children
 *
 *  An `any`'s `negate` opens into the «ninguna» group and does not stay as a group
 *  inside another: it is what `treeToFilter` writes back, so there and
 *  back give the same. What can NOT be read —an object that is neither a
 *  condition nor any of the three shapes— returns `null`, and there the component
 *  shows it read-only while still letting you touch it as JSON.
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
    /* An `any`'s `negate` is the negated group's children; anything else
       is a single child. */
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

/** A group's children, or `null` if any cannot be read: half a tree is
 *  worse than none, because it draws something that is not what filters. */
function readChildren(raws: readonly unknown[]): TreeNode[] | null {
  const children: TreeNode[] = [];
  for (const raw of raws) {
    const child = treeFromFilter(raw);
    if (child === null) return null;
    children.push(child);
  }
  return children;
}

/** The operators a rule about records offers: one record or several, in or out — and, through
 *  a column that admits it, «está vacío». A to-many relation is asked by some of its records
 *  or none of them. */
export function recordOps(target: RecordTarget): string[] {
  if (target.many) return ["in", "not in"];
  const empty = ["is null", "is not null"].filter(
    (op) => target.column !== undefined && target.ops.includes(op),
  );
  return ["=", "!=", "in", "not in", ...empty];
}

/** The keys of a list read back, as chosen values not named yet. */
function unnamed(keys: readonly RecordKey[]): RecordOption[] {
  return keys.map((id) => ({ id, name: "" }));
}

/**
 * The rules about RECORDS of a relation, recognised again in a tree read back.
 *
 * A filter carries keys, never which relation they were chosen from: `customer_id in [7, 9]`
 * is, for the tree, a column compared to two numbers. The model says that `customer_id` is
 * how «Cliente» is compared, so the row is drawn as «Cliente es alguno de [Andrés Pérez,
 * Andrés Gutiérrez]» — the names asked of `searchRecords` by key. The same for a to-many
 * crossed to its key: `{through: "tags", selection: {field: "id", operator: "in", …}}` is
 * «Etiquetas es alguno de …».
 *
 *      in   {field: "customer_id", operator: "in", value: [7, 9]}  (customer_id names Cliente)
 *      out  {field: "customer", target: Cliente, operator: "in", values: [#7, #9]}
 *
 * Only on the record's own fields: a relation of a related record needs its model, and a row
 * that stays a plain condition still filters the same.
 */
export function liftRecords(
  node: TreeNode,
  model: ModelDefinition,
  /** The model at the end of a path of relations, when it already arrived: with it, a rule
   *  about records past a relation —«Cliente > País es Bolivia»— is recognised too. */
  modelAt?: (path: readonly string[]) => ModelDefinition | undefined,
): TreeNode {
  if (node.kind === "group") {
    return {
      ...node,
      children: node.children.map((child) => liftRecords(child, model, modelAt)),
    };
  }
  if (node.target !== undefined) return node;
  const hops = node.through ?? [];
  const at = (path: readonly TreeHop[]) =>
    path.length === 0 ? model : modelAt?.(path.map((hop) => hop.field));
  const keys = (): RecordKey[] =>
    node.values !== undefined
      ? node.values.map((one) => one.id)
      : typeof node.raw === "string" || typeof node.raw === "number"
        ? [node.raw]
        : [];

  /* A to-one relation compared by its column, in the model the rule's field lives in. */
  const here = at(hops);
  if (here !== undefined) {
    for (const name of Object.keys(here.fields)) {
      const target = recordTarget(here, name);
      if (target === undefined || target.many || target.column !== node.field) continue;
      if (!recordOps(target).includes(node.operator)) return node;
      return {
        kind: "condition",
        ...(hops.length === 0 ? {} : { through: hops }),
        field: name,
        operator: node.operator,
        value: "",
        target,
        ...(WITHOUT_VALUE.has(node.operator) ? {} : { values: unnamed(keys()) }),
      };
    }
  }

  /* A to-many relation crossed to its key: the LAST hop is the relation. */
  const last = hops.at(-1);
  if (last === undefined || last.match === "all") return node;
  const before = hops.slice(0, -1);
  const owner = at(before);
  const target = owner === undefined ? undefined : recordTarget(owner, last.field);
  if (target === undefined || !target.many || node.field !== target.key) return node;
  if (node.operator !== "in" && node.operator !== "=") return node;
  return {
    kind: "condition",
    ...(before.length === 0 ? {} : { through: before }),
    field: last.field,
    operator: last.match === "none" ? "not in" : "in",
    value: "",
    target,
    values: unnamed(keys()),
  };
}

/** The names of the records a tree has chosen, by relation and key: what says them in a
 *  sentence (`describeFilter`) once the tree is applied. */
export function namesOf(node: TreeNode): RecordNames {
  const known = new Map<string, string>();
  const walk = (one: TreeNode) => {
    if (one.kind === "group") return one.children.forEach(walk);
    if (one.target === undefined) return;
    for (const value of one.values ?? []) {
      if (value.name !== "") known.set(`${one.target.name}\u0000${value.id}`, value.name);
    }
  };
  walk(node);
  return (relation, key) => known.get(`${relation}\u0000${key}`);
}

/** The tree with the names that were missing, where they are known. */
export function withNames(node: TreeNode, names: ReadonlyMap<string, string>): TreeNode {
  if (node.kind === "group") {
    return { ...node, children: node.children.map((child) => withNames(child, names)) };
  }
  if (node.target === undefined || node.values === undefined) return node;
  const target = node.target;
  return {
    ...node,
    values: node.values.map((one) =>
      one.name !== ""
        ? one
        : { ...one, name: names.get(`${target.name}\u0000${one.id}`) ?? `#${one.id}` },
    ),
  };
}

/** The paths whose models a tree needs to recognise its rules about records past a relation:
 *  every prefix of the hops of a rule that is not one yet. */
export function pathsToLift(node: TreeNode): string[][] {
  const out = new Map<string, string[]>();
  const walk = (one: TreeNode) => {
    if (one.kind === "group") return one.children.forEach(walk);
    if (one.target !== undefined) return;
    const fields = (one.through ?? []).map((hop) => hop.field);
    for (let end = 1; end <= fields.length; end++) {
      const path = fields.slice(0, end);
      out.set(path.join("."), path);
    }
  };
  walk(node);
  return [...out.values()];
}

export function stringifyFilter(filter: BuiltFilter | undefined): string {
  return filter === undefined ? "" : JSON.stringify(filter, null, 2);
}

/** A condition value, legible: a list is joined with commas, and what has nothing is
 *  said in words instead of showing a bare `true`/`undefined`. */
function describeValue(value: unknown, operator?: string): string {
  const copy = currentCopy();
  if (Array.isArray(value)) {
    return operator !== undefined && WITH_RANGE.has(operator)
      ? value.join(` ${copy.search.and} `)
      : value.join(", ");
  }
  /* The same two words the table puts in a boolean cell: a `sí` that
     is not the `sí` next door is a second way of saying the same thing. */
  if (typeof value === "boolean") return value ? copy.table.yes : copy.table.no;
  return String(value ?? "");
}

/** The filter said in one line, for a chip or a label.
 *
 *      in   {field: "row_count", operator: ">", value: 1000}, with the model
 *      out  'filas mayor que 1000'
 *
 *      in   {all: [cond1, cond2]}
 *      out  'el nombre contiene labs y filas mayor que 1000'
 *
 *      in   {any: [cond1, cond2]}
 *      out  'el nombre es a o el nombre es b'
 *
 *  Each condition is said by `sayCondition`, which is the same one the bar uses: without
 *  that, what is written in the bar and what is built in the dialog read differently even though
 *  they filter the same, and nobody knows which of the two phrases is the one in charge.
 *
 *  **The model is the one that knows what a field is called.** Without it the raw
 *  name remains —`row_count`—, which is the best that can be said without asking
 *  anybody.
 *
 *  A nested group is enclosed in parentheses, which is what keeps «a y (b o c)» from being
 *  read as «(a y b) o c». Past three conditions it is cut: a chip that does not fit in
 *  the bar says nothing — that is what opening the builder and seeing it whole is for. */
export function describeFilter(
  node: BuiltFilter,
  model?: ModelDefinition,
  /** The model at the end of a path of relations, when it already arrived: it names the
   *  fields of a `through`. Without it they keep their raw names. */
  modelAt?: (path: readonly string[]) => ModelDefinition | undefined,
  /** The names of the records a filter asks for, by relation and key: «Cliente es Andrés
   *  Pérez» instead of «customer_id es 7». The builder hands its own (`namesOf`). */
  names?: RecordNames,
): string {
  return say(node, model, 0, [], modelAt, names);
}

/** A record's name by the relation it was chosen from and its key, when it is known. */
export type RecordNames = (relation: string, key: RecordKey) => string | undefined;

/** A filter that asks for RECORDS of one of the model's relations, said as such: «Cliente es
 *  alguno de Andrés Pérez, Andrés Gutiérrez». `null` when it is not one. */
function sayRecords(
  node: BuiltFilter,
  model: ModelDefinition | undefined,
  names: RecordNames | undefined,
): string | null {
  if (model === undefined) return null;
  for (const name of Object.keys(model.fields)) {
    const target = recordTarget(model, name);
    if (target === undefined) continue;
    const asked = recordsOf(target, node);
    if (asked === null) continue;
    const one = asked.keys.length === 1 && !target.many;
    const op = asked.negate ? (one ? "!=" : "not in") : one ? "=" : "in";
    const said = asked.keys.map((key) => names?.(name, key) ?? String(key)).join(", ");
    return sayCondition(fieldLabel(model, name, currentCopy().locale), op, said);
  }
  return null;
}

function say(
  node: BuiltFilter,
  model: ModelDefinition | undefined,
  depth: number,
  at: readonly string[],
  modelAt: ((path: readonly string[]) => ModelDefinition | undefined) | undefined,
  names?: RecordNames,
): string {
  const copy = currentCopy();
  const records = sayRecords(node, model, names);
  if (records !== null) return records;
  const crossed = crossedOf(node);
  if (crossed !== null) {
    /* «alguno de Líneas con alguno de Impuestos con Monto mayor que 10». The quantifier
       is a separate word and not «algún impuesto» because the model publishes the label,
       not its gender or its singular: «algún Impuestos» would be worse than neutral. */
    const relation =
      model === undefined ? crossed.through : fieldLabel(model, crossed.through, copy.locale);
    const next = [...at, crossed.through];
    const inner = say(crossed.selection, modelAt?.(next), depth + 1, next, modelAt, names);
    const template = reachesOne(model, crossed)
      ? copy.fieldPath.say.one
      : copy.fieldPath.say[crossed.match];
    return fillCopy(template, { relation, inner });
  }
  if ("all" in node || "any" in node) {
    const items = "all" in node ? node.all : node.any;
    const glue = "all" in node ? copy.search.and : copy.search.or;
    const said = items
      .slice(0, 3)
      .map((child) => say(child, model, depth + 1, at, modelAt, names));
    if (items.length > 3) {
      said.push(fillCopy(copy.search.andMore, { count: items.length - 3 }));
    }
    const joined = said.join(` ${glue} `);
    return depth === 0 || said.length === 1 ? joined : `(${joined})`;
  }

  if ("negate" in node) {
    return `${copy.search.notWord} ${say(node.negate, model, depth + 1, at, modelAt, names)}`;
  }

  /* Every `through` was said above; anything still not a condition is not a shape of the
     grammar, and it is shown as it came rather than as a sentence it is not. */
  if (!isCondition(node)) return JSON.stringify(node);
  const label = model === undefined ? node.field : fieldLabel(model, node.field, copy.locale);
  return sayCondition(label, node.operator, describeValue(node.value, node.operator));
}
