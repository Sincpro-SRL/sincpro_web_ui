/**
 * Context: the people and the related records of the stories — the salespeople with the ways
 * to reach them, and the customers with the summary an invoice shows of them. Same names as
 * `erp.ts`, so the template and the primitive stories talk about the same company. The photo
 * is an inline SVG, so the stories render offline.
 */

import { CUSTOMER_OPTIONS } from "./erp";

function portrait(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 35% 86%)"/><circle cx="32" cy="25" r="12" fill="hsl(${hue} 30% 45%)"/><path d="M10 64c2-14 11-21 22-21s20 7 22 21z" fill="hsl(${hue} 30% 45%)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type Salesperson = {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photo?: string;
  open: number;
  amount: number;
};

/** The team of the sales module. One without a phone, one with a photo, one with a long
 *  role — what a real team brings. */
export const SALES_TEAM: readonly Salesperson[] = [
  {
    name: "Andrés Gutiérrez",
    role: "Jefe de ventas · Oficina central La Paz",
    email: "andres.gutierrez@sincpro.com.bo",
    phone: "+591 2 241-5530",
    whatsapp: "+591 71 234 567",
    open: 12,
    amount: 184_320.5,
  },
  {
    name: "Josefa Muñoz",
    role: "Vendedora · Sucursal La Paz",
    email: "josefa.munoz@sincpro.com.bo",
    phone: "+591 72 045-118",
    whatsapp: "+591 72 045 118",
    photo: portrait(18),
    open: 7,
    amount: 96_410,
  },
  {
    name: "Carla Rojas",
    role: "Ejecutiva de cuentas corporativas · Sucursal Santa Cruz de la Sierra",
    email: "carla.rojas@sincpro.com.bo",
    open: 0,
    amount: 0,
  },
];

export function salesperson(name: string): Salesperson | undefined {
  return SALES_TEAM.find((s) => s.name === name);
}

export type CustomerCard = {
  name: string;
  taxId: string;
  city: string;
  debt: string;
  credit: string;
  phone: string;
  state: { label: string; tone: "good" | "bad" | "warn" | "neutral" };
};

const CITIES = ["La Paz", "Cochabamba", "Santa Cruz", "Santa Cruz", "El Alto", "La Paz"];
const DEBTS = [
  "Bs. 0,00",
  "Bs. 18.650,00",
  "Bs. 4.200,00",
  "Bs. 64.320,50",
  "Bs. 0,00",
  "Bs. 920,00",
];
const STATES: readonly CustomerCard["state"][] = [
  { label: "al día", tone: "good" },
  { label: "con deuda vencida", tone: "bad" },
  { label: "por cobrar", tone: "warn" },
  { label: "con deuda vencida", tone: "bad" },
  { label: "al día", tone: "good" },
  { label: "por cobrar", tone: "warn" },
];

/** The customers of `erp.ts`, with what an invoice's summary of them says. */
export const CUSTOMER_CARDS: readonly CustomerCard[] = CUSTOMER_OPTIONS.map((c, i) => ({
  name: c.label,
  taxId: c.value,
  city: CITIES[i] ?? "La Paz",
  debt: DEBTS[i] ?? "Bs. 0,00",
  credit: `Bs. ${(20_000 + i * 15_000).toLocaleString("es-BO")},00`,
  phone: `+591 2 2${String(40 + i)}-${String(1000 + i * 137)}`,
  state: STATES[i] ?? { label: "al día", tone: "good" },
}));

export function customerCard(taxId: string): CustomerCard | undefined {
  return CUSTOMER_CARDS.find((c) => c.taxId === taxId);
}
