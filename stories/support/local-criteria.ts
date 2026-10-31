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
  where: BuiltFilter,
  read: (item: T, field: string) => unknown,
): boolean {
  if ("all" in where) return where.all.every((one) => test(item, one, read));
  if ("any" in where) return where.any.some((one) => test(item, one, read));
  if ("negate" in where) return !test(item, where.negate, read);
  const value = read(item, where.field);
  const wanted = where.value;
  switch (where.operator) {
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
  if (one.kind === "filter") return one.where === undefined || test(item, one.where, read);
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
