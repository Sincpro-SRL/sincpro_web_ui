"use client";

import { HeaderSlotContext } from "@sincpro/web-ui/components/shell/headerSlot";
import { SidebarDrawerContext } from "@sincpro/web-ui/components/shell/sidebarDrawer";
import { TopBar } from "@sincpro/web-ui/components/shell/TopBar";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { HANDHELD_WIDTH } from "@sincpro/web-ui/foundations/layout";
import { stickyReset, stickyTop, useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
import { bySurface, SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { Dialog as AriaDialog, Modal, ModalOverlay } from "react-aria-components";

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
 *
 *  ── The sidebar AS the chrome: no `menu` ────────────────────────────
 *
 *      ┌──────────┬────────────────────────────────────────────┐
 *      │ brand    │ view                                       │
 *      │ user     │   …its own header sticks at the top…       │
 *      │ sections │                                            │
 *      │ ──────── │                                            │
 *      │ sign out │                                            │
 *      └──────────┴────────────────────────────────────────────┘
 *
 *  A back office whose navigation is all in the sidebar has no bar on top: the
 *  sidebar is as tall as the window and holds the brand and the user itself
 *  (`Sidebar`). A view's header then stays in the view's column — there is no
 *  bar for it to hang under, and spanning above the sidebar it would push the
 *  brand down from the top-left, which is the brand's place.
 *
 *  ── On a phone the sidebar is a drawer ──────────────────────────────
 *
 *  Below `sm` a 15 rem column is two thirds of the screen. The sidebar is hidden
 *  and the SAME content opens as a drawer from the start edge: from a button the
 *  `TopBar` draws first, or — with no `menu` — from the bar the frame draws for
 *  the phone alone (`narrowMenu`, a bare `TopBar` by default). Following a link
 *  in it closes it: the person went where they were going.
 *
 *  ── In the brand's colour: `sidebarSurface="chrome"` ────────────────
 *
 *  The frame paints the column (and the drawer), so the frame is told which
 *  surface it is, and hands it to what is inside: a `Sidebar`, its tree, its
 *  counts. It is meant for the sidebar AS the chrome — with a `menu` too it
 *  would be a second dark band beside the bar's.
 *
 *  ── A workspace that scrolls itself: `scroll="view"` ────────────────
 *
 *      ┌──────────┬────────────────────────────────────────────┐
 *      │ sidebar  │ ┌ the workspace ─────────────────────────┐ │
 *      │          │ │ its own header sticks at ITS top       │ │  ← exactly the window,
 *      │          │ │ …and it scrolls inside itself…         │ │    minus the bar
 *      │          │ └────────────────────────────────────────┘ │
 *      └──────────┴────────────────────────────────────────────┘
 *
 *  By default the PAGE scrolls and the bars above announce their height in
 *  `--sticky-top`, so a view's sticky bands hang under them. A workspace
 *  (composer's) is the opposite: it is as tall as the window and scrolls
 *  inside its own boxes, where that offset is wrong — a table's header stuck
 *  that far down INSIDE the box, over its first rows. With `scroll="view"` the
 *  frame is the window's height, the view gets what the bars leave, and the
 *  stack starts from zero inside it (`stickyReset`). Without it every app wrote
 *  the same two `div`s by hand — the frame this component exists to replace.
 *
 *  ── On paper ────────────────────────────────────────────────────────
 *
 *  The bar, the sidebar and the drawer do not print: a printed record is the
 *  record. And a frame the window's height lets the whole view out on paper.
 * ==================================================================== */

/* Following a link closes the drawer. On the CAPTURE phase: React Aria's links stop the
   click from bubbling, and a keyboard Enter on one reaches here as the click it dispatches. */
function closeOnLink(close: () => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest("a[href]") !== null) close();
  };
}

/** The sidebar as a drawer, for a phone: modal (the page behind is inert and dimmed, the
 *  focus is kept inside and returns to the button), dismissed by the scrim, Escape, its ×
 *  or a link followed. */
function SidebarDrawerPanel({
  id,
  open,
  onClose,
  surface,
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  surface: Surface;
  children: ReactNode;
}) {
  const copy = useUiCopy();
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable
      className={({ isEntering, isExiting }) =>
        `fixed inset-0 z-50 bg-scrim/40 transition-opacity duration-(--duration-quick) ease-(--ease-out) sm:hidden print:hidden ${
          isEntering || isExiting ? "opacity-0" : ""
        }`
      }
    >
      <Modal
        className={({ isEntering, isExiting }) =>
          `fixed inset-y-0 start-0 flex w-(--container-drawer) flex-col border-e shadow-window outline-0 transition-[translate] duration-(--duration-panel) ease-(--ease-out) ${bySurface(
            surface,
            "border-line-strong bg-ground",
            "border-chrome-edge bg-chrome",
          )} ${isEntering || isExiting ? "-translate-x-full rtl:translate-x-full" : ""}`
        }
      >
        <AriaDialog
          id={id}
          aria-label={copy.shell.navigation}
          className="flex min-h-0 flex-1 flex-col outline-0"
        >
          <SurfaceProvider value={surface}>
            <div className="flex shrink-0 justify-end px-2 pt-2">
              <IconButton icon={X} label={copy.shell.close} onClick={onClose} />
            </div>
            <div
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
              onClickCapture={closeOnLink(onClose)}
            >
              {children}
            </div>
          </SurfaceProvider>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function AppFrame({
  /** The bar at the top. It stays in view while scrolling. */
  menu,
  /** The band at the bottom. It goes AFTER the content, not pinned to the
   *  floor of the window — pinning left a hole between it and a short view. */
  status,
  /** The module's navigation, on the left of the view: a `NavigationTree`, or a `Sidebar`
   *  around one when there is no `menu` and the sidebar is the application's chrome. On a
   *  phone it opens as a drawer. */
  sidebar,
  /** With a `sidebar` and no `menu`: the bar on top on a PHONE only, where the sidebar is a
   *  drawer and something has to open it — a `TopBar` with the product's name, which draws
   *  the button first. A bare `TopBar` by default. */
  narrowMenu,
  /** The surface of the sidebar and its drawer. `chrome` wears the brand's colour — for the
   *  sidebar as the application's chrome (no `menu`). `canvas` by default. */
  sidebarSurface = "canvas",
  /** Who scrolls. `page` (the default): the whole page, with the bars stuck on top. `view`:
   *  the frame is the window's height and the view scrolls inside itself — a workspace. */
  scroll = "page",
  children,
}: {
  menu?: ReactNode;
  status?: ReactNode;
  sidebar?: ReactNode;
  narrowMenu?: ReactNode;
  sidebarSurface?: Surface;
  scroll?: "page" | "view";
  children: ReactNode;
}) {
  /* The top bar MEASURES what it takes and passes it to what is below: a list's
     bar sticks beneath it, and a table's header beneath the other two. None of the
     three has a fixed height — see `system/sticky.tsx`. */
  const bar = useStickyLayer<HTMLDivElement>();
  /* The slot for a view's header (see `headerSlot.ts`): full width, stuck under the
     application bar, and it pushes the stack down for the sidebar and the table header. */
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const head = useStickyLayer<HTMLDivElement>();
  const hasSidebar = sidebar !== undefined;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();
  const drawer = useMemo(
    () =>
      hasSidebar
        ? {
            isOpen: drawerOpen,
            open: () => setDrawerOpen(true),
            close: () => setDrawerOpen(false),
            id: drawerId,
          }
        : null,
    [hasSidebar, drawerOpen, drawerId],
  );
  /* A window widened past the phone while the drawer was open (a tablet turned): the
     sidebar is back beside the view, and a modal drawer left open would keep the page inert
     behind a panel CSS has already hidden. */
  useEffect(() => {
    if (!drawerOpen) return;
    const wide = window.matchMedia(`(min-width: ${HANDHELD_WIDTH}px)`);
    const close = () => {
      if (wide.matches) setDrawerOpen(false);
    };
    close();
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, [drawerOpen]);

  /* With no `menu` the sidebar is the chrome: on a wide screen nothing is on top of it, and
     on a phone a bar appears to open it. */
  const sidebarIsChrome = hasSidebar && menu === undefined;
  const top = sidebarIsChrome ? (narrowMenu ?? <TopBar />) : menu;

  /* With `scroll="view"` the regions down to `main` take the height they are given instead of
     growing with their content (`min-h-0`), and `main` is where the view scrolls: the stack
     of sticky things starts again at its top. */
  const fills = scroll === "view";
  const region = fills ? "min-h-0" : "";
  const mainScroll = fills ? "min-h-0 overflow-y-auto print:overflow-visible" : "";

  /* The sidebar sits on the ground tone, the content on the paper (surface): the same white
     for both made the navigation read as part of the list bar. On the chrome it wears the
     brand's colour. On a phone it is hidden: the drawer shows it. */
  const aside =
    sidebar === undefined ? null : (
      <aside
        className={`sticky w-(--container-sidebar) shrink-0 self-start overflow-y-auto overscroll-contain border-r max-sm:hidden print:hidden ${bySurface(
          sidebarSurface,
          "border-line bg-ground",
          "border-chrome-edge bg-chrome",
        )}`}
        style={{ ...stickyTop, height: "calc(100dvh - var(--sticky-top, 0px))" }}
      >
        <SurfaceProvider value={sidebarSurface}>{sidebar}</SurfaceProvider>
      </aside>
    );

  return (
    <SidebarDrawerContext value={drawer}>
      {/* The frame owns the page: its background and its full height. A screen built inside
         it is only composition — before, every page had to wrap itself in a `div` with the
         ground color and `min-h-dvh`, and the one that forgot ended where its content did. */}
      <div
        className={`relative flex min-w-0 flex-col bg-ground ${
          fills ? "h-dvh overflow-hidden print:h-auto print:overflow-visible" : "min-h-dvh"
        }`}
        data-scroll={scroll}
      >
        {top === undefined ? null : (
          /* Hidden on a wide screen when it is only the phone's bar: it measures 0 there, so
             nothing below is pushed down by it. */
          <div
            ref={bar.ref}
            className={`sticky top-0 z-40 print:hidden ${sidebarIsChrome ? "sm:hidden" : ""}`}
          >
            {top}
          </div>
        )}
        {sidebar === undefined ? (
          <main
            className={`flex min-w-0 flex-1 flex-col ${mainScroll}`}
            style={fills ? stickyReset() : bar.below}
          >
            {children}
          </main>
        ) : sidebarIsChrome ? (
          <div className={`flex min-w-0 flex-1 items-start ${region}`} style={bar.below}>
            {aside}
            <main
              className={`flex min-w-0 flex-1 flex-col self-stretch ${mainScroll}`}
              {...(fills ? { style: stickyReset() } : {})}
            >
              {children}
            </main>
          </div>
        ) : (
          <HeaderSlotContext value={slot}>
            <div className={`flex min-w-0 flex-1 flex-col ${region}`} style={bar.below}>
              <div
                ref={(node) => {
                  head.ref.current = node;
                  setSlot(node);
                }}
                className="sticky z-30 min-w-0"
                style={head.self}
              />
              <div className={`flex min-w-0 flex-1 items-start ${region}`} style={head.below}>
                {aside}
                <main
                  className={`flex min-w-0 flex-1 flex-col self-stretch ${mainScroll}`}
                  {...(fills ? { style: stickyReset() } : {})}
                >
                  {children}
                </main>
              </div>
            </div>
          </HeaderSlotContext>
        )}
        {status}
        {sidebar === undefined ? null : (
          <SidebarDrawerPanel
            id={drawerId}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            surface={sidebarSurface}
          >
            {sidebar}
          </SidebarDrawerPanel>
        )}
      </div>
    </SidebarDrawerContext>
  );
}
