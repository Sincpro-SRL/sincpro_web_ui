"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useIdle } from "@sincpro/web-ui/foundations/idle";
import { POINTER_ATTRIBUTE } from "@sincpro/web-ui/foundations/pointer";
import { buttonClasses } from "@sincpro/web-ui/primitives/button/classes";
import { Accessibility, Hand, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

export type KioskFrameProps = {
  /** The self-service flow: the menu, the steps, the payment. */
  children: ReactNode;
  /** The screen that waits for someone: a title that invites, a line under it, and the call
   *  — «Tocá para pedir». Pressing anywhere on it starts. */
  attract: { title: string; subtitle?: string; call?: string; icon?: LucideIcon };
  /** Seconds without a touch before the kiosk goes back to `attract` and calls `onIdle` (to
   *  drop the abandoned order). 0 never. */
  idleAfter?: number;
  onIdle?: () => void;
  /** Controlled: whether the attract screen is showing. Uncontrolled it starts on it. */
  waiting?: boolean;
  onWaitingChange?: (waiting: boolean) => void;
  /** Who runs the kiosk, in its corner: the brand. */
  brand?: ReactNode;
};

/**
 * The frame of a self-service screen — a kiosk at a café, a check-in totem, a pickup point.
 *
 * Context: a kiosk is not an application someone opens: it waits for a stranger, is used once
 * standing up, and is left half-way. So the frame does three things no screen inside should
 * have to: it WAITS (an attract screen, pressed anywhere to start), it FORGETS (after
 * `idleAfter` seconds without a touch it goes back and tells the application to drop the
 * order), and it REACHES (a button in the corner brings the content down to the lower half
 * for someone seated, the way the big chains' kiosks do). It says «touch» for its whole area
 * (`data-pointer`): a kiosk's screen may report a mouse.
 */
export function KioskFrame({
  children,
  attract,
  idleAfter = 90,
  onIdle,
  waiting: controlled,
  onWaitingChange,
  brand,
}: KioskFrameProps) {
  const copy = useUiCopy();
  const [own, setOwn] = useState(true);
  const waiting = controlled ?? own;
  const [low, setLow] = useState(false);
  const setWaiting = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onWaitingChange?.(next);
  };
  useIdle(
    idleAfter,
    () => {
      setWaiting(true);
      setLow(false);
      onIdle?.();
    },
    !waiting,
  );
  const Icon = attract.icon ?? Hand;

  return (
    <div
      data-ui="kiosk"
      {...{ [POINTER_ATTRIBUTE]: "touch" }}
      className="relative flex h-dvh min-h-0 min-w-0 flex-col bg-ground"
    >
      {waiting ? (
        /* The whole screen is the button: a stranger does not look for a target. */
        <button
          type="button"
          data-ui="kiosk.attract"
          onClick={() => setWaiting(false)}
          className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center outline-none focus-visible:outline-4 focus-visible:-outline-offset-8 focus-visible:outline-primary"
        >
          {brand === undefined ? null : <span className="text-meta text-muted">{brand}</span>}
          <span className="text-hero leading-tight font-semibold text-ink">
            {attract.title}
          </span>
          {attract.subtitle === undefined ? null : (
            <span className="max-w-short text-lead text-muted">{attract.subtitle}</span>
          )}
          <span className={`${buttonClasses("primary", "lg")} mt-6 gap-3`}>
            <Icon aria-hidden className="size-(--size-icon-lg)" />
            {attract.call ?? copy.kiosk.start}
          </span>
        </button>
      ) : (
        <>
          {/* Reduced height: an empty band takes the top half, the flow lives in the lower
              half — within reach of a seated person. */}
          {low ? <div aria-hidden className="h-(--size-kiosk-reach) shrink-0" /> : null}
          <div
            data-ui="kiosk.content"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
          >
            {children}
          </div>
          <button
            type="button"
            data-ui="kiosk.reach"
            aria-pressed={low}
            onClick={() => setLow((now) => !now)}
            title={low ? copy.kiosk.reachOff : copy.kiosk.reach}
            aria-label={low ? copy.kiosk.reachOff : copy.kiosk.reach}
            className={`${buttonClasses("secondary", "lg")} absolute bottom-4 left-4 z-30 aspect-square rounded-pill px-0 shadow-float`}
          >
            <Accessibility aria-hidden className="size-(--size-icon-lg)" />
          </button>
        </>
      )}
    </div>
  );
}
