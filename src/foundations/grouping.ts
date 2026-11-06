import { dateLabel, type GroupGrain } from "@sincpro/web-ui/foundations/calendar";

/**
 * GROUPING, in N levels.
 *
 * Context: grouping is splitting a set by what its rows share, and that
 * need not be ONE question. «By origin» is one; «by origin
 * and then by month» is the same question asked twice, and the answer is a
 * tree and not a list of piles.
 *
 * ── What is ASKED FOR and what is DRAWN are two things ─────────────
 *
 * `GroupLevel` is what somebody asked for: which field to split by and, if it is a
 * date, with what grain. `Pile` is what is drawn: a pile already built, with its
 * label, how many rows it has and the level below. They are separate because
 * the piles are not always built by this machine: they can be built by whoever has the
 * data —and counting a whole catalog is something only whoever
 * stores it can answer—. That is why `pilesFrom` is a HELPER and not the only path: a
 * presentation receives `piles` and neither knows nor cares who counted them.
 *
 * **This knows no engine.** No criteria, no cursors, no transport: a
 * pile here is label, count, children and rows. Whoever translates a server's answer
 * into this shape lives outside, and that is why the same presentation serves
 * a grouping made in the browser and one counted a thousand kilometres away.
 *
 * ── The identity of a pile is its PATH ──────────────────────────────
 *
 * And not its key. With a single level the key was enough, because there were no two
 * piles that could have the same name. With N levels there are: «2026-09» can be a
 * month inside «sintético» and another inside «traído», and they are different
 * piles that fold separately. The path —`["sintético", "2026-09"]`—
 * is the only thing that tells them apart, so it is what is stored.
 *
 * ── The KEY identifies; the LABEL is read ───────────────────────────
 *
 * And they are two texts. «2026-09» is what the engine writes: what is compared with
 * what the server counted, what the path carries, what stays folded. With that
 * in view the interface speaks machine, so the pile also carries its
 * label —«Septiembre»— which is what is drawn and the only thing that changes with the
 * language. The other way round is not possible: with the label as identity, two Septembers of
 * different years melt into a pile that does not exist, and folding a month in
 * Spanish would leave it open in English.
 *
 * For a field that is not a date the two texts are the same —«sintético» is
 * identified and read the same— and that is why the label is only set apart where it is
 * needed: in dates, which `system/calendar.ts` names.
 */

/* The grain belongs to the calendar (`calendar.ts`): it is named here because a date level
   carries it. It used to live here and the calendar asked for it back — a cycle. */
export type { GroupGrain } from "@sincpro/web-ui/foundations/calendar";

/**
 * From COARSE to fine. It is the order in which the grains of the same field nest, and
 * it is not a preference: grouping by day and then by month would give piles of one
 * day inside months that no longer split anything, because a whole day lives inside
 * a single month. A calendar's hierarchy has a direction and this is it.
 */
export const GRAIN_ORDER: readonly GroupGrain[] = ["year", "quarter", "month", "week", "day"];

/** A LEVEL: which field is split by, and with what grain if it is a date. It is what
 *  somebody asked for, not what is drawn. */
export type GroupLevel = {
  field: string;
  grain?: GroupGrain;
};

/** A field it is POSSIBLE to group by, so the control offers something. The
 *  grains are declared here and not guessed from the type: who knows whether a date is
 *  looked at by week or by quarter is the domain, and always offering all four
 *  is offering three that serve nobody. */
export type GroupableField = {
  field: string;
  label: string;
  /** Present = it is a date and these are the cuts that make sense. */
  grains?: readonly GroupGrain[];
};

/**
 * A PILE already built: what its rows share, how many there are, and the level
 * below.
 */
