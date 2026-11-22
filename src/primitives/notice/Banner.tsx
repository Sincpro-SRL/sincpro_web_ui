"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  NOTICE_DISMISS,
  NOTICE_ICON,
  NOTICE_SKIN,
  type NoticeTone,
} from "@sincpro/web-ui/primitives/notice/tones";
import { type LucideIcon, X } from "lucide-react";
import type { ReactNode } from "react";

export type BannerProps = {
  /** What is happening, in one sentence: «El sistema se actualiza hoy a las 22:00». */
  children: ReactNode;
  /** Without this, `info`. The same four degrees as `Callout`. */
  tone?: NoticeTone;
  /** What resolves it, if there is something to press — usually a link: «Renovar el plan». */
  action?: ReactNode;
  /** Present = it can be closed. Absent = it stays, because it stays true for whoever looks. */
  onDismiss?: () => void;
  /** An icon of its own, when the tone's does not say enough (a truck for «envío gratis»). */
  icon?: LucideIcon;
};

/**
 * A notice about the whole APPLICATION, across the top of the frame: a maintenance window, a
 * plan about to expire, «envío gratis desde Bs 300», a company in a test environment.
 *
 * Context: a `Callout` speaks about the view it sits in and lives inside it; this speaks about
 * everything, so it goes in `AppFrame banner` — above the bar, edge to edge, scrolled away with
 * the page instead of stuck on top taking a line from every screen. It is the same four tones
 * as the `Callout` (one table, `tones.ts`), the sentence in ink and the tone on the icon and
 * the edge. A `status`, never an `alert`: it was there when the screen opened, it interrupts
 * nothing.
 */
export function Banner({ children, tone = "info", action, onDismiss, icon }: BannerProps) {
  const copy = useUiCopy();
  const Icon = icon ?? NOTICE_ICON[tone];
  return (
    <div
      role="status"
      data-ui="banner"
      data-tone={tone}
      className={`flex min-h-(--size-control-md) min-w-0 items-center gap-3 border-b px-4 py-1 print:hidden ${NOTICE_SKIN[tone]}`}
    >
      {/* Centred as a line across the page; the sentence and its action wrap together, so on
          a phone the action drops below the sentence instead of squeezing it. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon className="size-(--size-icon-sm) shrink-0" strokeWidth={2} aria-hidden />
          <span className="min-w-0 text-meta text-ink">{children}</span>
        </span>
        {action === undefined ? null : (
          <span className="shrink-0 text-meta" data-ui="banner.action">
            {action}
          </span>
        )}
      </div>
      {onDismiss === undefined ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={copy.shell.closeNotice}
          title={copy.shell.closeNotice}
          className={NOTICE_DISMISS}
        >
          <X className="size-(--size-icon-sm)" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
