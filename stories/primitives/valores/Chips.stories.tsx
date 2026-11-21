import { Tags } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Coffee, CupSoda, Sandwich, Soup, Star } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **chips que se eligen**, en tres tamaños que son LUGARES: `sm` una línea de texto
 * (los chips de un campo, de la barra de búsqueda), `md` un control de la barra (los filtros
 * rápidos de una lista, las facetas de una tienda), `lg` las categorías de una caja o un
 * kiosco, apuntadas a un brazo de distancia. Con `count` cada chip dice cuántos deja; con
 * `scroll` van en una fila que se desliza, porque las categorías de una caja se encuentran por
 * posición y no deben moverse cuando se agrega una.
 */
const meta: Meta = {
  title: "2 · Primitivas/Valores/Chips · tamaños, conteo y fila",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const CATEGORIES = [
  { id: "all", label: "Todo", count: 16, icon: Star },
  { id: "cafe", label: "Café", count: 4, icon: Coffee },
  { id: "bebidas", label: "Bebidas", count: 4, icon: CupSoda },
  { id: "saltenas", label: "Salteñas", count: 3, icon: Soup },
  { id: "sandwiches", label: "Sándwiches", count: 2, icon: Sandwich },
  { id: "dulces", label: "Dulces", count: 3 },
];

/** **Las categorías de una caja**: grandes, una sola elegida, en una fila que se desliza. */
export const Categorias: Story = {
  render: function Render() {
    const [chosen, setChosen] = useState("all");
    return (
      <div className="max-w-lg">
        <Tags
          size="lg"
          scroll
          label="Categorías"
          items={CATEGORIES.map((c) => ({
            ...c,
            selected: chosen === c.id,
            onSelect: () => setChosen(c.id),
          }))}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drinks = canvas.getByRole("row", { name: /Bebidas/ });
    await userEvent.click(drinks);
    await expect(drinks).toHaveAttribute("aria-selected", "true");
  },
};

/** **Filtros rápidos**: tamaño de control, varios a la vez, con cuántos deja cada uno. */
export const Facetas: Story = {
  render: function Render() {
    const [chosen, setChosen] = useState<string[]>(["stock"]);
    const toggle = (id: string) =>
      setChosen((now) => (now.includes(id) ? now.filter((one) => one !== id) : [...now, id]));
    return (
      <Tags
        size="md"
        multiple
        label="Filtrar"
        items={[
          { id: "stock", label: "Con stock", count: 12 },
          { id: "promo", label: "En promoción", count: 2, tone: "warn" as const },
          { id: "new", label: "Nuevos", count: 3 },
        ].map((f) => ({
          ...f,
          selected: chosen.includes(f.id),
          onSelect: () => toggle(f.id),
        }))}
      />
    );
  },
};

/** **Los tres tamaños**, lado a lado. */
export const Tamanos: Story = {
  name: "Tamaños",
  render: () => (
    <div className="flex flex-col gap-3">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Tags
          key={size}
          size={size}
          label={`Tamaño ${size}`}
          items={CATEGORIES.slice(0, 3).map((c, at) => ({
            id: c.id,
            label: c.label,
            count: c.count,
            selected: at === 0,
            onSelect: () => {},
          }))}
        />
      ))}
    </div>
  ),
};
