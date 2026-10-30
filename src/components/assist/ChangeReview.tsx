"use client";

import {
  appliedMessage,
  applyLabel,
  applyWithUndo,
  type AssistApply,
  type AssistSource,
  changeKind,
  chosenState,
  initiallyChosen,
  type ProposedChange,
  toggleChosen,
} from "@sincpro/web-ui/components/assist/assist";
import { AssistLabel, AssistSourceLink } from "@sincpro/web-ui/components/assist/AssistMark";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { flatten, propsOf, slot, slotOf } from "@sincpro/web-ui/foundations/slots";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Dialog, type DialogContext } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { Checkbox } from "@sincpro/web-ui/primitives/field/Checks";
import { useToastIfAny } from "@sincpro/web-ui/primitives/notice/Toast";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

/* ==================================================================== *
 *  CHANGE REVIEW — the assistant proposes changes to a record; a person
 *  chooses which ones happen.
 *
 *  The assistant read a purchase order and wants to fill the invoice from it:
 *  two fields and four lines. Applying all of that blind is how a wrong price
 *  ends up posted; asking «¿estás seguro?» is how people learn to press «sí»
 *  without reading. So the proposal is SHOWN as what it would do — each change
 *  with its before → after and its source — every change is a check, and
 *  «Aplicar N cambios» does exactly the chosen ones. Then the notice offers
 *  «Deshacer», the way every other change in the system is taken back.
 *
 *  ── Written as a tree ───────────────────────────────────────────────
 *
 *      <ChangeReview source={…} onApply={…} onDiscard={…}>
 *        <ChangeReview.Group title="Campos">
 *          <ChangeReview.Change id="term" label="Plazo de pago" before="15 días" after="30 días" />
 *        </ChangeReview.Group>
 *        <ChangeReview.Group title="Líneas">
 *          <ChangeReview.Change id="L1" label="Cemento IP-30" after="40 × Bs. 58,00" />
 *          <ChangeReview.Change id="L7" label="Flete" before="Bs. 150,00" />
 *        </ChangeReview.Group>
 *      </ChangeReview>
 *
 *  A change with no `before` is NEW, one with no `after` GOES AWAY, one with
 *  both CHANGES — and the kind is written next to it, never left to a color.
 *  The review knows nothing of invoices: labels and values come in as nodes,
 *  and `onApply` receives the chosen ids, in the order they are listed.
 *
 *  ── Two places, one review ──────────────────────────────────────────
 *
 *  `ChangeReview` sits in the page, inside the record it would change, as a
 *  dashed card (dashed: proposed, not yet real). `ChangeReviewDialog` is the
 *  same review in a `Dialog` — a bottom sheet on a phone — for when the proposal
 *  is opened on demand from a notice. «Aplicar» is the primary of the surface it
 *  is on; inline in a record whose rail already has the primary, pass
 *  `emphasis="secondary"`: one gold per screen.
 * ==================================================================== */

type GroupProps = {
  /** «Campos», «Líneas». Without it the changes are listed without a heading. */
  title?: string;
  children?: ReactNode;
};

const Group = slot("group", (_props: GroupProps): ReactNode => null);
const Change = slot("change", (_props: ProposedChange): ReactNode => null);

type Listed = { title?: string; changes: ProposedChange[] };

/** The groups as written. Changes written outside a group form an untitled one in their
 *  place, so a short review is just its changes. */
function readTree(children: ReactNode): Listed[] {
  const out: Listed[] = [];
  let loose: Listed | null = null;
  for (const node of flatten(children)) {
    const name = slotOf<"group" | "change">(node);
    if (name === "group") {
      loose = null;
      const props = propsOf<GroupProps>(node)!;
      out.push({
        ...(props.title === undefined ? {} : { title: props.title }),
        changes: flatten(props.children)
          .filter((one) => slotOf(one) === "change")
          .map((one) => propsOf<ProposedChange>(one)!),
      });
    } else if (name === "change") {
      if (loose === null) {
        loose = { changes: [] };
        out.push(loose);
      }
      loose.changes.push(propsOf<ProposedChange>(node)!);
    }
  }
  return out;
}

