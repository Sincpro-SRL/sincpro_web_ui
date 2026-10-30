"use client";

import { createContext, useContext } from "react";

/**
 * Context: **where a view's header goes when the frame has a sidebar.**
 *
 * With a sidebar the screen is a grid: the application bar on top, the sidebar on the
 * left, the view on the right. A list's bar (crumbs, search, pagination, actions, sort,
 * presentation switcher) is the header of the SCREEN, not of the column to the right of
 * the sidebar — drawn inside that column it started at the sidebar's edge and the
 * sidebar, taller and darker, won the top-left of the page. The frame offers a full-width
 * slot between the application bar and the sidebar row; a view that has a header renders
 * it into the slot (a portal, so its context — density, surface, copy — comes along).
 *
 * `null` = there is no slot (no sidebar, or the slot has not mounted yet): the view draws
 * its header where it always did. Not exported from the package: it is the contract
 * between `AppFrame` and the views, not something an app writes.
 */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

export function useHeaderSlot(): HTMLElement | null {
  return useContext(HeaderSlotContext);
}
