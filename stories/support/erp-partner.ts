/**
 * Context: one contact of the sales module — Odoo's `res.partner` — with every kind of datum
 * a contact card carries that is not plain text: an address to write to, a phone with
 * WhatsApp, a website, a NIT and a bank account with a fixed shape, a credit limit in a
 * currency that is chosen, a colour on the board, the hours of attention and a card on file.
 * Same company as `erp.ts` (Clínica San Gabriel, NIT 1020304050 there; here written the way
 * the tax office prints it).
 */

export type Partner = {
  name: string;
  kind: string;
  email: string;
  phone: string;
  website: string;
  /** The characters only — the control draws the separators. */
  nit: string;
  bankAccount: string;
  creditLimit: number | "";
  currency: string;
  /** The colour of its card on the board. */
  color: string;
  /** Hours, as a timesheet sums them: 8.5 is «8:30». */
  hoursPerDay: number | "";
  responseTime: number | "";
  cardNumber: string;
  cardExpiry: string;
  cardCode: string;
};

export const PARTNER: Partner = {
  name: "Clínica San Gabriel S.A.",
  kind: "Empresa · cliente desde 2021",
  email: "compras@sangabriel.bo",
  phone: "+591 71 553 210",
  website: "https://www.sangabriel.bo",
  nit: "10203045",
  bankAccount: "105012345678",
  creditLimit: 85_000,
  currency: "BOB",
  color: "#2E7D32",
  hoursPerDay: 8.5,
  responseTime: 4,
  cardNumber: "4242424242424242",
  cardExpiry: "0928",
  cardCode: "123",
};

export const PARTNER_CURRENCIES = [
  { id: "BOB", label: "Bs" },
  { id: "USD", label: "USD" },
] as const;

/** The board's palette: the colours a card can take. */
export const BOARD_COLORS: readonly string[] = [
  "#1F6FEB",
  "#2E7D32",
  "#B26A00",
  "#C62828",
  "#6A1B9A",
  "#455A64",
];

/** How many fields differ between two versions of the contact — «3 cambios sin guardar». */
export function changedFields(now: Partner, saved: Partner): (keyof Partner)[] {
  return (Object.keys(now) as (keyof Partner)[]).filter((key) => now[key] !== saved[key]);
}
