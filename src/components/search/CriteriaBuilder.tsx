"use client";

import type { BuiltFilter } from "@sincpro/web-ui/components/search/criteria";
import {
  blankGroup,
  ExpressionView,
  SelectionTree,
  treeFromFilter,
  type TreeGroup,
  treeToFilter,
} from "@sincpro/web-ui/components/search/FilterBuilder";
import { LazyJsonEditor } from "@sincpro/web-ui/components/search/LazyJsonEditor";
import {
  filterableNames,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { GRAIN_ORDER } from "@sincpro/web-ui/foundations/grouping";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Rule } from "@sincpro/web-ui/primitives/block/Block";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { Plus, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

/* ====================================================================== *
 *  THE BUILDER OF THE WHOLE CRITERIA, NOT JUST THE FILTER.
 *
 *  A read is four questions, and until now only the first
 *  could be built:
 *
 *    selection      which rows?          — the tree of conditions
 *    order          in what order?       — N fields, each asc or desc
 *    grouping       split by what?       — N levels, with a grain if it is a date
 *    specification  what of each one?    — the fields that come back
 *
 *  The four are the SAME criteria, so they are edited in a single place and
 *  serialised in a single JSON — the same object that travels in the URL, in the
 *  body of a POST or through a queue, with no translation in between.
 *
 *  The code editor below shows the WHOLE criteria, not the loose
 *  filter: it is the real shape of what is being built, and you can write or
 *  paste there instead of touching the controls.
 *
 *  The grouping comes out with the keys of `@sincpro/criteria` 2.0 —`group_by`,
 *  `measures` with `{function, field}`, `where_measures`, `order`, `pagination`—
 *  and no others: sincpro_framework's `Grouping` is strict and rejects a
 *  key it does not know. The screen's words («Totales por montón»,
 *  «Filtrar los montones») belong to the UI; what travels belongs to the engine.
 * ====================================================================== */

export interface BuiltSort {
  field: string;
  descending?: boolean;
}

/** A grouping level, like criteria's `Level`: the field and, if it is a date, the grain. */
export interface BuiltLevel {
  field: string;
  grain?: string | null;
}

/**
 * A number that each heap answers, like criteria's `Measure`:
 * `{ function: "sum", field: "row_count" }`. Named parts and not a pair, just as a
 * condition travels as `{field, operator, value}`.
 */
export interface BuiltMeasure {
  function: string;
  field: string;
  /** What the function needs besides the field. Only `percentile`: the cut's fraction. */
  argument?: number;
}

/** From where a page of heaps starts — the same shape as the rows' pagination. */
export type BuiltPageStrategy = { token: string | null } | { rows: number };

export interface BuiltGroupPagination {
  limit?: number;
  strategy?: BuiltPageStrategy;
}

/** The grouping as `@sincpro/criteria` 2.0 declares it, key by key. */
export interface BuiltGrouping {
  /** The levels, in order: they are not added, they nest. */
  group_by?: BuiltLevel[];
  /** The numbers each heap answers, each under a chosen name. */
  measures?: Record<string, BuiltMeasure>;
  /** A filter on what the heaps measured, not on the rows: `count > 10`. The
   *  names it admits are those of `measures`, plus `"count"`. */
  where_measures?: BuiltFilter;
  /** In what order the heaps come back: by the level's own field, by a name from
   *  `measures`, or by `count`. */
  order?: BuiltSort[];
  /** How many heaps of the first level come back, and from where. Absent is all of them. */
  pagination?: BuiltGroupPagination;
}

/** The criteria as the engine declares it. It is what this component builds and returns, and what
 *  the code editor shows. */
export interface BuiltCriteria {
  selection?: BuiltFilter;
  order?: BuiltSort[];
  grouping?: BuiltGrouping;
  specification?: Record<string, Record<string, never>>;
}

/**
 * A date's cuts, from COARSE to fine, with `null` first: with no cut, a
 * date field splits by instant and every row ends up in its own heap.
 *
 * The order is not a preference — a whole day lives inside a single month— and
 * it is the same one `GRAIN_ORDER` publishes for the bar: a single direction for
 * both screens. A level's chip rotates through this list.
 */
const GRAINS: readonly (string | null)[] = [null, ...GRAIN_ORDER];

/** Which types admit a grain: cutting a text by month means nothing. */
const DATE_TYPES = new Set(["date", "datetime"]);

/** The operators that a measure —always a number— or `count` admit in a
 *  `where_measures`: the same ones the model definition publishes for a numeric field,
 *  `is null` aside, which means nothing on a number the engine itself computed. */
const COMPARABLE = ["=", "!=", ">", ">=", "<", "<=", "between"] as const;

/** The functions a measure can ask for here, closed on the server side because the
 *  name reaches SQL. */
const MEASURE_FUNCTIONS = ["sum", "avg", "min", "max", "count"] as const;

function isEmpty(criteria: BuiltCriteria): boolean {
  return (
    criteria.selection === undefined &&
    (criteria.order ?? []).length === 0 &&
    (criteria.grouping?.group_by ?? []).length === 0 &&
    Object.keys(criteria.grouping?.measures ?? {}).length === 0 &&
    Object.keys(criteria.specification ?? {}).length === 0
  );
}

/** The `where_measures` editor's tree: what was read, wrapped in a group if it is a single
 *  condition, or a blank one over `count` if there is nothing to read. */
function measuresTreeOf(filter: BuiltFilter | undefined, model: ModelDefinition): TreeGroup {
  const node = filter === undefined ? null : treeFromFilter(filter);
  if (node === null) return blankGroup(model, "count");
  return node.kind === "group" ? node : { kind: "group", join: "all", children: [node] };
}

/**
 * THE CHIP THAT ADDS: a «+» that opens the list of what can be chosen.
 *
 * It is the same as what the hash sign does in the bar, and for the same reason: choosing
 * among twenty fields is choosing from a LIST, not unfolding a `<select>` that already
 * comes with one set and has to be changed. With the `<select>`, adding a
 * level put the model's first field even though nobody had asked for it.
 */
function AddTag({
  label,
  options,
  onPick,
}: {
  label: string;
  options: readonly string[];
  onPick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (options.length === 0) return null;
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-dashed border-line-strong px-2 py-0.5 text-micro text-muted transition-colors duration-(--duration-instant) hover:border-line-strong hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <Plus className="size-3" strokeWidth={2} aria-hidden />
        {label}
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-panel border border-line-strong bg-surface p-1 shadow-float">
          <Tags
            stack
            label={label}
            items={options.map((name) => ({
              id: name,
              label: name,
              onSelect: () => {
                onPick(name);
                setOpen(false);
              },
            }))}
          />
        </span>
      ) : null}
    </span>
  );
}

