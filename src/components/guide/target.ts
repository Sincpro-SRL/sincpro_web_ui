"use client";

import type { Box } from "@sincpro/web-ui/components/guide/place";

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

/** `display: contents` has no box of its own (a `GuideSpot`): its box is its children's. */
function wraps(element: Element): boolean {
  return getComputedStyle(element).display === "contents";
}

/** The element's box on screen, `null` when it has none — hidden, or not laid out. A
 *  `GuideSpot` measures as the union of what it wraps. */
export function boxOf(element: Element): Box | null {
  if (wraps(element)) {
    const boxes = [...element.children].map(boxOf).filter((box): box is Box => box !== null);
    if (boxes.length === 0) return null;
    const top = Math.min(...boxes.map((b) => b.top));
    const left = Math.min(...boxes.map((b) => b.left));
    const bottom = Math.max(...boxes.map((b) => b.top + b.height));
    const right = Math.max(...boxes.map((b) => b.left + b.width));
    return { top, left, width: right - left, height: bottom - top };
  }
  if (!element.checkVisibility({ visibilityProperty: true })) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export type Found = {
  /** The first match that is on screen. */
  shown: Element | null;
  /** A match that exists but is not on screen — the sidebar beside the view, on a phone. */
  hidden: Element | null;
};

/** Of every match, the one on screen wins: the same sidebar is laid out twice on a phone —
 *  hidden beside the view, and shown in the drawer. */
export function findTarget(target: GuideTarget, root: ParentNode = document): Found {
  const matches =
    typeof target === "function"
      ? [target()].filter((one): one is Element => one !== null && one !== undefined)
      : [...root.querySelectorAll(selectorOf(target))];
  return {
    shown: matches.find((one) => boxOf(one) !== null) ?? null,
    hidden: matches.find((one) => boxOf(one) === null) ?? null,
  };
}

/** What to scroll so the target is in view: a `GuideSpot` has no box to scroll to, its first
 *  child does. */
export function scrollable(element: Element): Element {
  return wraps(element) ? (element.firstElementChild ?? element) : element;
}
