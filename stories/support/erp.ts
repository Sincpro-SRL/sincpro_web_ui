/**
 * Context: the data of the templates — a sales module of an ERP, the most common screen of
 * the most common business software. It is invented but it is NOT generic: real customer
 * names, real states, totals that add up. A template that shows "Item 1, Item 2" proves the
 * layout and hides every problem a real record brings (a long name, a zero, an overdue
 * date).
 */

export type InvoiceState = "draft" | "posted" | "paid" | "overdue" | "cancelled";

export type InvoiceLine = {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  taxId: string;
  date: string;
  due: string;
  state: InvoiceState;
  salesperson: string;
  lines: readonly InvoiceLine[];
};

export const STATE_LABEL: Record<InvoiceState, string> = {
  draft: "Borrador",
  posted: "Publicada",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Anulada",
};

export const STATE_TONE = {
  draft: "neutral",
  posted: "info",
  paid: "good",
  overdue: "bad",
  cancelled: "neutral",
} as const satisfies Record<InvoiceState, string>;

/** The life of an invoice, in order — the status bar of the record. */
export const STAGES = [
  { id: "draft", label: "Borrador" },
  { id: "posted", label: "Publicada" },
  { id: "paid", label: "Pagada" },
] as const;

export function lineTotal(line: InvoiceLine): number {
  return line.quantity * line.unitPrice * (1 - line.discount / 100);
}

export function subtotalOf(invoice: Invoice): number {
  return invoice.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

/** IVA in Bolivia: 13 %, included in the price — shown apart because the fiscal invoice
 *  asks for it, not because it is added on top. */
export const TAX_RATE = 0.13;

export function taxOf(invoice: Invoice): number {
  return subtotalOf(invoice) * TAX_RATE;
}

const CUSTOMERS = [
  { name: "Distribuidora Andina S.R.L.", taxId: "1028457021" },
  { name: "Ferretería El Progreso", taxId: "4587123018" },
  { name: "Clínica San Gabriel S.A.", taxId: "1020304050" },
  { name: "Importadora y Exportadora del Oriente Boliviano Ltda.", taxId: "3214569870" },
  { name: "Panadería Doña Julia", taxId: "7896541230" },
  { name: "Constructora Illimani", taxId: "1597534862" },
] as const;

const PRODUCTS = [
  { name: "Implementación Odoo — módulo de ventas", price: 12500 },
  { name: "Soporte mensual (plan estándar)", price: 1800 },
  { name: "Licencia de usuario adicional", price: 350 },
  { name: "Capacitación presencial (por hora)", price: 420 },
  { name: "Consultoría ISO 9001 — diagnóstico", price: 6400 },
  { name: "Desarrollo a medida (por hora)", price: 280 },
] as const;

const SALESPEOPLE = ["Andrés Gutiérrez", "Josefa Muñoz", "Carla Rojas"] as const;
const STATES: readonly InvoiceState[] = [
  "paid",
  "posted",
  "overdue",
  "paid",
  "draft",
  "posted",
  "paid",
  "cancelled",
];

function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length]!;
}

function day(offset: number): string {
  const d = new Date(Date.UTC(2026, 9, 28));
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Thirty-two invoices: enough to page, to group and to find a long name in the middle. */
export const INVOICES: readonly Invoice[] = Array.from({ length: 32 }, (_, i) => {
  const customer = pick(CUSTOMERS, i * 5 + 1);
  const lines = Array.from({ length: 1 + (Math.floor(i / 2) % 4) }, (_, j) => {
    const product = pick(PRODUCTS, i + j * 2);
    return {
      id: `L${i}-${j}`,
      product: product.name,
      quantity: 1 + ((i + j) % 6),
      unitPrice: product.price,
      discount: j === 1 ? 10 : 0,
    };
  });
  return {
    id: `INV${i}`,
    number: `FAC/2026/${String(120 - i).padStart(4, "0")}`,
    customer: customer.name,
    taxId: customer.taxId,
    date: day(-i * 3),
    due: day(-i * 3 + 30),
    state: pick(STATES, i),
    salesperson: pick(SALESPEOPLE, i),
    lines,
  };
});

export const CUSTOMER_OPTIONS = CUSTOMERS.map((c) => ({ value: c.taxId, label: c.name }));
export const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);
export const SALESPERSON_OPTIONS = SALESPEOPLE.map((s) => ({ value: s, label: s }));

export function money(value: number): string {
  return `Bs. ${value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** What tells two products apart on an invoice line: the description and the code. */
export const PRODUCT_DETAIL: Readonly<Record<string, { description: string; sku: string }>> =
  {
    "Implementación Odoo — módulo de ventas": {
      description: "Configuración, migración de clientes y capacitación",
      sku: "SRV-IMP-VTA",
    },
    "Soporte mensual (plan estándar)": {
      description: "Hasta 20 tickets al mes, respuesta en 8 horas hábiles",
      sku: "SRV-SOP-STD",
    },
    "Licencia de usuario adicional": { description: "Por usuario y mes", sku: "LIC-USR" },
    "Capacitación presencial (por hora)": {
      description: "En las oficinas del cliente, grupos de hasta 8 personas",
      sku: "SRV-CAP-H",
    },
    "Consultoría ISO 9001 — diagnóstico": {
      description: "Brecha contra la norma e informe de hallazgos",
      sku: "SRV-ISO-DIAG",
    },
    "Desarrollo a medida (por hora)": {
      description: "Análisis, desarrollo y pruebas",
      sku: "SRV-DEV-H",
    },
  };
