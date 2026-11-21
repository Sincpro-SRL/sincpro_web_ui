import { Button, Outcome } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheck, Printer } from "lucide-react";
import { expect, within } from "storybook/test";

/**
 * Context: **el final, dicho en grande** — la pantalla que queda después de pagar en un kiosco
 * («tu número es 118»), de confirmar un pedido en una tienda, de cerrar una caja. Un aviso
 * alcanza para quien sigue cobrando; no para quien se va del kiosco ni para un checkout cuyo
 * final ES la página. Lo que pasó, la única cifra que hay que recordar y cómo seguir. Es un
 * `status`: el lector de pantalla lo anuncia sin mover el foco.
 */
const meta: Meta = {
  title: "2 · Primitivas/Mostrador/Final · lo que pasó, en grande",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **El kiosco, al terminar.** El número de pedido, grande; lo que sigue; y «Nuevo pedido». */
export const NumeroDePedido: Story = {
  name: "Número de pedido",
  render: () => (
    <div className="max-w-md rounded-box border border-line bg-surface">
      <Outcome
        title="¡Listo! Tu pedido está en cocina"
        figure="118"
        figureLabel="Tu número"
        detail="Te llamamos en la pantalla cuando esté listo. Pagás en caja al retirar."
        action={
          <>
            <Button role="secondary" icon={Printer}>
              Imprimir ticket
            </Button>
            <Button role="primary">Nuevo pedido</Button>
          </>
        }
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveTextContent(/Tu número\s*118/);
  },
};

/** **Con vuelto**: la cifra es lo que hay que devolver. */
export const Vuelto: Story = {
  render: () => (
    <div className="max-w-md rounded-box border border-line bg-surface">
      <Outcome
        title="Cobrado · Factura 00047"
        figure="Bs 24,00"
        figureLabel="Vuelto"
        icon={CircleCheck}
      />
    </div>
  ),
};

/** **Cuando no salió**: el tono lo dice el ícono; la frase sigue en tinta. */
export const NoSalio: Story = {
  name: "No salió",
  render: () => (
    <div className="max-w-md rounded-box border border-line bg-surface">
      <Outcome
        tone="bad"
        title="El pago con tarjeta fue rechazado"
        detail="Probá con otra tarjeta, QR o efectivo. El pedido sigue abierto."
        action={<Button role="primary">Elegir otro pago</Button>}
      />
    </div>
  ),
};