/** The next cut, and back to the start. */
function nextGrain(grain: string | null | undefined): string | null {
  const at = GRAINS.indexOf(grain ?? null);
  return GRAINS[(at + 1) % GRAINS.length] ?? null;
}

export function CriteriaBuilder({
  model,
  initial,
  focus,
  onApply,
  onCancel,
}: {
  model: ModelDefinition;
  /** The criteria that was already set. Reopening has to continue where it was left. */
  initial?: BuiltCriteria;
  /**
   * The condition's field to show first: the chip somebody
   * touched in the bar.
   *
   * Without this, touching a cut opened the builder on rule one and you had to
   * search among twelve for the one you were looking at — which is the quickest way to
   * edit the wrong one.
   */
  focus?: string;
  onApply: (criteria: BuiltCriteria | undefined) => void;
  onCancel?: () => void;
}) {
  const surface = useSurface();
  const names = Object.keys(model.fields).sort();
  /* Never a relational nor a value-object: neither has a comparison of its own
     (empty `ops`), so neither serves as a target for a filter, an order or a level. */
  const scalarNames = filterableNames(model);
  const sortable = names.filter((name) => model.fields[name]?.sortable === true);

  const decomposed =
    initial?.selection === undefined ? null : treeFromFilter(initial.selection);
  const [tree, setTree] = useState<TreeGroup>(() =>
    decomposed !== null && decomposed.kind === "group"
      ? decomposed
      : decomposed !== null
        ? { kind: "group", join: "all", children: [decomposed] }
        : blankGroup(model, scalarNames[0]),
  );
  const copy = useUiCopy();
  const [lockedSelection, setLockedSelection] = useState<BuiltFilter | null>(
    initial?.selection !== undefined && decomposed === null ? initial.selection : null,
  );
  const [order, setOrder] = useState<BuiltSort[]>(initial?.order ?? []);
  const [levels, setLevels] = useState<BuiltLevel[]>(initial?.grouping?.group_by ?? []);
  const [measures, setMeasures] = useState<Record<string, BuiltMeasure>>(
    initial?.grouping?.measures ?? {},
  );
  const [groupOrder, setGroupOrder] = useState<BuiltSort[]>(initial?.grouping?.order ?? []);
  const [groupLimit, setGroupLimit] = useState<number | undefined>(
    initial?.grouping?.pagination?.limit,
  );

  /* `where_measures` is a filter like any other, over a synthetic model whose only
     fields are the names it admits: those of `measures`, plus `count`. Reusing
     `SelectionTree` over that model is simpler and more correct than building a separate
     conditions editor. */
  const measuresModel = useMemo<ModelDefinition>(
    () => ({
      aggregate: "where_measures",
      identity: "count",
      fields: Object.fromEntries([
        ["count", { type: "integer", nullable: false, sortable: false, ops: COMPARABLE }],
        ...Object.keys(measures).map((name) => [
          name,
          { type: "number", nullable: false, sortable: false, ops: COMPARABLE },
        ]),
      ]),
    }),
    [measures],
  );
  const [measuresTree, setMeasuresTree] = useState<TreeGroup>(() =>
    measuresTreeOf(initial?.grouping?.where_measures, measuresModel),
  );

  const [fields, setFields] = useState<string[]>(Object.keys(initial?.specification ?? {}));
  const [rawText, setRawText] = useState<string>(() =>
    initial === undefined ? "" : JSON.stringify(initial, null, 2),
  );
  const [rawError, setRawError] = useState<string | null>(null);

  /** What the controls say, together: it is what is applied and what the JSON shows. */
  function assemble(next: {
    tree?: TreeGroup;
    locked?: BuiltFilter | null;
    order?: BuiltSort[];
    levels?: BuiltLevel[];
    measures?: Record<string, BuiltMeasure>;
    measuresTree?: TreeGroup;
    groupOrder?: BuiltSort[];
    groupLimit?: number | undefined;
    fields?: string[];
  }): BuiltCriteria {
    const selection = next.locked ?? lockedSelection ?? treeToFilter(next.tree ?? tree);
    const sorts = next.order ?? order;
    const groupBy = next.levels ?? levels;
    const measured = next.measures ?? measures;
    const whereMeasures = treeToFilter(next.measuresTree ?? measuresTree);
    const groupSorts = next.groupOrder ?? groupOrder;
    const limit = "groupLimit" in next ? next.groupLimit : groupLimit;
    const chosen = next.fields ?? fields;

    /* Without levels there is nothing to measure, nothing to filter between heaps, nor in what order or page
       they would come back — a measure, a `where_measures` or a page set and then emptied of
       levels must not survive loose in the criteria that is sent. */
    const grouping: BuiltGrouping =
      groupBy.length === 0
        ? {}
        : {
            group_by: groupBy,
            ...(Object.keys(measured).length === 0 ? {} : { measures: measured }),
            ...(whereMeasures === undefined ? {} : { where_measures: whereMeasures }),
            ...(groupSorts.length === 0 ? {} : { order: groupSorts }),
            ...(limit === undefined ? {} : { pagination: { limit } }),
          };

    return {
      ...(selection === undefined ? {} : { selection }),
      ...(sorts.length === 0 ? {} : { order: sorts }),
      ...(Object.keys(grouping).length === 0 ? {} : { grouping }),
      ...(chosen.length === 0
        ? {}
        : {
            specification: Object.fromEntries(
              chosen.map((name) => [name, {} as Record<string, never>]),
            ),
          }),
    };
  }

  /* Touching any control rewrites the whole JSON: the two views are the same criteria. */
  function push(next: Parameters<typeof assemble>[0]) {
    if (next.tree !== undefined) setTree(next.tree);
    if (next.locked !== undefined) setLockedSelection(next.locked);
    if (next.order !== undefined) setOrder(next.order);
    if (next.levels !== undefined) setLevels(next.levels);
    if (next.measures !== undefined) setMeasures(next.measures);
    if (next.measuresTree !== undefined) setMeasuresTree(next.measuresTree);
    if (next.groupOrder !== undefined) setGroupOrder(next.groupOrder);
    if ("groupLimit" in next) setGroupLimit(next.groupLimit);
    if (next.fields !== undefined) setFields(next.fields);

    const built = assemble(next);
    setRawText(isEmpty(built) ? "" : JSON.stringify(built, null, 2));
    setRawError(null);
  }

  /* Writing the JSON rebuilds the controls, as long as what was written is a criteria. */
  function updateRaw(text: string) {
    setRawText(text);
    if (text.trim() === "") {
      setRawError(null);
      return;
    }

    let parsed: BuiltCriteria;
    try {
      parsed = JSON.parse(text) as BuiltCriteria;
    } catch {
      setRawError(copy.builder.invalidJson);
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setRawError(copy.builder.notCriteria);
      return;
    }
    setRawError(null);

    const node = parsed.selection === undefined ? null : treeFromFilter(parsed.selection);
    if (node !== null) {
      setTree(
        node.kind === "group" ? node : { kind: "group", join: "all", children: [node] },
      );
      setLockedSelection(null);
    } else if (parsed.selection !== undefined) {
      setLockedSelection(parsed.selection);
    } else {
      setTree(blankGroup(model, scalarNames[0]));
      setLockedSelection(null);
    }
    setOrder(parsed.order ?? []);
    setLevels(parsed.grouping?.group_by ?? []);
    setMeasures(parsed.grouping?.measures ?? {});
    setGroupOrder(parsed.grouping?.order ?? []);
    setGroupLimit(parsed.grouping?.pagination?.limit);
    setMeasuresTree(measuresTreeOf(parsed.grouping?.where_measures, measuresModel));
    setFields(Object.keys(parsed.specification ?? {}));
  }

  const box =
    surface === "chrome"
      ? "border-chrome-ink/20 bg-chrome text-chrome-ink"
      : "border-ink/15 bg-surface text-ink";
  const select = `min-w-0 flex-1 basis-40 rounded-control border px-2 py-1 text-meta ${box}`;

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3">
      {/* ── which rows ────────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.filter} />
        <div className="max-h-72 min-w-0 overflow-auto">
          {lockedSelection !== null ? (
            <>
              <p className="mb-2 text-meta text-muted">{copy.search.unreadable}</p>
              <ExpressionView node={lockedSelection} model={model} />
            </>
          ) : (
            <SelectionTree
              model={model}
              group={tree}
              onChange={(next) => push({ tree: next })}
              {...(focus === undefined ? {} : { focus })}
            />
          )}
        </div>
      </section>

      {/* ── in what order ─────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.order} />
        {/* CHIPS, as in the bar: an order is N fields with their direction, and
            that is read at a glance on one line. With a `<select>` per field
            plus another per direction, three fields took six controls and you had
            to read them all to know what it sorts by. The arrow is touched and
            flips the direction; the × removes the field. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Tags
            items={order.map((sort, index) => ({
              id: `${sort.field}-${index}`,
              label: sort.field,
              note: sort.descending === true ? "↓" : "↑",
              title:
                sort.descending === true
                  ? `${copy.builder.descending} · ${copy.builder.flip}`
                  : `${copy.builder.ascending} · ${copy.builder.flip}`,
              onSelect: () =>
                push({
                  order: order.map((one, at) =>
                    at === index ? { ...one, descending: one.descending !== true } : one,
                  ),
                }),
              onRemove: () => push({ order: order.filter((_, at) => at !== index) }),
              removeLabel: fillCopy(copy.builder.dropOrderBy, { field: sort.field }),
            }))}
          />
          {/* Only what the model declares sortable: a column that admits
              empty loses rows in cursor pagination, and that is why the
              server does not offer it. */}
          <AddTag
            label={copy.builder.addOrder}
            options={sortable.filter((name) => !order.some((one) => one.field === name))}
            onPick={(name) => push({ order: [...order, { field: name, descending: false }] })}
          />
        </div>
        {order.length === 0 ? (
          <p className="text-meta text-muted">{copy.builder.noOrder}</p>
        ) : null}
      </section>

      {/* ── split by what ─────────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.groupBy} />
        {/* Chained with «›» and not in rows: the levels are NOT added, they
            nest —«año, y adentro mes»— and the order IS the question. It is the same
            drawing as the bar, so what is built here is recognised there. */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {levels.map((level, index) => (
            <Fragment key={`${level.field}-${index}`}>
              {index === 0 ? null : (
                <span className="shrink-0 text-micro text-muted" aria-hidden>
                  ›
                </span>
              )}
              <Tags
                items={[
                  {
                    id: `${level.field}-${index}`,
                    label: level.field,
                    ...(level.grain == null ? {} : { note: level.grain }),
                    ...(DATE_TYPES.has(model.fields[level.field]?.type ?? "")
                      ? {
                          title: copy.builder.changeGrain,
                          onSelect: () =>
                            push({
                              levels: levels.map((one, at) =>
                                at === index ? { ...one, grain: nextGrain(one.grain) } : one,
                              ),
                            }),
                        }
                      : {}),
                    onRemove: () => push({ levels: levels.filter((_, at) => at !== index) }),
                    removeLabel: fillCopy(copy.builder.dropLevel, { field: level.field }),
                  },
                ]}
              />
            </Fragment>
          ))}
          <AddTag
            label={copy.builder.addGroup}
            options={scalarNames.filter((name) => !levels.some((one) => one.field === name))}
            onPick={(name) => push({ levels: [...levels, { field: name }] })}
          />
        </div>
        {levels.length === 0 ? (
          <p className="text-meta text-muted">{copy.builder.noGrouping}</p>
        ) : null}
      </section>

      {/* What follows only matters with at least one level: without heaps there is nothing to
          measure, to filter between heaps, nor in what order or how many of them to return. */}
      {levels.length > 0 ? (
        <>
          {/* ── what is measured of each heap ───────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.totals} />
            {Object.keys(measures).length === 0 ? (
              <p className="text-meta text-muted">{copy.builder.noTotals}</p>
            ) : null}
            {Object.entries(measures).map(([name, measure]) => (
              <div key={name} className="flex min-w-0 flex-wrap items-center gap-2">
                {/* Changing the function writes a new measure, `argument` dropped: only a
                    percentile takes one, and none of these is a percentile. */}
                <select
                  aria-label={fillCopy(copy.builder.totalFunction, { name })}
                  value={measure.function}
                  onChange={(event) =>
                    push({
                      measures: {
                        ...measures,
                        [name]: { function: event.target.value, field: measure.field },
                      },
                    })
                  }
                  className={`min-w-0 flex-1 basis-28 rounded-control border px-2 py-1 text-meta ${box}`}
                >
                  {MEASURE_FUNCTIONS.map((one) => (
                    <option key={one} value={one}>
                      {one}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={fillCopy(copy.builder.totalField, { name })}
                  value={measure.field}
                  onChange={(event) =>
                    push({
                      measures: {
                        ...measures,
                        [name]: { ...measure, field: event.target.value },
                      },
                    })
                  }
                  className={select}
                >
                  {scalarNames.map((one) => (
                    <option key={one} value={one}>
                      {one}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-micro text-muted">
                  {fillCopy(copy.builder.totalAs, { name })}
                </span>
                <button
                  type="button"
                  aria-label={copy.builder.dropTotal}
                  onClick={() => {
                    const { [name]: _dropped, ...rest } = measures;
                    push({ measures: rest });
                  }}
                  className="ml-auto shrink-0 text-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button
                role="ghost"
                disabled={scalarNames.length === 0}
                onClick={() => {
                  let name = "total";
                  let index = 2;
                  while (name in measures) name = `total_${index++}`;
                  push({
                    measures: {
                      ...measures,
                      [name]: { function: "sum", field: scalarNames[0] ?? "" },
                    },
                  });
                }}
              >
                <Plus className="size-4" /> {copy.builder.addTotal}
              </Button>
            </div>
          </section>

          {/* ── which heaps remain ─────────────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.filterPiles} />
            <p className="text-meta text-muted">{copy.builder.pilesNote}</p>
            <SelectionTree
              model={measuresModel}
              group={measuresTree}
              onChange={(next) => push({ measuresTree: next })}
            />
          </section>

          {/* ── in what order the heaps come back ───────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.pileOrder} />
            {groupOrder.length === 0 ? (
              <p className="text-meta text-muted">{copy.builder.noPileOrder}</p>
            ) : null}
            {groupOrder.map((sort, index) => (
              <div key={index} className="flex min-w-0 flex-wrap items-center gap-2">
                <select
                  aria-label={copy.builder.pileOrderField}
                  value={sort.field}
                  onChange={(event) =>
                    push({
                      groupOrder: groupOrder.map((one, at) =>
                        at === index ? { ...one, field: event.target.value } : one,
                      ),
                    })
                  }
                  className={select}
                >
                  {[
                    ...levels.map((level) => level.field),
                    ...Object.keys(measures),
                    "count",
                  ].map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={copy.builder.pileOrderDirection}
                  value={sort.descending === true ? "desc" : "asc"}
                  onChange={(event) =>
                    push({
                      groupOrder: groupOrder.map((one, at) =>
                        at === index
                          ? { ...one, descending: event.target.value === "desc" }
                          : one,
                      ),
                    })
                  }
                  className={`min-w-0 flex-1 basis-32 rounded-control border px-2 py-1 text-meta ${box}`}
                >
                  <option value="asc">{copy.builder.ascending}</option>
                  <option value="desc">{copy.builder.descending}</option>
                </select>
                <button
                  type="button"
                  aria-label={copy.builder.dropOrder}
                  onClick={() =>
                    push({ groupOrder: groupOrder.filter((_, at) => at !== index) })
                  }
                  className="ml-auto shrink-0 text-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div>
              <Button
                role="ghost"
                onClick={() =>
                  push({
                    groupOrder: [...groupOrder, { field: "count", descending: true }],
                  })
                }
              >
                <Plus className="size-4" /> {copy.builder.addPileOrder}
              </Button>
            </div>
          </section>

          {/* ── how many heaps come back ──────────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-2">
            <Rule label={copy.builder.pilePage} />
            <p className="text-meta text-muted">{copy.builder.pilePageNote}</p>
            <label className="flex items-center gap-2 text-meta">
              <input
                type="checkbox"
                checked={groupLimit !== undefined}
                onChange={(event) =>
                  push({ groupLimit: event.target.checked ? 20 : undefined })
                }
              />
              {copy.builder.limitPiles}
            </label>
            {groupLimit !== undefined ? (
              <input
                type="number"
                min={0}
                value={groupLimit}
                onChange={(event) => push({ groupLimit: Number(event.target.value) })}
                className={`w-32 rounded-control border px-2 py-1 text-meta ${box}`}
              />
            ) : null}
          </section>
        </>
      ) : null}

      {/* ── what of each row ──────────────────────────────────────────── */}
      <section className="flex min-w-0 flex-col gap-2">
        <Rule label={copy.builder.fields} />
        <p className="text-meta text-muted">
          {fields.length === 0
            ? copy.builder.allFields
            : fillCopy(copy.builder.someFields, {
                shown: fields.length,
                total: names.length,
              })}
        </p>
        <div className="flex flex-wrap gap-2">
          {names.map((name) => {
            const chosen = fields.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  push({
                    fields: chosen ? fields.filter((one) => one !== name) : [...fields, name],
                  })
                }
                className={`rounded-pill border px-2 py-0.5 text-micro ${
                  chosen ? "border-accent/40 bg-accent/18 text-ink" : `text-muted ${box}`
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── the whole criteria, in its real form ──────────────────────── */}
      <LazyJsonEditor
        value={rawText}
        onChange={updateRaw}
        error={rawError}
        height="14rem"
        label={copy.builder.json}
      />

      <div className="flex gap-2">
        <Button
          role="primary"
          disabled={rawError !== null}
          onClick={() =>
            onApply(
              rawText.trim() === "" ? undefined : (JSON.parse(rawText) as BuiltCriteria),
            )
          }
        >
          {copy.builder.apply}
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
