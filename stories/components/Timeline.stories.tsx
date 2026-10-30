import { Button, Timeline } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Context: **la línea de tiempo, suelta.** El chatter la usa para la historia de un registro;
 * suelta sirve para cualquier auditoría — quién cambió qué y cuándo. El color vive en el
 * punto y el texto queda en tinta: un renglón entero en rojo no se lee más urgente, se lee
 * peor.
 */
const meta: Meta = {
  title: "3 · Componentes/Chatter · línea de tiempo",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **La auditoría de una factura**, de la más reciente a la más vieja. */
export const AuditoriaDeUnaFactura: Story = {
  render: () => (
    <div className="max-w-xl rounded-box border border-line bg-surface p-4">
      <Timeline>
        <Timeline.Item
          label="Carla Rojas registró un pago de Bs. 5.000,00"
          at="2026-10-20T16:45:00Z"
          tone="good"
          action={
            <Button role="ghost" size="sm">
              Ver el pago
            </Button>
          }
        />
        <Timeline.Item
          label="Venció sin pago completo"
          at="2026-10-15T00:00:00Z"
          tone="bad"
        />
        <Timeline.Item
          label="Josefa Muñoz la publicó y se envió por correo"
          at="2026-10-03T09:30:00Z"
          tone="info"
        />
        <Timeline.Item label="Andrés Gutiérrez creó el borrador" at="2026-10-02T14:10:00Z" />
      </Timeline>
    </div>
  ),
};

/** **Sin historia todavía.** Un vacío que se dice, no un hueco. */
export const Vacia: Story = {
  render: () => (
    <div className="max-w-xl rounded-box border border-line bg-surface p-4">
      <Timeline empty={{ sentence: "Todavía no pasó nada con esta factura." }}>{[]}</Timeline>
    </div>
  ),
};