export type Pile<T> = {
  /** The path from the root, in KEYS. It is the pile's identity: what folds
   *  it and what tells it apart from a namesake sibling in another branch. */
  path: readonly string[];
  /** How deep it is. `0` is the first level. The indentation uses it. */
  depth: number;
  /** Which field it was split by here. The header draws it to the left of the
   *  value: without it, «2026-09» does not say whether it is when it was registered or when it was
   *  run. */
  field: string;
  /** What the rows SHARE, in the engine's language: «2026-09». It is the last
   *  segment of the path, and what is compared with what the server counted. */
  key: string;
  /** The same value, already readable and in the active language: «Septiembre». It is what
   *  is drawn, and the only thing of a pile that changes with the language. */
  label: string;
  /**
   * How many rows are in the pile — ALL of them, not the page's.
   *
   * It is the difference between «there are 187 synthetics» and «12 are seen»: a count that
   * changes on turning the page is not a count, it is an array length. When the
   * piles are counted by whoever stores the data, this number comes from there.
   */
  count: number;
  /** What the pile ADDS UP TO, already written — «Total Bs 1.204.933» — summed by whoever
   *  keeps the data over EVERY row in it, like the count. Drawn in the pile's header. */
  detail?: string;
  /** The rows, at the DEEPEST level. Empty in the ones above: a pile that
   *  has piles inside has no rows of its own. */
  items: readonly T[];
  /** The level below. Empty at the deepest. */
  piles: readonly Pile<T>[];
  /**
   * What the next «show more» of a short pile brings — said by whoever pages it.
   *
   * `50` reads «Show 50 more of 49,950»: the button says what one press adds, not what is
   * missing. `false` says there is no next page although the count says more (a cap on
   * the rows held, a server that stops paging): the button goes and the pile says how many
   * it shows. Absent, the button counts what is left, as it did before this existed.
   */
  more?: number | false;
};

/**
 * The identity of a LEVEL: the field and, if it is a date, its grain.
 *
 * The field alone is not enough since the same field can be set with
 * several grains —«by month and inside by day» are two levels of the same
 * `registered_at`— and two levels with the same name can be neither removed nor
 * moved separately.
 */
export function levelKey(level: GroupLevel): string {
  return level.grain === undefined ? level.field : `${level.field}:${level.grain}`;
}

/**
 * The levels, arranged.
 *
 * Two rules, and both belong to the calendar and not to anybody's taste:
 *
 *  1. The levels of the SAME field stay together. Splitting by month, then by
 *     origin and then by day of the same field leaves two cuts of the same
 *     date separated by something else, and that is not a hierarchy, it is a stumble.
 *  2. Within a field they go from COARSE to FINE. Ticking «día» and then «mes»
 *     must give «mes › día», because the other way round the month splits nothing: a whole
 *     day already lives inside a single month.
 *
 * The order BETWEEN fields is decided by whoever groups —it is a domain question, not
 * a calendar one— so that of first appearance is respected and it can be moved.
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
 *  THE CONTRACT: what something that draws N things has to accept
 * ---------------------------------------------------------------- */

/**
 * WHAT MAKES A VIEW GROUPABLE.
 *
 * Any component that draws N things —rows, cards, cells, lines of a
 * report, points of a series— can group by accepting THIS and nothing else. It is
 * deliberately short: five fields, none optional on a whim.
 *
 * ── What the contract DOES fix ──────────────────────────────────────
 *
 *     levels     what is asked, and in what order
 *     of         which pile each thing goes to, already readable
 *     piles      the tree already built, if somebody counted it with the whole set
 *     collapsed  what is folded, by path
 *     onToggle   how it folds
 *
 * ── What it does NOT fix, and that is the point ─────────────────────
 *
 * **How a pile is drawn.** The list puts a header with a rule; the
 * spreadsheet, a band stuck to the left because it is virtualized by index
 * and cannot nest the markup; the table uses a row with `colSpan`; the report
 * makes a line with its subtotals; a series would make one series per pile. All
 * five are correct and none serves the others — a contract that also
 * dictated the drawing would force all of them to look like the first one written.
 *
 * That is why what is shared is the TREE and not the render: whoever implements receives
 * `Pile[]` from `pilesOf()` and walks it as their presentation needs.
 *
 * ── How it is implemented ───────────────────────────────────────────
 *
 *     function MiVista<T>({ items, grouping }: { items: readonly T[]; grouping?: Grouping<T> }) {
 *       const piles = pilesOf(items, grouping);
 *       if (piles === null) return <>{items.map(dibujar)}</>;
 *       return recorrer(piles);          // ← here the presentation rules
 *     }
 */
