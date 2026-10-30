import { type BuiltFilter, FilterBuilder, type ModelDefinition } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

/**
 * Context: **el filtro a medida.** Los recortes con nombre —«vencidas», «por cobrar»— son
 * las preguntas que alguien ya pensó; esto es para las demás. Los campos y los operadores
 * salen de la definición del modelo que manda el servidor: un monto ofrece «>», un estado
 * ofrece sus valores, una fecha ofrece «antes de». Nada está escrito a mano.
 */
const meta: Meta = {
  title: "3 · Componentes/Búsqueda · filtro a medida",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const FACTURA: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    number: { type: "string", nullable: false, sortable: true, ops: ["=", "like"] },
    customer: { type: "string", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    amount_total: {
      type: "decimal",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", ">", ">=", "<", "<="],
    },
    invoice_date_due: {
      type: "date",
      nullable: true,
      sortable: true,
      ops: ["=", ">", ">=", "<", "<="],
    },
    state: {
      type: "string",
      nullable: false,
      sortable: true,
      ops: ["=", "!="],
      choices: ["borrador", "publicada", "pagada", "anulada"],
    },
  },
  translations: {
    name: { default: "Factura" },
    labels: {
      number: { default: "número" },
      customer: { default: "cliente" },
      amount_total: { default: "total" },
      invoice_date_due: { default: "vence" },
      state: { default: "estado" },
    },
  },
};

/** **Armar una pregunta.** Elegí un campo, un operador y un valor; agrupá con Y u O, anidá un
 *  grupo, o escribí la criteria entera en JSON. Lo aplicado aparece abajo. */
export const ArmarUnFiltro: Story = {
  render: function Render() {
    const [where, setWhere] = useState<BuiltFilter | undefined>(undefined);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <div className="rounded-box border border-line bg-surface p-4">
          <FilterBuilder
            model={FACTURA}
            onApply={setWhere}
            onCancel={() => setWhere(undefined)}
          />
        </div>
        <pre className="overflow-auto rounded-box border border-line bg-ground p-3 font-mono text-micro text-muted">
          {where === undefined ? "sin filtro aplicado" : JSON.stringify(where, null, 2)}
        </pre>
      </div>
    );
  },
};
