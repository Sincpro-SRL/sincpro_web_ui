"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { ArrowRight, Info, Plus, Unlink } from "lucide-react";
import { type ReactNode, useId } from "react";

/**
 * The money summary of a document — subtotal, taxes, discounts and the TOTAL — under its
 * lines, aligned to the right. And, once the document starts being settled, what was already
 * taken off it, what is still owed, and what could still be taken off.
 *
 * Context: written as two more rows of the lines table, «IVA» and «Total» were the same size
 * and weight as a product line, and the one number the document exists for had to be found.
 * Every invoice people have ever read puts the summary apart, on the right, with the total
 * last and largest: following that convention is reading the document the way it is already
 * read (Jakob's law).
 *
 * Labels left and figures right of a narrow column, both in tabular figures, so the amounts
 * line up digit by digit. The `total` row closes the breakdown: a rule above it.
 *
 * ── Deductions, balance and credits: one block, not three ────────────
 *
 * A posted invoice is read as one sum: the total, minus each payment, gives what is owed. Drawn
 * as a second component under this one, the payments would be a second column of figures that
 * the screen has to line up with the first by hand — which a template cannot do without
 * styling — and the decision below, WHICH figure leads, needs to see the three at once. So it
 * is this block, extended, and a block with only `rows` draws exactly what it drew before.
 *
 * It still does not know what an invoice is. It speaks of `deductions` (a payment, a credit
 * note, a retention: anything already applied against the total), a `balance` (what remains
 * after them), `settled` (the word for «nothing remains»: «Pagada», «Conciliado») and
 * `credits` (what could still be applied). The domain formats the money and owns the actions;
 * this only lays them out and names them.
 *
 * ── The figure that leads moves with the state ───────────────────────
 *
 * There is ONE figure at the title size, and which one it is depends on where the document is:
 *
 *      nothing applied yet (a draft, a posted invoice)   the total
 *      something applied, something owed                 the balance — the total steps down
 *      settled                                           the total, with the `settled` mark
 *
 * Once a payment is in, the question the person brings is «how much is left?», and a total
 * at the title size next to a balance at the body size answers the wrong question first.
 * That is the default; `lead` says it explicitly when the screen knows better.
 *
 * ── A deduction is HEARD as one: «Pagado el 12/10/2026, menos Bs. 1.000,00» ──
 *
 * The amount arrives formatted and WITHOUT a sign; the block writes the minus. The visible
 * «−» is hidden from assistive technology — screen readers skip it or say «dash» — and a
 * visually hidden «menos» (`copy.totals.less`) is read in its place, so the label and the
 * figure are one sentence and not two loose numbers.
 *
 * ── The detail of a deduction: an `i`, asked for ─────────────────────
 *
 * Where it came from (journal, reference, method), going to it, and unlinking it open from an
 * `i` before the label — `PopoverTrigger`, the same `i` a `RelationValue` uses for its
 * summary. Not a `Preview` on hover: the card holds an action that changes the document
 * («Desvincular»), and that is asked for with a press, which the mouse, the keyboard and the
 * finger all have. The `i` sits BEFORE the label so the label and its amount stay together
 * in the reading order.
 *
 * ── None of these actions is the primary ─────────────────────────────
 *
 * The screen's one primary is somewhere else («Registrar pago», «Confirmar»). Unlinking is
 * `secondary` and not `danger`: it does not destroy — the payment comes back as a credit and
 * is applied again with one press, which is the undo. «Aplicar» and «Abrir» are `ghost`.
 */
export type TotalsRow = {
  label: ReactNode;
  value: ReactNode;
  /** A note under the label — «incluido en el precio», «sobre Bs. 3.601,80». */
  detail?: ReactNode;
  /** The row that closes the breakdown. Usually one, and last. */
  total?: boolean;
};

/** A fact of a deduction's detail: «Diario · Banco BNB», «Referencia · TRF-88213». */
export type TotalsFact = { label: string; value: ReactNode };

