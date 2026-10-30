"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { Callout, type CalloutProps } from "@sincpro/web-ui/primitives/notice/Callout";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { tagTone } from "@sincpro/web-ui/primitives/tag/Tag";
import { CircleCheck, Info, type LucideIcon, TriangleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button, Dialog, DialogTrigger, Heading } from "react-aria-components";

/* ==================================================================== *
 *  THE NOTICES OF A RECORD — anchored outside the form, and an indicator.
 *
 *  What has to be known about THIS record before acting on it: «este cliente
 *  tiene créditos pendientes · Aplicar», «posible factura duplicada», «vencida
 *  hace 12 días», «el SIN rechazó la factura». Drawn inside the paper they
 *  pushed the form down and read as part of it — a band among the fields is a
 *  field. So the record splits them by what they ask of the person:
 *
 *      blocking   `tone="bad"` — and the operation `error`. It is wrong and it
 *                 already had consequences: always visible, OUTSIDE the sheet,
 *                 between the rail and the paper, compact. Never folded.
 *      the rest   warn · info · good. Their HOME is the record's activity panel
 *                 (`Record.Activity`, section «Avisos»), and the rail keeps ONE
 *                 indicator — the count, toned by the most urgent. Pressing it
 *                 opens the panel and moves the focus to the notices (beside
 *                 the sheet on a wide record; below it, scrolled to, on a narrow
 *                 one). A record WITHOUT a panel (a `Drill` context, a dialog)
 *                 keeps the older answer: the indicator opens them in a popover
 *                 on PRESS (like `Flag` and `Hint`; a hover card does not exist
 *                 on a tablet and is gone before the sentence is read).
 *                 Either way each notice keeps its title, sentence and action.
 *
 *  Why the panel and not the popover when there is one: the popover was a
 *  second copy of the same list, gone the moment the person reached for the
 *  action; the panel is where everything around the record already lives,
 *  and it stays open while the person acts on the record.
 *
 *  A note that belongs to ONE field is not a record notice: it is the field's
 *  `note`, a card at its height in the activity column (`primitives/field/note.tsx`).
 *
 *  ── The order is urgency ────────────────────────────────────────────
 *
 *  They come from conditions written apart (a credit check, a duplicate check,
 *  a due date), so the composer cannot know which ones meet. Both the band and
 *  the list order them by tone —bad, warn, info, good—, the written order
 *  inside a tone. The indicator takes the tone of the first.
 *
 *  ── On a phone ──────────────────────────────────────────────────────
 *
 *  The indicator is in the rail's first line with the counters, and that line
 *  wraps instead of clipping (`Line`): it is never pushed out of reach, and it
 *  does not compete with the primary for the thumb bar. Without a rail (a
 *  dialog, a `Drill` context, a drawer) it goes first in the record, next to
 *  the counters — where `RecordHeader` puts what the missing rail would have
 *  said. The blocking band is the paper's width, the action under the sentence
 *  when they do not fit side by side (`Callout`).
 * ==================================================================== */

export type RecordNoticeSpec = Omit<CalloutProps, "dismissLabel">;

const URGENCY: Record<NonNullable<CalloutProps["tone"]>, number> = {
  bad: 0,
  warn: 1,
  info: 2,
  good: 3,
};

/** The notices in the order they are drawn: by urgency, written order inside a tone. */
export function orderNotices<T extends { tone?: CalloutProps["tone"] }>(
  notices: readonly T[],
): T[] {
  return notices
    .map((notice, at) => ({ notice, at }))
    .sort(
      (a, b) =>
        URGENCY[a.notice.tone ?? "info"] - URGENCY[b.notice.tone ?? "info"] || a.at - b.at,
    )
    .map(({ notice }) => notice);
}

/** Blocking (`bad`) and the rest, each already in urgency order. */
export function splitNotices(notices: readonly RecordNoticeSpec[]): {
  blocking: RecordNoticeSpec[];
  rest: RecordNoticeSpec[];
} {
  const ordered = orderNotices(notices);
  return {
    blocking: ordered.filter((n) => n.tone === "bad"),
    rest: ordered.filter((n) => n.tone !== "bad"),
  };
}

