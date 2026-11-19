import { List, type OpenTarget, ViewStyleProvider } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { COLUMNAS, type Item, ITEMS } from "./shared";

const meta: Meta = {
  tags: ["screen"],
  title: "4 · Vistas/Lista/Entrar a una fila",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las formas de entrar al registro de una fila, en UN lugar: al final de la fila, 👁 (mirarlo sin salir), ↗ (abrirlo) y «Abrir en…» con los otros lugares que el espacio de trabajo tiene (`openTargets` + `onOpenIn`) — al costado, en una ventana, en un modal. En el estilo moderno son una píldora azul translúcida, la del paginador: navegar tiene ese color en todo el sistema.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Pedidos() {
  const [went, setWent] = useState("—");
  return (
    <div className="min-h-dvh bg-ground">
      <p className="px-5 py-2 text-meta text-muted">Último: {went}</p>
      <List<Item>
        items={ITEMS.slice(0, 5)}
        keyOf={(d) => d.id}
        onPeek={(d) => setWent(`mirar ${d.number}`)}
        onOpen={(d) => setWent(`abrir ${d.number}`)}
        openTargets={["side", "window", "modal"] satisfies OpenTarget[]}
        onOpenIn={(d, to) => setWent(`${to} ${d.number}`)}
      >
        <List.Table<Item> columns={COLUMNAS} />
      </List>
    </div>
  );
}

async function waysWork(canvasElement: HTMLElement, look: "pill" | "plain") {
  const canvas = within(canvasElement);
  const page = within(document.body);
  const ways = await waitFor(() => {
    const found = canvasElement.querySelectorAll<HTMLElement>('[data-ui="row.ways"]');
    expect(found.length).toBe(5);
    return [...found];
  });
  await expect(ways[0]!.getAttribute("data-look")).toBe(look);
  const first = within(ways[0]!);
  await userEvent.click(first.getByRole("button", { name: "Abrir en…" }));
  await userEvent.click(await page.findByRole("menuitem", { name: /ventana/i }));
  await waitFor(() => expect(canvas.getByText(/^Último: window /)).toBeVisible());
  await userEvent.click(first.getByRole("button", { name: /^Mirar|^Vista previa|^Ver/ }));
  await waitFor(() => expect(canvas.getByText(/^Último: mirar /)).toBeVisible());
}

export const Moderno: Story = {
  render: () => (
    <ViewStyleProvider value="modern">
      <Pedidos />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => waysWork(canvasElement, "pill"),
};

export const Tradicional: Story = {
  render: () => <Pedidos />,
  play: async ({ canvasElement }) => waysWork(canvasElement, "plain"),
};
