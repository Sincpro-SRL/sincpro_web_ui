/**
 * What a step of a tour points at.
 *
 * Context: the anchors are the ones the system already keeps stable, so no component needs a
 * prop to be pointed at:
 *
 *  - `{ part }` — a web-ui part (`data-ui`, listed in the README and guarded by a test):
 *    `{ part: "sidebar.search" }`. With `key`, one item of a collection:
 *    `{ part: "navigation.item", key: "socios.cuotas" }`.
 *  - `{ spot }` — anything the application marked: `<GuideSpot id="cifras">` or its own
 *    element with `data-guide="cifras"`.
 *  - `{ selector }` — any CSS selector, for what has no name yet.
 *  - a function — a ref, or whatever the application computes at that moment.
 */
export type GuideTarget =
  | { part: string; key?: string }
  | { spot: string }
  | { selector: string }
  | (() => Element | null | undefined);

/* A quoted attribute value: only `"` and `\` need escaping there — and unlike `CSS.escape`
   this also runs where there is no DOM (a test, a server). */
const quoted = (value: string) => `"${value.replace(/["\\]/g, "\\$&")}"`;

/** The CSS selector a target names; `null` for a function. */
export function selectorOf(target: Exclude<GuideTarget, () => unknown>): string;
export function selectorOf(target: GuideTarget): string | null;
export function selectorOf(target: GuideTarget): string | null {
  if (typeof target === "function") return null;
  if ("part" in target) {
    const part = `[data-ui=${quoted(target.part)}]`;
    return target.key === undefined ? part : `${part}[data-key=${quoted(target.key)}]`;
  }
  if ("spot" in target) return `[data-guide=${quoted(target.spot)}]`;
  return target.selector;
}
