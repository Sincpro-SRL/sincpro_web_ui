import type { TagOption } from "@sincpro/web-ui";

import { money } from "./erp";

/**
 * Context: ONE invoice the size of a real one — what the «Factura completa» template is built
 * on. The simple invoice of the module (three lines, four facts) is the easy case; this one is
 * the case that breaks a system: fourteen lines read in three sections with notes between
 * them, ten fields per line of which a screen shows five, two taxes, a payment applied and
 * another pending, the journal entry it produced and the data of Bolivia's electronic
 * invoicing (SIAT). The figures add up: the totals, the journal and the payments are computed
 * from the lines, never typed.
 */

export type FullLine = {
  id: string;
  kind: "line" | "section" | "note";
  /** The product, or the text of a section or a note. */
  product: string;
  /** What the invoice says under the product — Odoo's line label. */
  label: string;
  sku: string;
  account: string;
  analytic: string;
  quantity: number;
  uom: string;
  price: number;
  discount: number;
  taxes: string[];
};

export const TAXES: readonly TagOption[] = [
  { value: "iva", label: "IVA 13 %" },
  { value: "it", label: "IT 3 %", tone: "info" },
  { value: "exento", label: "exento" },
];

export const ACCOUNTS = [
  "4.1.01 Ventas de equipos",
  "4.1.02 Servicios de implementación",
  "4.1.03 Servicios de soporte",
  "4.1.04 Licencias",
];

export const ANALYTIC = ["Proyecto POS · Clínica San Gabriel", "Soporte · contratos anuales"];

const line = (
  id: string,
  product: string,
  label: string,
  sku: string,
  quantity: number,
  price: number,
  {
    uom = "unidad",
    discount = 0,
    account = ACCOUNTS[0]!,
    analytic = ANALYTIC[0]!,
    taxes = ["iva", "it"],
  }: Partial<Pick<FullLine, "uom" | "discount" | "account" | "analytic" | "taxes">> = {},
): FullLine => ({
  id,
  kind: "line",
  product,
  label,
  sku,
  account,
  analytic,
  quantity,
  uom,
  price,
  discount,
  taxes,
});

const band = (id: string, kind: "section" | "note", text: string): FullLine => ({
  id,
  kind,
  product: text,
  label: "",
  sku: "",
  account: "",
  analytic: "",
  quantity: 0,
  uom: "",
  price: 0,
  discount: 0,
  taxes: [],
});

export const FULL_LINES: readonly FullLine[] = [
  band("s1", "section", "Equipos para tres puntos de venta"),
  line(
    "1",
    "Impresora térmica de tickets 80 mm",
    "USB y red, corte automático",
    "HW-IMP-T80",
    3,
    1450,
    { discount: 5 },
  ),
  line(
    "2",
    "Lector de código de barras inalámbrico",
    "2D, alcance 30 m",
    "HW-LEC-2D",
    3,
    780,
  ),
  line(
    "3",
    "Cajón de dinero con apertura automática",
    "Cinco billetes, ocho monedas",
    "HW-CAJ-01",
    3,
    690,
  ),
  line("4", "Pantalla táctil 15″ para caja", "Con soporte giratorio", "HW-PAN-15", 3, 2350, {
    discount: 5,
  }),
  line("5", "Terminal de pago con QR", "Compatible con QR Simple", "HW-POS-QR", 3, 980),
  band(
    "n1",
    "note",
    "Los equipos se entregan configurados y con un año de garantía en sucursal.",
  ),
  band("s2", "section", "Implementación"),
  line(
    "6",
    "Implementación Odoo — módulo de punto de venta",
    "Configuración y migración de productos",
    "SRV-IMP-POS",
    1,
    12500,
    { uom: "proyecto", account: ACCOUNTS[1]! },
  ),
  line("7", "Instalación en sucursal", "Por punto de venta", "SRV-INS-SUC", 3, 450, {
    uom: "visita",
    account: ACCOUNTS[1]!,
  }),
  line("8", "Capacitación presencial", "Grupos de hasta 8 personas", "SRV-CAP-H", 12, 420, {
    uom: "hora",
    account: ACCOUNTS[1]!,
  }),
  line(
    "9",
    "Migración de saldos de inventario",
    "Desde planillas del cliente",
    "SRV-MIG-INV",
    1,
    3200,
    { uom: "proyecto", account: ACCOUNTS[1]! },
  ),
  band("s3", "section", "Soporte y licencias"),
  line(
    "10",
    "Soporte mensual (plan estándar)",
    "Hasta 20 tickets al mes",
    "SRV-SOP-STD",
    12,
    1800,
    { uom: "mes", discount: 10, account: ACCOUNTS[2]!, analytic: ANALYTIC[1]! },
  ),
  line("11", "Licencia de usuario adicional", "Por usuario y mes", "LIC-USR", 36, 350, {
    uom: "usuario·mes",
    account: ACCOUNTS[3]!,
    analytic: ANALYTIC[1]!,
  }),
  line("12", "Respaldo en la nube", "100 GB, retención de 30 días", "SRV-BKP-100", 12, 260, {
    uom: "mes",
    account: ACCOUNTS[2]!,
    analytic: ANALYTIC[1]!,
  }),
  band(
    "n2",
    "note",
    "El soporte y las licencias se facturan desde la puesta en marcha (1/11/2026).",
  ),
  line("13", "Viáticos de instalación", "Traslado a Cochabamba", "SRV-VIA", 1, 1100, {
    uom: "viaje",
    account: ACCOUNTS[1]!,
    taxes: ["exento"],
  }),
  line("14", "Ajuste por redondeo de tarifas", "", "AJU-RED", 1, -40, {
    uom: "unidad",
    account: ACCOUNTS[1]!,
    taxes: ["exento"],
  }),
];

