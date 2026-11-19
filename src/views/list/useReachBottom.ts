"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

/** The nearest ancestor that scrolls vertically; `null` when it is the window. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let at = el.parentElement; at !== null; at = at.parentElement) {
    const y = getComputedStyle(at).overflowY;
    if (y === "auto" || y === "scroll") return at;
  }
  return null;
}

/**
 * How tall a list must be to reach the bottom of what scrolls it — so its floating pill sits at
 * the bottom of the SCREEN, not right under the last row.
 *
 * Context: the pill is sticky to the bottom of the list (`mt-auto`), which is the bottom of the
 * screen only while the list is taller than the screen. A list of six courses ended a third of the
 * way down and its pill floated there, under the sixth row: its place moved with how many rows
 * there were. With this as its `min-height` the list reaches the bottom of its scroll box (the
 * window, or the view's own box), and the pill has ONE place.
 *
 * Measured once and on resize — never on scroll: where the list starts within what scrolls does
 * not change while scrolling. Nothing is measured on the server; the pill settles after hydration.
 */
export function useReachBottom(
  frame: RefObject<HTMLElement | null>,
  on: boolean,
): number | undefined {
  const [min, setMin] = useState<number>();
  useLayoutEffect(() => {
    const el = frame.current;
    if (!on || el === null) {
      setMin(undefined);
      return;
    }
    const scroller = scrollerOf(el);
    const measure = () => {
      const viewTop = scroller === null ? 0 : scroller.getBoundingClientRect().top;
      const viewHeight = scroller === null ? window.innerHeight : scroller.clientHeight;
      const scrolled = scroller === null ? window.scrollY : scroller.scrollTop;
      const padded =
        scroller === null
          ? 0
          : Number.parseFloat(getComputedStyle(scroller).paddingBottom) || 0;
      const top = el.getBoundingClientRect().top - viewTop + scrolled;
      const rest = Math.floor(viewHeight - top - padded);
      setMin(rest > 0 ? rest : undefined);
    };
    measure();
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    watch?.observe(scroller ?? document.documentElement);
    window.addEventListener("resize", measure);
    return () => {
      watch?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [frame, on]);
  return min;
}
