import { type ChoiceOption, Field, FormModeProvider, RadioGroup } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **las variantes de un producto** — el color como su muestra, la talla como una
 * cajita con su palabra. Es `RadioGroup look="swatches"`: el mismo grupo de radios (las flechas
 * mueven, uno queda elegido) dibujado para una ficha de producto. El color nunca va solo: cada
 * muestra se nombra con su rótulo y el elegido se ESCRIBE al lado («Roble»). Lo que no hay en
 * stock queda a la vista, tachado, con el motivo en su título.
 */
const meta: Meta = {
  title: "2 · Primitivas/Campos/Variantes · color y talla",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/* The application's colours — example data, not tokens: a product's colour is the product's. */
const COLORES: readonly ChoiceOption[] = [
  { value: "roble", label: "Roble", swatch: "#b0814f" },
  { value: "nogal", label: "Nogal", swatch: "#6b4a33" },
  { value: "blanco", label: "Blanco", swatch: "#f7f5f0" },
  { value: "gris", label: "Gris grafito", swatch: "#4b4f54" },
  {
    value: "verde",
    label: "Verde salvia",
    swatch: "#9caf88",
    disabled: true,
    description: "Sin stock",
  },
];

const TALLAS: readonly ChoiceOption[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL", disabled: true, description: "Sin stock en esta talla" },
  { value: "xxl", label: "XXL" },
];

function Ficha() {
  const [color, setColor] = useState<string | null>("roble");
  const [talla, setTalla] = useState<string | null>(null);
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Field label="Color">
        <RadioGroup look="swatches" value={color} onChange={setColor} options={COLORES} />
      </Field>
      <Field label="Talla">
        <RadioGroup look="swatches" value={talla} onChange={setTalla} options={TALLAS} />
      </Field>
    </div>
  );
}

/** **Color y talla**: el elegido escrito al lado; el que no hay, tachado y no se puede elegir. */
export const ColorYTalla: Story = {
  name: "Color y talla",
  render: () => <Ficha />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const colores = canvas.getByRole("radiogroup", { name: "Color" });
    await expect(
      within(colores).getByText("Roble", { selector: '[data-ui="radio-group.chosen"]' }),
    ).toBeVisible();
    await userEvent.click(within(colores).getByRole("radio", { name: "Nogal" }));
    await expect(within(colores).getByRole("radio", { name: "Nogal" })).toBeChecked();
    await expect(
      within(colores).getByText("Nogal", { selector: '[data-ui="radio-group.chosen"]' }),
    ).toBeVisible();
    await expect(within(colores).getByRole("radio", { name: "Verde salvia" })).toBeDisabled();
    const tallas = canvas.getByRole("radiogroup", { name: "Talla" });
    await userEvent.click(within(tallas).getByRole("radio", { name: "M" }));
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(tallas).getByRole("radio", { name: "L" })).toBeChecked();
    await expect(within(tallas).getByRole("radio", { name: "XL" })).toBeDisabled();
  },
};

/** **En lectura**: la variante escrita, como cualquier otra elección. */
export const Lectura: Story = {
  render: () => (
    <FormModeProvider value="read">
      <Field label="Color">
        <RadioGroup look="swatches" value="nogal" options={COLORES} />
      </Field>
    </FormModeProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nogal")).toBeVisible();
    await expect(within(canvasElement).queryByRole("radio")).toBeNull();
  },
};
