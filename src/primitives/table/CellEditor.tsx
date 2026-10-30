"use client";

import { cn, focusRing } from "@sincpro/web-ui/foundations/variants";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { Pencil } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button as AriaButton, Dialog, DialogTrigger } from "react-aria-components";

/* ==================================================================== *
 *  CELL EDITOR — change one value of a list without leaving the list.
 *
 *  Context: the salesperson of an invoice, its due date, its stage. Opening the record to
 *  change one field and coming back is three screens for one value, and the person loses
 *  the row they were on. Odoo answers it with the editable list; this is the step before it:
 *  the list stays a list, and ONE cell opens a small popover with the right control —
 *  a `Picker`, a `Calendar`, a `Select` — anchored to the cell, the way a date picker opens
 *  its calendar under its field.
 *
 *  ── The cell IS the button ──────────────────────────────────────────
 *
 *  The whole drawing of the cell is the trigger, not a pencil on its side: the target is
 *  the value the eye is already on (Fitts), and a column of twelve pencils is noise. The
 *  pencil only appears where the pointer or the keyboard is — on hover and on visible
 *  focus — the same rule `RowActions` follows: an affordance without a subject yet is not
 *  shown. That is also why an editable column must not draw links: they would be a button
 *  inside a button.
 *
 *  ── React Aria's dialog trigger ─────────────────────────────────────
 *
 *  `DialogTrigger` + `Popover` + `Dialog`: Escape and a click outside close it, and the
 *  focus goes back to the cell it came from, so the keyboard continues down the column.
 *  What commits is the editor's own gesture (choosing a person, pressing a day), and then
 *  it calls `done`. Closing without that gesture changes nothing — Escape is «cancel».
 *
 *  The button's name is the verb plus the value («Editar vencimiento 15/11/2026»): the
 *  value alone does not say it can be changed, the verb alone does not say what it is.
 * ==================================================================== */

/** The first control of the editor gets the focus, unless the editor already placed it
 *  (a `Calendar` with `autoFocus`). Arriving in a popover with the focus on its frame is one
 *  extra Tab before the first key does anything. */
function useFocusFirst(scope: { current: HTMLElement | null }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = scope.current;
      if (root === null) return;
      const active = document.activeElement;
      if (active !== null && active !== root && root.contains(active)) return;
      for (const selector of [
        "input:not([disabled])",
        /* A calendar: the day the keyboard is on, not the «previous month» arrow. */
        '[role="grid"] [tabindex="0"]',
        "button:not([disabled])",
        '[tabindex="0"]',
      ]) {
        const target = root.querySelector<HTMLElement>(selector);
        if (target !== null) {
          target.focus();
          return;
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [scope]);
}

function EditorDialog({
  label,
  editor,
}: {
  label: string;
  editor: (done: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusFirst(ref);
  return (
    <Dialog
      ref={ref}
      aria-label={label}
      className="max-h-[inherit] max-w-sm min-w-56 overflow-auto p-2 outline-0"
    >
      {({ close }) => editor(close)}
    </Dialog>
  );
}

/**
 * One cell of a `DataTable` that edits in place: its drawing becomes a button that opens
 * `editor` in a popover anchored to the cell.
 *
 * Internal to the table family: a column asks for it with `DataColumn.edit`.
 */
export function CellEditor({
  label,
  numeric,
  editor,
  children,
}: {
  /** The verb and the column: «Editar vencimiento». Names the button and the popover. */
  label: string;
  numeric: boolean;
  editor: (done: () => void) => ReactNode;
  children: ReactNode;
}) {
  const verb = useId();
  const shown = useId();
  return (
    /* The row may open its record on click; changing one cell must not also open it. */
    <div onClick={(event) => event.stopPropagation()} className="-mx-1 min-w-0">
      <DialogTrigger>
        <AriaButton
          aria-labelledby={`${verb} ${shown}`}
          className={({ isFocusVisible }) =>
            cn(
              "group/edit flex w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-mark px-1 text-inherit outline-0 transition-colors duration-(--duration-instant) hover:bg-ink/6 pressed:bg-ink/10 aria-expanded:bg-primary/8",
              numeric ? "flex-row-reverse text-right" : "text-left",
              focusRing({ isFocusVisible }),
            )
          }
        >
          <span id={verb} hidden>
            {label}
          </span>
          <span id={shown} className="min-w-0 flex-1 truncate">
            {children}
          </span>
          <Pencil
            aria-hidden
            strokeWidth={2}
            className="size-(--size-icon-sm) shrink-0 text-muted opacity-0 transition-opacity duration-(--duration-instant) group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100 group-aria-expanded/edit:opacity-100"
          />
        </AriaButton>
        <Popover placement={numeric ? "bottom end" : "bottom start"}>
          <EditorDialog label={label} editor={editor} />
        </Popover>
      </DialogTrigger>
    </div>
  );
}
