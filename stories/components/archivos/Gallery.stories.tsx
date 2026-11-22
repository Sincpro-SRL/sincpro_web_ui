import {
  Field,
  Gallery,
  type GalleryImage,
  Price,
  RadioGroup,
  Rating,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **las imágenes de UNA cosa** — un producto, un inmueble, un activo, un daño
 * reportado con el teléfono: una grande, la tira del resto abajo y el tamaño completo al
 * tocarla. La mueve la persona — las flechas a los costados, la tira, las flechas del teclado,
 * el dedo deslizando — y nunca gira sola. Dónde está se escribe («2 / 4»). La foto no se recorta:
 * un producto recortado es otro producto.
 */
const meta: Meta = {
  title: "3 · Componentes/Archivos/Galería · las imágenes de una cosa",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/* Inline SVGs, so the story renders offline and the smoke test never waits on the network. */
function photo(hue: number, label: string, ratio: "square" | "wide" = "square"): string {
  const [w, h] = ratio === "square" ? [400, 400] : [640, 360];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="hsl(${hue} 40% 88%)"/><rect x="${w / 2 - 90}" y="${h / 2 - 70}" width="180" height="120" rx="16" fill="hsl(${hue} 45% 46%)"/><text x="${w / 2}" y="${h - 36}" font-family="sans-serif" font-size="22" text-anchor="middle" fill="hsl(${hue} 45% 26%)">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SILLA: readonly GalleryImage[] = [
  { src: photo(28, "De frente"), alt: "Silla Nórdica, de frente" },
  { src: photo(28, "De costado"), alt: "Silla Nórdica, de costado" },
  { src: photo(28, "Respaldo"), alt: "Silla Nórdica, el respaldo" },
  { src: photo(28, "Detalle"), alt: "Silla Nórdica, detalle de la madera" },
];

/** **Una galería**: las flechas, la tira, y «2 / 4». Tocar la imagen la abre en grande. */
export const Producto: Story = {
  render: () => (
    <div className="max-w-md">
      <Gallery images={SILLA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Imagen siguiente" }));
    await expect(
      canvas.getByRole("button", { name: "Imagen 2 de 4: Silla Nórdica, de costado" }),
    ).toHaveAttribute("aria-current", "true");
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Imagen 4 de 4: Silla Nórdica, detalle de la madera",
      }),
    );
    await expect(
      canvas.getByRole("img", { name: "Silla Nórdica, detalle de la madera" }),
    ).toBeVisible();
    /* Past the last comes the first. */
    await userEvent.click(canvas.getByRole("button", { name: "Imagen siguiente" }));
    await expect(canvas.getByRole("img", { name: "Silla Nórdica, de frente" })).toBeVisible();
  },
};

/** **En tamaño completo**: sobre un velo casi negro; las flechas del teclado y Escape. */
export const TamanoCompleto: Story = {
  name: "Tamaño completo",
  render: () => (
    <div className="max-w-md">
      <Gallery images={SILLA} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Ver en tamaño completo: Silla Nórdica, de frente",
      }),
    );
    const dialog = await page.findByRole("dialog");
    await expect(within(dialog).getByText("Imagen 1 de 4")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(dialog).getByText("Imagen 2 de 4")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
    /* The strip followed the full-size view. */
    await expect(
      canvas.getByRole("button", { name: "Imagen 2 de 4: Silla Nórdica, de costado" }),
    ).toHaveAttribute("aria-current", "true");
  },
};

const COLORES = { roble: 28, nogal: 18, gris: 220 } as const;
type Color = keyof typeof COLORES;

function Variantes() {
  const [color, setColor] = useState<Color>("roble");
  const [talla, setTalla] = useState<string | null>("m");
  const images = (["De frente", "De costado"] as const).map((view) => ({
    src: photo(COLORES[color], view),
    alt: `Silla Nórdica ${color}, ${view.toLowerCase()}`,
  }));
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Gallery images={images} />
      <p className="text-title font-semibold text-ink">Silla Nórdica</p>
      <Rating value={4.6} count={212} />
      <Price value={450} compareAt={520} currency="BOB" size="lg" />
      <Field label="Color">
        <RadioGroup
          look="swatches"
          value={color}
          onChange={(next) => setColor(next as Color)}
          options={[
            { value: "roble", label: "Roble", swatch: "hsl(28 45% 46%)" },
            { value: "nogal", label: "Nogal", swatch: "hsl(18 45% 46%)" },
            { value: "gris", label: "Gris", swatch: "hsl(220 45% 46%)" },
          ]}
        />
      </Field>
      <Field label="Altura">
        <RadioGroup
          look="swatches"
          value={talla}
          onChange={setTalla}
          options={[
            { value: "s", label: "Baja" },
            { value: "m", label: "Comedor" },
            { value: "l", label: "Barra", disabled: true, description: "Sin stock" },
          ]}
        />
      </Field>
    </div>
  );
}

/** **Con la variante**: elegir el color (sus muestras) cambia las fotos — la ficha entera de un producto. */
export const ConVariante: Story = {
  name: "Con la variante",
  render: () => <Variantes />,
};

/** **Sin imágenes, y de una sola**: el hueco lo dice; una sola foto no lleva flechas ni tira. */
export const Vacia: Story = {
  name: "Sin imágenes y de una sola",
  render: () => (
    <div className="grid max-w-2xl grid-cols-2 gap-4">
      <Gallery images={[]} aspect="tile" />
      <Gallery
        images={[{ src: photo(200, "Daño", "wide"), alt: "Abolladura en la puerta trasera" }]}
        aspect="tile"
      />
    </div>
  ),
};
