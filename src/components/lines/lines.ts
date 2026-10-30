/* The decisions of `LineItems` that do not need a screen: which lines a search leaves, where a
   removed line was and who takes the focus after it, and what «Listo» hands to the owner of
   the lines. Pure, so a test reads them without a browser. */

/** The lines whose text contains the query, case and locale aware. An empty query is all. */
export function filterLines<T>(
  lines: readonly T[],
  query: string,
  textOf: (line: T) => string,
  locale: string,
): readonly T[] {
  const q = query.trim().toLocaleLowerCase(locale);
  if (q === "") return lines;
  return lines.filter((line) => textOf(line).toLocaleLowerCase(locale).includes(q));
}

/**
 * What removing a line needs to know BEFORE it is gone: its position among all the lines (so
 * «Deshacer» puts it back exactly there) and the visible line that inherits the focus — the
 * next one, or the previous one when it was the last. `null` when none is left.
 */
export function planRemoval<T>(
  lines: readonly T[],
  shown: readonly T[],
  id: string,
  getId: (line: T) => string,
): { index: number; focus: string | null } {
  const index = lines.findIndex((l) => getId(l) === id);
  const at = shown.findIndex((l) => getId(l) === id);
  const neighbour = shown[at + 1] ?? (at > 0 ? shown[at - 1] : undefined);
  return { index, focus: neighbour === undefined ? null : getId(neighbour) };
}

/** What «Listo» does with the draft: nothing yet (it is not valid), add it, or replace a line. */
export type DraftCommit<T> =
  { kind: "invalid" } | { kind: "add"; line: T } | { kind: "change"; id: string; line: T };

export function commitDraft<T>(
  id: string | null,
  draft: T,
  isValid?: (draft: T) => boolean,
): DraftCommit<T> {
  if (isValid !== undefined && !isValid(draft)) return { kind: "invalid" };
  return id === null ? { kind: "add", line: draft } : { kind: "change", id, line: draft };
}
