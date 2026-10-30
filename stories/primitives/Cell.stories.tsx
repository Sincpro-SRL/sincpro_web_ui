import { CellStack, type DataColumn, DataTable, Tag, Thumb } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeyRound, Package, Wrench } from "lucide-react";

import { money } from "../support/erp";
import { type Product, PRODUCTS } from "../support/erp-catalog";

/**
 * Context: **una celda con jerarquía.** Una fila de ERP casi nunca es una sola cosa: un producto
 * es su nombre Y su descripción Y su código. `CellStack` los pone en dos líneas —lo que la fila
 * ES, en tinta; lo que la distingue, chico y callado— con la foto a la izquierda cuando la hay.
 * Va en el `cell` de una columna, en una fila de lista o en una tarjeta.
 */
const meta: Meta = {
  title: "2 · Primitivas/Celdas · widgets con jerarquía",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const ICON = { Servicios: Wrench, Licencias: KeyRound } as const;

const COLUMNS: readonly DataColumn<Product>[] = [
  {
    id: "product",
    header: "Producto",
    value: (p) => p.name,
    text: (p) => `${p.name} — ${p.description}`,
    cell: (p) => (
      <CellStack
        primary={p.name}
        secondary={`${p.description} · ${p.sku}`}
        media={
          p.photo === undefined
            ? { icon: ICON[p.category as keyof typeof ICON] ?? Package }
            : { src: p.photo, alt: p.name }
        }
      />
    ),
  },
  {
    id: "category",
    header: "Categoría",
    value: (p) => p.category,
    cell: (p) => <Tag>{p.category}</Tag>,
  },
  {
    id: "stock",
    header: "Stock",
    value: (p) => p.stock,
    numeric: true,
    tone: (p) => (p.category === "Equipos" && p.stock < 5 ? "warn" : undefined),
    note: (p) => (p.category === "Equipos" && p.stock < 5 ? "Quedan menos de 5" : undefined),
  },
  {
    id: "price",
    header: "Precio",
    value: (p) => p.price,
    numeric: true,
    cell: (p) => money(p.price),
  },
];

/** **El catálogo.** Foto cuando la hay, el ícono de su categoría cuando no — en el mismo lugar
 *  y del mismo tamaño, así la columna sigue alineada. */
export const Catalogo: Story = {
  render: () => (
    <div className="rounded-box border border-line bg-surface">
      <DataTable data={PRODUCTS} columns={COLUMNS} getRowId={(p) => p.id} />
    </div>
  ),
};

/** **La descripción larga, en dos líneas.** `wrap` deja que la segunda línea baje en vez de
 *  cortarse — para una descripción; un código se corta. */
export const DescripcionLarga: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4 rounded-box border border-line bg-surface p-4">
      {PRODUCTS.slice(2, 5).map((p) => (
        <CellStack
          key={p.id}
          primary={p.name}
          secondary={p.description}
          wrap
          {...(p.photo === undefined ? {} : { media: { src: p.photo, alt: p.name } })}
        />
      ))}
    </div>
  ),
};

/** **Las miniaturas.** Tres tamaños: fila densa, tabla y tarjeta. */
export const Miniaturas: Story = {
  render: () => (
    <div className="flex items-end gap-4 rounded-box border border-line bg-surface p-4">
      <Thumb size="sm" src={PRODUCTS[2]!.photo!} alt={PRODUCTS[2]!.name} />
      <Thumb size="md" src={PRODUCTS[2]!.photo!} alt={PRODUCTS[2]!.name} />
      <Thumb size="lg" src={PRODUCTS[2]!.photo!} alt={PRODUCTS[2]!.name} />
      <Thumb size="lg" icon={Wrench} />
    </div>
  ),
};
