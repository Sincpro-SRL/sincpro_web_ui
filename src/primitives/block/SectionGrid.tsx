import type { ReactNode } from "react";

/**
 * Context: the rule that decides whether two sections go side by side is
 * DEPENDENCY, not space. Two that don't govern each other —the invoice lines
 * and its payments— go side by side; two that do —choosing the customer and then
 * its price list— go stacked, because the vertical order is the only thing that says which
 * one comes first.
 *
 * That is why it is a grid and not a `flex-wrap`: wrapping arranges by available
 * width, which is a decision about space.
 *
 * And it asks `@container` and not `md:`: with four panels open each one measures
 * 380 px on a 1.600 screen, and a window rule would put two 190 px columns inside
 * each panel. **Whoever mounts the view has to declare `@container` on its
 * container** — the composer already does.
 */
export function SectionGrid({
  children,
  /** A single column until the panel is truly large. For sections with a table
   *  inside: two 300 px tables don't read better than one 600 px one. */
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`grid min-w-0 gap-(--spacing-block) ${wide ? "@4xl:grid-cols-2" : "@2xl:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}

/** A section that takes up both columns: a wide table, the glance at twelve
 *  columns. Without this you would have to take it out of the grid and set up
 *  another one below, which is how a screen ends up with three grids and none of
 *  them aligned. */
export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="min-w-0 @2xl:col-span-2">{children}</div>;
}
