"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { cn, tv } from "@sincpro/web-ui/foundations/variants";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Maximize2, X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from "react-aria-components";

/* ==================================================================== *
 *  DIALOG — «we don't have good popups that show the form».
 *
 *  There was none, and that is why everything that had to be filled in opened a
 *  panel: asking for two numbers to register a payment cost you sight of the
 *  invoice. Two properties define it, and both come from the request:
 *
 *  1. **IT PRESERVES THE CONTEXT OF WHOEVER CALLED IT.** A dialog opened from an
 *     invoice already knows which invoice it is talking about and says so in its
 *     header. Without that, the first field of the form is always «about what?»
 *     — the question the user already answered by opening it.
 *
 *  2. **IT EXPANDS INTO A PANEL WITHOUT LOSING WHAT WAS FILLED IN.** A dialog is
 *     for the short stuff; as soon as things get long you have to be able to
 *     dock it into the workspace and carry on. Keeping what was typed is not
 *     solved by this file —it is solved by a draft saved by key and not by
 *     component— but the button lives here because this is where the user looks
 *     for it.
 *
 *  ── What React Aria does, and what this file does ───────────────────
 *
 *  The modal behaviour is React Aria's `ModalOverlay` + `Modal` + `Dialog`: focus
 *  moves into the dialog on open and is trapped there (a modal dialog you can
 *  tab your way out of promises to block and does not block), Escape closes it,
 *  focus goes back to whatever opened it, the page behind stops scrolling, and
 *  everything outside is made `inert` — which is how React Aria makes it modal
 *  instead of `aria-modal`, on purpose: Safari, inside an iframe, honours
 *  `aria-modal` by forcing focus onto the first focusable element. The title is
 *  a `Heading slot="title"`, so the dialog is named by it (`aria-labelledby`).
 *
 *  It closes when the scrim is touched, but only if the gesture STARTED there:
 *  releasing the mouse outside after selecting text inside cannot close a
 *  half-filled form. React Aria's interact-outside works exactly like that.
 *
 *  This file only dresses it and draws the header: context, title, subtitle,
 *  expand and close.
 *
 *  ── On a phone it is a bottom sheet ─────────────────────────────────
 *
 *  Below `sm` (40rem, `--container-handheld`) the same window anchors to the
 *  bottom edge: full width, top corners rounded, at most `--size-sheet` (90dvh)
 *  tall, sliding up from below. A centred window on a phone leaves its footer —
 *  where «Registrar pago» is — in the middle of the screen, out of the thumb's
 *  reach, and wastes the sides on a scrim. Anchored to the bottom, the actions
 *  land where the thumb already is, and the strip of scrim left on top still
 *  shows what the dialog is about and still closes it.
 *
 *  It is a breakpoint on the WINDOW and not on a container, unlike the rest of
 *  the system: the modal is portalled to the body and covers the window, so the
 *  window is its container. And it is CSS only: the focus trap, Escape, the
 *  scrim press and the transitions are React Aria's, the same at every width.
 *  Reduced motion is honoured by the global rule in `tokens.css`.
 *
 *  ── What it does NOT do: stack ──────────────────────────────────────
 *
 *  A dialog on top of another is the road to simulated windows. If something
 *  has to be chosen from here, it is chosen INSIDE —a `Picker` in the body—,
 *  not in a second dialog on top. Two overlapping scrims darken the background
 *  squared and nobody knows what closes what any more.
 * ==================================================================== */

/** Where this dialog came from. It is drawn in the header, small. */
export interface DialogContext {
  /** The category, in small caps: «factura», «cliente». It answers *what kind of
   *  thing is this about?* before saying which one. */
  kind?: string;
  /** Which one. The name of the resource. */
  label: string;
  /** What describes it without opening it: «saldo Bs. 12.450,00 · vence 15/11». */
  detail?: string;
}

/** The scrim. The page stays visible under it — the dialog is ABOUT something on it.
 *  On a phone it drops the padding and pushes the window to the bottom edge. */
const overlay = tv({
  base: "fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 transition-opacity duration-(--duration-quick) ease-(--ease-out) max-sm:items-end max-sm:p-0 sm:p-8",
  variants: {
    isEntering: { true: "opacity-0" },
    isExiting: { true: "opacity-0" },
  },
});

/** The window. It never grows past the scrim's padding: when the form is long the BODY
 *  scrolls and the header (what it is about) and the footer (what to do) stay in view.
 *
 *  On a phone it is a bottom sheet: every width is the full width, only the top corners
 *  are rounded (the bottom ones sit on the screen's edge), it stops at `--size-sheet`,
 *  and it enters from below — the motion says where it lives. */
