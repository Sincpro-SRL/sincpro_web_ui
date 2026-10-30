/**
 * Context: a confirmed sale order and the records it leads to — its customer, the products of
 * its lines, each product's supplier — for the story that opens one from the other inside ONE
 * dialog (`Drill`). Small on purpose: three levels deep is the point, not the catalogue.
 */

export type DrillCustomer = {
  name: string;
  taxId: string;
  city: string;
  phone: string;
  debt: number;
  credit: number;
  limit: number;
};

export type DrillSupplier = {
  id: string;
  name: string;
  taxId: string;
  city: string;
  leadDays: number;
  /** What it sells us, at what price. */
  prices: readonly { id: string; product: string; minimum: number; price: number }[];
};

export type DrillProduct = {
  name: string;
  sku: string;
  price: number;
  cost: number;
  onHand: number;
  supplier: string;
  category: string;
};

export type DrillLine = { id: string; product: string; quantity: number; price: number };

export const ORDER = {
  number: "S00142",
  date: "28/10/2026",
  balance: 17_940,
};

export const CUSTOMER: DrillCustomer = {
  name: "Ferretería Sur S.R.L.",
  taxId: "1023456027",
  city: "Santa Cruz",
  phone: "+591 3 345 6789",
  debt: 4_850,
  credit: 1_200,
  limit: 30_000,
};

export const SUPPLIERS: readonly DrillSupplier[] = [
  {
    id: "andina",
    name: "Distribuidora Andina S.R.L.",
    taxId: "2045678019",
    city: "La Paz",
    leadDays: 5,
    prices: [
      { id: "p1", product: "Impresora térmica de tickets 80 mm", minimum: 5, price: 980 },
      {
        id: "p2",
        product: "Lector de código de barras inalámbrico",
        minimum: 10,
        price: 410,
      },
      { id: "p3", product: "Rollo térmico 80 × 70 mm (caja de 50)", minimum: 20, price: 260 },
    ],
  },
  {
    id: "pacifico",
    name: "Importadora del Pacífico Ltda.",
    taxId: "3098761024",
    city: "Cochabamba",
    leadDays: 21,
    prices: [
      { id: "q1", product: "Cajón de dinero metálico", minimum: 4, price: 520 },
      { id: "q2", product: "Impresora térmica de tickets 80 mm", minimum: 20, price: 910 },
    ],
  },
];

export const PRODUCTS: readonly DrillProduct[] = [
  {
    name: "Impresora térmica de tickets 80 mm",
    sku: "HW-IMP-080",
    price: 1_450,
    cost: 980,
    onHand: 0,
    supplier: "andina",
    category: "Hardware · punto de venta",
  },
  {
    name: "Lector de código de barras inalámbrico",
    sku: "HW-LEC-200",
    price: 690,
    cost: 410,
    onHand: 34,
    supplier: "andina",
    category: "Hardware · punto de venta",
  },
  {
    name: "Cajón de dinero metálico",
    sku: "HW-CAJ-010",
    price: 850,
    cost: 520,
    onHand: 12,
    supplier: "pacifico",
    category: "Hardware · punto de venta",
  },
];

export const ORDER_LINES: readonly DrillLine[] = [
  { id: "l1", product: "Impresora térmica de tickets 80 mm", quantity: 6, price: 1_450 },
  { id: "l2", product: "Lector de código de barras inalámbrico", quantity: 6, price: 690 },
  { id: "l3", product: "Cajón de dinero metálico", quantity: 6, price: 850 },
];

export const PAYMENT_METHODS = [
  { value: "transfer", label: "Transferencia bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "qr", label: "QR simple" },
] as const;

export const bs = (v: number) =>
  `Bs. ${v.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
