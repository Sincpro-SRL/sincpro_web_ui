/**
 * Context: what the assistant reads and proposes in the stories — a draft invoice for
 * Constructora Illimani, the purchase order the customer sent (PO/2026/0042), and the
 * customer's habit (it pays at 30 days). The assistant does not know any of this in the
 * package; the screen does, and hands the components plain values and labels.
 *
 * The proposal is deliberately mixed, the way a real one is: a quantity that changes, two
 * new lines, and one line the order does not mention — which the assistant proposes to
 * remove but leaves UNCHOSEN, because «not in the order» is not the same as «wrong».
 */
import { type InvoiceLine, lineTotal, money } from "./erp";
import { line } from "./erp-lines";

export const ORDER = {
  number: "PO/2026/0042",
  customer: "Constructora Illimani",
  taxId: "1597534862",
  /** Where the purchase order lives in the ERP. */
  href: "#compras/PO-2026-0042",
} as const;

/** The draft the assistant is helping to complete. */
export const ASSISTED_INVOICE = {
  number: "FAC/2026/0121",
  customer: ORDER.customer,
  taxId: ORDER.taxId,
  issued: "2026-10-30",
  /** What the person typed: 15 days. The customer always pays at 30. */
  termDays: 15,
} as const;

export const SUGGESTED_TERM = 30;

export const TERM_SOURCE = {
  label: "las últimas 5 facturas de Constructora Illimani",
  href: "#ventas/facturas?cliente=1597534862",
};

export const ORDER_SOURCE = { label: `orden de compra ${ORDER.number}`, href: ORDER.href };

/** The two lines already on the draft. */
export const DRAFT_LINES_BEFORE: readonly InvoiceLine[] = [
  line("A1", "Implementación Odoo — módulo de ventas", 1),
  line("A2", "Licencia de usuario adicional", 10),
];

export type LineProposal = {
  id: string;
  kind: "add" | "change" | "remove";
  /** The line as the order has it (for `remove`, the line that goes). */
  line: InvoiceLine;
  before?: InvoiceLine;
  unchosen?: boolean;
};

export const LINE_PROPOSALS: readonly LineProposal[] = [
  {
    id: "line-A2",
    kind: "change",
    before: DRAFT_LINES_BEFORE[1]!,
    line: { ...DRAFT_LINES_BEFORE[1]!, quantity: 12 },
  },
  { id: "line-P1", kind: "add", line: line("P1", "Capacitación presencial (por hora)", 8) },
  { id: "line-P2", kind: "add", line: line("P2", "Soporte mensual (plan estándar)", 1) },
  {
    id: "line-A1",
    kind: "remove",
    line: DRAFT_LINES_BEFORE[0]!,
    before: DRAFT_LINES_BEFORE[0]!,
    unchosen: true,
  },
];

/** «12 × Bs. 350,00 = Bs. 4.200,00» — how a line reads in a review. */
export function lineSummary(l: InvoiceLine): string {
  return `${l.quantity} × ${money(l.unitPrice)} = ${money(lineTotal(l))}`;
}

/** The lines after applying the chosen proposals — in the draft's order, new ones last. */
export function applyLineProposals(
  lines: readonly InvoiceLine[],
  chosen: readonly string[],
): InvoiceLine[] {
  const picked = LINE_PROPOSALS.filter((p) => chosen.includes(p.id));
  const out = lines
    .filter((l) => !picked.some((p) => p.kind === "remove" && p.line.id === l.id))
    .map((l) => picked.find((p) => p.kind === "change" && p.line.id === l.id)?.line ?? l);
  return [...out, ...picked.filter((p) => p.kind === "add").map((p) => p.line)];
}
