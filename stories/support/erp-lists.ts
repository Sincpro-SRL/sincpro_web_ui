import type { ReportColumn, ReportRow } from "@sincpro/web-ui";
import { FileText, type LucideIcon, Receipt, ShoppingCart } from "lucide-react";

import { money } from "./erp";

/**
 * Context: the data of the N-records stories — the list view, the tables, the pivot, the
 * report and the record built from them. Same rule as `erp.ts`: invented but not generic.
 * A list tried with three short rows looks fine and breaks in production, so these carry
 * what a real sales module carries: a customer name of sixty characters, an order worth
 * zero, a delivery that is late, a branch that did not exist last year.
 *
 * It lives apart from `erp.ts` because other stories read that file concurrently; what is
 * here is what the list, the record and the data components share.
 */

/* ==================================================================== *
 *  SALES ORDERS, with their deliveries hanging
 * ==================================================================== */

/** Where an order is in its life. Three, because a list that groups by it has to show
 *  more than one pile and fewer than a legend. */
export type OrderStage = "quotation" | "order" | "invoiced";

export type DeliveryState = "on_the_way" | "delivered" | "late";

/** A delivery hanging from its order. Not another order: it is not opened, chosen or
 *  acted on from the list — it says what happened to what was sold. */
export type Delivery = {
  id: string;
  state: DeliveryState;
  /** Percent of the units already loaded on the truck. */
  progress: number;
  units: number;
  /** ISO date: when it arrived, or when it was promised and did not. */
  date: string;
};

export type SalesOrder = {
  id: string;
  number: string;
  customer: string;
  taxId: string;
  date: string;
  salesperson: string;
  stage: OrderStage;
  lines: number;
  total: number;
  deliveries: Delivery[];
};

export const STAGE_ICON: Record<OrderStage, LucideIcon> = {
  quotation: FileText,
  order: ShoppingCart,
  invoiced: Receipt,
};

export const STAGE_TONE = { quotation: "neutral", order: "info", invoiced: "good" } as const;

export const STAGE_LABEL: Record<OrderStage, string> = {
  quotation: "cotización",
  order: "pedido",
  invoiced: "facturado",
};

/** The display name of an order: its number and who bought — the number alone is what
 *  the system knows, the customer is what a person looks for. */
export const orderName = (o: SalesOrder) => `${o.number} · ${o.customer}`;

export const orderMeta = (o: SalesOrder) =>
  `${o.lines} ${o.lines === 1 ? "línea" : "líneas"} · ${dayMonth(o.date)} · ${money(o.total)}`;

