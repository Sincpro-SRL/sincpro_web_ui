import type { GroupGrain, GroupLevel } from "@sincpro/web-ui/foundations/grouping";

/* ==================================================================== *
 *  WHAT THE BAR HAS SET: criteria instances.
 *
 *  Context: the bar handled three different things —searches, declared
 *  filters and grouping levels— and all three ended up in the same place
 *  only at the very end, each by its own path. That is why one could be edited and another
 *  could not, and why the nesting could not be drawn: it did not exist until someone
 *  built the `selection`.
 *
 *  Here there is ONE thing. Everything the bar has set is an INSTANCE, and
 *  an instance is one of two kinds:
 *
 *      group    how what is left is heaped — ALWAYS goes on the left
 *      filter   which rows are left — goes on the right, and may nest
 *
 *  ── This is NOT the engine's criteria ───────────────────────────────
 *
 *  It is what the UI knows about it: what kind it is, what it is called, and what it carries
 *  inside. The engine's object —`{field, operator, value}`, `{all}`, `{any}`—
 *  travels INSIDE, intact, and comes out without a single extra key. Mixing the two
 *  is what forces a choice between a label that reads and an object the
 *  server accepts; kept apart, you have both.
 *
 *      UI instance                   what travels
 *      ────────────────────          ────────────
 *      id, kind, label         →     (nothing)
 *      selection               →     {field, operator, value}
 *      level                   →     {field, grain}
 *
 *  ── A label is the ONLY thing that sets a filter apart from code ────
 *
 *  «Sólo vencidas» and «estado = vencida» are the same instance; one comes with its
 *  name set because somebody thought of it beforehand and the other describes itself. There
 *  are not two mechanisms: there is one, with or without a name.
 * ==================================================================== */

/* The shapes of a filter are the MODEL's: the builder draws them, the bar stores them, the
   engine reads them. They lived in `FilterBuilder` and the model imported them from the
   interface — a cycle, and the dependency pointing the wrong way. */

/** A condition, as the engine declares it. `operator` comes from the field's `ops`, so
 *  what the builder offers is exactly what the model accepts. */
export interface BuiltCondition {
  field: string;
  operator: string;
  value: unknown;
}

/** What the filter can be in its real form —`@sincpro/criteria`'s `Expression`, key
 *  by key—: a condition, an `all`/`any` group of more filters —what the tree builds, to
 *  any depth—, a `negate`, or a filter through a relation. */
export type BuiltFilter =
  | BuiltCondition
  | { all: BuiltFilter[] }
  | { any: BuiltFilter[] }
  | { negate: BuiltFilter }
  | BuiltThrough;

/** How many of the records reached through a to-many relation have to match: «alguno»,
 *  «ninguno», «todos». It is the TREE's word, not a key that travels: criteria's
 *  `{through, selection}` says «some», and the other two are written with `negate` around it
 *  (see {@link BuiltThrough}). */
export type ThroughMatch = "any" | "none" | "all";

/**
 * A filter asked about the records at the other end of a relation: some record the relation
 * `through` holds answers `selection` — criteria's shape, and nothing beside it.
 *
 *      «alguna línea con algún impuesto con monto > 10»
 *      {through: "lines",
 *       selection: {through: "taxes",
 *                   selection: {field: "amount", operator: ">", value: 10}}}
 *
 *      «el cliente es de Bolivia»  (to-one: the one record it reaches)
 *      {through: "partner_id", selection: {field: "country", operator: "=", value: "BO"}}
 *
 *      «ninguna línea con precio > 1»
 *      {negate: {through: "lines", selection: {field: "price", operator: ">", value: 1}}}
 *
 *      «todas las líneas con precio > 1»  (no line that does not have it)
 *      {negate: {through: "lines",
 *                selection: {negate: {field: "price", operator: ">", value: 1}}}}
 *
 * One node per relation crossed, nested in the order of the path: the engine reads it from
 * the outside in, the same way the path reads left to right. There is no `match` key:
 * sincpro_framework's `Through` refuses one, and «none» and «all» are already sentences of
 * the grammar.
 */
export interface BuiltThrough {
  through: string;
  selection: BuiltFilter;
}

/** How a node's instances are joined. `not` negates what it has inside. */
export type CriteriaJoin = "all" | "any" | "not";

/**
 * ONE INSTANCE of what the bar has set.
 *
 * Three forms and none extra: a grouping level, a filter, or a node that
 * joins filters. A node does NOT join groups — «year and month» is not crossed with AND, it
 * nests, and for that the list's order is already the hierarchy.
 */
export type SearchCriteria =
  | {
      id: string;
      kind: "group";
      /** How it reads: «registrado · mes». Set by whoever knows the model. */
      label: string;
      /** What travels: which field it splits by and with what grain. */
      level: GroupLevel;
    }
  | {
      id: string;
      kind: "filter";
      /** How it reads. A declared filter brings its own; one written in the bar
       *  describes itself, with the model's words. */
      label: string;
      /**
       * What travels, in the engine's form and without an extra key.
       *
       * MISSING when the cut cannot be asked: «con entregas pendientes» is defined
       * with data from another context and no `selection` on this table
       * answers it. The instance exists all the same —it is seen, counted, removed— and
       * whoever declared it answers it. Without this, such a cut was not an instance
       * of anything: it was drawn in the menu and ticking it did nothing.
       */
      selection?: BuiltCondition | BuiltFilter;
    }
  | {
      id: string;
      kind: "join";
      join: CriteriaJoin;
      of: readonly SearchCriteria[];
    };

