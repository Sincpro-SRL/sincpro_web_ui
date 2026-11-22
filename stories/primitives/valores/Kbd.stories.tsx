import { Kbd } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

/**
 * Context: **una tecla dibujada como tecla** — «⌘K» al final de la entrada de búsqueda, «Tab»
 * después de una sugerencia, la leyenda de qué hace cada tecla. Cuatro lugares dibujaban su
 * propio `<kbd>` y la tecla se veía un poco distinta en cada uno; ahora es una sola pieza. Una
 * combinación (`keys="Mod+K"`) se escribe como la dice ESTE teclado — «⌘K» en una Mac, «Ctrl K»
 * en el resto — y no se dibuja hasta saberlo. Se ve y no se oye: el control al que pertenece la
 * anuncia con `aria-keyshortcuts`.
 */
const meta: Meta = {
  title: "2 · Primitivas/Valores/Tecla · un atajo dibujado",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **Escrita o por combinación**: «Tab» tal cual; «Mod+K» como lo dice este teclado. */
export const Teclas: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3 text-meta text-muted">
      <span className="inline-flex items-center gap-2">
        <Kbd keys="Mod+K" /> abre la búsqueda
      </span>
      <span className="inline-flex items-center gap-2">
        <Kbd keys="Alt+ArrowDown" /> abre las sugerencias
      </span>
      <span className="inline-flex items-center gap-2">
        <Kbd>Tab</Kbd> completa
      </span>
      <span className="inline-flex items-center gap-2">
        <Kbd>/</Kbd> salta a la búsqueda
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll("kbd")).toHaveLength(4));
    await expect(within(canvasElement).getByText("Tab").tagName).toBe("KBD");
  },
};

/** **Sobre el cromo**: la misma tecla en la barra oscura. */
export const EnElCromo: Story = {
  name: "Sobre el cromo",
  render: () => (
    <div className="flex items-center gap-2 rounded-box bg-chrome p-4 text-meta text-chrome-muted">
      <Kbd keys="Mod+K" surface="chrome" /> buscar
    </div>
  ),
};
