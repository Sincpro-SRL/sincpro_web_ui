"use client";

import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import { HANDHELD_WIDTH } from "@sincpro/web-ui/foundations/layout";
import { WIDE_PRESENTS } from "@sincpro/web-ui/views/list/columns";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";

/**
 * A narrow LIST — a phone, a drawer, a panel among four — does not offer the presentations
 * that need width: a seven-column table at 360 px is a horizontal scroll nobody reads.
 * There the list shows rows (a stacked card per record: the name, its state, its facts)
 * and the board, and the switcher offers only those. It is the width of the list's own
 * container that decides, not the window's: a narrow panel on a wide screen is narrow.
 *
 * Attach `frame` to the list's root element; `offered` is what the switcher may show and
 * `present` what to draw (a wide one that was asked for falls back to rows).
 *
 * Measured BEFORE paint: waiting for the observer's first report drew the table and swapped it
 * for rows a frame later, so a click on a row of a list in a panel landed on a detached `<tr>`.
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
  useLayoutEffect(() => {
    const el = frame.current;
    if (el === null) return;
    setNarrow(el.getBoundingClientRect().width < HANDHELD_WIDTH);
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setNarrow(entry.contentRect.width < HANDHELD_WIDTH);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return { frame, ...narrowed(presents, requested, narrow) };
}

/** What a list offers and draws at its width. Only a list that HAS rows folds into them: one
 *  that declares just a table fell back to rows it had no `row` for, and drew empty lines — a
 *  table that scrolls sideways says more. */
export function narrowed(
  presents: readonly ListPresent[] | undefined,
  requested: ListPresent,
  narrow: boolean,
): { offered: readonly ListPresent[]; present: ListPresent } {
  const folds = narrow && (presents === undefined || presents.includes("rows"));
  return {
    offered: (presents ?? []).filter((p) => !folds || !WIDE_PRESENTS.includes(p)),
    present: folds && WIDE_PRESENTS.includes(requested) ? "rows" : requested,
  };
}
