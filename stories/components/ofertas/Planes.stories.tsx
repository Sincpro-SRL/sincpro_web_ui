import { Button, PlanCard, Plans, SegmentedControl } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **una oferta para elegir** — la suscripción de un portal, la membresía de una tienda,
 * las licencias de un ERP. Los planes se COMPARAN: todas las tarjetas con la misma anatomía y
 * en el mismo orden, y lo que un plan no trae sigue en su lista, marcado «no incluye». El plan
 * recomendado se enmarca en el azul de la selección; el dorado es su botón, el único principal
 * de la pantalla. En `Plans` las tarjetas comparten alto y los botones quedan alineados abajo.
 */
const meta: Meta = {
  title: "3 · Componentes/Ofertas/Planes · elegir una suscripción",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const FEATURES = (users: string, invoice: boolean, stock: boolean, api: boolean) => [
  { label: users },
  { label: "Facturación electrónica (SIAT)", included: invoice },
  { label: "Inventario por almacén", included: stock },
  { label: "Acceso por API", included: api },
];

function Oferta() {
  const [period, setPeriod] = useState("mes");
  const yearly = period === "año";
  /* A yearly price is shown per month, with the monthly one struck as the price before. */
  const monthly = (base: number) =>
    yearly
      ? { value: Math.round(base * 0.8), compareAt: base, currency: "BOB", per: "mes, anual" }
      : { value: base, currency: "BOB", per: "mes" };
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <SegmentedControl
        aria-label="Período"
        value={period}
        onChange={setPeriod}
        options={[
          { value: "mes", label: "Mensual" },
          { value: "año", label: "Anual · 20 % menos" },
        ]}
      />
      <Plans label="Planes de Sincpro ERP">
        <PlanCard
          name="Emprende"
          description="Para empezar a facturar"
          price={monthly(150)}
          features={FEATURES("1 usuario", true, false, false)}
          current
        />
        <PlanCard
          name="Pyme"
          description="Para una empresa con un local"
          price={monthly(350)}
          features={FEATURES("Hasta 5 usuarios", true, true, false)}
          highlight="Recomendado"
          action={<Button role="primary">Elegir Pyme</Button>}
        />
        <PlanCard
          name="Corporativo"
          description="Varias sucursales e integraciones"
          priceLabel="A convenir"
          features={FEATURES("Usuarios ilimitados", true, true, true)}
          action={<Button role="secondary">Hablar con ventas</Button>}
        />
      </Plans>
    </div>
  );
}

/** **Mensual y anual**: el anual muestra el precio por mes con el mensual tachado — el descuento lo calcula `Price`. */
export const Oferta_: Story = {
  name: "Mensual y anual",
  render: () => <Oferta />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pyme = canvas.getByRole("article", { name: "Pyme" });
    await expect(within(pyme).getByText("Recomendado")).toBeVisible();
    await expect(
      within(canvas.getByRole("article", { name: "Emprende" })).getByText("Tu plan"),
    ).toBeVisible();
    await expect(within(pyme).getByText(/No incluye/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", { name: "Anual · 20 % menos" }));
    await expect(within(pyme).getByText("-20%")).toBeVisible();
    /* One gold on the screen: the recommended plan's button. */
    await expect(canvasElement.querySelectorAll('[data-emphasis="primary"]')).toHaveLength(1);
  },
};