/** Something already applied against the total: a payment, a credit note, a retention. */
export type TotalsDeduction = {
  /** What it is, as one phrase — «Pagado el 12/10/2026». A string: it also names the `i`
   *  and the floating detail. */
  label: string;
  /** The amount taken off, formatted and WITHOUT a sign: the block writes the minus. */
  value: ReactNode;
  /** A quiet note under the label — «Transferencia · Banco BNB». */
  detail?: ReactNode;
  /** What the `i` shows: two to five facts — journal, reference, method. */
  facts?: readonly TotalsFact[];
  /** Go to the applied record. The detail shows «Abrir». */
  onOpen?: () => void;
  /** Undo the application — «Desvincular». Present = allowed; absent = not offered. */
  onRemove?: () => void;
};

/** Something that COULD be applied and is not yet: an unused credit of the same party. */
export type TotalsCredit = {
  /** What it is — «NC/2026/0012». A string: it also names its «Aplicar». */
  label: string;
  /** The amount available, formatted. */
  value: ReactNode;
  /** A quiet note — «del 02/10/2026», «anticipo». */
  detail?: ReactNode;
  onApply: () => void;
};

export type TotalsProps = {
  /** The breakdown and its `total`: subtotal, each tax group, discounts, TOTAL. */
  rows: readonly TotalsRow[];
  /** What was already applied against the total, one row each, after it. */
  deductions?: readonly TotalsDeduction[];
  /** What remains once the deductions are taken off — «Importe adeudado». */
  balance?: Omit<TotalsRow, "total">;
  /** Nothing remains: the word for it, drawn as a mark next to the leading figure —
   *  «Pagada». */
  settled?: string;
  /** Which figure leads, at the title size. By default the balance when something was
   *  deducted and the document is not settled; otherwise the total. */
  lead?: "total" | "balance";
  /** What could still be applied, apart and under the sum: it is not part of it. */
  credits?: readonly TotalsCredit[];
  /** The title of the credits. `copy.totals.credits` by default. */
  creditsLabel?: string;
};

/** The figure the block exists for: a rule above it and the figure at the title size. The
 *  `data-lead` marks it for the tests and for whoever reads the DOM. */
function LeadRow({ row, mark }: { row: Omit<TotalsRow, "total">; mark?: string }) {
  return (
    <div
      data-lead=""
      className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line-strong pt-2.5"
    >
      <dt className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
          {row.label}
          {mark === undefined ? null : <Tag tone="good">{mark}</Tag>}
        </span>
        {row.detail === undefined ? null : (
          <span className="text-micro text-muted">{row.detail}</span>
        )}
      </dt>
      <dd className="ml-auto text-title font-semibold whitespace-nowrap tabular-nums text-ink">
        {row.value}
      </dd>
    </div>
  );
}

/** A figure that closes a part of the sum without leading it: the total once the balance
 *  leads, or the balance while the total does. Ruled, in the body size. */
function ClosingRow({ row }: { row: Omit<TotalsRow, "total"> }) {
  return (
    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-2">
      <dt className="flex min-w-0 flex-col">
        <span className="text-body font-semibold text-ink">{row.label}</span>
        {row.detail === undefined ? null : (
          <span className="text-micro text-muted">{row.detail}</span>
        )}
      </dt>
      <dd className="ml-auto text-body font-semibold whitespace-nowrap tabular-nums text-ink">
        {row.value}
      </dd>
    </div>
  );
}

function PlainRow({ row }: { row: TotalsRow }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex min-w-0 flex-col text-meta text-muted">
        {row.label}
        {row.detail === undefined ? null : (
          <span className="text-micro text-muted">{row.detail}</span>
        )}
      </dt>
      <dd className="text-meta whitespace-nowrap tabular-nums text-ink">{row.value}</dd>
    </div>
  );
}

/** What floats from a deduction's `i`: its facts and, when allowed, «Desvincular» and
 *  «Abrir». Both close the card first — the row may be gone once the action runs. */
