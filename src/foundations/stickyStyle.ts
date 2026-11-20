import type { CSSProperties } from "react";

/**
 * The sticky stack's variable and the two styles that read it — see the long note in
 * `sticky.tsx`. Plain values, without `"use client"`: a band a server component draws sticks
 * below the others the same way. Measuring a band is `sticky.tsx`'s, in the browser.
 */

/** The variable that says at what height the next thing to stick starts. */
export const STICKY_TOP = "--sticky-top";

/** What goes in the `style` of something sticky: it sticks below what is already there. */
export const stickyTop: CSSProperties = { top: `var(${STICKY_TOP}, 0px)` };

/** For a box with its own scroll: inside, the stack starts from zero. */
export function stickyReset(): CSSProperties {
  return { [STICKY_TOP]: "0px" } as CSSProperties;
}
