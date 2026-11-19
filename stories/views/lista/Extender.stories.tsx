import {
  GroupingLevels,
  List,
  type ListPresent,
  SearchBar,
  type SortState,
  useGroupingControl,
  useTreeControl,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { orderName } from "../../support/erp-lists";
import type { Item } from "./shared";
import {
  AGRUPABLES,
  COLUMNAS,
  FACETAS,
  filaDe,
  Galeria,
  ITEMS,
  ORDENABLES,
  pileOf,
  Tarjeta,
} from "./shared";

const meta: Meta<typeof List<Item>> = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Lista/Extender",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una presentación o una tarjeta propia, con el mismo conjunto: orden, montones y selección siguen siendo de la lista.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof List<Item>>;

export const UnaPresentacionPropia: Story = {
  render: function Render() {
    const [present, setPresent] = useState<ListPresent>("gallery");
    const [sort, setSort] = useState<SortState[]>([{ key: "total", direction: "desc" }]);
    const [visto, setVisto] = useState("ninguno");
    const [elegidos, setElegidos] = useState<string[]>([]);
    const grouping = useGroupingControl();
    const tree = useTreeControl();
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS}
            keyOf={(d) => d.id}
            present={present}
            onPresentChange={setPresent}
            sort={sort}
            onSortChange={setSort}
            sortable={ORDENABLES}
            group={{
              levels: grouping.levels,
              of: pileOf,
              collapsed: tree.collapsed,
              onToggle: tree.toggle,
            }}
            selection={{
              has: (id) => elegidos.includes(id),
              toggle: (id) =>
                setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id])),
              count: elegidos.length,
              clear: () => setElegidos([]),
            }}
            onPeek={(d) => setVisto(`vista previa · ${orderName(d)}`)}
            onOpen={(d) => setVisto(`abrir · ${orderName(d)}`)}
          >
            <List.Bar>
              <List.Identity title="Pedidos" />
              <List.Search>
                <SearchBar
                  facets={FACETAS}
                  criteria={[]}
                  onCriteriaChange={() => {}}
                  grouping={<GroupingLevels fields={AGRUPABLES} control={grouping} />}
                />
              </List.Search>
            </List.Bar>
            <List.Rows<Item> row={filaDe} />
            <List.Present<Item> id="gallery" label="Galería" icon={LayoutDashboard}>
              {(set) => <Galeria set={set} />}
            </List.Present>
            <List.Table<Item> columns={COLUMNAS} />
          </List>
        </div>
        <p className="text-meta text-muted">
          último gesto: <span className="text-ink">{visto}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* It takes its place in the switcher in the order the tree wrote it. */
    const switcher = within(canvas.getByRole("group", { name: "Cómo verlo" }));
    await expect(
      switcher.getAllByRole("button").map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Filas", "Galería", "Tabla"]);
    /* It draws the set sorted by the bar: the largest total first. */
    const largest = [...ITEMS].sort((a, b) => b.total - a.total)[0]!;
    const gallery = within(canvas.getByRole("list", { name: "galería" }));
    await expect(gallery.getAllByRole("listitem")[0]).toHaveTextContent(orderName(largest));
    /* A press follows the list's rule — a look first — and the selection is the list's. */
    await userEvent.click(gallery.getByText(orderName(largest)));
    await expect(canvas.getByText(/^último gesto:/)).toHaveTextContent(
      `vista previa · ${orderName(largest)}`,
    );
    await userEvent.click(
      gallery.getByRole("checkbox", { name: `Elegir ${orderName(largest)}` }),
    );
    await expect(
      gallery.getByRole("checkbox", { name: `Elegir ${orderName(largest)}` }),
    ).toBeChecked();
    /* Switching away and back keeps it: the selection belongs to the set, not the tiles. */
    await userEvent.click(switcher.getByRole("button", { name: "Tabla" }));
    await userEvent.click(switcher.getByRole("button", { name: "Galería" }));
    await expect(
      canvas.getByRole("checkbox", { name: `Elegir ${orderName(largest)}` }),
    ).toBeChecked();
  },
};

/**
 * **Una tarjeta propia abre como las del sistema.** El dominio dibuja su tarjeta y recibe, al
 * lado del registro, lo que hace un clic en ESTA lista (`ways.press`): una vista previa
 * primero, como la fila. Antes la tarjeta propia perdía el «abrir» y la aplicación se lo
 * tenía que pasar a mano.
 */
export const TarjetaPropia: Story = {
  render: function Render() {
    const [visto, setVisto] = useState("ninguno");
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS.slice(0, 6)}
            keyOf={(d) => d.id}
            present="board"
            onPeek={(d) => setVisto(`vista previa · ${orderName(d)}`)}
            onOpen={(d) => setVisto(`abrir · ${orderName(d)}`)}
          >
            <List.Bar>
              <List.Identity title="Pedidos" />
            </List.Bar>
            <List.Board<Item> card={(d, ways) => <Tarjeta d={d} ways={ways} />} />
          </List>
        </div>
        <p className="text-meta text-muted">
          último gesto: <span className="text-ink">{visto}</span>
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = ITEMS[0]!;
    await userEvent.click(canvas.getByRole("button", { name: new RegExp(first.number) }));
    await expect(canvas.getByText(/^último gesto:/)).toHaveTextContent(
      `vista previa · ${orderName(first)}`,
    );
  },
};