function DeductionDetail({ item, close }: { item: TotalsDeduction; close: () => void }) {
  const copy = useUiCopy();
  const facts = item.facts ?? [];
  const run = (action: () => void) => () => {
    close();
    action();
  };
  return (
    <div className="flex w-64 max-w-full flex-col gap-3">
      {facts.length === 0 ? null : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-micro text-muted">{fact.label}</dt>
              <dd className="text-meta tabular-nums break-words text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.onRemove === undefined && item.onOpen === undefined ? null : (
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-2">
          {item.onRemove === undefined ? null : (
            <Button role="secondary" size="sm" icon={Unlink} onClick={run(item.onRemove)}>
              {copy.totals.unlink}
            </Button>
          )}
          {item.onOpen === undefined ? null : (
            <Button role="ghost" size="sm" icon={ArrowRight} onClick={run(item.onOpen)}>
              {copy.totals.open}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DeductionRow({ item }: { item: TotalsDeduction }) {
  const copy = useUiCopy();
  const asks =
    (item.facts !== undefined && item.facts.length > 0) ||
    item.onRemove !== undefined ||
    item.onOpen !== undefined;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex min-w-0 items-baseline gap-1 text-meta text-muted">
        {asks ? (
          <PopoverTrigger
            title={item.label}
            placement="bottom end"
            trigger={
              <IconButton
                icon={Info}
                label={fillCopy(copy.totals.details, { label: item.label })}
              />
            }
          >
            {(close) => <DeductionDetail item={item} close={close} />}
          </PopoverTrigger>
        ) : null}
        <span className="flex min-w-0 flex-col">
          {item.label}
          {item.detail === undefined ? null : (
            <span className="text-micro text-muted">{item.detail}</span>
          )}
        </span>
      </dt>
      <dd className="text-meta whitespace-nowrap tabular-nums text-ink">
        <span aria-hidden>{"− "}</span>
        <span className="sr-only">{copy.totals.less} </span>
        {item.value}
      </dd>
    </div>
  );
}

function Credits({ items, label }: { items: readonly TotalsCredit[]; label: string }) {
  const copy = useUiCopy();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-3">
      <p id={id} className="text-micro font-semibold text-muted">
        {label}
      </p>
      <ul aria-labelledby={id} className="flex flex-col gap-1">
        {items.map((credit, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex min-w-0 flex-col">
              <span className="text-meta text-ink">{credit.label}</span>
              {credit.detail === undefined ? null : (
                <span className="text-micro text-muted">{credit.detail}</span>
              )}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <span className="text-meta whitespace-nowrap tabular-nums text-ink">
                {credit.value}
              </span>
              {/* «Aplicar» is visible and repeats per row; its name says WHICH, starting with
                  the visible word so voice control still finds it. */}
              <Button
                role="ghost"
                size="sm"
                icon={Plus}
                aria-label={fillCopy(copy.totals.applyCredit, { label: credit.label })}
                onClick={credit.onApply}
              >
                {copy.totals.apply}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Totals({
  rows,
  deductions = [],
  balance,
  settled,
  lead,
  credits = [],
  creditsLabel,
}: TotalsProps) {
  const copy = useUiCopy();
  const leads: "total" | "balance" =
    lead ??
    (balance !== undefined && deductions.length > 0 && settled === undefined
      ? "balance"
      : "total");
  /* With nothing to lead it, the balance cannot lead: the total keeps the title size. */
  const balanceLeads = leads === "balance" && balance !== undefined;

  return (
    <div className="ml-auto flex w-full max-w-(--container-search) flex-col gap-3">
      <dl className="flex flex-col gap-1.5">
        {rows.map((row, i) =>
          row.total === true ? (
            balanceLeads ? (
              <ClosingRow key={i} row={row} />
            ) : (
              <LeadRow
                key={i}
                row={row}
                {...(settled === undefined ? {} : { mark: settled })}
              />
            )
          ) : (
            <PlainRow key={i} row={row} />
          ),
        )}
        {deductions.map((item, i) => (
          <DeductionRow key={i} item={item} />
        ))}
        {balance === undefined ? null : balanceLeads ? (
          <LeadRow row={balance} {...(settled === undefined ? {} : { mark: settled })} />
        ) : (
          <ClosingRow row={balance} />
        )}
      </dl>
      {credits.length === 0 ? null : (
        <Credits items={credits} label={creditsLabel ?? copy.totals.credits} />
      )}
    </div>
  );
}
