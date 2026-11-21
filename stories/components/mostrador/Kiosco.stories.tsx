import { Button, KioskFrame, Outcome } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Coffee } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **el marco de un kiosco** — una pantalla de autoservicio que espera a un desconocido,
 * se usa una vez de pie y se deja a medias. El marco ESPERA (una pantalla de inicio que se toca
 * entera), OLVIDA (sin un toque durante `idleAfter` segundos vuelve al inicio y avisa para
 * descartar el pedido abandonado) y ALCANZA (el botón de la esquina baja el contenido a la
 * mitad de abajo para quien está sentado). Dice «táctil» en toda su área.
 */
const meta: Meta = {
  title: "3 · Componentes/Mostrador/Kiosco · el marco de autoservicio",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** **Esperar, empezar, alcanzar.** Tocá la pantalla de inicio; con el botón de accesibilidad
 *  el contenido baja; a los 20 segundos sin tocar vuelve al inicio. */
export const Marco: Story = {
  render: function Render() {
    const [forgotten, setForgotten] = useState(0);
    return (
      <KioskFrame
        brand="Café Illimani"
        attract={{
          title: "Pedí aquí, sin filas",
          subtitle: "Café de los Yungas, salteñas del día y algo dulce.",
          call: "Tocá para pedir",
          icon: Coffee,
        }}
        idleAfter={20}
        onIdle={() => setForgotten((n) => n + 1)}
      >
        <Outcome
          title="Este es el contenido del kiosco"
          detail={`El menú, los pasos y el pago van aquí. Pedidos descartados por inactividad: ${forgotten}.`}
          action={<Button role="primary">Empezar el pedido</Button>}
        />
      </KioskFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tocá para pedir/ }));
    await expect(canvas.getByText("Este es el contenido del kiosco")).toBeVisible();
    const reach = canvas.getByRole("button", { name: "Bajar la pantalla al alcance" });
    await userEvent.click(reach);
    await expect(
      canvas.getByRole("button", { name: "Volver a la altura completa" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};