const modal = tv({
  base: "flex max-h-full w-full flex-col overflow-hidden rounded-panel border border-line-strong bg-surface text-ink shadow-window outline-0 transition-[opacity,translate] duration-(--duration-panel) ease-(--ease-out) forced-colors:bg-[Canvas] max-sm:max-h-(--size-sheet) max-sm:max-w-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
  variants: {
    width: { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" },
    isEntering: { true: "translate-y-2 opacity-0 max-sm:translate-y-full" },
    isExiting: {
      true: "translate-y-1 opacity-0 duration-(--duration-quick) max-sm:translate-y-full",
    },
  },
});

/** The scrim and the window recipes. Internal — exported only so a test can read the
 *  classes that make the bottom sheet: the modal is a portal and draws nothing on the
 *  server. */
export const dialogStyles = { overlay, modal };

export type DialogWidth = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  title: string;
  /** One sentence under the title. It is also the dialog's description for assistive
   *  technology: what is read after the name, before the first field. */
  subtitle?: string;
  context?: DialogContext;
  width?: DialogWidth;
  /** Every way out goes through here: the × button, Escape and a press on the scrim. */
  onClose: () => void;
  /** Dock into the workspace. Absent when there is nowhere to dock. */
  onExpand?: () => void;
  /** Where it expands to, when «into a panel» says nothing: «open the catalog».
   *  It is the tooltip and the accessible name, and it is not drawn. */
  expandLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
}

/** The inside of the window: React Aria's `Dialog` with the header, body and footer.
 *
 *  Internal — exported only so a test can read its markup, which the modal (a portal)
 *  does not produce on the server. */
export function DialogSurface({
  title,
  subtitle,
  context,
  onClose,
  onExpand,
  expandLabel,
  footer,
  children,
}: Omit<DialogProps, "open" | "width">) {
  const copy = useUiCopy();
  const subtitleId = useId();
  const expand = expandLabel ?? copy.dialog.expand;

  return (
    <AriaDialog
      aria-describedby={subtitle === undefined ? undefined : subtitleId}
      className="flex max-h-[inherit] min-h-0 flex-1 flex-col outline-0"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          {context === undefined ? null : (
            /* The context, on top and small. It is what keeps the first field
               from being «about what?». Same voice as a field label, not a
               console kicker: mono uppercase next to a form title was a
               second chrome fighting the first. */
            <p className="mb-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-micro text-muted">
              {context.kind === undefined ? null : (
                <span className="font-medium">{context.kind}</span>
              )}
              <span className="min-w-0 truncate text-ink">{context.label}</span>
              {context.detail === undefined ? null : (
                <span className="min-w-0 truncate tabular-nums">{context.detail}</span>
              )}
            </p>
          )}
          <Heading slot="title" className="text-title font-semibold text-ink">
            {title}
          </Heading>
          {subtitle === undefined ? null : (
            <p id={subtitleId} className="mt-1 max-w-prose text-meta text-muted">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onExpand === undefined ? null : (
            <IconButton icon={Maximize2} label={expand} onClick={onExpand} />
          )}
          <IconButton icon={X} label={copy.shell.close} onClick={onClose} />
        </div>
      </header>

      {/* Whatever touches the bottom edge of a phone keeps clear of the home indicator:
          the footer when there is one, the body when there is not. */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-4",
          footer === undefined && "max-sm:safe-bottom",
        )}
      >
        {children}
      </div>

      {footer === undefined ? null : (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-ground px-4 py-3 max-sm:safe-bottom">
          {footer}
        </footer>
      )}
    </AriaDialog>
  );
}

/**
 * What has to be answered before moving on: a short form that blocks the page and keeps
 * saying what it is about.
 *
 * Context: controlled by `open` + `onClose` — the screen that opens it owns the decision of
 * when it is open, and every way out (×, Escape, the scrim) reports through `onClose`. It
 * stays mounted for the exit transition after `open` turns `false`, so the window fades
 * out instead of vanishing.
 */
export function Dialog({ open, width = "md", onClose, ...surface }: DialogProps) {
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable
      className={overlay}
    >
      <Modal className={(state) => modal({ ...state, width })}>
        <DialogSurface onClose={onClose} {...surface} />
      </Modal>
    </ModalOverlay>
  );
}

