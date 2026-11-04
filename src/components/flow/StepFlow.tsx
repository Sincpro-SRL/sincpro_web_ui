"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { flatten, propsOf, slot, slotOf } from "@sincpro/web-ui/foundations/slots";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Check, ChevronRight, CircleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

/* ==================================================================== *
 *  STEP FLOW — one operation, in several steps, done in one sitting.
 *
 *  Importing contacts is three questions that cannot be asked at once: which
 *  file, which of its columns is which field, and — once both are answered —
 *  what is about to be created and what is wrong. The second question cannot
 *  even be drawn until the first is answered (the columns ARE the file), and
 *  the third is the answer to the other two. That is what earns steps: one
 *  answer changes the next question. A long form whose fields do not depend on
 *  each other is filled in faster on one page.
 *
 *  ── Written as a tree ───────────────────────────────────────────────
 *
 *      <StepFlow onFinish={…} onCancel={…}>
 *        <StepFlow.Step id="file" title="Subir el archivo" blocked={file ? undefined : "Elegí un archivo."}>
 *          <DropZone … />
 *        </StepFlow.Step>
 *        <StepFlow.Step id="map" title="Mapear columnas">…</StepFlow.Step>
 *        <StepFlow.Step id="review" title="Revisar" nextLabel="Importar 40 contactos">…</StepFlow.Step>
 *      </StepFlow>
 *
 *  Only the current step's contents are drawn. What a step asked lives ABOVE
 *  the flow, in whoever composes it: a step that kept its own answers would
 *  lose them on the way back, and the last step has to read all of them.
 *
 *  ── Not `Steps`, and not the dialog's `Wizard` ──────────────────────
 *
 *  `Steps` (primitives/block) is a procedure that spans DAYS: every stage on
 *  one page, collapsed to its state, because coming back to half-done work the
 *  first question is where it stands. Nothing is «next» there; the stages are
 *  the work. This is the opposite case: one sitting, one step in sight, a way
 *  forward and a way back, and when it ends the operation has happened.
 *
 *  `Wizard` (primitives/dialog) is the strip and the buttons of a `Dialog`, a
 *  display primitive driven entirely from outside. This is the component the
 *  composer workspace needs: it draws NO overlay of its own — inside the
 *  workspace every modal is a composer view (stories/Estilo.mdx), so the flow
 *  fills whatever surface opened it — and it owns what a primitive cannot:
 *  which step it is on (controlled or not), the focus and the announcement on
 *  every move, and the finish.
 *
 *  ── One gold at a time ──────────────────────────────────────────────
 *
 *  The footer has ONE primary (docs/PRINCIPLES.md §2): «Siguiente» while there
 *  is a next step, and on the last one whatever the step says will happen —
 *  `nextLabel` «Importar 40 contactos». A last button that says «Siguiente»
 *  hides that pressing it does something. Back is secondary, Cancel ghost.
 *
 *  ── A blocked step says why ─────────────────────────────────────────
 *
 *  `blocked` is the sentence, not a boolean: present, «Siguiente» turns off and
 *  the sentence is written next to it, with an icon, and names the button
 *  (`aria-describedby`) — the same contract as the record's `DirtyState
 *  .blocked`. A grey button with no reason is a wall: people press it, nothing
 *  happens, and nothing says what is missing.
 *
 *  ── Where you are, and what is left — never only by colour ──────────
 *
 *  The strip on top lists every step: done ones carry a check and are buttons
 *  (going back is reviewing), the current one is `aria-current="step"`, the
 *  pending ones are numbered and cannot be pressed — the next step does not
 *  know yet what to ask. Each one's state is also a word for a screen reader,
 *  and «Paso 2 de 3» sits over the step's title.
 *
 *  ── Every move is heard ─────────────────────────────────────────────
 *
 *  On a move the focus goes to the new step's heading — the button pressed is
 *  gone or means something else now, and leaving the focus on it strands a
 *  keyboard user in the footer — and a polite live region says «Paso 2 de 3:
 *  Mapear columnas». The region is always mounted (a region inserted with its
 *  words is not reliably read), and the first render moves nothing: whoever
 *  opened the flow decides where the focus starts.
 *
 *  ── Busy ────────────────────────────────────────────────────────────
 *
 *  `busy` is the operation running — the file being read, the contacts being
 *  created. The primary is `Button busy`: it keeps the focus and its width and
 *  ignores a second press (a second «Importar» is a second import). Back,
 *  Cancel and the strip turn off until it is done.
 * ==================================================================== */

export type StepFlowStepProps = {
  /** Who the step is: what `current` and `onCurrentChange` speak. */
  id: string;
  /** The step's name: on the strip and as the heading of its contents. */
  title: string;
  /** One sentence under the title: what this step asks for. */
  description?: string;
  /** Why it cannot move on yet. Present = «Siguiente» (or the finish) is off and this is
   *  written next to it. Absent = the step is answered. */
  blocked?: string;
  /** What the forward button says from this step. On the last step it names what is going
   *  to happen — «Importar 40 contactos» — instead of the copy's «Terminar». */
  nextLabel?: string;
  children?: ReactNode;
};

const Step = slot("step", (_props: StepFlowStepProps): ReactNode => null);

export type StepFlowProps = {
  /** The current step's id, controlled. With `onCurrentChange`, the screen owns the step:
   *  it can keep it in the URL, or jump back to the step that has the problem. */
  current?: string;
  /** Where an uncontrolled flow starts. The first step when absent. */
  defaultCurrent?: string;
  onCurrentChange?: (id: string) => void;
  /** The forward button on the last step: the operation itself. */
  onFinish: () => void;
  /** Leave without doing anything. Without it there is no «Cancelar» — the surface that
   *  opened the flow may already have its own way out (the composer modal's ×). */
  onCancel?: () => void;
  /** The operation is running: the primary is busy, the way back is off. */
  busy?: boolean;
  /** `StepFlow.Step`, in order. */
  children?: ReactNode;
};

