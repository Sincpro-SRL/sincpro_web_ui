"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { DensityProvider } from "@sincpro/web-ui/foundations/density";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { SquareArrowOutUpRight, X } from "lucide-react";
import type { ReactNode } from "react";
import { FocusScope, useKeyboard } from "react-aria";
import { Dialog, Heading } from "react-aria-components";

export interface PeekProps {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The × button and Escape (while the focus is inside the drawer). */
  onClose: () => void;
  /** Promoting preserves the context: it is the same view changing surface. */
  onPromote?: () => void;
  /** The actions of the record being previewed, next to «open as panel». */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * The drawer that previews a record next to the list it came from.
 *
 * Context: the drawer comes in from the right and does NOT dim what is behind
 * it — that is the property that defines it. The list it came from stays
 * clickable, which is the whole point of a preview; a scrim would turn it into
 * a dialog, and a dialog is for what has to be answered before moving on.
 * Pressing another row replaces what the drawer shows; it never opens a second one.
 *
 * It is anchored to the work area and not to the window: it covers the content
 * without covering the menu or the activity bar, which are still navigation.
 * The left corners are the panel radius. The sheet still spans the work area;
 * only the cut against the list is rounded, so the drawer reads as a panel.
 *
 * ── On a phone it is a bottom sheet ───────────────────────────────────
 *
 * Below `sm` (40rem, `--container-handheld`) there is no «beside the list»: 30rem from
 * the right of a 390 px screen is the whole screen. So the same drawer anchors to the
 * BOTTOM edge of the window — full width, top corners rounded, at most `--size-sheet`
 * (90dvh) tall, its body scrolling inside — and comes in from below. The strip left on
 * top still shows the list, and it is still not dimmed: what defines the drawer survives
 * the change of edge. It is `fixed` there and not `absolute` because on a phone the work
 * area is as tall as its content, and its bottom edge can be three screens down; the
 * screen's bottom edge is where the thumb is. (Like any `fixed`, it is anchored to the
 * window only if no ancestor has a `transform` or containment — mount it next to the
 * list, not inside a `@container`.) CSS only: the focus, Escape and restore below do not
 * change.
 *
 * ── Why it is not React Aria's `ModalOverlay` ─────────────────────────
 *
 * Every overlay React Aria has —`ModalOverlay`, `Sheet`— is modal: it makes the rest of the
 * page `inert`, traps the focus and portals to the window. Each of those breaks a promise
 * above: the list would stop answering, and the drawer would cover the menu. So the drawer
 * is an `<aside>` in the work area (the «preview» landmark) holding a NON-modal React Aria
 * `Dialog`:
 *
 * - `Dialog` — `role="dialog"` without `aria-modal`, named by its title (`Heading
 *   slot="title"`), and on open it takes the focus itself — else a keyboard user would have
 *   to tab through the whole list to reach it. Focusing the panel and not its first button
 *   keeps the close tooltip from popping up on every open.
 * - `FocusScope restoreFocus` — on close the focus goes back to the row that opened it.
 *   There is no `contain`: Tab may walk out to the list, which is still live.
 * - `useKeyboard` — Escape closes it while the focus is INSIDE the drawer. A listener on
 *   the window closed it from anywhere, competing with every other Escape on the page (a
 *   search field clearing, a list dropping its selection).
 */
export function Peek({
  open,
  title,
  subtitle,
  onClose,
  onPromote,
  actions,
  children,
}: PeekProps) {
  const copy = useUiCopy();
  const { keyboardProps } = useKeyboard({
    onKeyDown: (e) => {
      if (e.key === "Escape") onClose();
      else e.continuePropagation();
    },
  });

  if (!open) return null;
  const hasActions = onPromote !== undefined || actions !== undefined;

  return (
    <FocusScope restoreFocus>
      <aside
        {...keyboardProps}
        aria-label={copy.shell.preview}
        className="peek-width absolute top-0 right-0 bottom-0 z-30 overflow-hidden rounded-l-panel border-l border-line-strong bg-surface shadow-window transition-[opacity,translate] duration-(--duration-panel) ease-(--ease-out) starting:translate-x-4 starting:opacity-0 max-sm:fixed max-sm:top-auto max-sm:left-0 max-sm:max-h-(--size-sheet) max-sm:w-full max-sm:rounded-tr-panel max-sm:rounded-bl-none max-sm:border-t max-sm:border-l-0 max-sm:starting:translate-x-0 max-sm:starting:translate-y-4"
      >
        {/* `max-h-[inherit]`: as a bottom sheet the drawer's height is its content's up to
            `--size-sheet`, so the dialog inherits that ceiling and the BODY scrolls instead
            of the header and the actions being clipped. */}
        <Dialog className="flex h-full max-h-[inherit] flex-col outline-0">
          <header className="shrink-0 border-b border-line">
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
              <Tag tone="info">{copy.shell.previewTag}</Tag>
              <Heading
                slot="title"
                level={2}
                className="min-w-0 flex-1 truncate text-meta font-medium text-ink"
              >
                {title}
              </Heading>
              <IconButton icon={X} label={copy.shell.closePreview} onClick={onClose} />
            </div>

            {subtitle === undefined ? null : (
              <p className="truncate px-3 pb-2 text-micro tabular-nums text-muted">
                {subtitle}
              </p>
            )}
          </header>

          {/* The actions go under the header on a desk and to the BOTTOM edge on a phone,
              where the thumb is: as a bottom sheet the header is the farthest thing from
              the hand. It is a sibling of the header and not inside it so `order` can move
              it; the DOM order —and so the reading and Tab order— stays the desk's. */}
          {hasActions ? (
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-3 py-1.5 max-sm:order-last max-sm:border-t max-sm:border-b-0 max-sm:pt-2 max-sm:safe-bottom">
              {onPromote === undefined ? null : (
                <Button
                  role="secondary"
                  size="sm"
                  icon={SquareArrowOutUpRight}
                  onClick={onPromote}
                >
                  {copy.shell.openAsPanel}
                </Button>
              )}
              {actions}
            </div>
          ) : null}

          {/* The density is declared by the surface, which is the only one that
            knows its own width. */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-3 py-3",
              !hasActions && "max-sm:safe-bottom",
            )}
          >
            <DensityProvider value="compact">{children}</DensityProvider>
          </div>
        </Dialog>
      </aside>
    </FocusScope>
  );
}
