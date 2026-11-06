"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import {
  currentPage,
  ErrorCopy,
  errorReport,
} from "@sincpro/web-ui/primitives/notice/Notice";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A NOTICE about what is being looked at.
 *
 * Context: `Empty`, `Failed` and `Missing` say there is NO content and take the
 * place of the view. This is the opposite: there is content, it is visible, and something
 * ELSE has to be said —«there are unregistered entries in this period», «this period
 * is closed», «saved»—. Without this piece, every screen invented its own
 * with a `div` and a colour by eye, and that is how the same degree of urgency
 * ended up painted in three ways.
 *
 * ── The tone is the ONLY decision ───────────────────────────────────
 *
 *     info     a fact that changes how what is below is read
 *     warn     something worth looking at before going on
 *     bad      something that is wrong and has already had consequences
 *     good     something went well and there is nothing to do
 *
 * The icon comes from the tone and is not chosen: a red notice with a green tick inside
 * is a contradiction that someone will write if we let them write it.
 *
 * ── What it does NOT do ─────────────────────────────────────────────
 *
 * It does not close by itself, has no timer and does not stack. A notice that
 * disappears after four seconds is a notice someone did not get to read — that
 * is a `Toast`, which is another piece and another question («something happened away from here»).
 * This one speaks about what is on screen, so it stays as long as it is true.
 */

export type CalloutProps = {
  /** What is happening. One sentence, in the product's voice. */
  children: ReactNode;
  /** Without this, `info`. */
  tone?: Extract<Tone, "info" | "warn" | "bad" | "good">;
  /** The heading, when the sentence alone is not enough. Most do not
   *  need it: a two-line notice with a title is a poster. */
  title?: ReactNode;
  /** What resolves the notice, if there is something to press. */
  action?: ReactNode;
  /** Present = it can be closed. Absent = it cannot, because what it says stays
   *  true whoever looks at it. */
  onDismiss?: () => void;
  /** The accessible label of the ×. */
  dismissLabel?: string;
  /** An icon of its own, when the tone's does not say enough. */
  icon?: LucideIcon;
  /** What is copied with «Copiar el error» when the tone is `bad`. Without this, the
   *  sentence (if it is text) with the title. For a notice with technical detail, pass it here. */
  report?: string;
};

const ICON: Record<NonNullable<CalloutProps["tone"]>, LucideIcon> = {
  info: Info,
  warn: AlertTriangle,
  bad: OctagonAlert,
  good: CheckCircle2,
};

/* The background is a layer of the colour over the paper and not a colour of its own: so the
   notice reads on the floor and on white paper without two sets of tokens, and
   keeps working the day the palette changes. */
const SKIN: Record<NonNullable<CalloutProps["tone"]>, string> = {
  info: "border-info/25 bg-info/8 text-info",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/25 bg-bad/8 text-bad",
  good: "border-good/25 bg-good/8 text-good",
};

export function Callout({
  children,
  tone = "info",
  title,
  action,
  onDismiss,
  dismissLabel,
  icon,
  report,
}: CalloutProps) {
  const d = useDensity();
  const Icon = icon ?? ICON[tone];
  /* The text a person would paste: the sentence, or what the caller names. A title that
     is text becomes the report's heading; without one the sentence is the heading. */
  const sentence = report ?? (typeof children === "string" ? children : "");
  const copyable = tone === "bad" && sentence !== "";

  return (
    <div
      /* `status` and not `alert`: `alert` interrupts the screen reader and is
         reserved for what happened RIGHT NOW. A notice that was already there when the
         screen opened interrupts nothing. */
      role="status"
      className={`flex min-w-0 items-start gap-2.5 rounded-box border ${SKIN[tone]} ${byDensity(
        d,
        "px-3 py-2.5",
        "px-2.5 py-2",
      )}`}
    >
      <Icon className="mt-0.5 size-(--size-icon-sm) shrink-0" strokeWidth={2} aria-hidden />

      {/* The sentence and its action share a row that WRAPS: the sentence asks for at
          least `--container-name` and, when the action does not fit beside it (a phone, a
          long label), the action drops under the sentence instead of squeezing it into a
          column of three words. On a desk nothing moves. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-(--container-name) flex-col gap-1">
          {title === undefined ? null : (
            <p className="text-meta font-medium text-ink">{title}</p>
          )}
          {/* The text goes in normal ink and not in the tone's colour: a whole
              painted paragraph reads worse, and the frame already brings the colour. The tone
              stays on the icon and the border, which is where it is enough. */}
          <div className="min-w-0 text-meta text-ink">{children}</div>
        </div>

        {action === undefined ? null : <span className="shrink-0">{action}</span>}
        {copyable ? (
          <span className="shrink-0">
            <ErrorCopy
              report={() =>
                errorReport({
                  heading: typeof title === "string" ? title : "",
                  sentence: typeof title === "string" ? sentence : undefined,
                  at: new Date(),
                  page: currentPage(),
                })
              }
            />
          </span>
        ) : null}
      </div>

      {onDismiss === undefined ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel ?? "cerrar"}
          title={dismissLabel ?? "cerrar"}
          className="-mr-1 shrink-0 rounded-control p-0.5 text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink"
        >
          <X className="size-(--size-icon-sm)" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
