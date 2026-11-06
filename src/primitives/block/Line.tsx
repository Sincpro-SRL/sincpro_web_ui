import type { ReactNode } from "react";

/* ==================================================================== *
 *  THE THREE-ZONE LINE — and why the centre is centred against the LINE.
 *
 *  It is the shape of the product's two bands: the record's —where I
 *  come from · what hangs from this · which of eighty I am— and the list's —where
 *  I come from · what I am looking for · which page—. Both have the same
 *  problem and so they have a single solution.
 *
 *  ── The problem: the centre was not in the centre ───────────────────
 *
 *  With `mx-auto`, or with an `auto 1fr max-content` grid, the centre ends up
 *  wherever there is room LEFT OVER. And then a fifty-character name on the
 *  left —which in this product is normal— pushes the buttons against the
 *  right edge, and the same screen with a short name draws them somewhere
 *  else. Two records in a row put their controls in two different places:
 *  that is not a centre, it is a remainder.
 *
 *  ── The rule: both sides ASK for the same thing ─────────────────────
 *
 *  The sides ask for the same width and grow evenly, so what is left over is
 *  split in two equal halves and the centre falls in the middle of the line, with
 *  or without breadcrumbs, with or without a pager. What does not fit in a half is clipped
 *  inside its half —that is what `min-w-0` is for— instead of pushing the neighbour.
 *
 *  ── And it splits by itself ─────────────────────────────────────────
 *
 *  There is no threshold here: no media query, no container query, no branch
 *  per density. Each zone declares what it ASKS for and `flex-wrap` decides: in
 *  a narrow band the centre no longer fits beside the breadcrumbs and drops whole
 *  to the next row, with the pager behind it. It is what a list row does,
 *  and for the same reason: a threshold does not know whether the line carries three
 *  counters or nine.
 * ==================================================================== */

export function Line({
  start,
  center,
  end,
  /**
   * What each side ASKS for before the line splits. Both ask for the
   * same —it is what centres the centre— so it is a single value and not two.
   */
  asks = "var(--container-trail)",
  /** What the centre asks for. `auto` is «whatever it measures»; a search field asks for
   *  its maximum width, which is what keeps it from stretching to 700 px. */
  centerAsks = "auto",
  gap = "gap-x-4 gap-y-2",
  align = "items-center",
}: {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  asks?: string;
  centerAsks?: string;
  gap?: string;
  align?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap ${align} ${gap}`}>
      {/* The three zones are ALWAYS drawn, even empty. A half that
          disappears when there is no pager moves the centre, and then the
          centre depends again on what is beside it — which is the problem
          this solves. */}
      <div className="flex min-w-0 flex-1 items-center" style={{ flexBasis: asks }}>
        {start}
      </div>
      {/* The centre does NOT grow. If it did, what is left over would be split in three and
          the centre would move again with what it has beside it — a search
          field asks for its maximum width and the two sides keep the rest, in
          equal halves. Shrinking does: in a narrow line the field shrinks
          before it overflows. */}
      <div
        className="flex min-w-0 shrink items-center justify-center"
        style={{ flexBasis: centerAsks, flexGrow: 0 }}
      >
        {center}
      </div>
      <div
        className="flex min-w-0 flex-1 items-center justify-end"
        style={{ flexBasis: asks }}
      >
        {end}
      </div>
    </div>
  );
}
