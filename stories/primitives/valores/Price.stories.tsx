import { Price } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **un precio como lo dice una góndola** — el que se paga, grande; el de antes,
 * tachado; y cuánto menos, en una etiqueta. El descuento se CALCULA y se redondea hacia abajo:
 * un «−25 %» escrito a mano al lado de 80 por 100 es una promesa que la tienda no cumple. Cada
 * cifra se nombra para un lector de pantalla («Antes», «Ahora»), y cero dice «Gratis».
 */
const meta: Meta = {
  title: "2 · Primitivas/Valores/Precio · el de antes y cuánto menos",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **Los tres tamaños**: la línea del carrito, la tarjeta del producto, la página del producto. */
export const Tamanos: Story = {
  name: "Tamaños",
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Price value={18} currency="BOB" size="sm" />
      <Price value={18} currency="BOB" />
      <Price value={1299} currency="BOB" size="lg" />
    </div>
  ),
};

/** **Rebajado**: el de antes tachado y el descuento, calculado — 80 por 99 dice −19 %, no −20 %. */
export const Rebajado: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Price value={80} compareAt={100} currency="BOB" size="lg" />
      <Price value={80} compareAt={99} currency="BOB" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("-20%")).toBeInTheDocument();
    await expect(canvas.getByText("-19%")).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll("del")).toHaveLength(2);
  },
};

/** **Por unidad y gratis**: un plan por mes, la fruta por kilo, el envío que no se cobra. */
export const PorUnidad: Story = {
  name: "Por unidad y gratis",
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Price value={120} currency="BOB" per="mes" size="lg" />
      <Price value={12.5} currency="BOB" per="kg" />
      <Price value={0} currency="BOB" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Gratis")).toBeInTheDocument();
  },
};

/** **Sin moneda o en otra**: el número con dos decimales, o dólares. */
export const Moneda: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Price value={1299.5} />
      <Price value={49.99} compareAt={59.99} currency="USD" />
    </div>
  ),
};