/* ---------------------------------------------------------------- *
 *  THE WIZARD
 * ---------------------------------------------------------------- */

export interface WizardStep {
  id: string;
  label: string;
  /** What is missing before you can move on. If it is present, «next» is turned
   *  off and this is drawn — a disabled button with no reason is a dead end. */
  blocked?: string;
}

export interface WizardProps {
  steps: readonly WizardStep[];
  current: string;
  /** A completed step was pressed: going back to review it. */
  onStepChange?: (id: string) => void;
  children: ReactNode;
  onCancel?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  /** On the last step it stops being «next» and starts naming what is going to
   *  happen: «Crear orden». A button that says «next» on the last step hides that
   *  something gets executed there. */
  nextLabel?: string;
  busy?: boolean;
}

/** A dialog with steps, for what CANNOT be answered in one go.
 *
 *  ── When a form deserves to be a wizard ─────────────────────────────
 *
 *  Only when **one answer changes the following questions**. If the fields are
 *  independent, splitting them into steps simplifies nothing: it adds clicks and
 *  hides half the form, and whoever wants to review what they entered has to
 *  navigate backwards. A long but complete form is filled in faster than three
 *  short steps.
 *
 *  The case that does justify it: a purchase order. Whether it is a local purchase
 *  or an import changes which conditions exist — an import asks for currency and
 *  incoterm, a local one for payment terms. There, step 2 cannot even be drawn
 *  until step 1 has been answered.
 *
 *  ── The steps already completed can be clicked ──────────────────────
 *
 *  Going back is not a mistake: it is reviewing. What you cannot do is jump
 *  ahead, because the next step does not know yet what to ask.
 *
 *  ── It is the CONTENT of a `Dialog`, not a second one ────────────────
 *
 *  The focus trap, Escape and the return of focus are the dialog's. The wizard
 *  only moves between steps, so it has no overlay behaviour of its own. */
export function Wizard({
  steps,
  current,
  onStepChange,
  children,
  onCancel,
  onBack,
  onNext,
  nextLabel,
  busy = false,
}: WizardProps) {
  /* The words of the wizard's own buttons come from the copy table. */
  const words = useUiCopy().dialog;
  const at = steps.findIndex((s) => s.id === current);
  const step = steps[at];
  const last = at === steps.length - 1;
  const blocked = step?.blocked;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* The steps, with the path in plain sight. Same idea as the `StatusBar`
          of a record: a single loose word says where I am, this also says how
          much is left.

          The number is POSITION, not the action. Gold stays on «siguiente»:
          a gold disc on the current step was a second call to action and the
          eye did not know which one to press. Here is an ink disc. Done stays
          readable, at a normal weight, because going back is reviewing. */}
      <ol className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-box bg-ink/4 p-1">
        {steps.map((s, i) => {
          const done = i < at;
          const here = i === at;
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={i > at}
                onClick={() => {
                  if (!here) onStepChange?.(s.id);
                }}
                aria-current={here ? "step" : undefined}
                data-state={here ? "current" : done ? "done" : "pending"}
                className={`inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-micro transition-colors duration-(--duration-instant) disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                  here
                    ? "bg-surface font-medium text-ink"
                    : done
                      ? "text-ink hover:bg-surface/70"
                      : "text-muted"
                }`}
              >
                <span
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-pill text-micro tabular-nums ${
                    here
                      ? "bg-ink text-surface"
                      : done
                        ? "bg-ink/10 text-ink"
                        : "bg-ink/8 text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="min-w-0">{children}</div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {blocked === undefined ? null : (
          /* The reason, next to the disabled button. A grey «next» with no
             explanation is a dead end: the user tries, nothing happens, and
             there is no way to know what is missing. */
          <span className="mr-auto min-w-0 text-micro text-warn">{blocked}</span>
        )}
        <span
          className={
            blocked === undefined
              ? "ml-auto flex items-center gap-2"
              : "flex items-center gap-2"
          }
        >
          {onCancel === undefined ? null : (
            <Button role="ghost" onClick={onCancel}>
              {words.cancel}
            </Button>
          )}
          {at > 0 ? (
            <Button role="secondary" onClick={onBack}>
              {words.back}
            </Button>
          ) : null}
          <Button
            role="primary"
            onClick={onNext}
            disabled={blocked !== undefined || busy}
            aria-busy={busy || undefined}
          >
            {busy ? words.busy : (nextLabel ?? (last ? words.finish : words.next))}
          </Button>
        </span>
      </div>
    </div>
  );
}
