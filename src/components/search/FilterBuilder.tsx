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
 *  A FILTER SOMEBODY BUILDS, FROM WHAT THE MODEL SAYS IT ACCEPTS.
 *
 *  The named cuts alongside —«vencidas», «con entregas pendientes»— are the
 *  questions somebody already thought of. This is for the rest: choose a field, an
 *  operator, write a value — group them with AND or with OR, nest a group
 *  inside another as many times as needed, or write the
 *  JSON directly to copy or paste a whole criteria.
 *
 *  **Nothing here is written by hand.** The fields come from the model
 *  definition the server sends, and so do each one's operators: a
 *  text field offers «contiene», a numeric one offers «>», one that admits
 *  empty offers «está vacío». Adding a column makes it appear here, with
 *  its correct operators, without touching this file.
 *
 *  **A tree, not a list.** Each group —the root included— has its own
 *  «todas / cualquiera» and its own children: a condition, or another group
 *  nested inside. The tree icon adds a new group beside the
 *  row that was touched; the `+` adds another condition.
 *
 *  **One component renders and builds — and there is always a JSON
 *  beside it.** The tree and the code editor are two views of the SAME
 *  criteria, synchronised in both directions: touching the tree rewrites
 *  the JSON, and writing a recognisable JSON rebuilds the tree. The only thing the
 *  tree does not know how to build or show is a NOT: if the filter brings one at
 *  any level, it is drawn read-only with `ExpressionView` in its
 *  place, and the JSON remains the way to touch it.
 * ====================================================================== */

/* What an operator is called for whoever reads it: `copy.ops`, which is the SAME table the
   bar uses when building the question. Two tables means the same comparison is called two ways
   on the same screen. */

/** Which operators take no value: asking whether something is empty needs nothing written. */
const WITHOUT_VALUE = new Set(["is null"]);

/** Which operators compare against TWO values. «Entre el 1 y el 31» is the question everybody
 *  asks about dates, and writing it as two loose rules is the way to
 *  get one of the two ends wrong. */
const WITH_RANGE = new Set(["between"]);

/** What kind of input asks for a value, read from the field's type. */
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
  {
    if (node.field === "") return undefined;

    if (WITHOUT_VALUE.has(node.operator)) {
      return { field: node.field, operator: node.operator, value: true };
    }

    if (WITH_RANGE.has(node.operator)) {
      /* A half-written range is not half a range: while one end is missing, the rule does not
         travel. */
      if (node.value === "" || (node.upper ?? "") === "") return undefined;
      return { field: node.field, operator: node.operator, value: [node.value, node.upper] };
    }

    /* **A rule with no value does not filter.** It used to travel with `value: ""`, and that is not «not
       written anything yet»: against an `=` it is «the field is the empty string», which empties the list
       while somebody is still typing, and against a `like` it is «contains nothing», which leaves it
       the same. To ask for what is empty there is the «está vacío» operator, which the
       model publishes on the fields that admit it — explicit, and not by omission. */
    if (node.value === "") return undefined;

    return { field: node.field, operator: node.operator, value: node.value };
  }
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

/** A condition back to an editable row: the value goes back to text, which is the only thing
 *  an `<input>` knows how to show. A list —an `in`'s value— is written separated by commas. */
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

