import { Skeleton, type SkeletonShape } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **cargando, con la forma de lo que viene** — una lista espera en filas, una tabla en
 * columnas, una grilla de productos en tarjetas, un tablero en carriles. Así la página no salta
 * de líneas a cajas cuando llegan los datos. `List` elige la forma por su presentación. Sin
 * brillo que recorra las barras: un pulso ya quiere decir «esto está vivo». La frase es para el
 * lector de pantalla; las barras callan.
 */
const meta: Meta = {
  title: "2 · Primitivas/Avisos/Cargando · la forma de lo que viene",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const SHAPES: readonly { shape: SkeletonShape; title: string }[] = [
  { shape: "rows", title: "Filas — una lista" },
  { shape: "table", title: "Tabla — columnas" },
  { shape: "tiles", title: "Mosaicos — una vitrina" },
  { shape: "board", title: "Tablero — carriles" },
];

/** **Las cuatro formas**, una al lado de la otra. */
export const Formas: Story = {
  render: () => (
    <div className="grid max-w-5xl grid-cols-2 gap-4">
      {SHAPES.map(({ shape, title }) => (
        <section key={shape} className="flex flex-col gap-2">
          <h3 className="text-meta font-medium text-muted">{title}</h3>
          <div className="min-h-48 overflow-hidden rounded-box border border-line bg-surface">
            <Skeleton label="Cargando…" shape={shape} rows={shape === "tiles" ? 4 : 5} />
          </div>
        </section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-ui="skeleton"]')).toHaveLength(4);
    await expect(within(canvasElement).getAllByText("Cargando…")).toHaveLength(4);
  },
};