export type Grouping<T> = {
  /**
   * The levels asked for, from the outside in. Empty = not grouped.
   *
   * The ORDER is the hierarchy: `[origen, mes]` and `[mes, origen]` are two different
   * readings of the same set.
   */
  levels: readonly GroupLevel[];
  /** Which pile each thing goes to, at each level: the KEY. Trimming a date to its
   *  grain belongs to whoever knows the datum, not to the system. */
  of: PileOf<T>;
  /** How a key is read. Without this, a date is named by the system's calendar in the
   *  active language and everything else is drawn as is. */
  label?: PileLabelOf;
  /**
   * The tree ALREADY built, when it was counted by whoever has the whole set.
   *
   * It exists because a count that only the page knows is not a count: «187
   * sintéticos» cannot be answered by the twelve rows that were brought. Who
   * counts is not this layer's business — it draws the same tree in both cases.
   *
   * A tree counted outside arrives with its labels SET, and this layer does not
   * touch them: whoever translated it knows which of its keys is a date and which is a
   * code with a proper name. `dateLabel` is exported so they can set them with
   * the same words as the tree built here.
   */
  piles?: readonly Pile<T>[];
  /** Which piles are folded, by `pathKey(pile.path)`. */
  collapsed?: readonly string[];
  onToggle?: (key: string) => void;
  /**
   * A pile counted outside brings its FIRST page and its whole count: this asks for the
   * following ones. With this, each presentation offers «Ver N más» below the pile that
   * has fewer rows than it counts; whoever stores the data adds those that arrive to
   * `pile.items`.
   */
  onMore?: (pile: Pile<T>) => void;
};

/**
 * The tree to draw, or `null` if nothing is grouped.
 *
 * It is the only line a component needs to write to become groupable:
 * it chooses between the tree it was given and the one it builds with the things in hand, and
 * answers `null` when there is nothing to split — which is different from an empty
 * tree, because an empty tree means «it was grouped and nothing was left».
 */
export function pilesOf<T>(
  items: readonly T[],
  grouping: Grouping<T> | undefined,
): readonly Pile<T>[] | null {
  if (grouping === undefined || grouping.levels.length === 0) return null;
  return grouping.piles ?? pilesFrom(items, grouping.levels, grouping.of, grouping.label);
}

/** Whether a pile is open, according to what is folded. Open is the default: grouping and
 *  then having to open each pile are two gestures for what was asked in
 *  one. */
export function pileIsOpen<T>(pile: Pile<T>, grouping: Grouping<T> | undefined): boolean {
  return grouping?.collapsed?.includes(pathKey(pile.path)) !== true;
}

/** The fold key of a path. The separator is a character that does not appear
 *  in a real value, so two different paths cannot produce the same
 *  key by concatenation — `["a", "b"]` and `["a b"]` could with a
 *  writable separator. */
export function pathKey(path: readonly string[]): string {
  return path.join(" ");
}

/** Which pile each row goes to at each level: its KEY. Trimming a date to
 *  its grain belongs to whoever knows the datum —`dateKey` trims it with the same
 *  text as the engine— and naming it belongs to the label. */
export type PileOf<T> = (item: T, level: GroupLevel) => string;

/**
 * How a pile's key is read.
 *
 * `within` are the grains that the piles ABOVE, of the same field, already
 * said: with the year outside, a month is labeled «Septiembre» and not «Septiembre de
 * 2026». Saying it twice fills the indentation with what is two lines
 * above.
 */
export type PileLabelOf = (
  key: string,
  level: GroupLevel,
  within: readonly GroupGrain[],
) => string;

/** The default label: a date is named by the calendar in the active language,
 *  and what is not a date is drawn as is —«sintético» is identified and read
 *  with the same word, and translating it would be inventing a value nobody
 *  stored. */
export function pileLabel(
  key: string,
  level: GroupLevel,
  within: readonly GroupGrain[],
): string {
  return level.grain === undefined ? key : dateLabel(key, level.grain, within);
}

