"use client";

import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  ROW WINDOW — the rows of a `<table>` that are worth drawing.
 *
 *  Context: `DataTable` drew every row it got. A page of eighty is nothing; a
 *  «load more» that reached three thousand was three thousand rows of cells,
 *  copy buttons and editors, and the tab froze. web-framework put a ceiling on
 *  «load more» and kept the pages BECAUSE of it. This is what lifts the ceiling.
 *
 *  ── It stays a `<table>` ────────────────────────────────────────────
 *
 *  `SheetTable` positions `<div>` rows absolutely. A list cannot: its columns
 *  size themselves from the content, its header sticks with `position: sticky`
 *  and its rows carry the row semantics a screen reader walks. So the rows that
 *  are NOT drawn become one spacer row above and one below — real height, no
 *  content, `aria-hidden` —, and the table says how many rows it really has
 *  (`aria-rowcount`) and where each drawn one sits (`aria-rowindex`).
 *
 *  ── The scroller is found, not declared ─────────────────────────────
 *
 *  A list inside `AppFrame` scrolls with the PAGE — that is what keeps the
 *  application bar, the list bar and the header stuck one under the other. The
 *  same list inside a composer panel or a `Peek` scrolls inside THAT box, and a
 *  `DataTable` with `height` scrolls inside its own. The nearest ancestor that
 *  really scrolls vertically is the one; none means the page. Giving the table a
 *  scroll box of its own instead would break the sticky stack — the trap
 *  AGENTS.md writes down for `overflow-hidden`.
 *
 *  ── Only past a size ────────────────────────────────────────────────
 *
 *  Under `WINDOW_FROM` rows everything is drawn, as before: the browser's find,
 *  printing and a row that is always there are worth more than the few
 *  milliseconds saved on a page of eighty. Over it, the find of the browser only
 *  sees what is drawn — the search bar is how a set that large is searched.
 *
 *  ── What has focus stays drawn ──────────────────────────────────────
 *
 *  A cell being edited, a copy button just pressed: if its row scrolled out and
 *  got unmounted, the focus would fall to `<body>` and the popover with it. The
 *  last row that took focus is always kept in the window, wherever it is.
 *  Tabbing forward works without help: the next row is in the overscan, the
 *  browser scrolls it into view, and the window follows.
 * ==================================================================== */

/** From how many rows the table draws only the ones in view. */
export const WINDOW_FROM = 200;

/** A first guess of a row's height; each drawn row is measured after. */
const ESTIMATE = 36;
/** Rows drawn beyond each edge of the view. */
const OVERSCAN = 10;
/** Rows drawn before the scroller is known — the first frame only. */
const FIRST_FRAME = 40;

/** What a drawn row has to carry: spread on its `<tr>`. */
export type WindowedRow = {
  ref: (node: HTMLTableRowElement | null) => void;
  "data-index": number;
  "aria-rowindex": number;
  onFocus: () => void;
};

type Scroller = HTMLElement | "page";

