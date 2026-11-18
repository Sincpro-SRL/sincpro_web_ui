import type { ReactNode } from "react";

/**
 * Marks anything as a stop of a tour — `{ spot: "cifras" }` — without changing its layout.
 *
 * Context: a tour has to point at things the application composes — a row of `Metrics`, a
 * `Block`, a group of buttons — and none of them should grow a prop for it. This is a wrapper
 * with no box of its own (`display: contents`): inside a flex row or a grid its children stay
 * exactly where they were, and the tour measures the union of their boxes. An element of the
 * application's own can carry `data-guide` directly; this is for what it does not write.
 */
export function GuideSpot({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span data-guide={id} className="contents">
      {children}
    </span>
  );
}
