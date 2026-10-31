import { DataTable, Field, Priority } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta: Meta<typeof Priority> = {
  title: "2 · Primitivas/Prioridad",
  component: Priority,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Qué tan urgente es una oportunidad, una tarea o un ticket, contado sin leer. Es un grupo de radio: clic o flechas, y tocar la estrella puesta la quita. Sin `onChange`, solo muestra.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Priority>;

/** En un formulario: clic o flechas; tocar la estrella puesta vuelve a «sin prioridad». */
export const Editable: Story = {
  render: function Render() {
    const [value, setValue] = useState(2);
    return (
      <div className="max-w-xs rounded-box border border-line bg-surface p-4">
        <Field label="Prioridad">
          <Priority value={value} onChange={setValue} />
        </Field>
      </div>
    );
  },
};

const TICKETS = [
  { id: "T-1042", asunto: "La impresora térmica no corta el papel", prioridad: 3 },
  { id: "T-1041", asunto: "Pedir factura de diciembre", prioridad: 1 },
  { id: "T-1039", asunto: "Cambiar el NIT del cliente", prioridad: 0 },
];

/** En una lista: las estrellas se comparan de arriba abajo sin leer. */
export const EnUnaLista: Story = {
  render: () => (
    <div className="max-w-2xl rounded-box border border-line bg-surface">
      <DataTable
        data={TICKETS}
        getRowId={(t) => t.id}
        columns={[
          { id: "id", header: "Ticket", value: (t) => t.id, mono: true },
          { id: "asunto", header: "Asunto", value: (t) => t.asunto },
          {
            id: "prioridad",
            header: "Prioridad",
            value: (t) => t.prioridad,
            cell: (t) => <Priority value={t.prioridad} />,
          },
        ]}
      />
    </div>
  ),
};
