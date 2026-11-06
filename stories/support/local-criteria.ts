import type { BuiltFilter, SearchCriteria } from "@sincpro/web-ui";

/**
 * Context: in an app the server answers the search bar's criteria; a story has its data in
 * memory, so this answers them here — the conditions a facet writes (`like`, `contains`, `=`,
 * `in`, numbers compared) and the joins (all · any · none). `read` says what a field of a
 * record is.
 */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

function test<T>(
  item: T,
  selection: BuiltFilter,
  read: (item: T, field: string) => unknown,
): boolean {
  if ("all" in selection) return selection.all.every((one) => test(item, one, read));
  if ("any" in selection) return selection.any.some((one) => test(item, one, read));
  if ("negate" in selection) return !test(item, selection.negate, read);
  if ("through" in selection) {
    /* Some record at the other end of the relation answers — criteria's `{through,
       selection}`, nothing else: «none» and «all» arrive as a `negate` around it. A to-one is
       one record, a to-many a list; the inner filter reads their own fields by name. */
    const reached = read(item, selection.through);
    const records = Array.isArray(reached) ? reached : reached == null ? [] : [reached];
    return records.some((one) =>
      test(one as Record<string, unknown>, selection.selection, (row, field) => row[field]),
    );
  }
  const value = read(item, selection.field);
  const wanted = selection.value;
  switch (selection.operator) {
    case "like":
    case "contains":
    case "ilike":
      return fold(String(value ?? "")).includes(
        fold(String(wanted ?? "").replaceAll("%", "")),
      );
    case "in":
      return Array.isArray(wanted) && wanted.includes(value);
    case ">":
      return Number(value) > Number(wanted);
    case "<":
      return Number(value) < Number(wanted);
    case ">=":
      return Number(value) >= Number(wanted);
    case "<=":
      return Number(value) <= Number(wanted);
    case "!=":
      return value !== wanted;
    default:
      return value === wanted;
  }
}

function node<T>(
  item: T,
  one: SearchCriteria,
  read: (item: T, field: string) => unknown,
): boolean {
  if (one.kind === "group") return true;
  if (one.kind === "filter") {
    return one.selection === undefined || test(item, one.selection, read);
  }
  const results = one.of.map((child) => node(item, child, read));
  if (one.join === "any") return results.length === 0 || results.some(Boolean);
  if (one.join === "not") return !results.some(Boolean);
  return results.every(Boolean);
}

export function keepMatching<T>(
  items: readonly T[],
  criteria: readonly SearchCriteria[],
  read: (item: T, field: string) => unknown,
): T[] {
  return items.filter((item) => criteria.every((one) => node(item, one, read)));
}
