/**
 * Context: the data of the form stories — a customer, a product, an invoice header, a
 * payment. Same rule as `erp.ts`: invented but not generic. Long names, an account code that
 * is a code, an option that cannot be chosen, a city with an accent — what a real form gets.
 */
import type { CheckItem, SelectOption } from "@sincpro/web-ui";

export const PAYMENT_TERMS: SelectOption[] = [
  { value: "contado", label: "Al contado" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "60", label: "60 días fin de mes" },
];

export const CURRENCIES: SelectOption[] = [
  { value: "BOB", label: "Bolivianos (Bs.)" },
  { value: "USD", label: "Dólares estadounidenses (USD)" },
];

export const WAREHOUSES: SelectOption[] = [
  { value: "LPZ", label: "Almacén central — La Paz" },
  { value: "SCZ", label: "Sucursal Santa Cruz" },
  /* Shown and not choosable: the branch exists but has no stock location yet. */
  { value: "CBB", label: "Sucursal Cochabamba (en apertura)", disabled: true },
];

export const PRODUCT_CATEGORIES: SelectOption[] = [
  { value: "servicios", label: "Servicios profesionales" },
  { value: "licencias", label: "Licencias de software" },
  { value: "insumos", label: "Insumos de oficina" },
];

export const CREDIT_NOTE_REASONS: SelectOption[] = [
  { value: "devolucion", label: "Devolución de mercadería" },
  { value: "descuento", label: "Descuento posterior a la venta" },
  { value: "error", label: "Error en el precio facturado" },
];

export const CUSTOMER_KINDS = [
  { value: "empresa", label: "Empresa" },
  { value: "persona", label: "Persona" },
];

export const PAYMENT_METHODS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "qr", label: "QR" },
  { value: "efectivo", label: "Efectivo" },
];

export const BANKS = [
  "Banco Mercantil Santa Cruz",
  "Banco Nacional de Bolivia",
  "Banco Unión",
  "Banco BISA",
  "Banco Económico",
  "Banco Ganadero",
];

export const UNITS = ["unidad", "caja x 12", "kg", "hora", "mes", "licencia"];

export const CITIES = [
  "La Paz",
  "El Alto",
  "Santa Cruz de la Sierra",
  "Cochabamba",
  "Sucre",
  "Potosí",
  "Tarija",
  "Oruro",
  "Trinidad",
  "Cobija",
];

/** Accounts of the chart: the code is the machine's, the name is the accountant's. */
export const CASH_ACCOUNTS: CheckItem[] = [
  { value: "1.1.1.01", label: "1.1.1.01", detail: "Caja moneda nacional" },
  { value: "1.1.1.02", label: "1.1.1.02", detail: "Caja moneda extranjera" },
  {
    value: "1.1.2.01",
    label: "1.1.2.01",
    detail: "Banco Mercantil Santa Cruz — cuenta corriente",
  },
  { value: "1.1.2.02", label: "1.1.2.02", detail: "Banco Unión — caja de ahorro" },
  {
    value: "1.1.2.09",
    label: "1.1.2.09",
    detail: "Banco Económico — cuenta cerrada en 2025",
    disabled: true,
  },
];

export const SALE_WAREHOUSES: CheckItem[] = [
  { value: "LPZ", label: "Almacén central — La Paz", detail: "1.240 u. disponibles" },
  { value: "SCZ", label: "Sucursal Santa Cruz", detail: "312 u. disponibles" },
  { value: "EAL", label: "Depósito El Alto", detail: "sin stock" },
];