type ReviewProps = {
  /** What the proposal is, as a heading. The copy's «Cambios propuestos» when absent. */
  title?: string;
  /** One sentence under the title: what the assistant read and what it would do. */
  summary?: string;
  /** Where the whole proposal comes from. A change may carry its own. */
  source?: AssistSource;
  /** Applies the chosen changes — their ids, in the listed order. Return the function that
   *  reverts them, and the screen gets «Deshacer». */
  onApply: AssistApply<[ids: string[]]>;
  /** Rejects the proposal. */
  onDiscard: () => void;
  /** The chosen ids, controlled. Uncontrolled from «all but the `unchosen` ones». */
  chosen?: readonly string[];
  onChosenChange?: (ids: string[]) => void;
  /** `ChangeReview.Group` and `ChangeReview.Change`. */
  children?: ReactNode;
};

/** What both faces share: the tree read once, the chosen ids, and «apply». */
function useReview({ children, chosen, onChosenChange, onApply }: ReviewProps) {
  const copy = useUiCopy();
  const toasts = useToastIfAny();
  const groups = readTree(children);
  const all = groups.flatMap((g) => g.changes);
  const order = all.map((c) => c.id);
  const [own, setOwn] = useState<string[]>(() => initiallyChosen(all));
  const current = chosen === undefined ? own : order.filter((id) => chosen.includes(id));
  const choose = (next: string[]) => {
    if (chosen === undefined) setOwn(next);
    onChosenChange?.(next);
  };
  const apply = () => {
    const ids = current;
    applyWithUndo(
      () => onApply(ids),
      toasts,
      appliedMessage(copy, ids.length),
      copy.assist.undo,
    );
  };
  return { groups, order, current, choose, apply };
}

type Review = ReturnType<typeof useReview>;

