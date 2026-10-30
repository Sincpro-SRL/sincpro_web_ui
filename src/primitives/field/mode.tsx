"use client";

import { createContext, type ReactNode, useContext } from "react";

/* ==================================================================== *
 *  THE FORM MODE — look or write, and the VIEW decides it.
 *
 *  It is the same rule as density and for the same reason: a form with two
 *  read-only fields and three editable ones is not a mixed form, it is one that
 *  somebody forgot to finish. The mode has to be uniform inside, so it is set by
 *  whoever composes the screen and not by each field.
 *
 *  ── In read mode there are no disabled controls, there is TEXT ──────
 *
 *  An `<input disabled>` still draws the box, the border and the height of a
 *  control: it says "you write here, but not now", and on a record nobody is
 *  going to edit that is a screen full of boxes empty of meaning. In read mode
 *  the value is drawn as what it is —a piece of data— and the record becomes
 *  readable straight through.
 *
 *  What does NOT change is the label: in both modes it is there, in the same
 *  place and with the same weight. It is what allows going from looking to
 *  editing without the screen rearranging itself.
 * ==================================================================== */

export type FormMode = "edit" | "read";

const Ctx = createContext<FormMode>("edit");

export function FormModeProvider({
  value,
  children,
}: {
  value: FormMode;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The mode of this field. The prop beats the context — a computed field stays
 *  in read mode inside a form that is being edited. */
export function useFormMode(explicit?: FormMode): FormMode {
  const inherited = useContext(Ctx);
  return explicit ?? inherited;
}