/** The steps as written, in order. */
function readSteps(children: ReactNode): StepFlowStepProps[] {
  return flatten(children)
    .filter((node) => slotOf<"step">(node) === "step")
    .map((node) => propsOf<StepFlowStepProps>(node)!);
}

type Position = "done" | "current" | "pending";

const DISC: Readonly<Record<Position, string>> = {
  done: "bg-good/12 text-good",
  current: "bg-ink text-surface",
  pending: "bg-ink/8 text-muted",
};

export function StepFlow({
  current: controlled,
  defaultCurrent,
  onCurrentChange,
  onFinish,
  onCancel,
  busy = false,
  children,
}: StepFlowProps) {
  const words = useUiCopy().stepFlow;
  const steps = readSteps(children);
  const [own, setOwn] = useState<string | undefined>(defaultCurrent);
  const wanted = controlled ?? own;
  /* An id that is not (or no longer) a step falls back to the first: a flow that draws
     nothing because a step was renamed is a blank modal with no way out. */
  const found = steps.findIndex((s) => s.id === wanted);
  const at = found === -1 ? 0 : found;
  const step = steps[at];
  const currentId = step?.id;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(currentId);
  const headingId = useId();
  const blockedId = useId();

  /* The focus follows the step — but not on the first render, and not on StrictMode's
     second run of the same one: `shown` only differs after a real move. */
  useEffect(() => {
    if (shown.current === currentId) return;
    shown.current = currentId;
    headingRef.current?.focus();
  }, [currentId]);

  if (step === undefined) return null;

  const last = at === steps.length - 1;
  const total = steps.length;
  const go = (id: string) => {
    if (controlled === undefined) setOwn(id);
    onCurrentChange?.(id);
  };
  const forward = () => {
    if (busy || step.blocked !== undefined) return;
    if (last) onFinish();
    else go(steps[at + 1]!.id);
  };
  const position = fillCopy(words.position, { index: at + 1, total });

  return (
    /* `h-full`: the composer modal's body is a block with a height, not a flex column —
       filling it is what keeps the footer in sight while the step scrolls. */
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-surface text-ink">
      {/* Where you are and what is left. A list, so a screen reader counts it. */}
      <ol
        aria-label={words.steps}
        className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-1 gap-y-1 border-b border-line px-4 py-2.5"
      >
        {steps.map((s, i) => {
          const state: Position = i < at ? "done" : i === at ? "current" : "pending";
          const content = (
            <>
              <span
                aria-hidden
                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-pill text-micro font-medium tabular-nums ${DISC[state]}`}
              >
                {state === "done" ? (
                  <Check className="size-(--size-icon-sm)" strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="min-w-0 truncate">{s.title}</span>
              {state === "current" ? null : (
                <span className="sr-only">
                  {` (${state === "done" ? words.done : words.pending})`}
                </span>
              )}
            </>
          );
          return (
            <li key={s.id} className="flex min-w-0 items-center gap-1">
              {i === 0 ? null : (
                <ChevronRight
                  aria-hidden
                  className="size-(--size-icon-sm) shrink-0 text-muted"
                />
              )}
              {state === "done" && !busy ? (
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-control px-1.5 py-1 text-micro text-ink transition-colors duration-(--duration-instant) hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={`inline-flex min-w-0 items-center gap-1.5 px-1.5 py-1 text-micro ${
                    state === "current"
                      ? "font-medium text-ink"
                      : state === "done"
                        ? "text-ink"
                        : "text-muted"
                  }`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Always mounted: it is read when its words change, not when it appears. */}
      <p role="status" className="sr-only">
        {busy ? words.working : fillCopy(words.announce, { position, title: step.title })}
      </p>

      <section
        aria-labelledby={headingId}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4"
      >
        <p className="text-micro text-muted tabular-nums">{position}</p>
        {/* `tabIndex={-1}`: the flow sends the focus here on a move, and only the flow —
            it is not a stop of the Tab order. */}
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-title font-semibold text-ink outline-0"
        >
          {step.title}
        </h2>
        {step.description === undefined ? null : (
          <p className="mt-1 max-w-prose text-meta text-muted">{step.description}</p>
        )}
        {/* A step is usually a control and what it found — a drop zone and a notice, a
            notice and a table: the gap between them is the flow's, not the caller's. */}
        <div className="mt-4 flex min-w-0 flex-col gap-3">{step.children}</div>
      </section>

      <footer className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-ground px-4 py-3 max-sm:safe-bottom">
        {step.blocked === undefined ? null : (
          <p
            id={blockedId}
            className="mr-auto flex min-w-0 items-center gap-1.5 text-micro text-warn"
          >
            <CircleAlert aria-hidden className="size-(--size-icon-sm) shrink-0" />
            <span className="min-w-0">{step.blocked}</span>
          </p>
        )}
        {onCancel === undefined ? null : (
          <Button role="ghost" onClick={onCancel} disabled={busy}>
            {words.cancel}
          </Button>
        )}
        {at === 0 ? null : (
          <Button role="secondary" onClick={() => go(steps[at - 1]!.id)} disabled={busy}>
            {words.back}
          </Button>
        )}
        <Button
          role="primary"
          onClick={forward}
          busy={busy}
          disabled={step.blocked !== undefined}
          {...(step.blocked === undefined ? {} : { "aria-describedby": blockedId })}
        >
          {step.nextLabel ?? (last ? words.finish : words.next)}
        </Button>
      </footer>
    </div>
  );
}

StepFlow.Step = Step;
