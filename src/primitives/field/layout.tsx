"use client";

import { createContext, type ReactNode, useContext } from "react";

/**
 * HOW A FIELD PLACES ITS LABEL. Declared once, inherited by every field.
 *
 *     stacked      the label above. The grouped look of iOS. The default.
 *     horizontal   label | value, and every value starts on the same vertical — the Odoo
 *                  form, where twenty fields read as a column and not as a bounce.
 *
 * Context: it lives in `primitives/field` and not next to `Sheet`, which declares it,
 * because the one that READS it is `Field` — and a primitive cannot import from a
 * component. The container sets it, the field obeys, and the type that joins them is in the
 * level both can see.
 *
 * Being a context and not a prop is what keeps a sheet from ending up half aligned: nobody
 * has to remember to pass it to each field.
 */
export type FieldLayout = "stacked" | "horizontal";

/** The name the sheet knows it by. */
export type SheetLayout = FieldLayout;

const LayoutCtx = createContext<FieldLayout>("stacked");

export function useSheetLayout(): FieldLayout {
  return useContext(LayoutCtx);
}

export function FieldLayoutProvider({
  value,
  children,
}: {
  value: FieldLayout;
  children: ReactNode;
}) {
  return <LayoutCtx.Provider value={value}>{children}</LayoutCtx.Provider>;
}
