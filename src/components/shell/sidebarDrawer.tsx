"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Menu as Hamburger } from "lucide-react";
import { createContext, useContext } from "react";

/**
 * Context: **the sidebar on a phone.** Below `sm` (`--container-handheld`) a 15 rem column
 * beside the view is two thirds of a 390 px screen, so `AppFrame` hides it and offers the
 * SAME sidebar as a drawer from the start edge. What opens the drawer lives in the bar on
 * top — the application's `TopBar`, or the bar the frame draws when the sidebar is the
 * only chrome — and the frame is the one that knows there is a drawer. This is that
 * contract: `null` outside a frame with a sidebar, so a `TopBar` without one draws no
 * button that opens nothing.
 */
export type SidebarDrawer = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** The drawer's id, for `aria-controls`. */
  id: string;
};

export const SidebarDrawerContext = createContext<SidebarDrawer | null>(null);

/** The phone drawer of the frame's sidebar, for a bar or a control an application writes
 *  itself. `null` when the frame has no sidebar. */
export function useSidebarDrawer(): SidebarDrawer | null {
  return useContext(SidebarDrawerContext);
}

/** The button that opens the sidebar on a phone. It draws nothing on a wider screen — the
 *  sidebar is in view there — nor outside a frame with a sidebar. `TopBar` draws it first
 *  on its own; write it only in a bar of your own. */
export function SidebarToggle({ surface = "chrome" }: { surface?: "canvas" | "chrome" }) {
  const copy = useUiCopy();
  const drawer = useSidebarDrawer();
  if (drawer === null) return null;
  return (
    <span className="flex shrink-0 sm:hidden">
      <IconButton
        icon={Hamburger}
        label={copy.shell.openNavigation}
        size="md"
        surface={surface}
        expanded={drawer.isOpen}
        haspopup="dialog"
        {...(drawer.isOpen ? { "aria-controls": drawer.id } : {})}
        onClick={drawer.open}
      />
    </span>
  );
}