/** The band of what is wrong: the operation error first, then the `bad` notices. */
export function RecordBlocking({
  notices,
  error,
  errorHeading,
}: {
  notices: readonly RecordNoticeSpec[];
  /** The sentence the backend wrote about the last operation. Drawn first, whole. */
  error?: string | null;
  errorHeading?: string;
}): ReactNode {
  const copy = useUiCopy();
  const hasError = error !== undefined && error !== null;
  if (notices.length === 0 && !hasError) return null;
  return (
    <div
      role="group"
      aria-label={copy.record.blocking}
      data-record-blocking=""
      className="flex min-w-0 flex-col gap-1.5"
    >
      {hasError ? (
        <Failed heading={errorHeading ?? copy.failed.operation} sentence={error} />
      ) : null}
      {notices.map(({ children, ...notice }, i) => (
        <Callout key={i} {...notice} dismissLabel={copy.shell.closeNotice}>
          {children}
        </Callout>
      ))}
    </div>
  );
}

const ICON: Record<"warn" | "info" | "good", LucideIcon> = {
  warn: TriangleAlert,
  info: Info,
  good: CircleCheck,
};

const chip = tv({
  extend: focusRing,
  base: "inline-flex h-(--size-control-sm) shrink-0 cursor-default items-center gap-1.5 rounded-pill px-2.5 text-micro font-medium whitespace-nowrap transition-[filter] duration-(--duration-instant) hover:brightness-95 aria-expanded:brightness-95",
});

/** The indicator in the rail: the count of the record's notices, toned by the most urgent,
 *  that opens their list on press. Nothing is drawn without notices. */
export function RecordNoticeIndicator({
  notices,
  anchored = [],
  reveal,
}: {
  /** Not blocking, already in urgency order. */
  notices: readonly RecordNoticeSpec[];
  /** The notes of fields and rows: counted too when there is a panel that lists them —
   *  without one they are only the marks by their fields, and the popover leaves them out. */
  anchored?: readonly { tone?: "bad" | "warn" | "info" | "good" }[];
  /** The record has an ACTIVITY panel, and the notices live there: the indicator goes to
   *  them (opens the panel, scrolls to its notices, moves the focus) instead of floating
   *  a second copy in a popover. `target` is the id of that section. */
  reveal?: { target: string; onReveal: () => void };
}): ReactNode {
  const copy = useUiCopy();
  const surface = useSurface();
  const [open, setOpen] = useState(false);
  const all = reveal === undefined ? notices : [...notices, ...anchored];
  if (all.length === 0) return null;
  /* The most urgent of all of them gives the chip its tone; a field's `bad` note warns —
     what blocks the record is the blocking band, not this chip. */
  const order = ["bad", "warn", "info", "good"] as const;
  const worst = order.find((t) => all.some((n) => (n.tone ?? "info") === t)) ?? "info";
  const tone = (worst === "bad" ? "warn" : worst) as "warn" | "info" | "good";
  const Icon = ICON[tone];
  const count = fillCopy(all.length === 1 ? copy.record.noticeOne : copy.record.noticeMany, {
    count: all.length.toLocaleString(copy.locale),
  });

  const face = (
    <>
      {/* The shape says the tone too: a triangle warns, an «i» informs, a check
          confirms. The count is the word — never the colour alone. */}
      <Icon className="size-(--size-icon-sm) shrink-0" strokeWidth={2.25} aria-hidden />
      {count}
    </>
  );
  const skin = tagTone(tone, surface === "chrome" ? "chrome" : "canvas");

  if (reveal !== undefined) {
    return (
      <Button
        data-record-notices=""
        aria-controls={reveal.target}
        onPress={reveal.onReveal}
        className={({ isFocusVisible }) => `${chip({ isFocusVisible })} ${skin}`}
      >
        {face}
      </Button>
    );
  }

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        data-record-notices=""
        className={({ isFocusVisible }) => `${chip({ isFocusVisible })} ${skin}`}
      >
        {face}
      </Button>
      <Popover placement="bottom">
        {/* A toast's width on a desk; on a phone it shrinks to the screen instead —
            `auto` on a floating box is «what fits», and the screen is what fits. */}
        <Dialog
          aria-label={copy.record.notices}
          className="flex max-h-[inherit] w-(--container-toast) flex-col gap-2 overflow-auto p-3 outline-0 max-sm:w-auto"
        >
          <Heading slot="title" className="text-meta font-semibold text-ink">
            {copy.record.notices}
          </Heading>
          {notices.map(({ children, ...notice }, i) => (
            <Callout key={i} {...notice} dismissLabel={copy.shell.closeNotice}>
              {children}
            </Callout>
          ))}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