function dayMonth(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const SALES_ORDERS: SalesOrder[] = [
  {
    id: "o142",
    number: "S00142",
    customer: "Importadora y Exportadora del Oriente Boliviano Ltda.",
    taxId: "3214569870",
    date: "2026-10-28",
    salesperson: "Andrés Gutiérrez",
    stage: "order",
    lines: 4,
    total: 58000,
    deliveries: [
      {
        id: "WH/OUT/00231",
        state: "on_the_way",
        progress: 62,
        units: 40,
        date: "2026-10-30",
      },
    ],
  },
  {
    id: "o141",
    number: "S00141",
    customer: "Distribuidora Andina S.R.L.",
    taxId: "1028457021",
    date: "2026-10-27",
    salesperson: "Josefa Muñoz",
    stage: "order",
    lines: 2,
    total: 14300,
    deliveries: [
      {
        id: "WH/OUT/00229",
        state: "delivered",
        progress: 100,
        units: 12,
        date: "2026-10-24",
      },
      { id: "WH/OUT/00230", state: "late", progress: 0, units: 8, date: "2026-10-20" },
    ],
  },
  {
    id: "o140",
    number: "S00140",
    customer: "Ferretería El Progreso",
    taxId: "4587123018",
    date: "2026-10-26",
    salesperson: "Carla Rojas",
    stage: "quotation",
    lines: 1,
    total: 1800,
    deliveries: [],
  },
  {
    id: "o139",
    number: "S00139",
    customer: "Clínica San Gabriel S.A.",
    taxId: "1020304050",
    date: "2026-10-22",
    salesperson: "Andrés Gutiérrez",
    stage: "invoiced",
    lines: 3,
    total: 25620,
    deliveries: [
      { id: "WH/OUT/00221", state: "delivered", progress: 100, units: 6, date: "2026-10-23" },
    ],
  },
  {
    id: "o138",
    number: "S00138",
    customer: "Panadería Doña Julia",
    taxId: "7896541230",
    date: "2026-10-21",
    salesperson: "Josefa Muñoz",
    stage: "quotation",
    lines: 1,
    total: 350,
    deliveries: [],
  },
  {
    id: "o137",
    number: "S00137",
    customer: "Constructora Illimani",
    taxId: "1597534862",
    date: "2026-10-19",
    salesperson: "Carla Rojas",
    stage: "order",
    lines: 5,
    total: 112480.5,
    deliveries: [],
  },
  {
    id: "o136",
    number: "S00136",
    customer: "Importadora y Exportadora del Oriente Boliviano Ltda.",
    taxId: "3214569870",
    date: "2026-10-15",
    salesperson: "Andrés Gutiérrez",
    stage: "invoiced",
    lines: 2,
    total: 6400,
    deliveries: [],
  },
  {
    id: "o135",
    number: "S00135",
    customer: "Ferretería El Progreso",
    taxId: "4587123018",
    date: "2026-10-14",
    salesperson: "Josefa Muñoz",
    stage: "order",
    /* A sample sent at no charge: an order worth zero is real, and it has to read as
       a zero and not as a missing total. */
    lines: 1,
    total: 0,
    deliveries: [
      { id: "WH/OUT/00212", state: "delivered", progress: 100, units: 1, date: "2026-10-15" },
    ],
  },
  {
    id: "o134",
    number: "S00134",
    customer: "Clínica San Gabriel S.A.",
    taxId: "1020304050",
    date: "2026-10-10",
    salesperson: "Carla Rojas",
    stage: "quotation",
    lines: 2,
    total: 8760,
    deliveries: [],
  },
  {
    id: "o133",
    number: "S00133",
    customer: "Constructora Illimani",
    taxId: "1597534862",
    date: "2026-10-07",
    salesperson: "Andrés Gutiérrez",
    stage: "invoiced",
    lines: 6,
    total: 248900,
    deliveries: [],
  },
  {
    id: "o132",
    number: "S00132",
    customer: "Panadería Doña Julia",
    taxId: "7896541230",
    date: "2026-10-03",
    salesperson: "Josefa Muñoz",
    stage: "order",
    lines: 1,
    total: 420,
    deliveries: [
      { id: "WH/OUT/00198", state: "delivered", progress: 100, units: 3, date: "2026-10-04" },
    ],
  },
  {
    id: "o131",
    number: "S00131",
    customer: "Distribuidora Andina S.R.L.",
    taxId: "1028457021",
    date: "2026-10-01",
    salesperson: "Carla Rojas",
    stage: "invoiced",
    lines: 3,
    total: 19870,
    deliveries: [],
  },
];

/** What the whole set holds, beyond the page on screen. */
export const ORDER_COUNTERS = [
  { label: "cotizaciones", value: 64 },
  { label: "pedidos", value: 112 },
  { label: "facturados", value: 11 },
];

/** The life of a sales order — the status bar of its record. */
export const ORDER_STAGES = [
  { id: "draft", label: "cotización" },
  { id: "sent", label: "enviada" },
  { id: "sale", label: "pedido de venta" },
  { id: "invoiced", label: "facturado" },
];

/* ==================================================================== *
 *  THE HISTORY OF ONE ORDER: what the system logged and what people wrote
 * ==================================================================== */

export const ORDER_EVENTS = [
  {
    id: "e1",
    label: "se creó la cotización",
    at: "2026-10-20T09:12:00Z",
    by: "Andrés Gutiérrez",
    moved: { to: "cotización" },
    detail: "4 líneas · Bs. 58.000,00",
  },
  {
    id: "e2",
    label: "se envió por correo al cliente",
    at: "2026-10-20T11:40:00Z",
    tone: "info" as const,
    by: "Andrés Gutiérrez",
    moved: { from: "cotización", to: "enviada" },
  },
  {
    id: "e3",
    label: "el cliente confirmó el pedido",
    at: "2026-10-27T15:52:00Z",
    tone: "info" as const,
    by: "Josefa Muñoz",
    moved: { from: "enviada", to: "pedido de venta" },
    detail: "2 entregas programadas desde el almacén de El Alto",
  },
  {
    id: "e4",
    label: "la factura no se pudo emitir",
    at: "2026-10-28T08:02:00Z",
    tone: "bad" as const,
    error:
      "SIN · código 1037: el NIT 3214569870 no está habilitado para facturación electrónica en línea; emití la factura en modalidad fuera de línea o actualizá el padrón.",
  },
  {
    id: "e5",
    label: "salió la entrega WH/OUT/00231",
    at: "2026-10-29T10:15:00Z",
    tone: "good" as const,
    moved: { from: "preparada", to: "en camino" },
    detail: "25 de 40 unidades cargadas",
  },
];

export const ORDER_MESSAGES = [
  {
    id: "m1",
    author: "Andrés Gutiérrez",
    at: "2026-10-29T10:35:00Z",
    body: "La factura rebotó en el SIN por el NIT. ¿El cliente nos mandó el NIT nuevo de la sucursal de Montero o seguimos con el de la casa matriz?",
  },
  {
    id: "m2",
    author: "Josefa Muñoz",
    at: "2026-10-29T11:02:00Z",
    internal: true,
    body: "Seguimos con el de la casa matriz. Ya pedí que actualicen el padrón; mientras tanto la emito fuera de línea.",
  },
];

/* ==================================================================== *
 *  SALES BY BRANCH: what is looked at in a pivot
 *
 *  It lives here because TWO read it: the loose `PivotTable` and the list with
 *  `present="pivot"`. And they are a couple of hundred and not six on purpose — what a
 *  grid has to prove is that it stays readable with HOLES: five branches by eight
 *  quarters are forty crossings and not all of them exist, which is exactly the shape
 *  of a real pivot.
 *
 *  There are negatives (a return) and zeros (a quarter that opened and sold nothing),
 *  because the three are drawn differently and a data set with none of them shows none
 *  of that.
 * ==================================================================== */

export type Sale = {
  id: string;
  branch: string;
  year: string;
  quarter: string;
  payment: "contado" | "crédito";
  amount: number;
};

export const BRANCHES = ["La Paz", "Santa Cruz", "Cochabamba", "Tarija", "Oruro"];
const YEARS = ["2025", "2026"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const SALES: Sale[] = (() => {
  const out: Sale[] = [];
  let n = 0;
  BRANCHES.forEach((branch, s) =>
    YEARS.forEach((year, a) =>
      QUARTERS.forEach((quarter, t) => {
        /* The hole: Oruro did not open until 2026, and Tarija skips two quarters. A
           crossing that does not exist is NOT a crossing at zero. */
        if (branch === "Oruro" && year === "2025") return;
        if (branch === "Tarija" && (s + a + t) % 5 === 0) return;
        for (const payment of ["contado", "crédito"] as const) {
          n += 1;
          const base =
            ((s * 7 + a * 13 + t * 11) % 9) * 1250 + (payment === "contado" ? 900 : 0);
          out.push({
            id: `v${String(n)}`,
            branch,
            year,
            quarter,
            payment,
            /* Cochabamba opened in Q1 2026 and sold nothing: a true zero. And a return
               that leaves a quarter of Tarija negative. */
            amount:
              branch === "Cochabamba" && year === "2026" && quarter === "Q1"
                ? 0
                : branch === "Tarija" && year === "2026" && quarter === "Q3"
                  ? -base
                  : base,
          });
        }
      }),
    ),
  );
  return out;
})();

/* ==================================================================== *
 *  A REAL BALANCE SHEET
 *
 *  Read by TWO: the loose `ReportTable` and the list with `present="report"`. A
 *  three-line balance proves nothing — what has to be seen is whether forty lines with
 *  thirty zeros stay readable.
 * ==================================================================== */

export const BALANCE_COLUMNS: ReportColumn[] = [
  { id: "saldo", header: "Al 30/09/2026" },
  { id: "previo", header: "Al 30/09/2025" },
  {
    id: "var",
    header: "Variación",
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")} %`,
  },
];

const CASH: ReportRow[] = [
  {
    id: "b1",
    label: "1113014 Banco Unión Utilidades 1-45243289",
    level: 4,
    values: [0, 0, 0],
  },
  {
    id: "b2",
    label: "1113019 Banco Mercantil Santa Cruz 4071950356",
    level: 4,
    values: [2023.04, 1860.2, 8.8],
  },
  { id: "b3", label: "111302 Cuenta transitoria", level: 4, values: [2859.49, 0, null] },
  {
    id: "b4",
    label: "1113020 Banco Nacional de Bolivia 1000254781",
    level: 4,
    values: [186750.46, 92100.0, 102.8],
  },
  {
    id: "b5",
    label: "1113022 Banco Económico 3111445250",
    level: 4,
    values: [7361.5, 7361.5, 0],
  },
  {
    id: "b6",
    label: "111304 Transferencias entre cuentas propias",
    level: 4,
    values: [59020.82, 41200.11, 43.3],
  },
];

export const BALANCE_ROWS: ReportRow[] = [
  { id: "activos", label: "Activos", kind: "section", level: 0, values: [null, null, null] },
  {
    id: "ac",
    label: "Activos corrientes",
    kind: "group",
    level: 1,
    values: [null, null, null],
  },
  {
    id: "efectivo",
    label: "Efectivo y equivalentes de efectivo",
    kind: "group",
    level: 2,
    values: [258015.31, 142521.81, 81.0],
    note: "Caja, bancos y todo lo que se convierte en efectivo en menos de 90 días.",
    children: CASH,
  },
  {
    id: "cxc",
    label: "Cuentas por cobrar",
    kind: "group",
    level: 2,
    values: [96907.42, 88410.0, 9.6],
    children: [
      {
        id: "cxc1",
        label: "1121 Clientes nacionales",
        level: 4,
        values: [80112.4, 71200.0, 12.5],
      },
      {
        id: "cxc2",
        label: "1122 Clientes del exterior",
        level: 4,
        values: [16795.02, 17210.0, -2.4],
      },
    ],
  },
  { id: "inv", label: "Inventarios", level: 2, values: [0, 0, 0] },
  {
    id: "otros",
    label: "Otros activos corrientes",
    level: 2,
    values: [3227.87, 4100.0, -21.3],
  },
  {
    id: "tac",
    label: "Total activos corrientes",
    kind: "total",
    level: 1,
    values: [358150.6, 235031.81, 52.4],
  },

  {
    id: "anc",
    label: "Activos no corrientes",
    kind: "group",
    level: 1,
    values: [null, null, null],
  },
  { id: "cxclp", label: "Cuentas por cobrar a largo plazo", level: 2, values: [0, 0, 0] },
  {
    id: "ppe",
    label: "Propiedad, planta y equipo",
    level: 2,
    values: [4590.0, 5820.0, -21.1],
  },
  { id: "intang", label: "Activos intangibles", level: 2, values: [0, 0, 0] },
  {
    id: "tanc",
    label: "Total activos no corrientes",
    kind: "total",
    level: 1,
    values: [4590.0, 5820.0, -21.1],
  },
  {
    id: "ta",
    label: "Total activos",
    kind: "total",
    level: 0,
    values: [362740.6, 240851.81, 50.6],
  },

  { id: "pasivos", label: "Pasivos", kind: "section", level: 0, values: [null, null, null] },
  {
    id: "pc",
    label: "Pasivos corrientes",
    kind: "group",
    level: 1,
    values: [null, null, null],
  },
  { id: "oblig", label: "Obligaciones bancarias y financieras", level: 2, values: [0, 0, 0] },
  {
    id: "cxp",
    label: "Cuentas por pagar",
    kind: "group",
    level: 2,
    values: [699059.56, 512000.0, 36.5],
    children: [
      {
        id: "cxp1",
        label: "2111 Proveedores nacionales",
        level: 4,
        values: [612059.56, 460000.0, 33.1],
      },
      {
        id: "cxp2",
        label: "2112 Proveedores del exterior",
        level: 4,
        values: [87000.0, 52000.0, 67.3],
      },
    ],
  },
  {
    id: "socfis",
    label: "Obligaciones sociales y fiscales",
    level: 2,
    values: [-24863.54, 12400.0, -300.5],
    note: "Saldo a favor por el crédito fiscal IVA del período.",
  },
  { id: "prov", label: "Provisiones", level: 2, values: [0, 0, 0] },
  {
    id: "tpc",
    label: "Total pasivos corrientes",
    kind: "total",
    level: 1,
    values: [674196.02, 524400.0, 28.6],
  },
];

/* ==================================================================== *
 *  A RAW BANK STATEMENT, as the bank exported it
 *
 *  The columns come from the FILE and the code does not know them. Generated, not
 *  written, because what has to be seen is whether the grid keeps answering with the
 *  scroll at the bottom of forty thousand rows. `null` is a missing amount (the bank
 *  did not send it); `""` is an empty cell (a movement without a reference) — two
 *  different things, and the sheet tells them apart.
 * ==================================================================== */

/** Deterministic on purpose: a story that changes on every render is useless to compare
 *  two versions of a component. */
export function pseudo(row: number, col: number): number {
  return ((row * 2654435761 + col * 40503) >>> 0) / 4294967295;
}

export const BANK_BRANCHES = [
  "El Alto",
  "Equipetrol",
  "Cala Cala",
  "Sopocachi",
  "Tarija Centro",
];
export const BANK_CHANNELS = ["ventanilla", "banca móvil", "transferencia ACH", "QR simple"];

const MEMOS = [
  "DEP. EFECTIVO CLIENTE",
  "TRANSF. DISTRIBUIDORA ANDINA SRL",
  "PAGO QR FAC 0118",
  "COMISION MANTENIMIENTO CTA",
  "ITF 0,30 %",
  "PAGO PROVEEDOR CBN",
  "TRASPASO CTA PROPIA BNB",
];

/** The value of one cell of the statement, by column id. */
export function statementCell(row: number, column: string): string | number | null {
  const r = pseudo(row, column.length);
  switch (column) {
    case "n":
      return row + 1;
    case "fecha": {
      const day = 1 + (row % 31);
      return `2026-10-${String(day).padStart(2, "0")}`;
    }
    case "glosa":
      return MEMOS[row % MEMOS.length] ?? "";
    case "referencia":
      // An EMPTY cell every 53: a movement without a reference.
      return row % 53 === 0 ? "" : `TRX-${String((row * 7919) % 900000).padStart(6, "0")}`;
    case "agencia":
      return BANK_BRANCHES[row % BANK_BRANCHES.length] ?? null;
    case "canal":
      return BANK_CHANNELS[Math.floor(r * BANK_CHANNELS.length)] ?? null;
    case "debe":
      return row % 2 === 0 ? 0 : Math.round(r * 980000) / 100;
    case "haber":
      // A MISSING amount every 37: the bank did not send it.
      return row % 37 === 0 ? null : row % 2 === 0 ? Math.round(r * 1250000) / 100 : 0;
    default:
      return null;
  }
}

/* ==================================================================== *
 *  A SUPPLIER PRICE LIST, just imported — the cells of a payload
 * ==================================================================== */

export const PRICE_LIST_COLUMNS = ["código", "producto", "almacén", "stock", "costo"];

export const PRICE_LIST: readonly (string | number | null)[][] = [
  ["CEM-IP30-50", "Cemento IP-30 bolsa 50 kg", "El Alto", 1240, 58.5],
  ["FIE-CORR-12", "Fierro corrugado 12 mm × 12 m", "El Alto", 380, 96.0],
  ["LAD-6H-24", "Ladrillo 6 huecos 24 × 18 × 12", "Santa Cruz", 15200, 1.35],
  ["CAL-HID-25", "Cal hidratada bolsa 25 kg", "Cochabamba", 0, 32.0],
  ["CLV-2P-1K", "Clavo de 2 pulgadas (kilo)", "El Alto", 96, 18.4],
  ["TUB-PVC-4", "Tubo PVC sanitario 4 pulgadas × 6 m", "Santa Cruz", 214, null],
  ["PIN-LAT-18", "Pintura látex blanco hueso 18 L", "", 42, 310.0],
  ["ALA-GALV-16", "Alambre galvanizado N.º 16 (rollo 25 kg)", "Cochabamba", 18, 412.75],
  ["ARE-FIN-M3", "Arena fina (metro cúbico)", "El Alto", 60, 145.0],
  ["CER-PIS-45", "Cerámica de piso 45 × 45 beige (caja 2 m²)", "Santa Cruz", 530, 88.9],
  ["IMP-ASF-4", "Impermeabilizante asfáltico 4 L", "Cochabamba", 7, 126.0],
];