/** The nearest ancestor that scrolls vertically, or the page. */
function scrollerOf(node: HTMLElement): Scroller {
  for (let el = node.parentElement; el !== null; el = el.parentElement) {
    if (el === document.body || el === document.documentElement) break;
    const { overflowY } = getComputedStyle(el);
    const scrolls = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    /* A box that is `overflow-auto` only because the table is WIDER than it grows with
       its content and never scrolls down: it is not the one. */
    if (scrolls && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return "page";
}

/** Where the body starts inside the scroller's content — what the window counts from. */
function offsetIn(body: HTMLElement, scroller: Scroller): number {
  const top = body.getBoundingClientRect().top;
  if (scroller === "page") return top + window.scrollY;
  return top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

/**
 * Which rows of `count` to draw. Spread `body` on the `<tbody>`, draw `rows` in the
 * order given — `windowed(i)` on each one's `<tr>` — with `pad(...)` between them, and
 * pass `rowCount` to the table.
 *
 * `rowsBefore` is how many rows the table has above the body (the header), so the
 * `aria-rowindex` of the rows counts from there.
 */
export function useRowWindow({
  count,
  rowsBefore = 1,
  getKey,
}: {
  count: number;
  rowsBefore?: number;
  getKey: (index: number) => string;
}): {
  on: boolean;
  body: { ref: RefObject<HTMLTableSectionElement | null> };
  /** The indices to draw, in order. All of them when the window is off. */
  rows: readonly { index: number; start: number; end: number }[];
  windowed: (index: number) => WindowedRow | undefined;
  /** The spacer that stands for the rows not drawn before `start`. */
  pad: (from: number, to: number, columns: number, key: string) => ReactNode;
  /** The spacer after the last drawn row. */
  tail: (columns: number) => ReactNode;
  /** Scrolls row `index` into the window, so it gets drawn — for a jump past what is drawn
   *  (`Home`, `End`, «take me to it»). Nothing when the window is off: every row is there. */
  reveal: (index: number) => void;
} {
  const on = count >= WINDOW_FROM;
  const body = useRef<HTMLTableSectionElement>(null);
  const [scroller, setScroller] = useState<Scroller | null>(null);
  const [margin, setMargin] = useState(0);
  const pinned = useRef<number | null>(null);

  /* Every render, before paint: which box scrolls and where the body starts in it. The
     window re-renders on scroll, so what moves above the table — metrics that loaded,
     chips that wrapped — is caught on the next one. Set only on a real change: each set
     is one more render. No dependency list on purpose: what it measures is the layout,
     which no prop of this hook describes; it settles because it sets only on a change. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const node = body.current;
    if (!on || node === null) return;
    const found = scrollerOf(node);
    if (found !== scroller) setScroller(found);
    const at = offsetIn(node, found);
    if (Math.abs(at - margin) > 1) setMargin(at);
  });

  const options = {
    count,
    estimateSize: () => ESTIMATE,
    overscan: OVERSCAN,
    scrollMargin: margin,
    getItemKey: getKey,
    rangeExtractor: (range: { startIndex: number; endIndex: number }) => {
      const first = Math.max(0, range.startIndex - OVERSCAN);
      const last = Math.min(count - 1, range.endIndex + OVERSCAN);
      const out: number[] = [];
      for (let i = first; i <= last; i += 1) out.push(i);
      const keep = pinned.current;
      if (keep !== null && keep < count && (keep < first || keep > last)) {
        out.push(keep);
        out.sort((a, b) => a - b);
      }
      return out;
    },
  };
  const inBox = useVirtualizer<HTMLElement, HTMLTableRowElement>({
    ...options,
    enabled: on && scroller !== null && scroller !== "page",
    getScrollElement: () => (scroller === null || scroller === "page" ? null : scroller),
  });
  const inPage = useWindowVirtualizer<HTMLTableRowElement>({
    ...options,
    enabled: on && scroller === "page",
  });
  const v = scroller === "page" ? inPage : inBox;

  const all = () =>
    Array.from({ length: count }, (_, index) => ({
      index,
      start: index * ESTIMATE,
      end: (index + 1) * ESTIMATE,
    }));

  /* The positions come back in the scroller's coordinates; the spacers live inside the
     body, so they are counted from where it starts. */
  const rows = !on
    ? all()
    : scroller === null
      ? all().slice(0, FIRST_FRAME)
      : v.getVirtualItems().map((item) => ({
          index: item.index,
          start: item.start - margin,
          end: item.end - margin,
        }));
  const total = !on ? 0 : scroller === null ? count * ESTIMATE : v.getTotalSize();

  const spacer = (height: number, columns: number, key: string) =>
    height <= 0 ? null : (
      <tr key={key} aria-hidden style={{ height }}>
        <td colSpan={columns} className="p-0" />
      </tr>
    );

  return {
    on,
    body: { ref: body },
    rows,
    windowed: (index) =>
      !on
        ? undefined
        : {
            ref: scroller === null ? () => {} : v.measureElement,
            "data-index": index,
            "aria-rowindex": index + rowsBefore + 1,
            onFocus: () => {
              pinned.current = index;
            },
          },
    pad: (from, to, columns, key) => (on ? spacer(to - from, columns, key) : null),
    tail: (columns) => {
      if (!on) return null;
      const end = rows.length === 0 ? 0 : rows[rows.length - 1]!.end;
      return spacer(total - end, columns, "\u0000tail");
    },
    reveal: (index) => {
      if (on && scroller !== null) v.scrollToIndex(index, { align: "auto" });
    },
  };
}
