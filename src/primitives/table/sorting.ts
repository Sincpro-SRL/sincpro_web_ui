/* ==================================================================== *
 *  SORTING — an ordered list of criteria, not one column.
 *
 *  Context: the order of a set was ONE field and a direction. That answers
 *  «the newest first», and not the question people actually asked the list:
 *  «by date, and within the same date by customer, and then by product». The
 *  second and third fields are tie-breakers — they only decide between rows the
 *  first one left equal — and the engine's criteria already takes them
 *  (`order: [{ field, descending }, …]`). What could not say it was the screen.
 *
 *  So the order is a LIST, outermost first. Empty is «as they came»: the
 *  third state of a header, which gives the natural order back.
 *
 *  The two doors to it write the same list:
 *
 *      header click        this column alone — the quick question
 *      header Shift+click  this column as one more tie-breaker
 *      the bar's panel     the whole list: add, flip, reorder, remove
 *
 *  Pure, and in the table family because the header (`Th`) is its first user;
 *  the list's bar reads it from here.
 * ==================================================================== */

export type SortDirection = "asc" | "desc";

/** One criterion: a field and its direction. */
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** Where a column stands in the order: its place (0 = the primary) and direction. */
export function sortPosition(
  sort: readonly SortState[] | undefined,
  key: string,
): { index: number; direction: SortDirection } | null {
  const index = sort?.findIndex((one) => one.key === key) ?? -1;
  if (index === -1 || sort === undefined) return null;
  return { index, direction: sort[index]?.direction ?? "asc" };
}

/**
 * What a press on a column header does to the order.
 *
 * Plain press — the column ALONE:
 *   - the only criterion: asc → desc → nothing. The third press gives the
 *     natural order back (see `Table.tsx`).
 *   - with others around it: the column alone, flipped if it was there, and
 *     never «nothing» — a press that also wipes the tie-breakers someone built
 *     in the panel would be a surprise, not a shortcut.
 *
 * `additive` (Shift) — one more tie-breaker, the others untouched:
 *   - absent: appended, ascending.
 *   - ascending: flipped in its place.
 *   - descending: taken out.
 */
export function pressSort(
  sort: readonly SortState[],
  key: string,
  additive: boolean,
): SortState[] {
  const at = sortPosition(sort, key);

  if (additive) {
    if (at === null) return [...sort, { key, direction: "asc" }];
    if (at.direction === "asc") {
      return sort.map((one, i) => (i === at.index ? { key, direction: "desc" } : one));
    }
    return sort.filter((_, i) => i !== at.index);
  }

  if (at === null) return [{ key, direction: "asc" }];
  if (sort.length === 1) return at.direction === "asc" ? [{ key, direction: "desc" }] : [];
  return [{ key, direction: at.direction === "asc" ? "desc" : "asc" }];
}

/** The criterion at `index` with its direction flipped. */
export function flipSort(sort: readonly SortState[], index: number): SortState[] {
  return sort.map((one, i) =>
    i === index ? { ...one, direction: one.direction === "asc" ? "desc" : "asc" } : one,
  );
}

/** The criteria with the ones in `keys` moved to sit before `target` (or after it). The
 *  shape React Aria's drag-and-drop hands over: a set of dragged keys and a drop target. */
export function moveSort(
  sort: readonly SortState[],
  keys: ReadonlySet<string>,
  target: string,
  position: "before" | "after",
): SortState[] {
  const moving = sort.filter((one) => keys.has(one.key));
  const rest = sort.filter((one) => !keys.has(one.key));
  const at = rest.findIndex((one) => one.key === target);
  if (at === -1 || moving.length === 0) return [...sort];
  const cut = position === "before" ? at : at + 1;
  return [...rest.slice(0, cut), ...moving, ...rest.slice(cut)];
}

/**
 * Compares two rows by every criterion, in order: the second one speaks only when the first
 * one ties. `read` gives each row's value for a field; `undefined` there means «this field
 * cannot be sorted here» and the criterion is skipped.
 *
 * Missing values go LAST whatever the direction. A blank is not «the smallest»: it is the
 * absence of an answer, and putting it first when the order is flipped fills the first
 * screen with the rows that say the least.
 */
export function compareBy<T>(
  sort: readonly SortState[],
  read: (key: string) => ((row: T) => string | number | null | undefined) | undefined,
): (a: T, b: T) => number {
  const criteria = sort.flatMap((one) => {
    const value = read(one.key);
    return value === undefined ? [] : [{ value, sign: one.direction === "asc" ? 1 : -1 }];
  });

  return (a, b) => {
    for (const { value, sign } of criteria) {
      const left = value(a);
      const right = value(b);
      const leftMissing = left === null || left === undefined || left === "";
      const rightMissing = right === null || right === undefined || right === "";
      if (leftMissing && rightMissing) continue;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      if (order !== 0) return order * sign;
    }
    return 0;
  };
}
