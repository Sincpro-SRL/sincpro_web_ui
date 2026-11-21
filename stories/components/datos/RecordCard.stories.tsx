import { RecordCard, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Package } from "lucide-react";

import { money } from "../../support/erp";
import { PRODUCTS } from "../../support/erp-catalog";

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

/** **Las tres formas.** `card` en un tablero —el nombre en dos líneas antes que cortarlo, N
 *  datos, sus controles al pie—, `compact` para un pipeline de sesenta, `tile` para una
 *  grilla de productos: la foto arriba y se toca entera. Con cantidad en la esquina, elegida,
 *  agotada y con la franja de su estado. */
export const Formas: Story = {
  render: () => {
    const [first, second, third] = PRODUCTS;
    return (
      <div className="flex max-w-5xl flex-col gap-6">
        <div className="grid grid-cols-3 gap-3">
          <RecordCard
            title="Certificación ISO 9001 — Constructora Illimani"
            subtitle="Constructora Illimani S.A."
            figure="Bs. 45.500"
            fields={[
              { label: "Cierre", value: "30/11/2026" },
              { label: "Probabilidad", value: "60 %" },
              { label: "Fuente", value: "Referido" },
            ]}
            onOpen={() => {}}
          />
          <RecordCard
            title="Soporte Odoo — plan anual"
            subtitle="Ferretería El Progreso"
            figure="Bs. 21.600"
            tone="bad"
            meta="Actividad vencida hace 3 días"
            onOpen={() => {}}
          />
          <RecordCard
            title="Portal de pedidos B2B"
            subtitle="Distribuidora Andina S.R.L."
            figure="Bs. 78.400"
            selected
            onOpen={() => {}}
          />
        </div>
        <div className="grid max-w-md grid-cols-1 gap-1.5">
          <RecordCard
            layout="compact"
            title="Migración a Odoo 18"
            figure="Bs. 18.900"
            meta="Panadería Doña Julia · 21/10"
            onOpen={() => {}}
          />
          <RecordCard
            layout="compact"
            title="Asistente IA conectado al ERP"
            figure="Bs. 132.000"
            meta="Importadora del Oriente · 28/10"
            tone="warn"
            onOpen={() => {}}
          />
        </div>
        <div className="grid max-w-2xl grid-cols-3 gap-3">
          {[first!, second!, third!].map((p, at) => (
            <RecordCard
              key={p.id}
              layout="tile"
              title={p.name}
              figure={money(p.price)}
              meta={p.stock > 0 ? `${p.stock} en stock` : "Sin stock"}
              media={
                p.photo === undefined ? { icon: Package } : { src: p.photo, alt: p.name }
              }
              {...(at === 2 ? { badge: 2 } : {})}
              disabled={p.stock === 0}
              onOpen={() => {}}
            />
          ))}
        </div>
      </div>
    );
  },
};
