"use client";

import {
  acceptedMessage,
  applyWithUndo,
  type AssistApply,
  type AssistSource,
} from "@sincpro/web-ui/components/assist/assist";
import { AssistLabel, AssistSourceLink } from "@sincpro/web-ui/components/assist/AssistMark";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { FieldIdsContext } from "@sincpro/web-ui/primitives/field/context";
import { useToastIfAny } from "@sincpro/web-ui/primitives/notice/Toast";
import { Check, X } from "lucide-react";
import { type ReactNode, useContext, useId } from "react";

export type AssistSuggestionProps = {
  /** The proposed value, drawn as it will read once applied: «30 días», «15/11/2026», a
   *  product with its code. */
  value: ReactNode;
  /** Where the assistant got it — a link to the record it read. */
  source?: AssistSource;
  /** Applies the value. Return the function that reverts it and the screen gets a
   *  «Deshacer» notice; the suggestion itself is the screen's to remove. */
  onAccept: AssistApply;
  /** «No, gracias»: the screen forgets the suggestion. */
  onDismiss: () => void;
  /** The field's name, for the notice after accepting. Inside a `Field` the accessible
   *  name already takes the field's label; the notice is read elsewhere, so it needs it. */
  field?: string;
};

/**
 * The assistant proposes a value for ONE field: the customer's payment term, the product of
 * a scanned line, the due date. It goes right under the control it would change.
 *
 * Context: a suggestion has to be noticed and must not be mistaken for the value. So it is
 * NOT written into the control — a pre-filled field reads as «someone already decided» and
 * gets saved without a look. It sits under the control, in a dashed box (dashed: proposed,
 * not yet real), with the robot and «Asistente sugiere», the value, and its source as a
 * link. «Aceptar» applies it at once, and the notice carries «Deshacer» — undo over
 * confirm, the system's rule. The × forgets it.
 *
 * Written inside a `Field`, after the control:
 *
 *     <Field label="Plazo de pago">
 *       <NumberInput … />
 *       <AssistSuggestion value="30 días" source={…} onAccept={…} onDismiss={…} />
 *     </Field>
 *
 * It is a group named «Sugerencia del asistente» + the field's label, so a screen reader
 * hears which field it is about before the value. Both buttons are plain buttons: Tab
 * reaches them, Enter and Space press them. After pressing either, the focus goes back to
 * the field's control — the suggestion that held it is gone, and the control is what the
 * person was working on.
 */
export function AssistSuggestion({
  value,
  source,
  onAccept,
  onDismiss,
  field,
}: AssistSuggestionProps) {
  const copy = useUiCopy();
  const toasts = useToastIfAny();
  const ids = useContext(FieldIdsContext);
  const nameId = useId();

  /* Back to the control once this box is gone. A frame later: the screen removes the
     suggestion in the same update, and the control is only focusable after it. */
  const refocus = () => {
    const target = ids?.id;
    if (target === undefined || typeof document === "undefined") return;
    requestAnimationFrame(() => document.getElementById(target)?.focus());
  };

  return (
    <div
      role="group"
      aria-labelledby={ids === null ? nameId : `${nameId} ${ids.labelId}`}
      data-assist="suggestion"
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-control border border-dashed border-info/40 bg-info/5 py-1 pr-1 pl-2.5"
    >
      <span id={nameId} hidden>
        {copy.assist.suggestion}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <AssistLabel>
            {copy.assist.assistant} {copy.assist.suggests}
          </AssistLabel>
          <span className="min-w-0 text-meta font-semibold text-ink tabular-nums">
            {value}
          </span>
        </span>
        {source === undefined ? null : <AssistSourceLink source={source} />}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <Button
          role="secondary"
          size="sm"
          icon={Check}
          onClick={() => {
            applyWithUndo(onAccept, toasts, acceptedMessage(copy, field), copy.assist.undo);
            refocus();
          }}
        >
          {copy.assist.accept}
        </Button>
        <IconButton
          icon={X}
          label={copy.assist.dismiss}
          onClick={() => {
            onDismiss();
            refocus();
          }}
        />
      </span>
    </div>
  );
}
