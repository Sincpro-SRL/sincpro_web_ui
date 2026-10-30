"use client";

import { HeaderSlotContext } from "@sincpro/web-ui/components/shell/headerSlot";
import { stickyTop, useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
import { type ReactNode, useState } from "react";

/* ==================================================================== *
 *  THE APPLICATION FRAME — the three bands, and nothing between them.
 *
 *      ┌───────────────────────────────────────────────────────┐
 *      │ menu                                                  │  ← sticky
 *      ├───────────────────────────────────────────────────────┤  ← no seam
 *      │ view                                                  │
 *      ├───────────────────────────────────────────────────────┤  ← no seam
 *      │ status                                                │
 *      └───────────────────────────────────────────────────────┘
 *
 *  It exists because the frame was handwritten in the application, with a
 *  `px-3 py-2.5` here and a `bg-surface` there, and every hole fix opened
 *  another one in another view. The decisions below are taken ONCE and hold
 *  for every view — list, record, form — which is what makes them look alike
 *  without anybody remembering to copy them.
 *
 *  ── What this frame decides, and why ────────────────────────────────
 *
 *  **The three bands touch.** No padding, no margin, no `gap` between the
 *  menu, the view and the status. Any gap here reads as a white border around
 *  the content: the dark band of a list stops reading as the continuation of
 *  the menu and starts looking like a loose card.
 *
 *  **The view does not get padding from the frame.** Inner air is put by the
 *  view, which is the only one that knows whether it is drawing a table to
 *  both edges or a narrow form. A padding here would impose it on both.
 *
 *  **Nothing forces the window height.** A short view ends where its content
 *  ends: without cascading `h-full` there is no leftover white under the
 *  status, and the page scrolls as a whole like any page.
 *
 *  ── The sidebar ─────────────────────────────────────────────────────
 *
 *      ┌───────────────────────────────────────────────────────┐
 *      │ menu                                                  │  ← sticky
 *      ├──────────┬────────────────────────────────────────────┤
 *      │ sidebar  │ view                                       │
 *      │ (sticky) │   …scrolls with the page…                  │
 *      ├──────────┴────────────────────────────────────────────┤
 *      │ status                                                │
 *      └───────────────────────────────────────────────────────┘
 *
 *  It sticks UNDER the menu, not at the top of the window: it reads the same
 *  measured `--sticky-top` the view's own sticky bands read, so a menu that
 *  wraps to two lines pushes the sidebar down with it. It is as tall as what
 *  is left of the window and scrolls on its own, so a long module never takes
 *  the page with it. The page still scrolls as a whole — only the view moves.
 *  Without a `sidebar` the frame is exactly what it was.
 * ==================================================================== */

export function AppFrame({
  /** The bar at the top. It stays in view while scrolling. */
  menu,
  /** The band at the bottom. It goes AFTER the content, not pinned to the
   *  floor of the window — pinning left a hole between it and a short view. */
  status,
  /** The module's navigation, on the left of the view: a `NavigationTree`. */
  sidebar,
  children,
}: {
  menu?: ReactNode;
  status?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  /* La barra de arriba MIDE lo que ocupa y se lo pasa a lo de abajo: la barra
     de una lista se pega debajo de ella, y el encabezado de una tabla debajo de
     las dos. Ninguna de las tres tiene alto fijo — ver `system/sticky.tsx`. */
  const bar = useStickyLayer<HTMLDivElement>();
  /* The slot for a view's header (see `headerSlot.ts`): full width, stuck under the
     application bar, and it pushes the stack down for the sidebar and the table header. */
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const head = useStickyLayer<HTMLDivElement>();

  return (
    /* The frame owns the page: its background and its full height. A screen built inside
       it is only composition — before, every page had to wrap itself in a `div` with the
       ground color and `min-h-dvh`, and the one that forgot ended where its content did. */
    <div className="relative flex min-h-dvh min-w-0 flex-col bg-ground">
      {menu === undefined ? null : (
        <div ref={bar.ref} className="sticky top-0 z-40">
          {menu}
        </div>
      )}
      {sidebar === undefined ? (
        <main className="flex min-w-0 flex-1 flex-col" style={bar.below}>
          {children}
        </main>
      ) : (
        <HeaderSlotContext value={slot}>
          <div className="flex min-w-0 flex-1 flex-col" style={bar.below}>
            <div
              ref={(node) => {
                head.ref.current = node;
                setSlot(node);
              }}
              className="sticky z-30 min-w-0"
              style={head.self}
            />
            <div className="flex min-w-0 flex-1 items-start" style={head.below}>
              {/* The sidebar sits on the ground tone, the content on the paper (surface): the
                  same white for both made the navigation read as part of the list bar. */}
              <aside
                className="sticky w-(--container-sidebar) shrink-0 self-start overflow-y-auto overscroll-contain border-r border-line bg-ground"
                style={{ ...stickyTop, height: "calc(100dvh - var(--sticky-top, 0px))" }}
              >
                {sidebar}
              </aside>
              <main className="flex min-w-0 flex-1 flex-col self-stretch">{children}</main>
            </div>
          </div>
        </HeaderSlotContext>
      )}
      {status}
    </div>
  );
}
