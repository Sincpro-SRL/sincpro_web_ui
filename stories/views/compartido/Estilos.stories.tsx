import { type Meta, type StoryObj } from "@storybook/react-vite";

import type { DockArgs } from "./shared";
import { actionsWork, DockedInvoice } from "./shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Compartido/Estilos · tradicional y moderno",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<DockArgs>;

/**
 * **Moderno — la decisión.** Las migas son el título («Ventas › Facturas › FAC/2026/0119»), el
 * paginador en su línea; abajo, más chicos, los contadores y el estado en pasos. Las acciones
 * flotan en una píldora ABAJO, al centro: «Enviar», «Imprimir ▾», «⋯» y «Registrar pago» dorada y
 * última. Escribí en «Referencia del cliente»: la misma píldora pasa a «1 cambio · Descartar ·
 * Guardar», y dice «Guardado».
 */
export const Moderno: Story = {
  args: { style: "modern", placement: "auto", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/**
 * **Tradicional**, con el MISMO código: las mismas `DockAction` son los botones del riel —la
 * principal primero y dorada, las secundarias, «⋯» con el resto—, y Guardar / Descartar ocupan
 * su lugar mientras hay cambios.
 */
export const Tradicional: Story = {
  args: {
    style: "traditional",
    placement: "auto",
    align: "center",
    look: "chrome",
    visible: 2,
  },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/** **Moderno, la píldora arriba**: descansa en el riel, al centro, y flota arriba cuando el riel
 *  se va. */
export const ModernoArriba: Story = {
  name: "Moderno, la píldora arriba",
  args: { style: "modern", placement: "top", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
};

/** **Explorar**: el estilo, dónde va la píldora, su color, cuántas visibles. */
export const Explorar: Story = {
  args: { style: "modern", placement: "auto", align: "center", look: "chrome", visible: 2 },
  argTypes: {
    style: { control: "inline-radio", options: ["traditional", "modern"] },
    placement: { control: "inline-radio", options: ["auto", "rail", "top", "bottom"] },
    align: { control: "inline-radio", options: ["center", "end"] },
    look: { control: "inline-radio", options: ["chrome", "canvas"] },
    visible: { control: { type: "range", min: 0, max: 4, step: 1 } },
  },
  render: (args) => <DockedInvoice {...args} />,
};
