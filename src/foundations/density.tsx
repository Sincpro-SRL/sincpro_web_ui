"use client";

import { createContext, type ReactNode, useContext } from "react";

/* ==================================================================== *
 *  DENSITY — the SURFACE decides it, not the component.
 *
 *  The same content has to look different in a 1,400 px panel and in a 480 px
 *  preview drawer. Not «a little smaller»: **different**. A six-column table at
 *  480 px is not a tight table, it is an accordion; and a form with each
 *  field's help text above it, at 480 px, is more help than form.
 *
 *  ── Why this one IS a context and color is NOT ──────────────────────
 *
 *  That is the question that matters, because the system's rule says the
 *  surface is a prop (`surface="chrome"`) precisely so that the decision is
 *  visible in the calling code. Here it is the other way around, and the
 *  difference is real:
 *
 *      COLOR    is decided per element. A ghost button on the chrome uses a
 *               different blue than on the canvas, and that is a contrast
 *               decision that has to be auditable one at a time.
 *      DENSITY  is decided per surface, and it has to be UNIFORM inside. A
 *               compact list with a comfortable form in the same drawer is not
 *               a mix: it is a bug.
 *
 *  And there is a practical reason: a view is indifferent to its surface —the
 *  same tree is drawn in a panel, in a preview and in a dialog—, so passing
 *  density by prop would force EVERY view to receive it and relay it to every
 *  child, just to forward something it did not decide. That is exactly what a
 *  context exists to avoid.
 *
 *  ── Two values, and not one more ────────────────────────────────────
 *
 *  `comfortable` and `compact`. A third intermediate step gets picked out of
 *  habit and stops meaning a place — the same reason buttons have three sizes
 *  and not five.
 * ==================================================================== */

export type Density = "comfortable" | "compact";

const Ctx = createContext<Density>("comfortable");

/** The surface declares it: `Peek` and the narrow dialogs set it to `compact`;
 *  a panel leaves it at `comfortable`. */
export function DensityProvider({
  value,
  children,
}: {
  value: Density;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDensity(): Density {
  return useContext(Ctx);
}

/** Pick between two values according to the density, without writing the
 *  ternary.
 *
 *  It exists so the difference between the two stays on ONE readable line next
 *  to the class, and not scattered across conditionals — which is how one of
 *  the two densities ends up unmaintained. */
export function byDensity<T>(d: Density, comfortable: T, compact: T): T {
  return d === "compact" ? compact : comfortable;
}
