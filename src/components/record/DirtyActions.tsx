"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useKeysHint, useShortcuts } from "@sincpro/web-ui/foundations/shortcut";
import { bySurface, SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Check, Save, Undo2 } from "lucide-react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

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
  floating = false,
}: DirtyState & {
  /** In the floating bar (`DirtyBar`): the count is WRITTEN — the changed fields may be far
   *  up a long form, out of sight, and their marks with them — and Discard is the quiet
   *  ghost, so the bar reads «what is pending · undo · save» and not two equal boxes. */
  floating?: boolean;
}) {
  const copy = useUiCopy();
  /* Mod+S saves wherever Save is — the rail, the thumb bar, a floating pill —: the gesture
     every editor has, and in a browser it would otherwise save the PAGE. */
  useShortcuts([{ keys: "Mod+S", run: onSave, enabled: blocked === undefined && !saving }]);
  const saveHint = useKeysHint("Mod+S");
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
        <span
          id={changesId}
          /* In the rail the changed fields are in sight and the count only describes Save;
             in the floating bar it is written. */
          {...(floating
            ? {
                /* One row on a phone too: the count gives way (it truncates), never the
                   buttons — a pill broken in two rows is a blob. */
                className: `min-w-0 shrink! truncate px-2.5 text-meta ${bySurface(surface, "text-muted", "text-chrome-muted")}`,
              }
            : { hidden: true })}
        >
          {fillCopy(changes === 1 ? copy.record.unsavedOne : copy.record.unsavedMany, {
            count: changes.toLocaleString(copy.locale),
          })}
        </span>
      ) : null}
      <Button
        {...(floating ? { role: "ghost" as const } : {})}
        surface={surface}
        onClick={onDiscard}
        disabled={saving}
        icon={Undo2}
      >
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
        {...(saveHint === undefined
          ? {}
          : {
              title: `${copy.record.save} (${saveHint.label})`,
              "aria-keyshortcuts": saveHint.aria,
            })}
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

/** The «✓ Guardado» chip itself, without its live region: what is SEEN. */
function SavedChip() {
  const copy = useUiCopy();
  const surface = useSurface();
  return (
    <span
      aria-hidden
      className={`inline-flex h-(--size-control-md) shrink-0 items-center gap-1.5 rounded-ui-button px-2.5 text-meta font-medium transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) starting:-translate-y-0.5 starting:opacity-0 ${bySurface(
        surface,
        "bg-good/12 text-good",
        "bg-chrome-good/15 text-chrome-good",
      )}`}
    >
      <Check className="size-(--size-icon-sm)" strokeWidth={2.5} />
      {copy.record.saved}
    </span>
  );
}

/** «✓ Guardado», where Save was, for a moment. The live region is always there — a region
 *  inserted together with its words is not reliably announced. */
export function SavedMark({ saved }: { saved: boolean }) {
  const copy = useUiCopy();
  return (
    <>
      <span role="status" className="sr-only">
        {saved ? copy.record.saved : ""}
      </span>
      {saved ? <SavedChip /> : null}
    </>
  );
}

/**
 * Save and Discard FLOATING at the bottom of the screen, centred — the «settings» form
 * style's (`FormStyleProvider`), in place of the rail and the thumb bar.
 *
 * Context: a settings form is long and read top to bottom; the rail is left behind with the
 * first card, and the last field changed is near the bottom. The bar appears with the first
 * change, in the dark band (the chrome) so it reads apart from the cards, and says «Guardado»
 * for a moment where Save was. Sticky and last in the record, as the thumb bar: at the end of
 * the form it settles under the last card and covers nothing.
 *
 * ── It never covers the field being typed into ──────────────────────
 *
 * The bar appears with the first keystroke, and on a phone the field being typed into is
 * often the one at the bottom of the screen — right where the bar lands. So while the bar is
 * up, the field that has the focus (when the bar appears, and each time the focus moves) is
 * scrolled up out from under it: a form that hides what you are writing is broken, however
 * nice the bar.
 *
 * ── Its shape ─────────────────────────────────────────────────────────
 *
 * A pill holds pills: the buttons inside take the pill's radius (`--ui-button-radius`), or a
 * full-round bar around 8 px corners reads as two boxes in a tube. On the dark theme the
 * chrome is as dark as the ground, so the bar carries the chrome's hairline (`chrome-edge`) —
 * invisible on light, where the chrome already stands apart by luminance.
 */
const PILL = { "--ui-button-radius": "var(--radius-pill)" } as CSSProperties;

/** Scrolls `field` up from under `bar` when they overlap, with a little air above the bar. */
function clearOf(bar: HTMLElement, field: Element | null) {
  if (!(field instanceof HTMLElement) || field === document.body || bar.contains(field))
    return;
  const over = bar.getBoundingClientRect();
  const under = field.getBoundingClientRect();
  if (over.height === 0 || under.bottom <= over.top || under.top >= over.bottom) return;
  const before = field.style.scrollMarginBottom;
  field.style.scrollMarginBottom = `${String(Math.ceil(over.height + 12))}px`;
  field.scrollIntoView({ block: "nearest" });
  field.style.scrollMarginBottom = before;
}

export function DirtyBar({
  dirty,
  saved,
}: {
  dirty: DirtyState | undefined;
  saved: boolean;
}) {
  const copy = useUiCopy();
  const shown = dirty !== undefined || saved;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = ref.current;
    if (!shown || bar === null) return;
    /* After the bar has its height: the frame it was drawn in. */
    const frame = requestAnimationFrame(() => clearOf(bar, document.activeElement));
    const onFocus = (event: FocusEvent) => clearOf(bar, event.target as Element | null);
    document.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", onFocus);
    };
  }, [shown]);
  /* Always mounted, so «Guardado» is announced (see `SavedMark`); with nothing to say it has
     no height and covers nothing. */
  return (
    <div
      ref={ref}
      data-ui="dirty.bar"
      className={`pointer-events-none sticky bottom-0 z-20 mt-auto flex justify-center px-3 ${
        shown ? "pt-3 safe-bottom" : ""
      }`}
    >
      <span role="status" className="sr-only">
        {saved ? copy.record.saved : ""}
      </span>
      {shown ? (
        <SurfaceProvider value="chrome">
          <div
            style={PILL}
            className="pointer-events-auto flex max-w-full min-w-0 items-center gap-1 rounded-pill border border-chrome-edge bg-chrome p-1.5 shadow-float *:shrink-0"
          >
            {dirty === undefined ? <SavedChip /> : <DirtyActions {...dirty} floating />}
          </div>
        </SurfaceProvider>
      ) : null}
    </div>
  );
}
