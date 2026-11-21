import { Button, pointerAttributes, SearchField, Tags, TextInput } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

/**
 * Context: **táctil** — los mismos controles, al tamaño de un dedo. El navegador contesta por
 * el puntero PRINCIPAL, y una caja es un monitor táctil con un mouse enchufado: ahí
 * `pointer: coarse` es falso y quien cobra recibía blancos de 30 px. La aplicación lo puede
 * DECIR: `data-pointer="touch"` en `<html>` o en una zona (`pointerAttributes`). Lo que se
 * dibuja chico —la «×» de un chip, la casilla de una fila— contesta en `--size-target`
 * alrededor: 24 px con mouse (el mínimo de WCAG 2.2), 44 px con el dedo.
 */
const meta: Meta = {
  title: "1 · Fundamentos/Táctil",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function Sample({ label }: { label: string }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-box border border-line bg-surface p-4">
      <h3 className="text-meta font-semibold text-ink">{label}</h3>
      <SearchField value="" onChange={() => {}} placeholder="Buscar…" />
      <TextInput aria-label="Nombre" value="Distribuidora Andina" onChange={() => {}} />
      <Tags
        label="Filtros"
        items={[
          { id: "a", label: "Pagada", onRemove: () => {}, removeLabel: "Quitar Pagada" },
          { id: "b", label: "Octubre", onRemove: () => {}, removeLabel: "Quitar Octubre" },
        ]}
      />
      <div className="flex gap-2">
        <Button role="secondary">Cancelar</Button>
        <Button role="primary">Cobrar</Button>
      </div>
    </section>
  );
}

/** **Mouse y dedo, lado a lado.** A la derecha la zona dice `data-pointer="touch"`: los
 *  controles miden 44 px y la «×» de cada chip contesta en 44 × 44 aunque se dibuje chica. */
export const MouseYDedo: Story = {
  name: "Mouse y dedo",
  render: () => (
    <div className="flex max-w-4xl gap-4">
      <div {...pointerAttributes("fine")} className="flex min-w-0 flex-1">
        <Sample label='data-pointer="fine" · mouse' />
      </div>
      <div {...pointerAttributes("touch")} className="flex min-w-0 flex-1">
        <Sample label='data-pointer="touch" · dedo' />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [mouse, finger] = canvas.getAllByRole("button", { name: "Cobrar" });
    await expect(mouse!.getBoundingClientRect().height).toBeLessThan(40);
    await expect(finger!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    /* The «×» is drawn small and answers to 44 × 44 under a finger. */
    const remove = canvas.getAllByRole("button", { name: /Quitar Pagada/ })[1]!;
    const target = getComputedStyle(remove, "::after");
    await expect(Number.parseFloat(target.height)).toBeGreaterThanOrEqual(44);
  },
};
