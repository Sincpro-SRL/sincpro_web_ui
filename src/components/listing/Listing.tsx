"use client";

import { useHeaderSlot } from "@sincpro/web-ui/components/shell/headerSlot";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/* ==================================================================== *
 *  LISTING — the shape of a screen of N records. A single one, for all of them.
 *
 *  The request was literal: «in every list window don't forget that it has
 *  [Search (Filters)] [List]». Up to here every view built that by hand —one
 *  put the totals on top, another the search box below the upload panel, another
 *  had no search box at all— and the result is that two lists of the same
 *  product get used differently.
 *
 *  Four bands, always in the same order:
 *
 *      bar       crumbs · search · pagination
 *                actions · title · columns · views
 *      body      the rows, in a card with a border
 *
 *  ── The list goes in a card and the background stays behind ─────────
 *
 *  It is what separates an application from a document. Without the card the
 *  rows float over nothing and the screen reads as running text; the card puts
 *  a boundary around the set, and that boundary is what makes it read as «one
 *  thing with elements inside».
 *
 *  ── Two densities, and both are needed ──────────────────────────────
 *
 *  `table`  aligned, sortable columns. It wins when there is width: the data
 *           gets compared across rows without reading, which is what a table
 *           exists for.
 *  `rows`   two lines per record, big name and metadata underneath. It wins
 *           when there is NO width —a narrow panel, the preview— because a
 *           six-column table in 380 px is not a table, it is an accordion.
 *
 *  It is not an aesthetic preference: it is the available width. That is why
 *  the consumer passes it and this piece does not choose it — only whoever
 *  composes knows which surface it is going to land on.
 *
 *  ── The row lays itself out; nobody tells it how ────────────────────
 *
 *  WHICH presentation is the consumer's call. How a row arranges itself inside
 *  the one that was chosen is nobody's: there is no width at which a row «turns
 *  narrow», and no breakpoint written anywhere. Every zone asks for what it
 *  needs —the name `--container-name`, the tags `--container-tags`, the
 *  metadata what it says— and the line does what a line does: what does not fit
 *  wraps, and the name keeps the first one.
 *
 *  **That is why it holds up with a checkbox, an icon, actions, no tags, or a
 *  metadata three times longer.** None of that is declared anywhere: they all
 *  take their width from the same line, so a list that selects wraps a little
 *  earlier than one that does not, on its own. Asking the density instead —a
 *  decision per SURFACE— got it wrong in the one place it mattered: a list in a
 *  480 px drawer is comfortable —it draws its title, its counters, its full
 *  padding— and narrow at the same time, and the name was left with whatever
 *  was over between a metadata that did not shrink and a tag column of 8 rem:
 *  about a dozen pixels, «ve…».
 * ==================================================================== */

export function Listing({
  bar,
  metrics,
  sticky = false,
  surface,
  children,
}: {
  /** The `ListingBar`: actions, title, search, pagination and views. */
  bar?: ReactNode;
  /**
   * The bar stays at the top on scroll, below whatever is already stuck.
   *
   * It is opt-in and not the default because the background has to be that of what is
   * BEHIND, and that depends on where it is placed: the list archetype lives
   * on the page floor, but a `FrameView` —a record's «glance»— lives on the white
   * PAPER, and there the floor-coloured band looks like a
   * stain. It was discovered by comparing stories, not by reasoning.
   */
  sticky?: boolean;
  /** What the list is placed on. It is used only for the background of the band that
   *  sticks: `chrome` paints the same blue the bar already paints —that is,
   *  invisible— and any other paints the FLOOR, which is what is behind a
   *  page list. Those living inside something white —a drawer, a preview—
   *  are compact, and in compact the bar does not stick. */
  surface?: Surface;
  /** The metrics that also narrow down. They go BELOW the bar and above the
   *  rows: they belong to the set I am looking at, not to the frame that frames
   *  it — above the bar they read as part of the navigation. */
  metrics?: ReactNode;
  children: ReactNode;
}) {
  const d = useDensity();
  /* The bar STICKS to the top and the rows go beneath it.
     Context: with 187 rows, scrolling to see the last one left you without search,
     without pager and without the presentation switcher — so cutting
     after looking forced you to scroll up again. It sticks below whatever is already
     stuck (the application bar) and pushes the stack down for the
     table's header, which sticks below it. See `system/sticky.tsx`. */
  const band = useStickyLayer<HTMLDivElement>();

  /* In compact it does NOT stick, and not for lack of space: compact is a drawer
     or a preview, that is a short box with its own header and its own
     scroll. A band stuck there is painted over the drawer's white paper —it
     looks like a stain— to solve a scroll that does not exist in five rows.
     It is the same reason `ListingBar` does not draw the identity there either. */
  const pegada = sticky && d === "comfortable";
  /* With a sidebar the bar is the screen's header: it goes in the frame's full-width slot,
     above the sidebar (see `shell/headerSlot.ts`), and the frame does the sticking. */
  const slot = useHeaderSlot();
  const inSlot = pegada && slot !== null;

  return (
    /* Context: the box of rows carries no border. What separates it from the
       background is its white and its radius; a frame around a list that is
       already inside a framed panel is a nested rectangle, and nested
       rectangles are what make a product read like a cloud console. */
    <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-2.5", "gap-2")}`}>
      {/* The BAR sticks, not the metrics. The background is mandatory and not
          aesthetic: without it the rows are seen passing under the text. The
          metrics stay out because they are the only ones that in a chromeless list
          would have to paint a background of their own, and the colour depends on what
          the list is placed on — the page floor or a record's white paper.
          They answer «what is this made of», not «what am I
          looking at»: they can go. */}
      {/* No bar, no band: an empty sticky box would still take a gap above the rows. */}
      {bar === undefined || bar === null ? null : inSlot ? (
        createPortal(bar, slot)
      ) : (
        <div
          ref={band.ref}
          className={`min-w-0 ${
            pegada ? `sticky z-30 ${surface === "chrome" ? "bg-chrome" : "bg-ground"}` : ""
          }`}
          style={pegada ? band.self : undefined}
        >
          {bar}
        </div>
      )}
      {/* Out of the slot the bar is a sibling and the column gap separates it from the
          metrics; in the slot it is not, so the gap is put back. */}
      {inSlot && metrics !== undefined ? <div className="pt-2">{metrics}</div> : metrics}
      {/* `overflow-clip` and NOT `overflow-hidden`: both clip the rounded
          corners the same, but `hidden` creates a scroll container, and
          then the table header's `sticky` sticks to the edge of
          THIS box —which does not scroll— instead of the page's. So it
          went away with the rows. `clip` clips without being a scroller. */}
      <div
        className="min-w-0 overflow-clip rounded-box bg-surface"
        style={pegada && !inSlot ? band.below : undefined}
      >
        {children}
      </div>
    </div>
  );
}
