"use client";

import type { BlockStatus } from "@sincpro/web-ui/primitives/block/Block";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { ChevronDown, Lock, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

/**
 * Context: a procedure laid flat — every stage of one piece of work on a single
 * page, each collapsed to its title until you need it.
 *
 * ── Why not a `Wizard` ──────────────────────────────────────────────
 *
 * A wizard shows one step and hides the rest, which is right when the steps are
 * a single sitting and wrong when they are the work itself. This is for work
 * that spans days: you come back to a half-done piece and the first thing you
 * need is **where it stands** — which stages are settled, which are waiting on
 * you, which cannot start yet — and a wizard answers that with one screen and a
 * «back» button.
 *
 * ── Why collapsed and not a `Block` per stage ───────────────────────
 *
 * `Block` already carries the half of this that matters — a header that says
 * «Required» or «(Incomplete)» so you can see what is missing WITHOUT opening
 * anything. What it cannot do is *close*. Seven open blocks is a page nobody
 * scrolls; seven closed ones with their state on the line is an index of the
 * work, and that index IS the view.
 *
 * ── Locked is a sentence, never a disabled box ──────────────────────
 *
 * A stage that cannot start yet says **what would unlock it**, because «you
 * cannot do this» without «do that first» is the failure mode that makes people
 * click every section looking for the one that works.
 */

export type StepProps = {
  title: string;
  /** The stage's own mark, to the left of the title — what the eye finds when
   *  scanning a closed stack. */
  icon?: LucideIcon;
  /** «Required», «(Incomplete)», «(Complete)» — whatever this stage's state is
   *  called by whoever composes; the kit does not know what complete means. */
  status?: BlockStatus;
  /** Present when the stage cannot be opened yet. The sentence says what would
   *  unlock it, and it is shown in place of the contents. */
  locked?: string;
  /** What can be done with this stage, on its header line. Hidden while closed:
   *  an action you cannot see the context of is an action you press by mistake. */
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * One stage. Controlled on purpose: which stage is open is a fact about where
 * the work stands, so the page owns it — completing one can open the next, and
 * arriving at a half-done piece can open the one that is waiting.
 */
export function Step({
  title,
  icon: Icon,
  status,
  locked,
  actions,
  open,
  onToggle,
  children,
}: StepProps) {
  const isLocked = locked !== undefined;
  const expanded = open && !isLocked;

  return (
    <section className="min-w-0 border-t border-line bg-surface first:border-t-0">
      <h3 className="min-w-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          /* Open is a ground bar: the stage you are in is the only row with a
             fill. Closed rows stay on the paper, so the stack still reads as
             an index. */
          className={`group/step relative flex w-full min-w-0 items-center px-3 py-2.5 text-left ${
            expanded ? "border-b border-line bg-ground" : ""
          } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
        >
          {isLocked ? null : (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-control group-hover/step:bg-ground"
            />
          )}
          <span className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
            {Icon === undefined ? null : (
              <Icon
                className={`size-(--size-icon-md) shrink-0 ${isLocked ? "text-muted/60" : "text-muted"}`}
                aria-hidden
              />
            )}
            <span
              className={`min-w-0 truncate text-meta font-medium ${
                isLocked ? "text-muted" : "text-ink"
              }`}
            >
              {title}
            </span>
            {isLocked ? (
              <Lock className="size-(--size-icon-sm) shrink-0 text-muted/60" aria-hidden />
            ) : status === undefined ? null : (
              <Tag tone={status.tone ?? "neutral"}>{status.label}</Tag>
            )}
            <ChevronDown
              className={`ml-auto size-(--size-icon-md) shrink-0 text-muted transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </span>
        </button>
      </h3>

      {!expanded ? null : (
        <div className="px-3 py-3">
          {actions === undefined ? null : (
            <div className="mb-3 flex flex-wrap items-center gap-1">{actions}</div>
          )}
          {children}
        </div>
      )}

      {/* The locked sentence sits on the closed header rather than inside, so it
          is readable without a click that does nothing. */}
      {!isLocked ? null : (
        <p className="border-t border-line px-3 py-2 text-micro text-muted">{locked}</p>
      )}
    </section>
  );
}

export type StepsProps = {
  children: ReactNode;
};

/** The stack. One frame: the outer corners are the only rounded ones, and the
 *  stages share a hairline. A box around a box would be two frames arguing. */
export function Steps({ children }: StepsProps) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-box border border-line bg-surface">
      {children}
    </div>
  );
}

/**
 * Which stage is open, when the page has no better answer than «one at a time».
 *
 * Returns the current id and a toggle: pressing the open one closes it, so a
 * fully collapsed stack —the index of the work— is always one click away.
 *
 * `openStep` exists for the rail: the button that says what to do next lives up
 * there with the other actions, and pressing it has to open the stage down here
 * that does it.
 */
export function useSteps(initial?: string) {
  const [open, setOpen] = useState<string | undefined>(initial);

  return {
    open,
    isOpen: (id: string) => open === id,
    toggle: (id: string) => setOpen((current) => (current === id ? undefined : id)),
    openStep: (id: string) => setOpen(id),
  };
}
