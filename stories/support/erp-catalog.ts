/**
 * Context: the product catalogue of the stories — the rows that need a picture, a description
 * and a code to be told apart. The photos are small inline SVGs (a tinted tile with a shape),
 * so the stories render offline and the smoke test never waits on the network.
 */

function photo(hue: number, shape: "box" | "circle" | "bars"): string {
  const fill = `hsl(${hue} 45% 52%)`;
  const bg = `hsl(${hue} 40% 92%)`;
  const body =
    shape === "box"
      ? `<rect x="14" y="16" width="36" height="32" rx="4" fill="${fill}"/>`
      : shape === "circle"
        ? `<circle cx="32" cy="32" r="16" fill="${fill}"/>`
        : `<rect x="14" y="30" width="8" height="18" fill="${fill}"/><rect x="28" y="22" width="8" height="26" fill="${fill}"/><rect x="42" y="14" width="8" height="34" fill="${fill}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  photo?: string;
};

export const PRODUCTS: readonly Product[] = [
  {
    id: "P1",
    name: "Implementación Odoo — módulo de ventas",
    description: "Configuración, migración de clientes y capacitación de dos jornadas",
    sku: "SRV-IMP-VTA",
    category: "Servicios",
    price: 12500,
    stock: 0,
  },
  {
    id: "P2",
    name: "Soporte mensual (plan estándar)",
    description: "Hasta 20 tickets al mes, respuesta en 8 horas hábiles",
    sku: "SRV-SOP-STD",
    category: "Servicios",
    price: 1800,
    stock: 0,
  },
  {
    id: "P3",
    name: "Impresora térmica de tickets 80 mm",
    description:
      "USB y red, corte automático, compatible con facturación electrónica del SIAT",
    sku: "HW-IMP-T80",
    category: "Equipos",
    price: 1450,
    stock: 14,
    photo: photo(210, "box"),
  },
  {
    id: "P4",
    name: "Lector de código de barras inalámbrico",
    description: "2D, alcance 30 m, base de carga",
    sku: "HW-LEC-2D",
    category: "Equipos",
    price: 780,
    stock: 3,
    photo: photo(150, "bars"),
  },
  {
    id: "P5",
    name: "Rollo de papel térmico 80×80 (caja de 50)",
    description: "Papel libre de BPA",
    sku: "INS-PAP-8080",
    category: "Insumos",
    price: 420,
    stock: 120,
    photo: photo(35, "circle"),
  },
  {
    id: "P6",
    name: "Licencia de usuario adicional",
    description: "Por usuario y mes",
    sku: "LIC-USR",
    category: "Licencias",
    price: 350,
    stock: 0,
  },
];
