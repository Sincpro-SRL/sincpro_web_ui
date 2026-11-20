"use client";

import {
  useSearchSettings,
  type ValueEditor,
  type ValueEditorProps,
} from "@sincpro/web-ui/components/search/context";
import type {
  BuiltFilter,
  RecordKey,
  ThroughMatch,
} from "@sincpro/web-ui/components/search/criteria";
import {
  FieldPath,
  useFieldPathSteps,
  useModelCache,
} from "@sincpro/web-ui/components/search/FieldPath";
import {
  blankCondition,
  blankGroup,
  crossedOf,
  describeFilter,
  inputType,
  isRecognizedFilter,
  liftRecords,
  MATCHES,
  namesOf,
  pathsToLift,
  reachesOne,
  type RecordNames,
  recordOps,
  stringifyFilter,
  type TreeCondition,
  treeFromFilter,
  type TreeGroup,
  type TreeHop,
  type TreeNode,
  treeToFilter,
  WITH_RANGE,
  withNames,
  WITHOUT_VALUE,
} from "@sincpro/web-ui/components/search/filterTree";
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
  isRelation,
  isToMany,
  type LoadModel,
  type ModelCache,
} from "@sincpro/web-ui/components/search/paths";
import { opLabel } from "@sincpro/web-ui/components/search/query";
import {
  type BrowseRecords,
  type RecordTarget,
  recordTarget,
  type SearchRecords,
} from "@sincpro/web-ui/components/search/records";
import { RuleValue } from "@sincpro/web-ui/components/search/RuleValue";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

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

/* The model — the tree, its way to the JSON and back, the records it names, the filter said
   in a line — is `filterTree.ts`, without the directive, so a server component reads it;
   re-exported so every path that read it here keeps reading it. */
export type { RecordNames, TreeCondition, TreeGroup, TreeHop, TreeNode };
export {
  blankCondition,
  blankGroup,
  describeFilter,
  isRecognizedFilter,
  liftRecords,
  namesOf,
  recordOps,
  treeFromFilter,
  treeToFilter,
};

/**
 * Names the records a tree read back carries only by key — ONE question per relation, for the
 * whole tree. Per row, five rows answered at five moments and each wrote its answer over a tree
 * that no longer had the others'. Until it answers, a record reads «#7».
 */
