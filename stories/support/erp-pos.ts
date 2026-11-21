/**
 * Context: a café's counter — the menu a till sells, the orders its kitchen prepares, the
 * catalogue its online shop shows. Example domain for `5 · Plantillas/Mostrador/*`; the package
 * knows none of this. The photos are inline SVGs (a tinted tile with a shape), so the stories
 * render offline and the smoke test never waits on the network.
 */

function photo(hue: number, shape: "cup" | "round" | "bar" | "glass"): string {
  const fill = `hsl(${hue} 45% 48%)`;
  const bg = `hsl(${hue} 42% 90%)`;
  /* A 4:3 tile — the shape of `--aspect-tile`. */
  const body =
    shape === "cup"
      ? `<rect x="20" y="14" width="22" height="22" rx="4" fill="${fill}"/><rect x="42" y="19" width="6" height="11" rx="3" fill="none" stroke="${fill}" stroke-width="3"/>`
      : shape === "round"
        ? `<ellipse cx="32" cy="26" rx="18" ry="11" fill="${fill}"/>`
        : shape === "bar"
          ? `<rect x="14" y="17" width="36" height="16" rx="5" fill="${fill}"/>`
          : `<path d="M23 10 h18 l-3 28 h-12 z" fill="${fill}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48"><rect width="64" height="48" fill="${bg}"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type MenuCategory = "cafe" | "bebidas" | "salteñas" | "dulces" | "sandwiches";

export const CATEGORIES: readonly { id: MenuCategory; label: string }[] = [
  { id: "cafe", label: "Café" },
  { id: "bebidas", label: "Bebidas" },
  { id: "salteñas", label: "Salteñas" },
  { id: "sandwiches", label: "Sándwiches" },
  { id: "dulces", label: "Dulces" },
];

export type MenuItem = {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  /** Units left today; `0` = sold out (shown, not sold). */
  stock: number;
  photo: string;
  /** What the shop says about it. */
  description: string;
  /** A price before a discount — the shop shows it struck through. */
  before?: number;
};

export const MENU: readonly MenuItem[] = [
  {
    id: "m1",
    name: "Café americano",
    category: "cafe",
    price: 15,
    stock: 99,
    photo: photo(28, "cup"),
    description: "Grano de los Yungas, tostado medio.",
  },
  {
    id: "m2",
    name: "Capuchino",
    category: "cafe",
    price: 20,
    stock: 99,
    photo: photo(30, "cup"),
    description: "Doble espresso con leche espumada.",
  },
  {
    id: "m3",
    name: "Latte de vainilla",
    category: "cafe",
    price: 22,
    stock: 99,
    photo: photo(38, "cup"),
    description: "Con jarabe de vainilla de la casa.",
    before: 26,
  },
  {
    id: "m4",
    name: "Mocaccino",
    category: "cafe",
    price: 23,
    stock: 0,
    photo: photo(20, "cup"),
    description: "Espresso, cacao del Beni y leche.",
  },
  {
    id: "m5",
    name: "Api morado con pastel",
    category: "bebidas",
    price: 18,
    stock: 24,
    photo: photo(285, "glass"),
    description: "Maíz morado, canela y clavo; el pastel recién frito.",
  },
  {
    id: "m6",
    name: "Jugo de papaya",
    category: "bebidas",
    price: 16,
    stock: 12,
    photo: photo(32, "glass"),
    description: "Natural, sin azúcar agregada.",
  },
  {
    id: "m7",
    name: "Mate de coca",
    category: "bebidas",
    price: 8,
    stock: 99,
    photo: photo(110, "cup"),
    description: "Para la altura.",
  },
  {
    id: "m8",
    name: "Limonada",
    category: "bebidas",
    price: 14,
    stock: 30,
    photo: photo(70, "glass"),
    description: "Con hierbabuena.",
    before: 16,
  },
  {
    id: "m9",
    name: "Salteña de pollo",
    category: "salteñas",
    price: 12,
    stock: 40,
    photo: photo(36, "round"),
    description: "Jugosa, horneada esta mañana.",
  },
  {
    id: "m10",
    name: "Salteña de carne",
    category: "salteñas",
    price: 12,
    stock: 3,
    photo: photo(18, "round"),
    description: "La clásica paceña.",
  },
  {
    id: "m11",
    name: "Salteña vegetariana",
    category: "salteñas",
    price: 11,
    stock: 0,
    photo: photo(95, "round"),
    description: "Queso, choclo y arvejas.",
  },
  {
    id: "m12",
    name: "Sándwich de chola",
    category: "sandwiches",
    price: 25,
    stock: 15,
    photo: photo(24, "bar"),
    description: "Chancho al horno, escabeche y quirquiña.",
  },
  {
    id: "m13",
    name: "Sándwich de palta y queso",
    category: "sandwiches",
    price: 21,
    stock: 9,
    photo: photo(90, "bar"),
    description: "En pan de molde integral.",
  },
  {
    id: "m14",
    name: "Cuñapé (3 u.)",
    category: "dulces",
    price: 10,
    stock: 50,
    photo: photo(48, "round"),
    description: "De almidón de yuca, del oriente.",
  },
  {
    id: "m15",
    name: "Torta de chocolate",
    category: "dulces",
    price: 18,
    stock: 6,
    photo: photo(15, "bar"),
    description: "Porción, con cacao del Alto Beni.",
  },
  {
    id: "m16",
    name: "Alfajor de maicena",
    category: "dulces",
    price: 7,
    stock: 30,
    photo: photo(42, "round"),
    description: "Con dulce de leche.",
  },
];

/** «Bs 1.250,50» — the till's money, written the Bolivian way. */
export function bs(value: number): string {
  return `Bs ${value.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** One line of a ticket: an item and how many. */
export type TicketLine = {
  id: string;
  item: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
};

export function lineAmount(line: TicketLine): number {
  return Math.round(line.quantity * line.price * (1 - line.discount / 100) * 100) / 100;
}

/* ---------------------------------------------------------------- *
 *  The kitchen
 * ---------------------------------------------------------------- */

export type KitchenStage = "recibido" | "preparando" | "listo";

export const KITCHEN_STAGES: readonly {
  id: KitchenStage;
  label: string;
  tone: "info" | "warn" | "good";
}[] = [
  { id: "recibido", label: "Recibido", tone: "info" },
  { id: "preparando", label: "Preparando", tone: "warn" },
  { id: "listo", label: "Listo", tone: "good" },
];

export type KitchenOrder = {
  id: string;
  /** Where it goes: a table, a takeaway name, a delivery. */
  where: string;
  channel: "mesa" | "llevar" | "delivery" | "kiosco";
  stage: KitchenStage;
  /** Minutes ago it came in — the stories turn it into a date against the story's «now». */
  minutesAgo: number;
  lines: readonly { quantity: number; name: string; note?: string }[];
};

export const KITCHEN: readonly KitchenOrder[] = [
  {
    id: "K-0412",
    where: "Mesa 4",
    channel: "mesa",
    stage: "recibido",
    minutesAgo: 2,
    lines: [
      { quantity: 2, name: "Salteña de pollo" },
      { quantity: 1, name: "Api morado con pastel" },
    ],
  },
  {
    id: "K-0413",
    where: "Para llevar · Ana",
    channel: "llevar",
    stage: "recibido",
    minutesAgo: 6,
    lines: [{ quantity: 1, name: "Sándwich de chola", note: "sin cebolla" }],
  },
  {
    id: "K-0409",
    where: "Kiosco · 117",
    channel: "kiosco",
    stage: "preparando",
    minutesAgo: 11,
    lines: [
      { quantity: 2, name: "Capuchino" },
      { quantity: 3, name: "Cuñapé (3 u.)" },
    ],
  },
  {
    id: "K-0407",
    where: "Delivery · PedidosYa",
    channel: "delivery",
    stage: "preparando",
    minutesAgo: 17,
    lines: [
      { quantity: 4, name: "Salteña de carne" },
      { quantity: 2, name: "Jugo de papaya" },
    ],
  },
  {
    id: "K-0405",
    where: "Mesa 9",
    channel: "mesa",
    stage: "preparando",
    minutesAgo: 23,
    lines: [
      { quantity: 1, name: "Torta de chocolate" },
      { quantity: 2, name: "Latte de vainilla", note: "leche de almendra" },
    ],
  },
  {
    id: "K-0401",
    where: "Mesa 2",
    channel: "mesa",
    stage: "listo",
    minutesAgo: 26,
    lines: [{ quantity: 1, name: "Café americano" }],
  },
];

export const CHANNEL_LABEL: Record<KitchenOrder["channel"], string> = {
  mesa: "Mesa",
  llevar: "Para llevar",
  delivery: "Delivery",
  kiosco: "Kiosco",
};

/** The item's barcode — what a scanner types (and an Enter after it). */
export function codeOf(item: MenuItem): string {
  return `7771${item.id.slice(1).padStart(3, "0")}`;
}