function stringifyFilter(filter: BuiltFilter | undefined): string {
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

/** The filter drawn as it is, recursive: a condition is a line, `all`/`any` are a
 *  group with its label and its children inside, `negate` is «no» wrapping the one it negates.
 *
 *  It is the read-only half of this file, and it also works alone: showing what a
 *  filter that is already set says does not need opening the builder. */
export function ExpressionView({
  node,
  model,
  depth = 0,
  modelAt,
  at = [],
}: {
  node: BuiltFilter;
  /** Who knows what a field is called. Without it the raw name remains. */
  model?: ModelDefinition;
  depth?: number;
  /** The model at the end of a path of relations, if it has arrived: it names the fields of a
   *  `through`. */
  modelAt?: (path: readonly string[]) => ModelDefinition | undefined;
  /** The path up to here (through the outer `through`s). */
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
    /* THE SAME THREE WORDS AS THE BAR. A group that is called «coincide
       con alguna» here and «cualquiera» on the chip is two vocabularies for one
       thing, and whoever reads them has to learn both. */
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

  /* And the same phrase as the chip: a condition reads the same wherever it is. */
  return <p className={`text-meta ${indent}`}>{describeFilter(node, model)}</p>;
}

/* ---------------------------------------------------------------------- *
 *  A GROUP, DRAWN — the piece that calls itself to nest.
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
   * The condition's field to show FIRST: the one somebody touched in
   * the bar.
   *
   * Without this, touching a chip opened the builder on rule one and you had to
   * search among twelve for the one you were looking at — which is the quickest way to
   * edit the wrong one. It is marked and brought into view; it does not open in a different
   * mode, because the builder is the same.
   *
   * It marks at ANY depth: the tree passes it to the groups it nests.
   *
   * **It is a field name, not a path**, so two conditions on the
   * same field in different branches are both marked and the view goes to the first.
   * Telling them apart requires the tree and the bar's instances to share
   * identity, and today they do not: `selectionOf` builds the filter skipping the
   * levels and what does not travel, so the position in one is not the position in
   * the other.
   */
  focus?: string;
  /** The model at the end of a path of relations. With this, each rule's field can
   *  be one from a related record («Líneas > Impuestos > Monto»). */
  loadModel?: LoadModel;
  /** The model cache the rules share. The outer tree builds it. */
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
      {/* THE SAME WORD AS THE BAR, and the same control: a `<select>` here and
          a list of chips there are two ways of deciding the same thing, and whoever
          learned one does not recognise the other. */}
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
 *  A RULE — the path to the field, how many of each relation, the operator and the value.
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
  /* The operator and the value come from the path's LAST field: «Monto», reached through two
     relations, is compared as a number and not as the relation it was reached through. A
     root rule knows it without waiting for anybody. */
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
      /* Changing the final field does not reset the chip of a relation that remains in the path. */
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
      /* The one that was come to see is marked and brought into view. A ring and not
         a background: the background competes with the `select` that has to be touched. */
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

      {/* ONE CHIP FOR EACH TO-MANY RELATION in the path: «alguna línea», «ninguna línea»,
          «todas las líneas» are three different questions and the path alone does not say which. Whether the
          relation reaches many is told by the model; a quantifier that is not «alguno» is shown
          even if the model has not arrived, because hiding it is hiding what the rule
          asks. */}
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
  /** The model at the end of a path of relations. With this, a rule can ask about
   *  a field of a related record: «alguna línea con algún impuesto con monto > 10».
   *  web-ui asks for nothing: whoever draws the builder knows where the models come from. */
  loadModel?: LoadModel;
  /** A model cache shared with whoever draws the builder —the same one it uses to
   *  describe the applied filter with `describeFilter(…, modelAt)`—. Without this, its own. */
  models?: ModelCache;
  /** The filter that was already set, if there was one. Reopening the builder with this inside
   *  has to continue where it was left, not start blank. */
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

  /* Touching the tree rewrites the JSON so it shows exactly what the tree now says,
     and drops any read-only view that may have been left. */
  function updateTree(next: TreeGroup) {
    setTree(next);
    setLockedView(null);
    setRawText(stringifyFilter(treeToFilter(next)));
    setRawError(null);
  }

  /* Writing in the JSON tries the same the other way round: if what was typed brings no `negate` at
     any level, the tree is rebuilt to show it — AND and OR, at any depth. If it brings
     one, it is drawn read-only, but the JSON remains what will be applied. If it is
     neither —half-written, or not a filter— what was there is not touched. */
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
      {/* The tree has its own height and its own scroll: nesting six levels cannot
          push the code editor out of the dialog. */}
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

      {/* The real filter, in JSON: it rewrites itself while the tree above is touched, and
          you can write or paste here instead of building it with it — the two views stay
          equal as long as what is there is recognisable as a filter. */}
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
