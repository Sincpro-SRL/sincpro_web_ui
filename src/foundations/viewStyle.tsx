"use client";

import { createContext, type ReactNode, useContext } from "react";

/* ==================================================================== *
 *  THE VIEW STYLE — how a whole application draws its views. Set once.
 *
 *  `modern` is the DIRECTION the system is taking — what new screens are drawn in and what
 *  keeps being applied and refined —; `traditional` stays for the applications drawn in it.
 *
 *  traditional  the rail as an ERP has it: a band on top with the trail, the counters and the
 *               pager; the actions on its second row with the state. The default.
 *  modern       the trail is the page's heading —at the title's size, the pager on its line—;
 *               the counters and the state go a step down, quieter; the band is the ground,
 *               not a white strip; and the actions float in a pill at the bottom of the
 *               screen (`Record.Dock`).
 *
 *  The SAME API draws both: `Record.Dock`'s and `List.Dock`'s actions are the bar's buttons in
 *  `traditional` and ONE floating pill at the bottom in `modern` — a record and a list alike.
 *  An application chooses its look the way it chooses its density — once, around the app —,
 *  and a record can say its own (`Record look`).
 * ==================================================================== */

export type ViewStyle = "traditional" | "modern";

const Ctx = createContext<ViewStyle>("traditional");

export function ViewStyleProvider({
  value,
  children,
}: {
  value: ViewStyle;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The style in force: the record's own, else the provider's. */
export function useViewStyle(own?: ViewStyle): ViewStyle {
  const inherited = useContext(Ctx);
  return own ?? inherited;
}
