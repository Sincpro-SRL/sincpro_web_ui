import { Count, IconButton, SurfaceProvider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, ShoppingCart } from "lucide-react";
import { expect } from "storybook/test";

/**
 * Context: **cuántos hay, o que algo pide que lo miren.** El contador estaba dibujado cinco
 * veces —la barra lateral, las pestañas, el systray, el menú y el botón que cada aplicación
 * se hacía— con cuatro reglas distintas para el cero y el «99+». Ahora es una pieza: la usan
 * esos componentes y la usa la aplicación en lo suyo.
 */
const meta: Meta<typeof Count> = {
  title: "2 · Primitivas/Valores/Count · cuántos hay",
  component: Count,
  parameters: {
    docs: {
      description: {
        component:
          "`neutral` (por defecto) dice CUÁNTOS: «Facturas 31». Cualquier otro tono dice que algo PIDE atención: «3 rechazados». Sin `value` es un punto. El cero no se dibuja, salvo con `showZero`, donde el cero es una respuesta. `solid` es la insignia sobre un ícono, y `max` la corta en «99+».",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Count>;

/** **Cuántos hay, en voz baja.** Una columna de cuentas al lado de una de nombres se lee
 *  cuando se busca, no antes. La fila actual toma el color de su fila (`current`). */
export const Contar: Story = {
  render: () => (
    <ul className="flex w-64 flex-col gap-1 text-meta text-ink">
      <li className="flex items-center justify-between px-2">
        Cotizaciones <Count value={7} />
      </li>
      <li className="flex items-center justify-between rounded-control bg-primary/10 px-2 text-primary">
        Facturas <Count value={1234} current />
      </li>
      <li className="flex items-center justify-between px-2">
        Notas de crédito <Count value={0} />
      </li>
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const counts = [...canvasElement.querySelectorAll("[data-count]")];
    // The zero is not drawn: a «0» beside every quiet screen is noise.
    await expect(counts.map((c) => c.getAttribute("data-count"))).toEqual(["7", "1234"]);
    // Written in the copy's locale, never «1234».
    await expect(counts[1]?.textContent).not.toBe("1234");
  },
};

/** **Algo pide que lo miren.** El tono dice de qué tipo; sin número es un punto: llegó algo
 *  y contarlo no agrega nada. El dorado nunca es texto sobre el lienzo, así que su cuenta es
 *  tinta sobre un baño dorado. */
export const PedirAtencion: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-meta text-ink">
      {(["info", "good", "warn", "bad", "accent"] as const).map((tone) => (
        <span key={tone} className="flex items-center gap-2">
          <span className="w-20 text-muted">{tone}</span>
          <Count value={3} tone={tone} />
          <Count tone={tone} />
          <Count value={12} tone={tone} solid />
        </span>
      ))}
    </div>
  ),
};

/** **El cero que es una respuesta.** En una pestaña, «Pagos 0» ahorra abrirla para descubrir
 *  que está vacía: se dibuja, más tenue. */
export const CeroQueResponde: Story = {
  render: () => (
    <span className="flex items-center gap-2 text-meta text-ink">
      Pagos <Count value={0} showZero />
    </span>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-count="0"]')?.textContent).toBe("0");
  },
};

/** **La insignia sobre un ícono, en un botón de la aplicación.** Se lee de un vistazo: pasadas
 *  dos cifras dice «muchos» (`max`). El botón ya dice el número en su nombre, así que la
 *  insignia sólo se ve (`aria-hidden`). */
export const SobreUnIcono: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <span className="relative inline-flex">
        <IconButton icon={ShoppingCart} label="Carrito: 3 productos" size="md" />
        <span className="absolute -top-0.5 -right-0.5 flex">
          <Count value={3} tone="info" solid aria-hidden />
        </span>
      </span>
      <SurfaceProvider value="chrome">
        <span className="relative inline-flex rounded-pill bg-chrome p-1">
          <IconButton icon={Bell} label="Avisos: 99+" size="md" />
          <span className="absolute -top-0.5 -right-0.5 flex">
            <Count value={240} tone="bad" solid max={99} aria-hidden />
          </span>
        </span>
      </SurfaceProvider>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-count="240"]')?.textContent).toBe("99+");
  },
};
