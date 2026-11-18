"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Check, Save, Undo2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface DirtyState {
  onSave: () => void;
  onDiscard: () => void;
  /** It is saving. The button turns off: pressing it twice sends it twice, and
   *  when what gets saved is a payment, that matters. */
  saving?: boolean;
  /** What gets saved, when it is not obvious: «guardar la factura», «guardar la
   *  regla». */
  label?: string;
  /** Why it CANNOT be saved yet. Present = the button is off and the reason is written
   *  beside it — a button that is off with no reason is a wall, and a reason in a `title`
   *  reaches neither the keyboard nor a finger. It is the only mark the rail draws. */
  blocked?: string;
  /** How many fields changed. Not drawn: it describes the Save button, «Guardar — 2 cambios
   *  sin guardar», for whoever cannot see the fields' own `Field changed` marks. */
  changes?: number;
}

/** Save and discard, in the rail and in place of the action buttons.
 *
 *  Context: discard goes to the LEFT of save and with the quieter look. It is
 *  the same rule as `FormActions`, and here it matters more: the rail is where
 *  the hand is after editing.
 *
 *  There is no «sin guardar» mark. The two buttons only exist while something changed, and
 *  each changed field already says so (`Field changed`): a third signal repeating the other
 *  two was noise beside the one action that matters. The only thing written here is what
 *  the buttons cannot say — WHY it cannot be saved yet (`blocked`). The count of changes
 *  still reaches a screen reader, as the Save button's description. */
export function DirtyActions({
  onSave,
  onDiscard,
  saving = false,
  label,
  blocked,
  changes,
}: DirtyState) {
  const copy = useUiCopy();
  const blockedId = useId();
  const changesId = useId();
  /* It follows the rail it sits on instead of assuming the dark one: on a light rail the
     chrome palette was white text on white. */
  const surface = useSurface();
  const counted = changes !== undefined && changes > 0;
  const describedBy = [
    ...(blocked === undefined ? [] : [blockedId]),
    ...(counted ? [changesId] : []),
  ].join(" ");
  return (
    <>
      {blocked === undefined ? null : (
        <span
          id={blockedId}
          data-ui="dirty.blocked"
          className={`inline-flex h-(--size-control-md) min-w-0 shrink items-center gap-1.5 truncate rounded-control px-2.5 text-meta font-medium ${bySurface(
            surface,
            "bg-warn/12 text-warn",
            "bg-chrome-warn/15 text-chrome-warn",
          )}`}
        >
          {blocked}
        </span>
      )}
      {counted ? (
        <span id={changesId} hidden>
          {fillCopy(changes === 1 ? copy.record.unsavedOne : copy.record.unsavedMany, {
            count: changes.toLocaleString(copy.locale),
          })}
        </span>
      ) : null}
      <Button surface={surface} onClick={onDiscard} disabled={saving} icon={Undo2}>
        {copy.record.discard}
      </Button>
      {/* Busy, not disabled, while it saves: the focus stays on it and a second press is
          not a second save. The reason it cannot be saved is written at the left, and it
          names the button too. */}
      <Button
        role="primary"
        surface={surface}
        onClick={onSave}
        busy={saving}
        disabled={blocked !== undefined}
        icon={Save}
        {...(describedBy === "" ? {} : { "aria-describedby": describedBy })}
      >
        {saving ? copy.record.saving : (label ?? copy.record.save)}
      </Button>
    </>
  );
}

/** The one action a view leads with: the element written with `role="primary"` — the
 *  same prop that paints it gold and that `make smoke` counts, so there is no second way to
 *  say «this is the main one» that could disagree with the first. */

/** How long «Guardado» stays: long enough to be seen without looking for it, short enough
 *  not to stay as one more thing on the rail. */
const SAVED_FOR = 2400;

/**
 * Whether the record has JUST been saved: `dirty` went from saving straight to gone.
 *
 * Context: saving ended with the rail silently swapping Save for the usual actions — the
 * screen changed and said nothing, so each application wrote its own toast, or none. A
 * failed save does not count: `saving` turns off and `dirty` stays.
 */
export function useJustSaved(dirty: DirtyState | undefined): boolean {
  const wasSaving = useRef(false);
  const [saved, setSaved] = useState(false);
  const saving = dirty?.saving === true;
  const present = dirty !== undefined;
  useEffect(() => {
    if (saving) {
      wasSaving.current = true;
      return;
    }
    if (present) {
      wasSaving.current = false;
      setSaved(false);
      return;
    }
    if (!wasSaving.current) return;
    wasSaving.current = false;
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), SAVED_FOR);
    return () => clearTimeout(timer);
  }, [saving, present]);
  return saved;
}

/** «✓ Guardado», where Save was, for a moment. The live region is always there — a region
 *  inserted together with its words is not reliably announced. */
export function SavedMark({ saved }: { saved: boolean }) {
  const copy = useUiCopy();
  const surface = useSurface();
  return (
    <>
      <span role="status" className="sr-only">
        {saved ? copy.record.saved : ""}
      </span>
      {saved ? (
        <span
          aria-hidden
          className={`inline-flex h-(--size-control-md) shrink-0 items-center gap-1.5 rounded-control px-2.5 text-meta font-medium transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) starting:-translate-y-0.5 starting:opacity-0 ${bySurface(
            surface,
            "bg-good/12 text-good",
            "bg-chrome-good/15 text-chrome-good",
          )}`}
        >
          <Check className="size-(--size-icon-sm)" strokeWidth={2.5} />
          {copy.record.saved}
        </span>
      ) : null}
    </>
  );
}
