"use client";

import { AssistLabel } from "@sincpro/web-ui/components/assist/AssistMark";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { LoaderCircle } from "lucide-react";

/** The widths of the skeleton's bars: uneven, so it reads as lines of content and not as
 *  a striped box. */
const BAR = ["w-2/3", "w-1/2", "w-3/4", "w-2/5"] as const;

export type AssistPendingProps = {
  /** What the assistant is doing, in the screen's words: «Leyendo la orden de compra
   *  PO/2026/0042…». The copy's «El asistente está trabajando…» when absent. */
  label?: string;
  /** Stops it. Present = a «Cancelar» next to the sentence. */
  onCancel?: () => void;
  /** Skeleton bars under the sentence, standing in for the proposal that is coming —
   *  `0` (the default) is the one-line form, for under a field. */
  rows?: number;
};

/**
 * The assistant is working on a suggestion, and the screen goes on.
 *
 * Context: the assistant is slower than a form, and a screen that locks while it thinks
 * teaches people to wait for it — or to close it. So this BLOCKS NOTHING: it is a line in
 * the place where the suggestion will appear (under a field, above the lines), the fields
 * stay editable, and «Cancelar» stops it. What the person types in the meantime wins; the
 * screen decides whether a suggestion that arrives late still makes sense.
 *
 * The sentence is a polite live region (`role="status"`), so a screen reader hears that
 * the assistant started without being interrupted; the bars are silent. The spinner and
 * the bars' pulse stop under reduced motion, by the global rule in `tokens.css`.
 */
export function AssistPending({ label, onCancel, rows = 0 }: AssistPendingProps) {
  const copy = useUiCopy();
  return (
    <div data-assist="pending" aria-busy="true" className="flex min-w-0 flex-col gap-2">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <LoaderCircle
          className="size-(--size-icon-sm) shrink-0 animate-spin text-info"
          strokeWidth={2}
          aria-hidden
        />
        <AssistLabel />
        <span role="status" className="min-w-0 text-micro text-muted">
          {label ?? copy.assist.working}
        </span>
        {onCancel === undefined ? null : (
          <Button role="ghost" size="sm" onClick={onCancel}>
            {copy.assist.cancel}
          </Button>
        )}
      </span>
      {rows <= 0 ? null : (
        <span aria-hidden className="flex flex-col gap-2 pl-5">
          {Array.from({ length: rows }, (_, i) => (
            <span
              key={i}
              className={`h-3 rounded-control bg-ink/8 motion-safe:animate-pulse ${BAR[i % BAR.length]}`}
            />
          ))}
        </span>
      )}
    </div>
  );
}
