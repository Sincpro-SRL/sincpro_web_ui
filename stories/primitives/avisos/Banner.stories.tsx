import { AppFrame, Banner, ButtonLink, TopBar } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Truck } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **un aviso sobre TODA la aplicación**, de borde a borde arriba del marco: una
 * ventana de mantenimiento, un plan que vence, «envío gratis desde Bs 300», una empresa en
 * ambiente de pruebas. El `Callout` habla de la vista en la que está; éste habla de todo, así
 * que va en `AppFrame banner` — arriba de la barra, y se va con el scroll en vez de quitarle una
 * línea a cada pantalla. Los mismos cuatro tonos que el `Callout`.
 */
const meta: Meta = {
  title: "2 · Primitivas/Avisos/Banner · sobre toda la aplicación",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** **Los cuatro tonos**: la frase en tinta, el tono en el ícono y el borde. */
export const Tonos: Story = {
  render: () => (
    <div className="flex flex-col">
      <Banner>El sistema se actualiza hoy a las 22:00 — tarda unos diez minutos.</Banner>
      <Banner
        tone="warn"
        action={
          <ButtonLink href="#plan" role="ghost" size="sm">
            Renovar el plan
          </ButtonLink>
        }
      >
        Tu plan vence en 3 días.
      </Banner>
      <Banner tone="bad">Ambiente de PRUEBAS — nada de lo que hagas acá es real.</Banner>
      <Banner tone="good" icon={Truck}>
        Envío gratis en pedidos desde Bs 300.
      </Banner>
    </div>
  ),
};

function EnElMarco() {
  const [open, setOpen] = useState(true);
  return (
    <AppFrame
      {...(open
        ? {
            banner: (
              <Banner tone="warn" onDismiss={() => setOpen(false)}>
                El sistema se actualiza hoy a las 22:00.
              </Banner>
            ),
          }
        : {})}
      menu={<TopBar app={{ label: "Ventas" }} />}
    >
      <p className="p-6 text-body text-ink">La vista.</p>
    </AppFrame>
  );
}

/** **En el marco, y se puede cerrar**: arriba de la barra; la ✕ lo quita. */
export const EnElMarco_: Story = {
  name: "En el marco",
  render: () => <EnElMarco />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("El sistema se actualiza hoy a las 22:00."),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Descartar el aviso" }));
    await expect(canvas.queryByText("El sistema se actualiza hoy a las 22:00.")).toBeNull();
  },
};
