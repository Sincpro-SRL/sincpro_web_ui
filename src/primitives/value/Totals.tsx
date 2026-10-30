import type { ReactNode } from "react";

/**
 * The money summary of a document — subtotal, taxes, discounts and the TOTAL — under its
 * lines, aligned to the right.
 *
 * Context: written as two more rows of the lines table, «IVA» and «Total» were the same size
 * and weight as a product line, and the one number the document exists for had to be found.
 * Every invoice people have ever read puts the summary apart, on the right, with the total
 * last and largest: following that convention is reading the document the way it is already
 * read (Jakob's law).
 *
 * Labels left and figures right of a narrow column, both in tabular figures, so the amounts
 * line up digit by digit. The `total` row closes the block: a rule above it, and the figure
 * at the title size.
 */
export type TotalsRow = {
  label: ReactNode;
  value: ReactNode;
  /** A note under the label — «incluido en el precio», «sobre Bs. 3.601,80». */
  detail?: ReactNode;
  /** The row the block exists for. Usually one, and last. */
  total?: boolean;
};

export function Totals({ rows }: { rows: readonly TotalsRow[] }) {
  return (
    <dl className="ml-auto flex w-full max-w-(--container-search) flex-col gap-1.5">
      {rows.map((row, i) =>
        row.total === true ? (
          <div
            key={i}
            className="mt-1 flex items-baseline justify-between gap-4 border-t border-line-strong pt-2.5"
          >
            <dt className="text-body font-semibold text-ink">{row.label}</dt>
            <dd className="text-title font-semibold tabular-nums text-ink">{row.value}</dd>
          </div>
        ) : (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <dt className="flex flex-col text-meta text-muted">
              {row.label}
              {row.detail === undefined ? null : (
                <span className="text-micro text-muted">{row.detail}</span>
              )}
            </dt>
            <dd className="text-meta tabular-nums text-ink">{row.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