export function useRecordNames(
  tree: TreeNode,
  searchRecords: SearchRecords | undefined,
  apply: (named: (tree: TreeNode) => TreeNode) => void,
) {
  const missing = new Map<
    string,
    { target: RecordTarget; path: string[]; keys: RecordKey[] }
  >();
  const walk = (node: TreeNode) => {
    if (node.kind === "group") return node.children.forEach(walk);
    if (node.target === undefined) return;
    const path = [...(node.through ?? []).map((hop) => hop.field), node.target.name];
    for (const one of node.values ?? []) {
      if (one.name !== "") continue;
      const asked = missing.get(node.target.name) ?? { target: node.target, path, keys: [] };
      asked.keys.push(one.id);
      missing.set(node.target.name, asked);
    }
  };
  walk(tree);
  const key = [...missing.values()]
    .map((one) => `${one.target.name}:${one.keys.join(",")}`)
    .join("|");

  useEffect(() => {
    if (searchRecords === undefined || missing.size === 0) return;
    const controller = new AbortController();
    void Promise.all(
      [...missing.values()].map(({ target, path, keys }) =>
        searchRecords({
          relation: target.relation,
          path,
          text: "",
          keys,
          signal: controller.signal,
        }).then(
          (found) => found.map((one) => [`${target.name}\u0000${one.id}`, one.name] as const),
          () => [],
        ),
      ),
    ).then((answers) => {
      if (controller.signal.aborted) return;
      const names = new Map(answers.flat());
      apply((current) => withNames(current, names));
    });
    return () => controller.abort();
    // Asked once per set of keys without a name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
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
  searchRecords: ownSearchRecords,
  browseRecords: ownBrowseRecords,
  valueEditor: ownValueEditor,
}: {
  model: ModelDefinition;
  group: TreeGroup;
  onChange: (next: TreeGroup) => void;
  depth?: number;
  /** Searches the records of a relation: with it a rule can be about a relation ITSELF,
   *  its records picked by name (see `records.ts`). Absent, the `SearchProvider`'s. */
  searchRecords?: SearchRecords;
  /** «Buscar más…» under a relation's records: the application's chooser. Absent, the
   *  provider's. */
  browseRecords?: BrowseRecords;
  /** The application's own value controls (see `ValueEditor`). Absent, the provider's. */
  valueEditor?: ValueEditor;
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
  const extend = useSearchSettings({
    ...(ownSearchRecords === undefined ? {} : { searchRecords: ownSearchRecords }),
    ...(ownBrowseRecords === undefined ? {} : { browseRecords: ownBrowseRecords }),
    ...(ownValueEditor === undefined ? {} : { valueEditor: ownValueEditor }),
  });
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
                {...extend}
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
            {...extend}
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

/** The rule without what was chosen or read for its value: what is left when the field or
 *  the way of comparing changes, or something is written in the box. */
function bare(child: TreeCondition): TreeCondition {
  return {
    kind: "condition",
    field: child.field,
    operator: child.operator,
    value: child.value,
    ...(child.through === undefined ? {} : { through: child.through }),
    ...(child.upper === undefined ? {} : { upper: child.upper }),
    ...(child.target === undefined ? {} : { target: child.target }),
  };
}

function ConditionRow({
  model,
  models,
  child,
  box,
  focused,
  onChange,
  actions,
  searchRecords,
  browseRecords,
  valueEditor,
}: {
  model: ModelDefinition;
  models: ModelCache;
  child: TreeCondition;
  box: string;
  focused: boolean;
  onChange: (next: TreeCondition) => void;
  actions: ReactNode;
  searchRecords?: SearchRecords;
  browseRecords?: BrowseRecords;
  valueEditor?: ValueEditor;
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
  const leafModel = models.peek(hops.map((hop) => hop.field));
  const target = child.target;
  /* A rule about records offers the comparisons that pick them —one, several, in or out—;
     any other, the ones the model publishes for the field. */
  const ops = target !== undefined ? recordOps(target) : (leaf?.ops ?? []);
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
    const name = next[next.length - 1] ?? "";
    /* The relation ITSELF was chosen —«Cliente», not «Cliente > Nombre»—: the rule asks
       about its records, picked by name. Only when they can be searched. */
    const parent = models.peek(next.slice(0, -1));
    const nextTarget =
      searchRecords !== undefined && isRelation(last.field) && parent !== undefined
        ? recordTarget(parent, name)
        : undefined;
    const nextOps = nextTarget !== undefined ? recordOps(nextTarget) : last.field.ops;
    onChange({
      kind: "condition",
      ...(nextHops.length === 0 ? {} : { through: nextHops }),
      field: name,
      operator: nextOps.includes(child.operator) ? child.operator : (nextOps[0] ?? "="),
      value: nextTarget === undefined && child.target === undefined ? child.value : "",
      ...(nextTarget === undefined ? {} : { target: nextTarget }),
    });
  }

  function setOperator(operator: string) {
    /* From several to one keeps the first: a picker of one cannot show three. */
    const many = operator === "in" || operator === "not in";
    const values =
      child.values === undefined ? undefined : many ? child.values : child.values.slice(0, 1);
    onChange({ ...child, operator, ...(values === undefined ? {} : { values }) });
  }

  function setMatch(at: number, match: ThroughMatch) {
    onChange({
      ...child,
      through: hops.map((hop, i) => (i === at ? { ...hop, match } : hop)),
    });
  }

  const editor: ValueEditorProps = {
    name: child.field,
    field: leaf ?? { type, nullable: true, sortable: false, ops },
    path,
    ...(leafModel === undefined ? {} : { model: leafModel }),
    operator: child.operator,
    value: child.value,
    /* What is written IS the value: what was read or chosen before is dropped. */
    onValue: (value) => onChange({ ...bare(child), value }),
    values: child.values ?? [],
    onValues: (values) => onChange({ ...bare(child), values }),
    raw: child.raw,
    onRaw: (raw) =>
      onChange(
        raw === undefined
          ? { ...bare(child), value: "" }
          : { ...bare(child), raw, value: String(raw) },
      ),
    label: copy.builder.ruleValue,
  };

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
        /* A relation can be chosen itself —«Cliente es …»— when its records can be searched;
           otherwise only what compares on its own. */
        filter={(field) =>
          isFilterable(field) || (searchRecords !== undefined && isRelation(field))
        }
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
        onChange={(event) => setOperator(event.target.value)}
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
      ) : (
        /* The application's control first, for the fields it draws its own way; the builder's
           for the rest. */
        (valueEditor?.(editor) ??
        (WITH_RANGE.has(child.operator) ? (
          <span className="flex min-w-0 flex-1 basis-40 items-center gap-1">
            <input
              type={inputType(type)}
              value={child.value}
              onChange={(event) => onChange({ ...bare(child), value: event.target.value })}
              placeholder={copy.builder.from}
              className={`min-w-0 flex-1 rounded-control border px-2 py-1 text-meta ${box}`}
            />
            <span className="shrink-0 text-micro text-muted">{copy.search.and}</span>
            <input
              type={inputType(type)}
              value={child.upper ?? ""}
              onChange={(event) => onChange({ ...bare(child), upper: event.target.value })}
              placeholder={copy.builder.to}
              className={`min-w-0 flex-1 rounded-control border px-2 py-1 text-meta ${box}`}
            />
          </span>
        ) : (
          <RuleValue
            props={editor}
            {...(target === undefined ? {} : { target })}
            {...(searchRecords === undefined ? {} : { searchRecords })}
            {...(browseRecords === undefined ? {} : { browseRecords })}
            relationLabel={steps?.at(-1)?.label ?? child.field}
            box={box}
            inputType={inputType(type)}
          />
        )))
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
  searchRecords: ownSearchRecords,
  browseRecords: ownBrowseRecords,
  valueEditor: ownValueEditor,
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
  /** The filter applied, and how it reads —with the names of the records chosen, «Cliente es
   *  Andrés Pérez»— for the chip that shows it. */
  onApply: (selection: BuiltFilter | undefined, said?: string) => void;
  onCancel?: () => void;
  /** Searches the records of a relation (see `records.ts`). Absent, the `SearchProvider`'s. */
  searchRecords?: SearchRecords;
  /** «Buscar más…» under a relation's records: the application's chooser. Absent, the
   *  provider's. */
  browseRecords?: BrowseRecords;
  /** The application's own value controls (see `ValueEditor`). Absent, the provider's. */
  valueEditor?: ValueEditor;
}) {
  const names = filterableNames(model);
  const models = useModelCache(model, loadModel, shared);
  const settings = useSearchSettings({
    ...(ownSearchRecords === undefined ? {} : { searchRecords: ownSearchRecords }),
    ...(ownBrowseRecords === undefined ? {} : { browseRecords: ownBrowseRecords }),
    ...(ownValueEditor === undefined ? {} : { valueEditor: ownValueEditor }),
  });
  /* A filter read back carries keys; with records searchable, the rules about records are
     drawn as such again — by name. */
  const read = (filter: unknown): TreeNode | null => {
    const node = treeFromFilter(filter);
    return node === null || settings.searchRecords === undefined
      ? node
      : liftRecords(node, model);
  };

  const copy = useUiCopy();
  const decomposed = initial === undefined ? null : read(initial);
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
  useRecordNames(tree, settings.searchRecords, (named) =>
    setTree((current) => named(current) as TreeGroup),
  );
  /* A rule past a relation —«Cliente > País es Bolivia»— is recognised once the models along
     its path arrive: they are asked here, and the tree read again with them. */
  const hopPaths = pathsToLift(tree);
  useEffect(() => {
    if (settings.searchRecords === undefined || !models.canLoad || hopPaths.length === 0)
      return;
    let alive = true;
    void Promise.all(hopPaths.map((path) => models.get(path).catch(() => undefined))).then(
      () => {
        if (alive)
          setTree((current) => liftRecords(current, model, models.peek) as TreeGroup);
      },
    );
    return () => {
      alive = false;
    };
    // Asked again only when the paths to look at change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hopPaths.map((path) => path.join(".")).join("|")]);

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

    const node = read(parsed);
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
          <SelectionTree
            model={model}
            group={tree}
            onChange={updateTree}
            models={models}
            {...settings}
          />
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
          onClick={() => {
            const selection: BuiltFilter | undefined =
              rawText.trim() === "" ? undefined : JSON.parse(rawText);
            onApply(
              selection,
              selection === undefined
                ? undefined
                : describeFilter(selection, model, models.peek, namesOf(tree)),
            );
          }}
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
