"use client";

import type { Box } from "@sincpro/web-ui/components/guide/place";
import { type GuideTarget, selectorOf } from "@sincpro/web-ui/components/guide/selector";

/* What a step points at and the selector it names are plain (`selector.ts`), without the
   directive, so a server component reads them; re-exported so every path that read them here
   keeps reading them. Finding and measuring the element is this module's: it needs the DOM. */
export type { GuideTarget };
export { selectorOf };

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
