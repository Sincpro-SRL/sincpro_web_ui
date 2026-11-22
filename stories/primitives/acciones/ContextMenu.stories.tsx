import { ContextMenu, type MenuGroup, RecordCard, Tag } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ban, Copy, ExternalLink, Send } from "lucide-react";
import { useState } from "react";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **los verbos de UNA cosa, donde ya está la mano** — clic derecho sobre una fila o
 * una tarjeta, el dedo apoyado en ella, o Shift+F10 / la tecla Menú sobre la que tiene el foco.
 * Es el mismo menú que `Menu` (grupos, íconos, atajos, la fila de peligro al final) abierto en
 * el puntero. Es un atajo y nunca el único camino: lo que está acá también tiene un control a
 * la vista, porque nadie descubre un clic derecho mirando.
 */
const meta: Meta = {
  title: "2 · Primitivas/Acciones/Menú contextual · clic derecho y mantener",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const FACTURAS = [
  { id: "0047", cliente: "Ferretería El Tornillo", total: "Bs 1.250,00", estado: "Pagada" },
  { id: "0048", cliente: "Distribuidora Andina", total: "Bs 480,00", estado: "Por cobrar" },
  { id: "0049", cliente: "Café de los Yungas", total: "Bs 3.900,00", estado: "Borrador" },
];

const verbs = (id: string): MenuGroup[] => [
  {
    options: [
      { id: `abrir:${id}`, label: "Abrir", icon: ExternalLink, shortcut: "Enter" },
      { id: `duplicar:${id}`, label: "Duplicar", icon: Copy },
      { id: `enviar:${id}`, label: "Enviar por correo", icon: Send },
    ],
  },
  { options: [{ id: `anular:${id}`, label: "Anular", icon: Ban, danger: true }] },
];

function Filas() {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col divide-y divide-line rounded-box border border-line bg-surface">
        {FACTURAS.map((f) => (
          <ContextMenu
            key={f.id}
            label={`Acciones de la factura ${f.id}`}
            groups={verbs(f.id)}
            onSelect={setLast}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => setLast(`abrir:${f.id}`)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-meta text-ink outline-0 hover:bg-ink/4 focus-visible:bg-primary/6 ${open ? "bg-primary/6" : ""}`}
              >
                <span className="w-12 font-medium tabular-nums">{f.id}</span>
                <span className="min-w-0 flex-1 truncate">{f.cliente}</span>
                <Tag
                  tone={
                    f.estado === "Pagada"
                      ? "good"
                      : f.estado === "Borrador"
                        ? "neutral"
                        : "warn"
                  }
                >
                  {f.estado}
                </Tag>
                <span className="w-24 text-right tabular-nums">{f.total}</span>
              </button>
            )}
          </ContextMenu>
        ))}
      </div>
      <p className="text-meta text-muted">
        {last === null ? "Clic derecho sobre una fila." : `Elegiste ${last}.`}
      </p>
    </div>
  );
}

/** **Sobre las filas de una lista**: clic derecho abre los verbos de ESA factura, en el puntero;
 *  la fila queda marcada mientras su menú está abierto. */
export const SobreFilas: Story = {
  name: "Sobre las filas",
  render: () => <Filas />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    fireEvent.contextMenu(canvas.getByText("Distribuidora Andina"), {
      clientX: 200,
      clientY: 80,
    });
    const menu = await page.findByRole("menu", { name: "Acciones de la factura 0048" });
    await waitFor(() =>
      expect(within(menu).getByRole("menuitem", { name: /Abrir/ })).toHaveFocus(),
    );
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Duplicar/ }));
    await waitFor(() => expect(page.queryByRole("menu")).toBeNull());
    await expect(canvas.getByText("Elegiste duplicar:0048.")).toBeInTheDocument();
  },
};

/** **Con el teclado**: Shift+F10 sobre la fila que tiene el foco; Escape lo cierra. */
export const ConTeclado: Story = {
  name: "Con el teclado",
  render: () => <Filas />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    canvas.getByText("Café de los Yungas").closest("button")!.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const menu = await page.findByRole("menu", { name: "Acciones de la factura 0049" });
    /* It enters with a fade: visible once the first row has the focus. */
    await waitFor(() =>
      expect(within(menu).getByRole("menuitem", { name: /Abrir/ })).toHaveFocus(),
    );
    await waitFor(() => expect(menu).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("menu")).toBeNull());
  },
};

/** **Sobre las tarjetas de un tablero**: donde no entra un `⋯`, el dedo apoyado o el clic derecho. */
export const SobreTarjetas: Story = {
  name: "Sobre tarjetas",
  render: () => (
    <div className="grid max-w-2xl grid-cols-2 gap-3">
      {FACTURAS.slice(0, 2).map((f) => (
        <ContextMenu key={f.id} label={`Acciones de la factura ${f.id}`} groups={verbs(f.id)}>
          <RecordCard title={f.cliente} subtitle={`Factura ${f.id}`} figure={f.total} />
        </ContextMenu>
      ))}
    </div>
  ),
};
