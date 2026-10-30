"use client";

import type { Surface } from "@sincpro/web-ui/foundations/types";
import { createContext, type ReactNode, useContext } from "react";

/**
 * Context: which surface whatever is inside is drawing on.
 *
 * It is a context and not a prop —the opposite of `Button`— for the same reason
 * as density: a surface has to be UNIFORM inside. A chrome bar with a canvas
 * search box inside is not a mix, it is a bug, and that happened: the status bar
 * was drawn with the canvas palette on top of the navy because whoever put it
 * there forgot to pass `surface="chrome"`.
 *
 * The pieces that live on both still accept it as a prop: the prop wins, and the
 * context is only the default value. That way a one-off decision can be audited
 * by reading the JSX, which is the system's rule for color.
 */
const Ctx = createContext<Surface>("canvas");

export function SurfaceProvider({
  value,
  children,
}: {
  value: Surface;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSurface(explicit?: Surface): Surface {
  const inherited = useContext(Ctx);
  return explicit ?? inherited;
}

/** Picks between two values according to the surface. The twin of `byDensity`. */
export const bySurface = <T,>(surface: Surface, canvas: T, chrome: T): T =>
  surface === "chrome" ? chrome : canvas;
