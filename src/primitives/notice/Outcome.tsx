"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* The icon's tone — and only the icon's: the sentence stays ink, so it reads at 4.5:1 on any
   surface. */
const ICON_TONE: Record<Tone, string> = {
  neutral: "text-muted",
  info: "text-info",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  accent: "text-primary",
};

export type OutcomeProps = {
  /** What happened, as a sentence: «Pedido confirmado». */
  title: string;
  /** The ONE thing to remember, big: the order's number, the change to hand back. */
  figure?: ReactNode;
  /** What the figure is, read before it — «Tu número». */
  figureLabel?: string;
  /** What follows: «Te llamamos en pantalla cuando esté listo». */
  detail?: ReactNode;
  /** The way on — «Nuevo pedido». Usually one button; the screen may also move on by itself. */
  action?: ReactNode;
  /** `good` for a success (the default), `warn` for «done, but…», `bad` for «it did not go». */
  tone?: Tone;
  icon?: LucideIcon;
};

/**
 * The end of an operation, said big — the screen after paying, a kiosk's «tu número es 118».
 *
 * Context: a toast is enough for a cashier who keeps selling; it is not for the person at a
 * kiosk who walks away, nor for a checkout whose end is the page. They need the end AS the
 * screen: what happened, the one figure to remember, and the way on. It is a status
 * (`role="status"`): a screen reader announces it when it appears, without moving the focus
 * off the action that follows.
 */
export function Outcome({
  title,
  figure,
  figureLabel,
  detail,
  action,
  tone = "good",
  icon,
}: OutcomeProps) {
  const copy = useUiCopy();
  const Icon = icon ?? (tone === "bad" || tone === "warn" ? CircleAlert : CircleCheck);
  return (
    <div
      role="status"
      data-ui="outcome"
      data-tone={tone}
      className="flex min-w-0 flex-col items-center gap-3 px-4 py-10 text-center"
    >
      <Icon aria-hidden className={`size-12 ${ICON_TONE[tone]}`} strokeWidth={1.75} />
      <p className="text-title font-semibold text-ink">{title}</p>
      {figure === undefined ? null : (
        <p data-ui="outcome.figure" className="flex flex-col items-center gap-1">
          <span className="text-meta text-muted">{figureLabel ?? copy.outcome.figure}</span>
          <span className="text-hero leading-none font-semibold text-ink tabular-nums">
            {figure}
          </span>
        </p>
      )}
      {detail === undefined ? null : (
        <p className="max-w-short text-body text-muted">{detail}</p>
      )}
      {action === undefined ? null : (
        <div className="flex flex-wrap justify-center gap-2 pt-2">{action}</div>
      )}
    </div>
  );
}
