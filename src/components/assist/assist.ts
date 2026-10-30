import { fillCopy, type UiCopy } from "@sincpro/web-ui/foundations/copy";
import type { ToastSpec } from "@sincpro/web-ui/primitives/notice/Toast";
import { Bot, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* ==================================================================== *
 *  THE ASSISTANT'S CONTRACT — what every piece of this family agrees on.
 *
 *  An assistant that acts inside a business screen is trusted for one reason:
 *  whoever works the screen can always answer three questions about what it did.
 *
 *      where did it get that?     → a SOURCE, a link to the record it read
 *      what exactly will change?  → the value, or the before → after
 *      how do I take it back?     → apply returns its UNDO
 *
 *  So a source is plain data (a label and where it goes), and applying anything
 *  — accepting a suggestion, applying a set of changes — is a function the
 *  screen writes and that RETURNS the function that reverts it. The family turns
 *  that return into the system's «Deshacer» notice; it never applies anything by
 *  itself, because it does not know what an invoice is.
 *
 *  Pure on purpose (no hooks, no "use client"): the components call these, and
 *  the tests do too.
 * ==================================================================== */

/** The one mark of the assistant, everywhere it appears: the suggestion, the review, the
 *  marker on a value, the event in the history. A robot and not sparkles — it says «an
 *  automated assistant did this», which is a fact, not a celebration.
 *
 *  Exported so a screen that composes the assistant into a piece of its own — a `Callout`,
 *  a `ActivityEvent` — uses the same mark and not a second one. */
export const ASSIST_ICON: LucideIcon = Bot;

/** Where a suggestion or a change comes from: «orden de compra PO/2026/0042», «las últimas
 *  5 facturas del cliente». With `href` it is a real link; with `onOpen`, a button that the
 *  screen answers. Without either it is said, not linked. */
export type AssistSource = {
  label: string;
  href?: string;
  onOpen?: () => void;
};

/** What a value set by the assistant carries afterwards: when, from what, and who said yes. */
export type AssistOrigin = {
  /** When the assistant set it (or when it was accepted). */
  at?: Date | string | number;
  source?: AssistSource;
  /** The person who accepted it. The assistant proposes; a person decides. */
  acceptedBy?: string;
};

/** Applying something the assistant proposed. It may return the function that reverts it:
 *  with one, the screen gets a «Deshacer» notice; without one, nothing to undo is offered. */
export type AssistApply<A extends unknown[] = []> = (...args: A) => (() => void) | void;

/** The part of the toast API the family uses — the optional toast hook gives it, or `null`. */
export type AssistToasts = { show: (spec: ToastSpec) => number } | null;

/**
 * Runs `apply` and, when it returns an undo and there is a notice stack, offers it.
 *
 * Context: undo over confirm (docs/PRINCIPLES.md §7). Accepting a suggestion does not ask
 * «¿estás seguro?» — the change happens at once, and the notice carries the way back. The
 * notice is `good` because the change worked; the undo lives in its action, which is the
 * same «Deshacer» a removed line or a registered payment offers.
 */
export function applyWithUndo(
  apply: () => (() => void) | void,
  toasts: AssistToasts,
  message: string,
  undoLabel: string,
): void {
  const undo = apply();
  if (typeof undo !== "function" || toasts === null) return;
  toasts.show({ message, tone: "good", action: { label: undoLabel, onSelect: undo } });
}

/** The notice after accepting a suggestion — naming the field when the screen said which. */
export function acceptedMessage(copy: UiCopy, field?: string): string {
  return field === undefined
    ? copy.assist.accepted
    : fillCopy(copy.assist.acceptedIn, { field });
}

/* ---------------------------------------------------------------- *
 *  The review of proposed changes
 * ---------------------------------------------------------------- */

export type ChangeKind = "add" | "remove" | "change";

/** One proposed change, as plain data — what `ChangeReview.Change` is written with. */
export type ProposedChange = {
  id: string;
  /** What changes: the field's label, or the line's name. */
  label: string;
  /** The value now. Absent = the thing does not exist yet (`add`). `null` = an empty field. */
  before?: ReactNode;
  /** The value after. Absent = the thing goes away (`remove`). */
  after?: ReactNode;
  /** Forces the kind; by default it follows from `before` and `after`. */
  kind?: ChangeKind;
  /** A second line under the label: the product's code, «40 bolsas × Bs. 58,00». */
  detail?: ReactNode;
  /** Where THIS change comes from, when it is not the review's own source. */
  source?: AssistSource;
  /** Proposed but not chosen when the review opens — the assistant is less sure of it. */
  unchosen?: boolean;
};

/** The kind of a change, from what it has: no `before` → new, no `after` → removed. */
export function changeKind(
  change: Pick<ProposedChange, "before" | "after" | "kind">,
): ChangeKind {
  if (change.kind !== undefined) return change.kind;
  if (change.before === undefined) return "add";
  if (change.after === undefined) return "remove";
  return "change";
}

/** The ids chosen when a review opens: all of them but the ones marked `unchosen`. */
export function initiallyChosen(changes: readonly ProposedChange[]): string[] {
  return changes.filter((c) => c.unchosen !== true).map((c) => c.id);
}

/** Turns one change on or off, and returns the chosen ids IN THE ORDER the review lists
 *  them — so what `onApply` receives reads like the screen, not like the clicks. */
export function toggleChosen(
  order: readonly string[],
  chosen: readonly string[],
  id: string,
  on: boolean,
): string[] {
  const next = new Set(chosen);
  if (on) next.add(id);
  else next.delete(id);
  return order.filter((one) => next.has(one));
}

/** Whether the «all» check is on, off, or mixed. */
export function chosenState(
  order: readonly string[],
  chosen: readonly string[],
): "all" | "some" | "none" {
  const count = order.filter((id) => chosen.includes(id)).length;
  if (count === 0) return "none";
  return count === order.length ? "all" : "some";
}

/** The label of the apply button, with the count — a button that says how much it does. */
export function applyLabel(copy: UiCopy, count: number): string {
  return count === 1 ? copy.assist.applyOne : fillCopy(copy.assist.applyMany, { count });
}

/** The notice after applying. */
export function appliedMessage(copy: UiCopy, count: number): string {
  return count === 1 ? copy.assist.appliedOne : fillCopy(copy.assist.appliedMany, { count });
}
