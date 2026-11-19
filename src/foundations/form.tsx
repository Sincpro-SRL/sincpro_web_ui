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

/**
 * What a place WITHOUT a `Field` says to the control in it: what describes it and whether it
 * is in error — no id, no label.
 *
 * Context: a cell of an editable table has no label of its own (its control carries an
 * `aria-label`, the column's name) but it can be wrong — «la cantidad supera el stock» — and
 * that has to reach the control the same way a field's error does, or the error is a red
 * cell nobody hears. The table provides this around each control it edits; every control
 * that reads `useFieldIds` (the package's and an application's own) gets `aria-invalid` and
 * `aria-describedby` without the table knowing what control it is.
 */
export type ControlState = { describedBy?: string; invalid?: boolean };

export const ControlStateContext = createContext<ControlState | null>(null);

/**
 * Where a `Field` stops reaching: what is inside belongs to no field.
 *
 * Context: a `Field` hands its id and its label to the control inside it through context —
 * and context goes all the way down. An editable table placed inside a field (the lines of a
 * one2many under its label) gave EVERY cell's control the field's id and `aria-labelledby`:
 * forty inputs with the same id, all named «Líneas». A collection is many controls, each
 * named by its column, so the tables put this around themselves; an application's own
 * composite control does the same.
 */
export function FieldBoundary({ children }: { children: ReactNode }) {
  return <FieldIdsContext.Provider value={null}>{children}</FieldIdsContext.Provider>;
}

/** The ids of the enclosing `Field` — or, outside one, the state of the place the control
 *  sits in (a cell) — resolved against the control's own props. */
export function useFieldIds(own: { id?: string; describedBy?: string; invalid?: boolean }): {
  id: string | undefined;
  labelledBy: string | undefined;
  describedBy: string | undefined;
  invalid: boolean;
} {
  const field = useContext(FieldIdsContext);
  const place = useContext(ControlStateContext);
  return {
    id: own.id ?? field?.id,
    labelledBy: field?.labelId,
    describedBy: own.describedBy ?? field?.describedBy ?? place?.describedBy,
    invalid: own.invalid ?? field?.invalid ?? place?.invalid ?? false,
  };
}

/**
 * The `aria-label` a control puts on itself: none inside a `Field` — the field's label names
 * it — and outside one the control's own, or as a last resort its placeholder (what a browser
 * reads for a bare `<input placeholder>` anyway, so a control outside a form is never
 * nameless).
 *
 * Context: a control inside a `Field` used to keep its `aria-label` too. With both, React Aria
 * names the control by the label AND itself («Cliente Cliente», «Cantidad cantidad»), so the
 * name was read twice. The field wins: an `aria-label` is for a control that has no label
 * on screen — a table cell, a search box — and inside a field it is ignored.
 */
export function controlName(
  labelledBy: string | undefined,
  ariaLabel: string | undefined,
  fallback?: string,
): string | undefined {
  return labelledBy === undefined ? (ariaLabel ?? fallback) : undefined;
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

/* ==================================================================== *
 *  THE FORM STYLE — how a whole application draws its forms. Set once.
 *
 *  dense      Odoo's sheet: label | control, two columns of fields, help behind a `?` on
 *             the label. Twenty fields at a glance — an ERP's form. The default.
 *  settings   the settings page: every field a ROW that says what it asks — the label and
 *             its help written under it on the left, the control on the right, a hairline
 *             between rows —, each section a card with its title, an index of the sections
 *             beside them, and Save floating at the bottom of the screen.
 *
 *  Context: it is orthogonal to the layout (`stacked` / `horizontal`), which the SCREEN
 *  decides by its width; the style is the APPLICATION's, like density — a back office of
 *  forms people fill once in a while reads better when each field explains itself, and an
 *  ERP's dense sheet stays as it is. It is a context and not a prop for the reason the
 *  layout is: nobody has to remember it on each field, section and record.
 * ==================================================================== */

/**
 *     dense     the ERP's sheet: one white paper, groups side by side, a notebook of tabs.
 *     settings  a back office's form: each section a card of rows that explain themselves —
 *               the label, its help under it, the control beside —, an index at the left.
 *     sections  the DENSE sheet in the settings' shape: each group and each notebook page a
 *               card, on the ground, with the index at the left — and inside, the dense grid
 *               (label | value, two or three columns). A long record found by its index
 *               instead of hidden behind tabs, without losing a line of density.
 */
export type FormStyle = "dense" | "settings" | "sections";

const StyleCtx = createContext<FormStyle>("dense");

export function FormStyleProvider({
  value,
  children,
}: {
  value: FormStyle;
  children: ReactNode;
}) {
  return <StyleCtx.Provider value={value}>{children}</StyleCtx.Provider>;
}

export function useFormStyle(): FormStyle {
  return useContext(StyleCtx);
}