/** The path to an instance, by index from the root. It is its identity: two
 *  instances may say the same in different branches, and touching one cannot
 *  open the other. */
export type CriteriaPath = readonly number[];

/** A grouping instance, already narrowed: group ones are never a node, so
 *  whoever draws them does not have to ask whether they have a label. */
export type GroupCriteria = Extract<SearchCriteria, { kind: "group" }>;

/** The grouping instances, in order. They ALWAYS go on the left and do not
 *  cross with anything: the order IS the hierarchy. */
export function groupsOf(all: readonly SearchCriteria[]): GroupCriteria[] {
  return all.filter((one): one is GroupCriteria => one.kind === "group");
}

/** The filter ones, which are the ones that nest. */
export function filtersOf(all: readonly SearchCriteria[]): SearchCriteria[] {
  return all.filter((one) => one.kind !== "group");
}

/** The instance at that path, if there is one. */
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

/** The same tree with one instance changed. Returning a new one and not touching the
 *  old one is what allows comparing before and after —and undoing. */
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
 * The same tree without that instance.
 *
 * A node left with a single child is DISMANTLED: «cualquiera de: (a)» is a
 * parenthesis around nothing, and leaving it forces reading a group that does not group.
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

/** How a node's instances are joined: `all` → `any` → `not` and round again. It is
 *  the same wheel the selector shows open, for whoever prefers the
 *  shortcut. */
export function nextJoin(join: CriteriaJoin): CriteriaJoin {
  return join === "all" ? "any" : join === "any" ? "not" : "all";
}

/** An id that does not collide with another. Short, because it is read in the DOM. */
export function criteriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** A grouping instance, from an already legible level. */
export function groupCriteria(level: GroupLevel, label: string): SearchCriteria {
  return { id: criteriaId("g"), kind: "group", label, level };
}

/** A filter instance. `label` is the only thing that sets a declared-in-code one apart from
 *  one written in the bar; without `selection`, it is one that only whoever
 *  declared it answers. */
export function filterCriteria(
  selection: BuiltCondition | BuiltFilter | undefined,
  label: string,
  id?: string,
): SearchCriteria {
  return {
    id: id ?? criteriaId("f"),
    kind: "filter",
    label,
    ...(selection === undefined ? {} : { selection }),
  };
}

/**
 * What TRAVELS: the engine's `selection`, built from the filter instances.
 *
 * It is the only thing that leaves from here outward, and it leaves without labels, ids or
 * kinds: the UI keeps what the UI needs. It carries the field name of the
 * criteria it fills —`Criteria.selection`—, like `@sincpro/criteria`'s `selection`.
 */
export function selectionOf(all: readonly SearchCriteria[]): BuiltFilter | undefined {
  const parts = filtersOf(all)
    .map(expressionOf)
    .filter((one): one is BuiltFilter => one !== undefined);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return { all: parts };
}

function expressionOf(one: SearchCriteria): BuiltFilter | undefined {
  if (one.kind === "group") return undefined;
  /* An instance without `selection` does not travel: there is no way to ask it, and sending
     something similar would be answering something else. Whoever declared it answers it. */
  if (one.kind === "filter") return one.selection;
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

/** The levels that travel, in order. */
export function levelsOf(all: readonly SearchCriteria[]): GroupLevel[] {
  return groupsOf(all).flatMap((one) => (one.kind === "group" ? [one.level] : []));
}

export type { GroupGrain, GroupLevel };

/* ---------------------------------------------------------------- *
 *  The two operations every consumer needs
 * ---------------------------------------------------------------- */

/**
 * The grouping levels, brought up to date.
 *
 * Replaces ALL the group instances with those that come out of `levels`, and touches
 * none of the filter ones. It exists because the levels control is an
 * ordered list that is edited whole —added to, removed from, moved— and reconciling it
 * instance by instance from outside is the same loop written on every
 * screen.
 *
 * The group ones stay IN FRONT, which is where they are drawn.
 */
export function withLevels(
  all: readonly SearchCriteria[],
  levels: readonly GroupLevel[],
  labelOf: (level: GroupLevel) => string,
): SearchCriteria[] {
  return [...levels.map((level) => groupCriteria(level, labelOf(level))), ...filtersOf(all)];
}

/**
 * A NAMED filter, set or removed.
 *
 * It is the only thing a filter declared in code does: bring its label and its
 * condition already thought out. Ticking it adds it, unticking removes it, and it is recognised
 * by its `id` — the one declared by whoever wrote it, so it survives
 * being saved as a favourite and read back.
 */
export function toggleNamed(
  all: readonly SearchCriteria[],
  named: { id: string; label: string; selection?: BuiltCondition | BuiltFilter },
): SearchCriteria[] {
  const at = all.findIndex((one) => one.id === named.id);
  if (at >= 0) return all.filter((_, index) => index !== at);
  return [...all, filterCriteria(named.selection, named.label, named.id)];
}

/** Whether that named filter is set. The panel uses it to draw the mark:
 *  the mark comes from what is SET and not from a separate state that could disagree. */
export function hasNamed(all: readonly SearchCriteria[], id: string): boolean {
  return all.some((one) => one.id === id);
}
