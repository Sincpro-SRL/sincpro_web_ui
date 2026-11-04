"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { PileFoot } from "@sincpro/web-ui/foundations/grouping";

/**
 * The foot of a short pile, as words: «Show 50 more of 49,950», or «Showing 500 of 49,950»
 * when there is no next page.
 *
 * Context: the table's row and the list's line both draw it, each in its own frame (a `td`
 * with a `colSpan`, an indented line), so this is only what goes inside. The end is quiet
 * text and not a disabled button: there is nothing to press, and a control that does
 * nothing is the bug this replaced.
 */
export function PileFootLine({ foot, onMore }: { foot: PileFoot; onMore: () => void }) {
  const copy = useUiCopy();
  const n = (value: number) => value.toLocaleString(copy.locale);
  if (foot.kind === "end") {
    return (
      <span className="text-meta text-muted">
        {fillCopy(copy.table.pileShown, { shown: n(foot.shown), count: n(foot.count) })}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onMore}
      className="rounded-control text-meta text-primary transition-colors duration-(--duration-instant) hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
    >
      {foot.next === undefined
        ? fillCopy(copy.table.pileMore, { count: n(foot.left) })
        : fillCopy(copy.table.pileMoreOf, { count: n(foot.next), left: n(foot.left) })}
    </button>
  );
}
