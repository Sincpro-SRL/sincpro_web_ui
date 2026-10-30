import type { ReactNode } from "react";

/* ==================================================================== *
 *  THE SURFACE, AS PART OF THE STORY.
 *
 *  Storybook's backgrounds addon is good for EXPLORING —trying a piece over
 *  another background by hand— and it is not good for DOCUMENTING, because the
 *  background lives in a preference of whoever is looking and not in the story.
 *  A screenshot, a `docs` page or an `npm run build` come out with whatever
 *  background the last person who passed by had set, and then half the system
 *  is seen over a surface where it is never going to live.
 *
 *  Here the surface is content: if the piece goes on the chrome, the story
 *  draws the chrome. And along the way it forces the right thing — you cannot
 *  write a story without deciding which surface what it shows lives on.
 * ==================================================================== */

export function OnCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-box bg-ground p-5">
      {children}
    </div>
  );
}

/** The raised surface: a card, a block, the list inside the panel. */
export function OnSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-box border border-line bg-surface p-5">
      {children}
    </div>
  );
}

/** The chrome: header, menu rail, tab bar, activity bar.
 *
 *  It carries the `brand-wash` because the real header carries it, and the gold
 *  over a flat #121016 and over that same #121016 washed in blue do not look
 *  alike — if the story lies about that, it lies about exactly the one thing
 *  that had to be looked at. */
export function OnChrome({
  wash = false,
  children,
}: {
  wash?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-box bg-chrome p-5 ${
        wash ? "brand-wash" : ""
      }`}
    >
      {children}
    </div>
  );
}
