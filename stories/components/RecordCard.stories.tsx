import { RecordCard, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Package } from "lucide-react";

import { money } from "../support/erp";
import { PRODUCTS } from "../support/erp-catalog";

/**
 * Context: **un registro como tarjeta** — la cara de tablero de una lista. El estado primero,
 * el nombre como punto de entrada, la cifra a la derecha y los datos que distinguen dos
 * tarjetas abajo, en el tamaño callado. Con foto, se reconoce antes de leer.
 */
const meta: Meta = {
  title: "3 · Componentes/Datos/Tarjeta de registro",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **El tablero de productos.** Foto cuando la hay, el ícono cuando no; se abren con clic o
 *  con Enter. */
export const Productos: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-3 gap-3">
      {PRODUCTS.map((p) => (
        <RecordCard
          key={p.id}
          title={p.name}
          tags={<Tag tone={p.stock > 0 ? "good" : "neutral"}>{p.category}</Tag>}
          meta={`${p.sku} · stock ${p.stock}`}
          figure={money(p.price)}
          media={p.photo === undefined ? { icon: Package } : { src: p.photo, alt: p.name }}
          onOpen={() => {}}
        />
      ))}
    </div>
  ),
};