/**
 * HOW A PATH of keys IS READ, segment by segment.
 *
 * The key identifies and the label is read: «2026-09» is what the engine writes and
 * «Septiembre» what is drawn. Anyone who has a path —a pivot's axis, a pile's
 * title, a breadcrumb— says it with this, because a path that
 * reads differently depending on who draws it is the same cut with two faces.
 *
 * `within` comes from the levels ABOVE of the same field: with the year outside, the
 * month is said «Septiembre» and not «Septiembre de 2026», because that is already written
 * one segment earlier.
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
 * Builds the tree of piles from the rows IN HAND.
 *
 * It serves when the whole set is in the browser. When it is not —a
 * catalog of a hundred and eighty-seven of which twelve were downloaded—, the piles are
 * counted by whoever stores them and this is not used: the presentation receives `piles` already
 * made. Both forms draw the same because they draw the same type.
 *
 * The order of the piles is that of FIRST APPEARANCE of each value, at each
 * level. It is not sorted alphabetically: the order of the rows was already decided by
 * somebody —a column, a criterion, the engine— and reordering the piles here would
 * contradict it.
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
  /* The levels left above, so a label does not repeat what was already
     said. They go whole and not just their grains because the field matters: a year of
     `registrado` does not explain a month of `corrido`. */
  above: readonly GroupLevel[],
): readonly Pile<T>[] {
  const [level, ...deeper] = levels;
  if (level === undefined) return [];

  /* A Map and not an object: it preserves insertion order for keys that
     look like numbers —«2026» would come before «sintético» in an object, because
     integer keys sort themselves— and that would break the order of appearance
     precisely in date fields, which are the most grouped ones. */
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
      /* Rows live at the deepest level and at none of those above. A
         pile that has piles inside does not repeat them: drawing them twice is
         how a total ends up counting double. */
      items: deeper.length === 0 ? inside : [],
      piles,
    };
  });
}

/**
 * The path of ONE row: the pile it falls in at each level.
 *
 * It is the identity of the deepest pile that contains it, without building the tree.
 * It serves to ask «are these two rows neighbors?», which with a single level was
 * answered by comparing a key and with N the whole path must be compared: two
 * datasets of the same month are neighbors only if they also share the origin,
 * because otherwise they are in different piles even if the last segment matches.
 */
export function itemPath<T>(item: T, levels: readonly GroupLevel[], of: PileOf<T>): string[] {
  return levels.map((level) => of(item, level));
}

/** The rows of a tree, in the order they are drawn. Used by
 *  presentations that need the sequence and not the tree —the virtualized
 *  spreadsheet, which counts indices— and whoever wants to know what stayed visible. */
export function pileItems<T>(piles: readonly Pile<T>[]): readonly T[] {
  return piles.flatMap((pile) =>
    pile.piles.length === 0 ? pile.items : pileItems(pile.piles),
  );
}

/**
 * What the foot of a pile offers: the next page, or the word that there is none.
 *
 * Context: every presentation that draws piles —rows, cards, the table, one of the
 * application's own— asks this, so «Show 50 more of 49,950» and «Showing 500 of 49,950»
 * are decided once. `null` when the pile holds every row it counts, or holds piles and not
 * rows. A short pile with no way to page (`more: false`, or no `onMore`) still says so: a
 * header that reads 49,950 over 500 rows is a count the screen silently contradicts.
 */
export type PileFoot =
  | { kind: "more"; left: number; next?: number }
  | { kind: "end"; shown: number; count: number };

export function pileFoot<T>(pile: Pile<T>, canAsk: boolean): PileFoot | null {
  if (pile.piles.length > 0) return null;
  const left = pile.count - pile.items.length;
  if (left <= 0) return null;
  const next = pile.more ?? left;
  if (!canAsk || next === false || next <= 0) {
    return { kind: "end", shown: pile.items.length, count: pile.count };
  }
  /* The last page brings what is left; «50 more of 12» would promise rows that are not there. */
  return next >= left ? { kind: "more", left } : { kind: "more", left, next };
}

/** How many rows there are in total. Adds up the counts of the first level, which already
 *  include those below — it does not walk the rows, because it may not have them. */
export function pileCount<T>(piles: readonly Pile<T>[]): number {
  return piles.reduce((total, pile) => total + pile.count, 0);
}

/** Moves a level `delta` places. It stays at the edges instead of wrapping
 *  around: reaching the first and coming back to the last is not what anybody expects of
 *  an «up» arrow. The order of the levels IS the hierarchy, so this changes
 *  the question and not just the list. */
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
