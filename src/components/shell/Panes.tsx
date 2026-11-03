"use client";

import { HeaderSlotContext } from "@sincpro/web-ui/components/shell/headerSlot";
import { stickyReset } from "@sincpro/web-ui/foundations/sticky";
import type { ReactNode } from "react";

/* ==================================================================== *
 *  PANES — a screen of N sets side by side, each one with its own search.
 *
 *  Context: Odoo's bank reconciliation is the case — the statement lines on one side, the
 *  record being matched and the journal items that could match it on the other, each with
 *  its own search, and the person going back and forth between them. A list that fills the
 *  page carries its bar up to the screen's header (`useHeaderSlot`), and there is ONE
 *  header: with two or three lists they fought over it, and each bar stuck to the page
 *  instead of to its own column.
 *
 *  A pane is the answer: on a desk each pane SCROLLS ON ITS OWN — a long list on the left
 *  does not drag the record on the right out of sight — so what sticks inside it (a list's
 *  bar, a table's header) sticks to the pane's edge, and nothing inside goes up to the
 *  screen's header. Narrow, the panes stack and the page scrolls: a scroll inside a scroll
 *  on a phone is a list nobody can leave.
 *
 *  It decides by ITS OWN width (it is the `@container`), not the window's: a workspace panel
 *  among four is narrow on a wide screen, and a view mounted without a container around it
 *  would never go side by side.
 * ==================================================================== */

const BASIS = { narrow: "@4xl:flex-2", wide: "@4xl:flex-3" } as const;

/** One column of the screen. `narrow` for the set you pick from, `wide` for the work. */
export function Pane({
  children,
  size = "wide",
  label,
}: {
  children: ReactNode;
  size?: keyof typeof BASIS;
  /** What this pane is — «Extracto», «Por conciliar». Panes are regions a screen reader
   *  jumps between, so each one is named. */
  label: string;
}) {
  return (
    <HeaderSlotContext.Provider value={null}>
      <section
        aria-label={label}
        style={stickyReset()}
        /* Stacked it keeps its own height (the page scrolls); side by side it shares the
           height and scrolls inside. */
        className={`flex min-h-0 min-w-0 shrink-0 flex-col @4xl:shrink @4xl:basis-0 @4xl:overflow-y-auto ${BASIS[size]}`}
      >
        {children}
      </section>
    </HeaderSlotContext.Provider>
  );
}

/** The panes, side by side on a desk and stacked when narrow. Fills the height it is given. */
export function Panes({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-line @4xl:flex-row @4xl:divide-x max-@4xl:divide-y">
        {children}
      </div>
    </div>
  );
}
