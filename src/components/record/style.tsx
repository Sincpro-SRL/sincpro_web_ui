"use client";

import { createContext, type ReactNode, useContext } from "react";

/* ==================================================================== *
 *  THE RECORD STYLE — how a whole application draws its records. Set once. (experimental)
 *
 *  traditional  the rail as an ERP has it: a band on top with the trail, the counters and the
 *               pager; the actions on its second row with the state. The default.
 *  modern       the trail is the page's heading —at the title's size, the pager on its line—;
 *               the counters and the state go a step down, quieter; the band is the ground,
 *               not a white strip; and the actions float in a pill at the bottom of the
 *               screen (`Record.Dock`).
 *
 *  The SAME API draws both: `Record.Dock`'s actions are the rail's buttons in `traditional` and
 *  the floating pill in `modern`. An application chooses its look the way it chooses its
 *  density — once, around the app —, and a record can say its own (`Record look`).
 * ==================================================================== */

export type RecordStyle = "traditional" | "modern";

const Ctx = createContext<RecordStyle>("traditional");

export function RecordStyleProvider({
  value,
  children,
}: {
  value: RecordStyle;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The style in force: the record's own, else the provider's. */
export function useRecordStyle(own?: RecordStyle): RecordStyle {
  const inherited = useContext(Ctx);
  return own ?? inherited;
}
