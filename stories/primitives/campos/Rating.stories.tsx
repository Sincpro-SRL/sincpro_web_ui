import { Field, FormModeProvider, Rating } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **estrellas para «qué tan bueno»** — el promedio de un producto, de un proveedor, de
 * un técnico; o la opinión que se pide al cerrar un ticket. La hermana de `Prioridad` (las tres
 * estrellas de urgencia de Odoo): ésta dibuja medias estrellas, la CIFRA al lado («4,5» se lee;
 * cuatro estrellas y media sólo se estiman) y de cuántas opiniones sale.
 */
const meta: Meta = {
  title: "2 · Primitivas/Campos/Calificación · estrellas con su cifra",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** **El promedio**: estrellas, la cifra y cuántas opiniones. Una sola imagen con todo en su nombre. */
export const Promedio: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Rating value={4.5} count={128} size="lg" />
      <Rating value={3.8} count={1520} />
      <Rating value={5} count={1} size="sm" />
      <Rating value={0} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("img", { name: "Calificación: 4,5 de 5, 128 opiniones" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("img", { name: "Calificación: todavía sin calificar" }),
    ).toBeInTheDocument();
  },
};

function Pregunta() {
  const [value, setValue] = useState(0);
  return (
    <Field label="¿Cómo te atendimos?" hint="Una estrella es «mal», cinco es «excelente».">
      <Rating value={value} onChange={setValue} size="lg" />
    </Field>
  );
}

/** **La pregunta**: un grupo de radios nombrado por su `Field`, una parada de Tab y las flechas adentro. */
export const Pregunta_: Story = {
  name: "Pregunta",
  render: () => <Pregunta />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("radiogroup", { name: "¿Cómo te atendimos?" });
    await expect(group).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("radio", { name: "3 de 5 estrellas" }));
    await expect(canvas.getByRole("radio", { name: "3 de 5 estrellas" })).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "4 de 5 estrellas" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "4 de 5 estrellas" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("radio", { name: "5 de 5 estrellas" })).toBeChecked();
  },
};

/** **En lectura**: el mismo control en un formulario que se lee se dibuja como el promedio. */
export const Lectura: Story = {
  render: () => (
    <FormModeProvider value="read">
      <Field label="Calificación del proveedor">
        <Rating value={4} onChange={() => {}} />
      </Field>
    </FormModeProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("radiogroup")).toBeNull();
  },
};