export const amountOf = (l: FullLine) =>
  l.kind === "line" ? l.quantity * l.price * (1 - l.discount / 100) : 0;

const sum = (ls: readonly FullLine[]) => ls.reduce((a, l) => a + amountOf(l), 0);

/** The figures of the invoice, from its lines. Prices include IVA (Bolivia), so IVA is
 *  13 % of the taxed amount and the base is the rest; IT is 3 % on the taxed amount. */
export function figuresOf(lines: readonly FullLine[]) {
  const total = sum(lines);
  const taxed = sum(lines.filter((l) => l.taxes.includes("iva")));
  const iva = taxed * 0.13;
  const it = sum(lines.filter((l) => l.taxes.includes("it"))) * 0.03;
  return { total, base: total - iva, iva, it };
}

export const subtotalOf = (ls: readonly FullLine[]) => money(sum(ls));

/** One payment applied, and the rest still due. */
export const PAYMENTS = [
  {
    id: "p1",
    date: "2026-10-20",
    amount: 30000,
    journal: "Banco BNB",
    reference: "TRF 88231904",
    method: "Transferencia",
  },
  {
    id: "p2",
    date: "2026-10-27",
    amount: 15000,
    journal: "Banco Unión",
    reference: "CHQ 004512",
    method: "Cheque",
  },
];

export const CREDIT_NOTE = { number: "NC/2026/0012", amount: 1200, date: "2026-10-02" };

/** The journal entry the invoice produced: one line per account and tax, debit = credit. */
export function journalOf(lines: readonly FullLine[]) {
  const f = figuresOf(lines);
  const byAccount = new Map<string, number>();
  for (const l of lines) {
    if (l.kind !== "line") continue;
    const share = l.taxes.includes("iva") ? amountOf(l) * 0.87 : amountOf(l);
    byAccount.set(l.account, (byAccount.get(l.account) ?? 0) + share);
  }
  return [
    {
      id: "j0",
      account: "1.1.03.01 Cuentas por cobrar clientes",
      label: "FAC/2026/0115",
      debit: f.total,
      credit: 0,
    },
    {
      id: "j1",
      account: "6.2.01 Impuesto a las transacciones",
      label: "IT 3 %",
      debit: f.it,
      credit: 0,
    },
    ...[...byAccount].map(([account, credit], i) => ({
      id: `j${i + 2}`,
      account,
      label: "Ventas",
      debit: 0,
      credit,
    })),
    {
      id: "jiva",
      account: "2.1.03.01 IVA débito fiscal",
      label: "IVA 13 %",
      debit: 0,
      credit: f.iva,
    },
    { id: "jit", account: "2.1.03.02 IT por pagar", label: "IT 3 %", debit: 0, credit: f.it },
  ];
}

/** Bolivia's electronic invoicing: what the tax authority (SIAT) answered. */
export const SIAT = {
  cuf: "46D3A1F8B2C70E5D9A4F1B6C3E8D2A7F5B0C9E1D4A6F8B3C",
  control: "7E-9A-1C-44-B0",
  modality: "Electrónica en línea",
  sector: "Compra-venta",
  legend:
    "Ley N° 453: El proveedor deberá suministrar el servicio en las modalidades y términos ofertados o convenidos.",
  received: "2026-10-13 10:42",
};
