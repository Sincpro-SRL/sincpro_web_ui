"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Save, Undo2 } from "lucide-react";

export interface DirtyState {
  onSave: () => void;
  onDiscard: () => void;
  /** It is saving. The button turns off: pressing it twice sends it twice, and
   *  when what gets saved is a payment, that matters. */
  saving?: boolean;
  /** What gets saved, when it is not obvious: «guardar la factura», «guardar la
   *  regla». */
  label?: string;
  /** Why it CANNOT be saved yet. Present = the button is off and the reason is
   *  in its `title` — a button that is off with no reason is a wall. */
  blocked?: string;
}

/** Save and discard, in the rail and in place of the action buttons.
 *
 *  Context: discard goes to the LEFT of save and with the quieter look. It is
 *  the same rule as `FormActions`, and here it matters more: the rail is where
 *  the hand is after editing.
 *
 *  The «sin guardar» warning is text and not just a color: whoever is leaving
 *  the screen has to be able to read what is going on, not deduce it from a
 *  dot. */
export function DirtyActions({
  onSave,
  onDiscard,
  saving = false,
  label,
  blocked,
}: DirtyState) {
  const copy = useUiCopy();
  /* It follows the rail it sits on instead of assuming the dark one: on a light rail the
     chrome palette was white text on white. */
  const surface = useSurface();
  return (
    <>
      <span
        className={`inline-flex h-(--size-control-md) shrink-0 items-center gap-1.5 rounded-control px-2.5 text-meta font-medium ${bySurface(
          surface,
          "bg-warn/12 text-warn",
          "bg-chrome-warn/15 text-chrome-warn",
        )}`}
      >
        {copy.record.unsaved}
      </span>
      <Button surface={surface} onClick={onDiscard} disabled={saving} icon={Undo2}>
        {copy.record.discard}
      </Button>
      {/* The `title` goes on the wrapper and not on the button: a disabled
          button receives no pointer events, so its own `title` never shows — and
          a button that is off with no reason is a wall. */}
      <span {...(blocked === undefined ? {} : { title: blocked })}>
        <Button
          role="primary"
          surface={surface}
          onClick={onSave}
          disabled={saving || blocked !== undefined}
          icon={Save}
        >
          {saving ? copy.record.saving : (label ?? copy.record.save)}
        </Button>
      </span>
    </>
  );
}

/** The one action a view leads with: the element written with `role="primary"` — the
 *  same prop that paints it gold and that `make smoke` counts, so there is no second way to
 *  say «this is the main one» that could disagree with the first. */
