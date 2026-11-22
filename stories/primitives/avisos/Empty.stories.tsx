import { Button, ButtonLink, Empty } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, SearchX, ShoppingCart } from "lucide-react";
import { expect, within } from "storybook/test";

/**
 * Context: **nada todavía, dicho como pantalla** — el carrito vacío de una tienda, el «todavía
 * no tenés pedidos» de un portal, el módulo que la empresa no usó. Una frase gris sola en el
 * medio de una página blanca se lee como algo roto; con un título, un dibujo y qué hacer se lee
 * como un lugar que espera. El dibujo nunca es el mensaje: se oculta al lector de pantalla y el
 * título dice lo que muestra. Sin título ni dibujo, `Empty` sigue siendo la línea tranquila de
 * un panel, como siempre.
 */
const meta: Meta = {
  title: "2 · Primitivas/Avisos/Vacío · la frase o la pantalla",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **Con ícono**: el carrito vacío — título, la frase y la acción que lo llena. */
export const ConIcono: Story = {
  name: "Con ícono",
  render: () => (
    <div className="max-w-xl rounded-box border border-line bg-surface">
      <Empty
        icon={ShoppingCart}
        title="Tu pedido está vacío"
        sentence="Sumá algo de la vitrina y aparece acá, con su total."
        action={<Button role="primary">Ver la vitrina</Button>}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Tu pedido está vacío")).toBeVisible();
    await expect(canvasElement.querySelector('[data-ui="empty.visual"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  },
};

/* The application's own art — here drawn with the system's colours, so it follows the theme. */
const Dibujo = (
  <svg viewBox="0 0 160 110" className="w-40" role="presentation">
    <rect
      x="28"
      y="18"
      width="88"
      height="76"
      rx="10"
      className="fill-ink/5 stroke-line-strong"
      strokeWidth="2"
    />
    <rect x="42" y="36" width="44" height="6" rx="3" className="fill-line-strong" />
    <rect x="42" y="50" width="60" height="6" rx="3" className="fill-line" />
    <rect x="42" y="64" width="36" height="6" rx="3" className="fill-line" />
    <circle cx="118" cy="78" r="20" className="fill-surface" />
    <circle
      cx="118"
      cy="78"
      r="20"
      className="fill-primary/12 stroke-primary"
      strokeWidth="2"
    />
    <path
      d="M110 78h16M118 70v16"
      className="stroke-primary"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/** **Con ilustración**: el arte de la aplicación en lugar del ícono — el portal sin pedidos. */
export const ConIlustracion: Story = {
  name: "Con ilustración",
  render: () => (
    <div className="max-w-xl rounded-box border border-line bg-surface">
      <Empty
        illustration={Dibujo}
        title="Todavía no tenés pedidos"
        sentence="Cuando compres, cada pedido aparece acá con su estado y su factura."
        action={
          <>
            <Button role="primary">Empezar a comprar</Button>
            <ButtonLink href="#ayuda" role="ghost">
              ¿Cómo compro?
            </ButtonLink>
          </>
        }
      />
    </div>
  ),
};

/** **Las dos formas**: la línea tranquila de un panel y la pantalla vacía de un módulo. */
export const DosFormas: Story = {
  name: "Las dos formas",
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4">
      <div className="rounded-box border border-line bg-surface">
        <Empty sentence="Sin adjuntos todavía." align="start" />
      </div>
      <div className="rounded-box border border-line bg-surface">
        <Empty
          icon={FileText}
          title="Sin facturas este mes"
          sentence="Importá las del SIAT o creá la primera."
          action={<Button role="secondary">Importar</Button>}
        />
      </div>
      <div className="col-span-2 rounded-box border border-line bg-surface">
        <Empty
          icon={SearchX}
          title="Nada con «tornilo»"
          sentence="Revisá cómo se escribe, o quitá un filtro."
          action={<Button role="ghost">Quitar los filtros</Button>}
        />
      </div>
    </div>
  ),
};
