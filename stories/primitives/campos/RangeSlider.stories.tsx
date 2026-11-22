import { Field, FormModeProvider, RangeSlider, Slider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **un rango con dos extremos** — el «precio entre» de una tienda, el «monto entre»
 * de un ERP, una banda de tolerancia. El hermano del `Slider`: la misma pista y la misma cifra,
 * con dos manijas que no se cruzan. Cada manija dice qué extremo es («Mínimo, Precio»), y la
 * lista filtrada escucha `onChangeEnd`: no se vuelve a consultar en cada píxel del arrastre.
 */
const meta: Meta = {
  title: "2 · Primitivas/Campos/Rango · dos extremos",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const BS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "BOB",
  maximumFractionDigits: 0,
};

function Precio() {
  const [value, setValue] = useState<[number, number]>([50, 300]);
  const [settled, setSettled] = useState<[number, number]>([50, 300]);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <Field label="Precio">
        <RangeSlider
          value={value}
          onChange={setValue}
          onChangeEnd={setSettled}
          min={0}
          max={500}
          step={10}
          format={BS}
        />
      </Field>
      <p className="text-meta text-muted">
        La lista se consulta con {settled[0]} – {settled[1]}
      </p>
    </div>
  );
}

/** **El filtro de precio**: cada extremo con las flechas; el mínimo no pasa al máximo. */
export const FiltroDePrecio: Story = {
  name: "Filtro de precio",
  render: () => <Precio />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [low, high] = canvas.getAllByRole("slider");
    await expect(low).toHaveAccessibleName("Mínimo Precio");
    await expect(high).toHaveAccessibleName("Máximo Precio");
    await userEvent.click(low!);
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(low).toHaveValue("70");
    await userEvent.keyboard("{End}");
    /* It stops at the other end: the thumbs never cross. */
    await expect(low).toHaveValue("300");
    await expect(canvas.getByText(/La lista se consulta con 300 – 300/)).toBeInTheDocument();
  },
};

/** **En lectura**: los dos extremos escritos, sin pista. */
export const Lectura: Story = {
  render: () => (
    <FormModeProvider value="read">
      <Field label="Monto entre">
        <RangeSlider value={[1000, 25000]} min={0} max={50000} format={BS} />
      </Field>
    </FormModeProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("slider")).toBeNull();
  },
};

/** **Uno y dos extremos**: el `Slider` y el rango leen igual, y cada manija se nombra una vez. */
export const UnoYDos: Story = {
  name: "Uno y dos extremos",
  render: () => (
    <div className="flex max-w-md flex-col gap-2">
      <Field label="Descuento">
        <Slider value={0.12} min={0} max={0.5} step={0.01} format={{ style: "percent" }} />
      </Field>
      <Field label="Monto entre">
        <RangeSlider value={[1000, 25000]} min={0} max={50000} step={500} format={BS} />
      </Field>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [single, low, high] = within(canvasElement).getAllByRole("slider");
    /* It said «12 % Descuento» — the group read by its whole text — before the group carried
       the field's words. */
    await expect(single).toHaveAccessibleName("Descuento");
    await expect(low).toHaveAccessibleName("Mínimo Monto entre");
    await expect(high).toHaveAccessibleName("Máximo Monto entre");
  },
};
