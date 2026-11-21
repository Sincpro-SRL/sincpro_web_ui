import { type DataColumn, List, RecordCard, SearchField, Tag, Tags } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import {
  bs,
  CATEGORIES,
  MENU,
  type MenuCategory,
  type MenuItem,
} from "../../support/erp-pos";

/**
 * Context: **una lista como grilla de mosaicos** — los productos de una caja, el catálogo de
 * una tienda. La misma lista de siempre (búsqueda, orden, conmutador) con una presentación
 * más: `present="tiles"`, tantos mosaicos por línea como entren. Debajo de la barra, los
 * FILTROS RÁPIDOS (`List.Filters`): las categorías como chips con su conteo, a la vista en vez
 * de detrás del panel de la búsqueda. Y las cifras de la barra filtran al tocarlas.
 */
const meta: Meta = {
  title: "4 · Vistas/Lista/Mosaicos · productos y filtros rápidos",
  tags: ["screen"],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const COLUMNS: DataColumn<MenuItem>[] = [
  { id: "name", header: "producto", value: (m) => m.name },
  {
    id: "category",
    header: "categoría",
    value: (m) => m.category,
    cell: (m) => CATEGORIES.find((c) => c.id === m.category)?.label ?? m.category,
  },
  { id: "stock", header: "stock", value: (m) => m.stock, numeric: true },
  {
    id: "price",
    header: "precio",
    value: (m) => m.price,
    cell: (m) => bs(m.price),
    numeric: true,
  },
];

function Catalog({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [onlyStock, setOnlyStock] = useState(false);
  const [present, setPresent] = useState<string>("tiles");
  const matches = MENU.filter(
    (m) =>
      query === "" || m.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  const shown = matches.filter(
    (m) => (category === "all" || m.category === category) && (!onlyStock || m.stock > 0),
  );
  const soldOut = MENU.filter((m) => m.stock === 0).length;
  return (
    <List<MenuItem>
      items={shown}
      keyOf={(m) => m.id}
      present={present}
      onPresentChange={setPresent}
      onChoose={() => {}}
      filtered={query !== "" || category !== "all" || onlyStock}
    >
      <List.Bar>
        <List.Identity
          title="Menú"
          description="lo que se vende hoy en el mostrador"
          counters={[
            { label: "productos", value: MENU.length },
            {
              label: "con stock",
              value: MENU.length - soldOut,
              onClick: () => setOnlyStock((now) => !now),
              active: onlyStock,
              tone: "good",
            },
            { label: "agotados", value: soldOut, tone: "bad" },
          ]}
        />
        <List.Search>
          <SearchField value={query} onChange={setQuery} placeholder="Buscar un producto…" />
        </List.Search>
      </List.Bar>
      <List.Filters>
        <Tags
          size="md"
          scroll
          label="Categorías"
          items={[{ id: "all", label: "Todo" }, ...CATEGORIES].map((c) => ({
            id: c.id,
            label: c.label,
            count: matches.filter((m) => c.id === "all" || m.category === c.id).length,
            selected: category === c.id,
            onSelect: () => setCategory(c.id as MenuCategory | "all"),
          }))}
        />
      </List.Filters>
      <List.Tiles<MenuItem>
        size={size}
        card={(m, ways) => (
          <RecordCard
            layout="tile"
            title={m.name}
            figure={bs(m.price)}
            media={{ src: m.photo, alt: "" }}
            meta={m.stock === 0 ? "Agotado" : m.stock < 5 ? `Quedan ${m.stock}` : undefined}
            {...(m.before === undefined
              ? {}
              : { tags: <Tag tone="warn">{`antes ${bs(m.before)}`}</Tag> })}
            disabled={m.stock === 0}
            {...(ways.press === undefined ? {} : { onOpen: ways.press })}
          />
        )}
      />
      <List.Table<MenuItem> columns={COLUMNS} />
    </List>
  );
}

/** **La grilla de una caja.** Elegí «Bebidas»: los chips dicen cuántos deja cada categoría.
 *  «con stock» en la barra también filtra. */
export const Grilla: Story = {
  render: () => <Catalog />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("row", { name: /Bebidas/ }));
    await expect(canvas.getByText("Api morado con pastel")).toBeVisible();
    await expect(canvas.queryByText("Capuchino")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: /con stock/ }));
    await expect(canvas.getByRole("button", { name: /con stock/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

/** **Vitrina de una tienda**: mosaicos grandes. */
export const Vitrina: Story = {
  render: () => <Catalog size="lg" />,
};

/** **En el teléfono** la grilla se acomoda: dos por línea, los chips se deslizan. */
export const EnElTelefono: Story = {
  name: "En el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Catalog size="sm" />,
};
