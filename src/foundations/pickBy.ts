import type { Density, Surface } from "@sincpro/web-ui/foundations/types";

/**
 * One of two values, by the density or by the surface — the two choices a surface makes for
 * everything inside it (`density.tsx`, `surface.tsx`). Reading them takes React's context;
 * picking by them does not, so the pick lives here, without `"use client"`: a server
 * component that knows its surface writes the same classes.
 */

/** Pick between two values according to the density, without writing the
 *  ternary.
 *
 *  It exists so the difference between the two stays on ONE readable line next
 *  to the class, and not scattered across conditionals — which is how one of
 *  the two densities ends up unmaintained. */
export function byDensity<T>(d: Density, comfortable: T, compact: T): T {
  return d === "compact" ? compact : comfortable;
}

/** Picks between two values according to the surface. The twin of `byDensity`. */
export const bySurface = <T>(surface: Surface, canvas: T, chrome: T): T =>
  surface === "chrome" ? chrome : canvas;
