"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Check, X } from "lucide-react";

/**
 * A yes / no, READ: how a boolean looks where it is shown and not changed — a cell, a fact, a
 * card.
 *
 * Context: a column of booleans drew «Sí» / «No» as plain text in one place, a bare ✓ and
 * nothing in another, «✓ Sí» / «No» in a third. Each is right for some column, so they are
 * LOOKS of one piece, chosen per column:
 *
 *     check   ✓ for yes, nothing for no — a column scanned for its yeses («Publicado»).
 *     icon    a green ✓ and a quiet ✕ — both answers matter and are read at a glance.
 *     word    «✓ Sí» / «No» — a check alone is not read by everyone the same way.
 *
 * Color never alone: the green ✓ has a shape that is not the ✕'s, and every look says «Sí» or
 * «No» to a screen reader, the empty «no» of `check` included — an empty cell is not an answer.
 * To CHANGE it from where it is shown, a column draws a checkbox or a switch instead (the
 * table's `yesNo.onToggle`).
 */
export type YesNoLook = "check" | "icon" | "word";

export function YesNo({ value, look = "word" }: { value: boolean; look?: YesNoLook }) {
  const copy = useUiCopy();
  const said = value ? copy.table.yes : copy.table.no;

  if (look === "icon") {
    return (
      <span
        data-ui="yes-no"
        data-value={value ? "yes" : "no"}
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-pill ${
          value ? "bg-good/12 text-good" : "bg-ink/6 text-muted"
        }`}
      >
        {value ? (
          <Check aria-hidden className="size-(--size-icon-sm)" strokeWidth={2.75} />
        ) : (
          <X aria-hidden className="size-(--size-icon-sm)" strokeWidth={2.5} />
        )}
        <span className="sr-only">{said}</span>
      </span>
    );
  }

  if (look === "check") {
    return value ? (
      <span data-ui="yes-no" data-value="yes" className="inline-flex text-good">
        <Check aria-hidden className="size-(--size-icon-sm)" strokeWidth={2.5} />
        <span className="sr-only">{said}</span>
      </span>
    ) : (
      <span data-ui="yes-no" data-value="no" className="sr-only">
        {said}
      </span>
    );
  }

  /* `word`: «no» needs no icon — an empty mark next to every false row would only add noise. */
  return value ? (
    <span
      data-ui="yes-no"
      data-value="yes"
      className="inline-flex items-center gap-1 text-ink"
    >
      <Check aria-hidden className="size-(--size-icon-sm) text-good" strokeWidth={2.5} />
      {said}
    </span>
  ) : (
    <span data-ui="yes-no" data-value="no" className="text-muted">
      {said}
    </span>
  );
}
