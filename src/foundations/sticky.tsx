"use client";

import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  THE STACK OF STICKY THINGS
 *
 *  Three bands stay at the top while a long view is scrolled, and each
 *  one has to sit BELOW the previous one:
 *
 *      ┌─ TopNav ─────────────────────────────────┐  top: 0
 *      ├─ list bar ───────────────────────────────┤  top: height of the TopNav
 *      │  🔍 buscar…  ⚙3          1–80 / 187 ‹ ›  │
 *      ├─ table header ───────────────────────────┤  top: the two above
 *      │  número │ cliente │ fecha │ total        │
 *      ├──────────────────────────────────────────┤
 *      │  …the rows, which do scroll away…        │
 *
 *  **None of the three has a fixed height.** The `TopNav` grows when it wraps;
 *  the list bar has two lines, or one when compact, or three when
 *  the search chips wrap. A hand-written `top-[52px]` is right in
 *  one window and leaves a gap or an overlap in the others — and it is the kind
 *  of number nobody touches again when the bar changes.
 *
 *  That is why each band MEASURES what it takes and adds it to `--sticky-top` for whatever
 *  comes below. The variable cascades, so each layer reads the one above without
 *  any of them knowing how many layers there are.
 *
 *  ── The rule for whoever opens a box with its own scroll ────────────
 *
 *  Inside a box with a height and `overflow`, it is the box that scrolls and not
 *  the page, so what is sticky sticks to the box's edge: there the stack
 *  starts from zero again. That is `stickyReset()`.
 * ==================================================================== */

/** The variable that says at what height the next thing to stick starts. */
export const STICKY_TOP = "--sticky-top";

/** What goes in the `style` of something sticky: it sticks below what is already there. */
export const stickyTop: CSSProperties = { top: `var(${STICKY_TOP}, 0px)` };

/** For a box with its own scroll: inside, the stack starts from zero. */
export function stickyReset(): CSSProperties {
  return { [STICKY_TOP]: "0px" } as CSSProperties;
}

/**
 * A TABLE'S BOX: when it has to be a scroll container and when not.
 *
 * The system's three tables have the same dilemma and used to solve it with three
 * copies of the same measurement. The dilemma is CSS's and cannot be dodged:
 * `overflow-x: auto` **forces** `overflow-y: auto` —the specification says that
 * `visible` next to a value that is neither `visible` nor `clip` computes to `auto`—,
 * so as soon as the box allows horizontal scroll it becomes the scroller, and
 * the sticky header sticks to ITS edge instead of the page's.
 *
 * From there come the three cases, and they are the only ones:
 *
 *     own height       the box really scrolls. `auto`, and the stack of sticky
 *                      things starts from zero inside.
 *     no height, fits  no box is needed. `clip` —trims the rounded corners
 *                      without being a scroller— and the header sticks
 *                      to the page, below the list bar.
 *     no height, does not fit   horizontal scroll comes back, and the header goes
 *                      away with the rows. It is the price, and it is what there is.
 *
 * Returns the class and the style already resolved so that no table has to
 * decide it on its own again.
 */
export function useScrollBox<T extends HTMLElement>(options: {
  /** The declared height. `undefined` or `"auto"` = grows with the content. */
  height?: number | string;
}): {
  ref: RefObject<T | null>;
  className: string;
  style: CSSProperties;
  /** `0` when the box scrolls: someone without a pointer has to be able to reach it to
   *  scroll it (WCAG 2.1.1) — a twelve-column report is unreadable past its third column
   *  otherwise. `undefined` when it grows with its content. */
  tabIndex: 0 | undefined;
} {
  const ref = useRef<T>(null);
  const crece = options.height === undefined || options.height === "auto";
  const [desborda, setDesborda] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null || !crece) return;
    /* The CONTENT is measured and not the box, and that is the difference between this
       working and getting stuck: with `overflow: clip` the box stops being a
       scroll container, so its `scrollWidth` becomes its own width
       and would never report overflow again. Once clipped, it would stay
       clipped forever. The child does know how wide it really is. */
    const dentro = node.firstElementChild;
    const medir = () => {
      const ancho = dentro === null ? node.scrollWidth : dentro.getBoundingClientRect().width;
      setDesborda(ancho > node.clientWidth + 1);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(medir);
    observer.observe(node);
    /* The content too: the columns change width without the box
       changing size. */
    if (dentro !== null) observer.observe(dentro);
    return () => observer.disconnect();
  }, [crece]);

  const suelta = crece && !desborda;
  return {
    ref,
    className: suelta ? "overflow-clip" : "overflow-auto",
    tabIndex: suelta ? undefined : 0,
    style: suelta
      ? {}
      : {
          ...(crece || options.height === undefined ? {} : { height: options.height }),
          ...stickyReset(),
        },
  };
}

/**
 * Measures an element's height and returns the style that pushes the stack for its
 * siblings below.
 *
 * `useLayoutEffect` and `ResizeObserver` and not a declared height: the height depends
 * on whether the search chips wrapped, and that is only known after
 * painting.
 */
export function useStickyLayer<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  /** Goes on the element that sticks. */
  self: CSSProperties;
  /** Goes on what comes BELOW, so that it sticks even lower. */
  below: CSSProperties;
} {
  const ref = useRef<T>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;

    /* The value below is computed in JS and written in PIXELS, not as
       `calc(var(--sticky-top) + 44px)`. Context: that form looks natural and
       does not work — setting `--sticky-top` on an element while reading `var(--sticky-top)`
       from the SAME element is a cycle, CSS declares it invalid, and the
       descendants inherit «nothing»: everything stuck at 0 and the bands
       overlapped. It was measured in the browser, not deduced. */
    const measure = () => {
      const inherited = Number.parseFloat(
        getComputedStyle(node).getPropertyValue(STICKY_TOP),
      );
      const above = Number.isFinite(inherited) ? inherited : 0;
      setTop(above + node.getBoundingClientRect().height);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    /* The height of a layer ABOVE changes without this observer noticing
       —the `TopNav` wraps when narrowed—, so it is also re-measured when the
       window is resized, which is when that happens. */
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return {
    ref,
    self: stickyTop,
    below: { [STICKY_TOP]: `${top}px` } as CSSProperties,
  };
}
