"use client";

import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import { HANDHELD_WIDTH } from "@sincpro/web-ui/foundations/layout";
import { WIDE_PRESENTS } from "@sincpro/web-ui/views/list/columns";
import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * A narrow LIST — a phone, a drawer, a panel among four — does not offer the presentations
 * that need width: a seven-column table at 360 px is a horizontal scroll nobody reads.
 * There the list shows rows (a stacked card per record: the name, its state, its facts)
 * and the board, and the switcher offers only those. It is the width of the list's own
 * container that decides, not the window's: a narrow panel on a wide screen is narrow.
 *
 * Attach `frame` to the list's root element; `offered` is what the switcher may show and
 * `present` what to draw (a wide one that was asked for falls back to rows).
 */
export function useNarrowList(
  presents: readonly ListPresent[] | undefined,
  requested: ListPresent,
): {
  frame: RefObject<HTMLDivElement | null>;
  offered: readonly ListPresent[];
  present: ListPresent;
} {
  const frame = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = frame.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setNarrow(entry.contentRect.width < HANDHELD_WIDTH);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const offered = (presents ?? []).filter((p) => !narrow || !WIDE_PRESENTS.includes(p));
  const present: ListPresent =
    narrow && WIDE_PRESENTS.includes(requested) ? "rows" : requested;
  return { frame, offered, present };
}
