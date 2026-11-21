"use client";

import type { ReactNode } from "react";

/** One line of the ticket: how many, of what, for how much (already written). */
export type ReceiptLine = {
  quantity: number | string;
  name: string;
  /** The line's amount, written for the person: «Bs 40,00». */
  amount: ReactNode;
  /** A note under it: «sin cebolla», «2 × Bs 20,00». */
  note?: string;
};

/** A fact or a total: «Subtotal · Bs 76,00». `total` is the line that closes it, bigger. */
export type ReceiptRow = { label: string; value: ReactNode; total?: boolean };

export type ReceiptProps = {
  /** Who sells: the business name on top, big. */
  issuer: string;
  /** Under it, small and centred: the tax id, the address, the branch. */
  issuerLines?: readonly string[];
  /** The document's name — «FACTURA», «NOTA DE VENTA», «PEDIDO» — between rules. */
  document: string;
  /** Its facts: number, date, cashier, customer and tax id. */
  facts?: readonly ReceiptRow[];
  lines: readonly ReceiptLine[];
  totals: readonly ReceiptRow[];
  /** The closing words: the legend the law asks for, «¡Gracias por su compra!». */
  footer?: readonly string[];
  /** Something to scan or copy under everything — a QR the application draws, a control
   *  code. Drawn centred. */
  code?: ReactNode;
  /**
   * `paper` is the printed ticket: the width of an 80 mm roll, monospaced figures, what a
   * thermal printer gives. `screen` is the same document read on a screen across the counter
   * (a customer display, a kiosk's summary): bigger, in the system's type.
   */
  look?: "paper" | "screen";
};

/**
 * The ticket a till prints — a sale note, an invoice, a kitchen order — and the same document
 * shown on a screen.
 *
 * Context: a POS reprints, a customer asks for the receipt by email, a kiosk shows what was
 * ordered before paying. Each drew its own ticket, and a ticket is a fixed form people already
 * know how to read: who sells, which document, the lines (how many, what, how much), the
 * totals, the legend. It is a document, so it prints as itself — `print:` drops the rest of
 * the page's chrome (`AppFrame` already does) and the ticket keeps its width. No domain: the
 * application writes the words (a Bolivian invoice's legend, a control code).
 */
export function Receipt({
  issuer,
  issuerLines = [],
  document,
  facts = [],
  lines,
  totals,
  footer = [],
  code,
  look = "paper",
}: ReceiptProps) {
  const paper = look === "paper";
  const text = paper ? "text-micro" : "text-body";
  const rule = paper ? "border-dashed border-line-strong" : "border-line";
  return (
    <article
      data-ui="receipt"
      data-look={look}
      className={`mx-auto flex w-full min-w-0 flex-col gap-2 bg-surface text-ink ${
        paper
          ? "max-w-(--container-receipt) border border-line px-4 py-5 font-mono shadow-raised print:border-0 print:shadow-none"
          : "max-w-(--container-short) px-1 py-2"
      }`}
    >
      <header className="flex flex-col items-center gap-0.5 text-center">
        <h3 className={`${paper ? "text-body" : "text-title"} font-semibold`}>{issuer}</h3>
        {issuerLines.map((one) => (
          <p key={one} className={`${text} text-muted`}>
            {one}
          </p>
        ))}
      </header>
      <p
        data-ui="receipt.document"
        className={`border-y py-1 text-center ${text} font-semibold tracking-wide ${rule}`}
      >
        {document}
      </p>
      {facts.length === 0 ? null : (
        <dl className={`flex flex-col gap-0.5 ${text}`}>
          {facts.map((one) => (
            <div key={one.label} className="flex min-w-0 justify-between gap-3">
              <dt className="shrink-0 text-muted">{one.label}</dt>
              <dd className="min-w-0 truncate text-right">{one.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ul
        data-ui="receipt.lines"
        className={`flex flex-col gap-1 border-t pt-2 ${text} ${rule}`}
      >
        {lines.map((one, at) => (
          <li key={`${one.name}-${at}`} className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 tabular-nums">{one.quantity}</span>
              <span className="min-w-0 flex-1">{one.name}</span>
              <span className="shrink-0 tabular-nums">{one.amount}</span>
            </span>
            {one.note === undefined ? null : (
              <span className="pl-6 text-muted">{one.note}</span>
            )}
          </li>
        ))}
      </ul>
      <dl data-ui="receipt.totals" className={`flex flex-col gap-0.5 border-t pt-2 ${rule}`}>
        {totals.map((one) => (
          <div
            key={one.label}
            className={`flex min-w-0 items-baseline justify-between gap-3 ${
              one.total === true
                ? `${paper ? "text-body" : "text-title"} font-semibold`
                : `${text} text-muted`
            }`}
          >
            <dt className="shrink-0">{one.label}</dt>
            <dd className="min-w-0 truncate text-right text-ink tabular-nums">{one.value}</dd>
          </div>
        ))}
      </dl>
      {code === undefined ? null : (
        <div className={`flex justify-center border-t pt-2 ${rule}`}>{code}</div>
      )}
      {footer.length === 0 ? null : (
        <footer
          className={`flex flex-col items-center gap-0.5 pt-1 text-center ${text} text-muted`}
        >
          {footer.map((one) => (
            <p key={one}>{one}</p>
          ))}
        </footer>
      )}
    </article>
  );
}
