"use client";

import { createContext, type ReactNode, useContext } from "react";

/* ==================================================================== *
 *  THE CONTRACT OF A CONTROL — what every control speaks, whoever wrote it.
 *
 *  Context: it lived in `primitives/field`, next to `Field`, so every control and every
 *  value that reads differently in read mode depended on the field FAMILY to reach two
 *  contexts — a `RelationValue` (a value) imported from the controls. They are not a
 *  control: they are the agreement between a form and what goes inside it, the way density
 *  and surface are, and an application's own control has to speak it the same way the
 *  package's do (docs/ARCHITECTURE.md §2).
 * ==================================================================== */

/**
 * What a `Field` hands to the control inside it: the id its label points at, the ids that
 * describe it (hint, error), and whether it is in error.
 *
 * Context: `Field` used to hand these through a render prop — `{(aria) => <TextInput
 * id={aria.id} … />}` — on every field of every form. Correct, and three lines of wiring
 * per field that anyone could get wrong (forget `describedBy` and the error is never read
 * aloud). Now a control written directly inside a `Field` reads them from here; the render
 * prop still works, and an explicit prop on the control always wins.
 */
export type FieldIds = {
  id: string;
  /** The id of the field's label. A native input is named by `<label for>`; a React Aria
   *  control — a date picker, a combobox — is a group of elements, and is named by this. */
  labelId: string;
  describedBy: string | undefined;
  invalid: boolean;
};

export const FieldIdsContext = createContext<FieldIds | null>(null);

/** The ids of the enclosing `Field`, resolved against the control's own props. */
export function useFieldIds(own: { id?: string; describedBy?: string; invalid?: boolean }): {
  id: string | undefined;
  labelledBy: string | undefined;
  describedBy: string | undefined;
  invalid: boolean;
} {
  const field = useContext(FieldIdsContext);
  return {
    id: own.id ?? field?.id,
    labelledBy: field?.labelId,
    describedBy: own.describedBy ?? field?.describedBy,
    invalid: own.invalid ?? field?.invalid ?? false,
  };
}

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
