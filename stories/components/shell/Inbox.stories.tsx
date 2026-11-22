import { Block, Inbox, type InboxItem, InboxList, TopBar } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageSquare, Truck } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

/**
 * Context: **las notificaciones** — en el portal, «tu pedido salió a reparto»; en el ERP, «te
 * asignaron una tarea». Desde la barra: una campana con cuántas hay sin leer (el cero no se
 * dibuja, después de 99 dice «99+») y la lista en un popover. Sola, la misma lista es la página
 * «Notificaciones» de un portal. Sin leer no es sólo un color: el punto va con el título en
 * negrita y con la palabra dicha al lector de pantalla.
 */
const meta: Meta = {
  title: "3 · Componentes/Shell/Notificaciones · la campana y la bandeja",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const NOW = new Date("2026-11-22T12:00:00-04:00");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const ITEMS: readonly InboxItem[] = [
  {
    id: "n1",
    title: "Tu pedido 0047 salió a reparto",
    detail: "Llega hoy entre las 15:00 y las 17:00. Seguilo en «Mis pedidos».",
    when: minutesAgo(5),
    unread: true,
    icon: Truck,
  },
  {
    id: "n2",
    title: "El pago con tarjeta fue rechazado",
    detail: "Factura 00112 · Bs 1.250,00. Probá con otra tarjeta o con QR.",
    when: minutesAgo(48),
    unread: true,
    tone: "bad",
  },
  {
    id: "n3",
    title: "Ana Gutiérrez respondió tu consulta",
    detail: "«Sí, el cambio de talla no tiene costo dentro de los 30 días.»",
    when: minutesAgo(60 * 5),
    icon: MessageSquare,
  },
  {
    id: "n4",
    title: "Pago recibido",
    detail: "Factura 00108 · Bs 480,00.",
    when: minutesAgo(60 * 24 * 3),
    tone: "good",
  },
];

function useInbox() {
  const [items, setItems] = useState(ITEMS);
  const [opened, setOpened] = useState<string | null>(null);
  return {
    items,
    opened,
    onOpen: (id: string) => {
      setOpened(id);
      setItems((all) => all.map((one) => (one.id === id ? { ...one, unread: false } : one)));
    },
    onMarkAllRead: () => setItems((all) => all.map((one) => ({ ...one, unread: false }))),
  };
}

function EnLaBarra() {
  const inbox = useInbox();
  return (
    <div className="flex min-h-96 flex-col bg-ground">
      <TopBar
        app={{ label: "Mi cuenta" }}
        systray={
          <Inbox
            items={inbox.items}
            now={NOW}
            onOpen={inbox.onOpen}
            onMarkAllRead={inbox.onMarkAllRead}
            onSeeAll={() => {}}
          />
        }
        user={{ name: "Lucía Rojas" }}
      />
      <p className="p-6 text-body text-muted">
        {inbox.opened === null ? "Tocá la campana." : `Abriste ${inbox.opened}.`}
      </p>
    </div>
  );
}

/** **En la barra**: la campana con sus «2»; abrir una la marca leída y cierra la bandeja. */
export const EnLaBarra_: Story = {
  name: "En la barra",
  render: () => <EnLaBarra />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "Notificaciones: 2" }));
    const dialog = await page.findByRole("dialog", { name: "Notificaciones" });
    await expect(within(dialog).getByText("2 sin leer")).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Tu pedido 0047 salió a reparto/ }),
    );
    await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
    await expect(canvas.getByText("Abriste n1.")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Notificaciones: 1" }),
    ).toBeInTheDocument();
  },
};

/** **Marcar todo como leído**: la campana se queda sin número — el cero no se dibuja. */
export const MarcarTodo: Story = {
  name: "Marcar todo como leído",
  render: () => <EnLaBarra />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "Notificaciones: 2" }));
    const dialog = await page.findByRole("dialog", { name: "Notificaciones" });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Marcar todo como leído" }),
    );
    await expect(within(dialog).queryByText(/sin leer/)).toBeNull();
    await expect(canvas.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
  },
};

function Pagina() {
  const inbox = useInbox();
  return (
    <div className="max-w-xl p-6">
      <Block>
        <InboxList
          items={inbox.items}
          now={NOW}
          onOpen={inbox.onOpen}
          onMarkAllRead={inbox.onMarkAllRead}
        />
      </Block>
    </div>
  );
}

/** **Como página de un portal**: la misma lista, sin la campana. */
export const ComoPagina: Story = {
  name: "Como página",
  render: () => <Pagina />,
};

/** **Nada nuevo**: la frase en lugar de una lista vacía. */
export const Vacia: Story = {
  name: "Nada nuevo",
  render: () => (
    <div className="max-w-sm p-6">
      <Block>
        <InboxList items={[]} />
      </Block>
    </div>
  ),
};