/** One change: its check (named by its label), the kind in words, and before → after. */
function ChangeRow({
  change,
  on,
  onToggle,
}: {
  change: ProposedChange;
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  const copy = useUiCopy();
  const valuesId = useId();
  const kind = changeKind(change);
  const word = {
    add: copy.assist.added,
    remove: copy.assist.removed,
    change: copy.assist.changed,
  }[kind];
  const empty = <span className="text-muted italic">{copy.assist.empty}</span>;
  const before = change.before === null ? empty : change.before;

  return (
    <li
      data-change={kind}
      className="flex min-w-0 flex-col gap-1 border-b border-line px-4 py-2.5 last:border-b-0 @lg:flex-row @lg:items-start @lg:gap-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Checkbox
            checked={on}
            onChange={onToggle}
            label={change.label}
            describedBy={valuesId}
          />
          <Tag>{word}</Tag>
        </span>
        {change.detail === undefined ? null : (
          <span className="pl-6.5 text-micro text-muted">{change.detail}</span>
        )}
        {change.source === undefined ? null : (
          <span className="pl-6.5">
            <AssistSourceLink source={change.source} />
          </span>
        )}
      </span>

      {/* The values, read as a sentence: «de 15 días a 30 días». Visually an arrow. What
          goes away is struck through — and still readable: it is what the person is
          about to lose. */}
      <span
        id={valuesId}
        className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 pl-6.5 text-meta tabular-nums @lg:w-2/5 @lg:shrink-0 @lg:justify-end @lg:pl-0 @lg:text-right"
      >
        {kind === "add" ? null : (
          <>
            <span className="sr-only">{copy.assist.from} </span>
            <span className={`text-muted ${kind === "remove" ? "line-through" : ""}`}>
              {before}
            </span>
          </>
        )}
        {kind === "remove" ? null : (
          <>
            {kind === "add" ? null : (
              <ArrowRight
                className="size-(--size-icon-sm) shrink-0 self-center text-muted"
                strokeWidth={2}
                aria-hidden
              />
            )}
            <span className="sr-only">{copy.assist.to} </span>
            <span className="font-medium text-ink">{change.after}</span>
          </>
        )}
      </span>
    </li>
  );
}

/** «Todos los cambios», the count, and the groups. */
function ReviewBody({ review }: { review: Review }) {
  const copy = useUiCopy();
  const { groups, order, current, choose } = review;
  const state = chosenState(order, current);
  return (
    <div className="@container flex min-w-0 flex-col">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-2">
        <Checkbox
          checked={state === "all"}
          mixed={state === "some"}
          label={copy.assist.all}
          onChange={(on) => choose(on ? [...order] : [])}
        />
        <span className="text-micro text-muted tabular-nums">
          {fillCopy(copy.assist.chosen, { count: current.length, total: order.length })}
        </span>
      </div>
      {groups.map((group, i) => (
        <section key={group.title ?? i} className="flex min-w-0 flex-col">
          {group.title === undefined ? null : (
            <h4 className="px-4 pt-3 pb-1 text-micro font-medium text-muted">
              {group.title}
            </h4>
          )}
          <ul className="flex min-w-0 flex-col">
            {group.changes.map((change) => (
              <ChangeRow
                key={change.id}
                change={change}
                on={current.includes(change.id)}
                onToggle={(on) => choose(toggleChosen(order, current, change.id, on))}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** «Elegí al menos un cambio.», «Descartar» and «Aplicar N cambios». */
function ReviewActions({
  review,
  emphasis,
  onDiscard,
  after,
}: {
  review: Review;
  emphasis: "primary" | "secondary";
  onDiscard: () => void;
  /** What happens after either button — the dialog closes. */
  after?: () => void;
}) {
  const copy = useUiCopy();
  const count = review.current.length;
  return (
    <>
      {count > 0 ? null : (
        /* The reason next to the disabled button: a grey «Aplicar» with no explanation is a
           dead end (the same rule as the wizard's «siguiente»). */
        <span className="mr-auto min-w-0 text-micro text-warn">{copy.assist.noneChosen}</span>
      )}
      <Button
        role="ghost"
        size="sm"
        onClick={() => {
          onDiscard();
          after?.();
        }}
      >
        {copy.assist.discard}
      </Button>
      <Button
        role={emphasis}
        size="sm"
        disabled={count === 0}
        onClick={() => {
          review.apply();
          after?.();
        }}
      >
        {applyLabel(copy, count)}
      </Button>
    </>
  );
}

export type ChangeReviewProps = ReviewProps & {
  /** The role of «Aplicar». `primary` by default; `secondary` inside a record whose rail
   *  already shows the screen's one primary. */
  emphasis?: "primary" | "secondary";
};

/** The review inside the page: a dashed card in the record it would change. */
export function ChangeReview(props: ChangeReviewProps) {
  const { title, summary, source, onDiscard, emphasis = "primary" } = props;
  const copy = useUiCopy();
  const review = useReview(props);
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      data-assist="review"
      className="flex min-w-0 flex-col overflow-clip rounded-box border border-dashed border-info/40 bg-surface"
    >
      <header className="flex min-w-0 flex-col gap-1 border-b border-line px-4 py-3">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <AssistLabel />
          {source === undefined ? null : <AssistSourceLink source={source} />}
        </span>
        <h3 id={titleId} className="text-lead font-semibold text-ink">
          {title ?? copy.assist.review}
        </h3>
        {summary === undefined ? null : (
          <p className="max-w-prose text-meta text-muted">{summary}</p>
        )}
      </header>
      <ReviewBody review={review} />
      <footer className="flex min-w-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-ground px-4 py-2.5">
        <ReviewActions review={review} emphasis={emphasis} onDiscard={onDiscard} />
      </footer>
    </section>
  );
}

ChangeReview.Group = Group;
ChangeReview.Change = Change;

export type ChangeReviewDialogProps = ReviewProps & {
  open: boolean;
  /** Every way out ends here: ×, Escape, the scrim — «later», the proposal stays — and
   *  also after «Aplicar» and «Descartar». */
  onClose: () => void;
  /** What the dialog is about, in its header: «factura · FAC/2026/0120». */
  context?: DialogContext;
};

/**
 * The same review, in a `Dialog`: opened on demand — from a notice that says «el asistente
 * encontró la orden de compra» — and a bottom sheet on a phone. «Aplicar» is the dialog's
 * primary; closing without choosing keeps the proposal for later.
 */
export function ChangeReviewDialog(props: ChangeReviewDialogProps) {
  const { open, onClose, context, title, summary, source, onDiscard } = props;
  const copy = useUiCopy();
  const review = useReview(props);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? copy.assist.review}
      {...(summary === undefined ? {} : { subtitle: summary })}
      {...(context === undefined ? {} : { context })}
      footer={
        <ReviewActions
          review={review}
          emphasis="primary"
          onDiscard={onDiscard}
          after={onClose}
        />
      }
    >
      {/* The body's padding is the dialog's; the review's rows run edge to edge like a
          table, so they take it back. */}
      <div className="-mx-4 -my-4 flex min-w-0 flex-col">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
          <AssistLabel />
          {source === undefined ? null : <AssistSourceLink source={source} />}
        </span>
        <ReviewBody review={review} />
      </div>
    </Dialog>
  );
}

ChangeReviewDialog.Group = Group;
ChangeReviewDialog.Change = Change;
