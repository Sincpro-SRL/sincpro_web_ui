/**
 * Context: a bank account to reconcile — the lines the bank sent (the statement) and the
 * open journal items they may pay. Example domain for `5 · Plantillas/Conciliación`; the
 * package knows none of this.
 */

/** A movement the bank reports: money in (positive) or out (negative). */
export type StatementLine = {
  id: string;
  date: string;
  /** What the bank wrote — often a reference and a name, rarely both right. */
  label: string;
  partner: string | null;
  amount: number;
};

/** An open journal item: what a customer still owes, or what is still owed to a supplier. */
export type JournalItem = {
  id: string;
  /** The entry it belongs to: «FAC/2026/0118». */
  move: string;
  partner: string;
  date: string;
  account: string;
  /** What is still open, signed like the statement: a receivable is positive. */
  residual: number;
};

export const STATEMENT: readonly StatementLine[] = [
  {
    id: "st1",
    date: "2026-10-28",
    label: "TRF-88213 CONSTRUCTORA ILLIMANI FAC 0118",
    partner: "Constructora Illimani",
    amount: 18_340.5,
  },
  {
    id: "st2",
    date: "2026-10-28",
    label: "QR DISTRIBUIDORA ANDINA",
    partner: "Distribuidora Andina S.R.L.",
    amount: 6_615.02,
  },
  {
    id: "st3",
    date: "2026-10-29",
    label: "ACH CLINICA SAN GABRIEL 0103 0115",
    partner: "Clínica San Gabriel S.A.",
    amount: 6_576.6,
  },
  {
    id: "st4",
    date: "2026-10-30",
    label: "PAGO PROVEEDOR FERRETERIA EL PROGRESO",
    partner: "Ferretería El Progreso",
    amount: -4_210,
  },
  {
    id: "st5",
    date: "2026-10-31",
    label: "COMISION MANTENIMIENTO CUENTA",
    partner: null,
    amount: -35,
  },
];

export const OPEN_ITEMS: readonly JournalItem[] = [
  {
    id: "ji1",
    move: "FAC/2026/0118",
    partner: "Constructora Illimani",
    date: "2026-10-02",
    account: "1121 Clientes",
    residual: 18_340.5,
  },
  {
    id: "ji2",
    move: "FAC/2026/0107",
    partner: "Distribuidora Andina S.R.L.",
    date: "2026-09-21",
    account: "1121 Clientes",
    residual: 6_615.02,
  },
  {
    id: "ji3",
    move: "FAC/2026/0103",
    partner: "Clínica San Gabriel S.A.",
    date: "2026-09-12",
    account: "1121 Clientes",
    residual: 1_898.4,
  },
  {
    id: "ji4",
    move: "FAC/2026/0115",
    partner: "Clínica San Gabriel S.A.",
    date: "2026-09-29",
    account: "1121 Clientes",
    residual: 4_678.2,
  },
  {
    id: "ji5",
    move: "FAC-P/2026/0044",
    partner: "Ferretería El Progreso",
    date: "2026-10-11",
    account: "2111 Proveedores",
    residual: -4_210,
  },
  {
    id: "ji6",
    move: "FAC/2026/0111",
    partner: "Panadería Doña Julia",
    date: "2026-09-25",
    account: "1121 Clientes",
    residual: 1_898.4,
  },
];

export const bs = (v: number) =>
  `Bs. ${v.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
