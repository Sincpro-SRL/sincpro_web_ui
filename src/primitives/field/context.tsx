"use client";

import { createContext, useContext } from "react";

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
