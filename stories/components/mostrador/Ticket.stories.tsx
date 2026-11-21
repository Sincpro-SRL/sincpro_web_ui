import { Receipt } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **el ticket** — lo que imprime una caja (nota de venta, factura, comanda de cocina) y
 * el mismo documento leído en una pantalla al otro lado del mostrador. Una forma fija que la
 * gente ya sabe leer: quién vende, qué documento, las líneas (cuántos, qué, cuánto), los totales
 * y la leyenda. `look="paper"` es el rollo térmico de 80 mm (cifras monoespaciadas, imprime como
 * es); `look="screen"` es la pantalla del cliente o el resumen de un kiosco. Las palabras son de
 * la aplicación: la leyenda del SIN, el código de control.
 */
const meta: Meta = {
  title: "3 · Componentes/Mostrador/Ticket · impreso y en pantalla",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const LINES = [
  { quantity: 2, name: "Capuchino", amount: "40,00" },
  { quantity: 3, name: "Salteña de pollo", amount: "36,00", note: "sin picante" },
  { quantity: 1, name: "Torta de chocolate", amount: "18,00" },
];

/** **Una factura de una cafetería**, como sale de la impresora térmica. */
export const Factura: Story = {
  render: () => (
    <Receipt
      issuer="Café Illimani"
      issuerLines={[
        "NIT 1023456028",
        "Casa matriz · Av. Arce 2631, La Paz",
        "Tel. 2 2441122",
      ]}
      document="FACTURA · CON DERECHO A CRÉDITO FISCAL"
      facts={[
        { label: "N.º", value: "00047" },
        { label: "Fecha", value: "20/11/2026 10:24" },
        { label: "Cliente", value: "Distribuidora Andina S.R.L." },
        { label: "NIT/CI", value: "1028457021" },
        { label: "Caja", value: "Caja 1 · María Q." },
      ]}
      lines={LINES}
      totals={[
        { label: "Subtotal", value: "94,00" },
        { label: "Descuento", value: "0,00" },
        { label: "Total Bs", value: "94,00", total: true },
        { label: "Efectivo", value: "100,00" },
        { label: "Vuelto", value: "6,00" },
      ]}
      footer={[
        "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS",
        "Ley N.º 453: Tienes derecho a recibir información sobre las características de los productos.",
        "¡Gracias por su compra!",
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("article")).toHaveTextContent(/FACTURA.*Total Bs\s*94,00/s);
  },
};

/** **La comanda de cocina**: sin precios, con las notas. */
export const Comanda: Story = {
  render: () => (
    <Receipt
      issuer="Cocina"
      document="PEDIDO 118 · MESA 4"
      facts={[{ label: "Hora", value: "10:24" }]}
      lines={LINES.map((one) => ({ ...one, amount: "" }))}
      totals={[{ label: "Ítems", value: "6", total: true }]}
    />
  ),
};

/** **En la pantalla del cliente**: el mismo documento, grande, en la letra del sistema. */
export const EnPantalla: Story = {
  name: "En la pantalla del cliente",
  render: () => (
    <Receipt
      look="screen"
      issuer="Café Illimani"
      document="TU PEDIDO"
      lines={LINES.map((one) => ({ ...one, amount: `Bs ${one.amount}` }))}
      totals={[
        { label: "Subtotal", value: "Bs 94,00" },
        { label: "Total", value: "Bs 94,00", total: true },
      ]}
      footer={["Pagá con QR o tarjeta en el lector"]}
    />
  ),
};
