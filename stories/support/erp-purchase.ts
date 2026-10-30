/**
 * Context: the purchases side of the ERP — who the company buys from and on what terms —
 * for the dialogs and the wizard. Invented, but with what a real purchase brings: a local
 * supplier with a NIT and an import one without it, payment terms in days, the incoterm
 * that decides who pays the freight.
 */

export type PurchaseKind = "local" | "import";

export type Supplier = {
  id: string;
  name: string;
  /** The NIT for a Bolivian supplier; the foreign tax id otherwise. */
  taxId: string;
  city: string;
  kind: PurchaseKind;
};

export const SUPPLIERS: readonly Supplier[] = [
  {
    id: "S1",
    name: "Cerámica Santa Cruz S.A.",
    taxId: "1023456027",
    city: "Santa Cruz",
    kind: "local",
  },
  {
    id: "S2",
    name: "Papelería y Suministros de Oficina La Paz S.R.L.",
    taxId: "4561237019",
    city: "La Paz",
    kind: "local",
  },
  {
    id: "S3",
    name: "Ferretería Mayorista Quillacollo",
    taxId: "7412589630",
    city: "Cochabamba",
    kind: "local",
  },
  {
    id: "S4",
    name: "Ningbo Hardware Trading Co., Ltd.",
    taxId: "91330206MA2H",
    city: "Ningbo, China",
    kind: "import",
  },
  {
    id: "S5",
    name: "Aceros del Pacífico S.A.C.",
    taxId: "20512345678",
    city: "Lima, Perú",
    kind: "import",
  },
];

export const PURCHASE_KIND_OPTIONS = [
  { value: "local", label: "Compra local" },
  { value: "import", label: "Importación" },
];

export const PAYMENT_TERMS = [
  { value: "0", label: "Contado" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "60", label: "60 días" },
];

export const INCOTERMS = [
  { value: "EXW", label: "EXW — en fábrica", description: "Todo el flete lo pagás vos." },
  {
    value: "FOB",
    label: "FOB — libre a bordo",
    description: "El proveedor lo deja en el barco.",
  },
  {
    value: "CIF",
    label: "CIF — costo, seguro y flete",
    description: "Llega pagado hasta el puerto.",
  },
  {
    value: "DAP",
    label: "DAP — entregado en destino",
    description: "Llega a tu almacén, sin impuestos.",
  },
];

export const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

export const WAREHOUSES = [
  { value: "EA", label: "Almacén central — El Alto" },
  { value: "SC", label: "Sucursal Santa Cruz — Parque Industrial" },
  { value: "CB", label: "Sucursal Cochabamba" },
];

/** The reasons Impuestos Nacionales accepts for voiding an invoice. */
export const VOID_REASONS = [
  { value: "1", label: "Factura mal emitida" },
  { value: "2", label: "Nota de crédito-débito mal emitida" },
  { value: "3", label: "Datos de emisión incorrectos" },
  { value: "4", label: "Factura o nota de crédito-débito devuelta" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "qr", label: "QR" },
  { value: "check", label: "Cheque" },
];
