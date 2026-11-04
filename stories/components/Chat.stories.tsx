import {
  ChatComposer,
  type ChatMessage,
  ChatThread,
  type Conversation,
  ConversationList,
  ToastProvider,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

/**
 * Context: **una conversación**, como la de WhatsApp o Telegram dentro de un CRM: a la izquierda
 * la lista de conversaciones con lo último que se dijo y lo que no se leyó; a la derecha el
 * hilo, que abre en el último mensaje, sigue el final mientras una lo mira y no la arrastra
 * cuando se está leyendo más arriba; abajo, el compositor: Enter envía, Shift+Enter cambia de
 * renglón. Los mensajes propios van de un lado y los ajenos del otro, con el nombre del autor
 * cuando empieza una serie.
 */
const meta = {
  title: "3 · Componentes/Chat · conversación y compositor",
  component: ChatThread,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Lista de conversaciones (teclado con flechas, no leídos en palabras), hilo por días con el último mensaje a la vista y botón «Ir al último», y compositor con Enter para enviar. El hilo no arrastra la lectura si la persona está más arriba.",
      },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="h-[36rem]">
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ChatThread>;

export default meta;
type Story = StoryObj<typeof meta>;

const AHORA = new Date(2026, 10, 4, 15, 40);
const ayer = (h: number, m: number) => new Date(2026, 10, 3, h, m);
const hoy = (h: number, m: number) => new Date(2026, 10, 4, h, m);

const CONVERSACIONES: Conversation[] = [
  {
    id: "ana",
    title: "Ana Ruiz · Clínica San Gabriel",
    preview: "¿Me confirman la entrega del jueves?",
    at: hoy(15, 32),
    unread: 2,
  },
  {
    id: "cem",
    title: "Constructora Illimani",
    preview: "Gracias, lo reviso esta tarde.",
    at: ayer(18, 5),
  },
  {
    id: "pan",
    title: "Panadería Doña Julia",
    preview: "Adjunto el comprobante.",
    at: ayer(9, 14),
    unread: 1,
  },
];

const HILO: ChatMessage[] = [
  {
    id: "1",
    author: "Ana Ruiz",
    body: "Buenas tardes, ¿la factura 0418 ya salió?",
    at: ayer(17, 40),
  },
  {
    id: "2",
    author: "Andrés",
    body: "Sí, la emitimos ayer. Te la paso ahora.",
    at: ayer(17, 52),
    mine: true,
  },
  {
    id: "3",
    author: "Andrés",
    body: "Te dejo también el detalle de los servicios.",
    at: ayer(17, 53),
    mine: true,
  },
  { id: "4", author: "Ana Ruiz", body: "Perfecto, gracias.", at: hoy(9, 2) },
  {
    id: "5",
    author: "Ana Ruiz",
    body: "¿Me confirman la entrega del jueves?",
    at: hoy(15, 32),
  },
];

/** El estado real de la conversación: el hilo, la lista y el compositor se hablan. */
function Conversacion({ inicial }: { inicial: ChatMessage[] }) {
  const [mensajes, setMensajes] = useState(inicial);
  const [abierta, setAbierta] = useState("ana");
  return (
    <div className="grid h-full grid-cols-[minmax(0,16rem)_minmax(0,1fr)] overflow-hidden rounded-control border border-line bg-ground">
      <aside className="flex min-h-0 flex-col border-r border-line bg-surface">
        <ConversationList
          conversations={CONVERSACIONES}
          selectedId={abierta}
          onSelect={setAbierta}
          now={AHORA}
        />
      </aside>
      <section className="flex min-h-0 flex-col">
        <ChatThread
          messages={mensajes}
          now={AHORA}
          label={CONVERSACIONES.find((c) => c.id === abierta)?.title}
        />
        <ChatComposer
          onSend={(texto) =>
            setMensajes((prev) => [
              ...prev,
              {
                id: `n${prev.length}`,
                author: "Andrés",
                body: texto,
                at: new Date(),
                mine: true,
              },
            ])
          }
        />
      </section>
    </div>
  );
}

export const Conversación: Story = {
  args: { messages: HILO },
  render: () => <Conversacion inicial={HILO} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const caja = canvas.getByRole("textbox", { name: "Mensaje" });
    await userEvent.type(caja, "Llegó el detalle, gracias{Enter}");
    await expect(await canvas.findByText("Llegó el detalle, gracias")).toBeVisible();
    await expect(caja).toHaveValue("");
    await userEvent.type(caja, "Línea uno{Shift>}{Enter}{/Shift}Línea dos");
    await expect(caja).toHaveValue("Línea uno\nLínea dos");
  },
};

export const Vacia: Story = {
  args: { messages: [] },
  render: () => <Conversacion inicial={[]} />,
};

/** Dos días y una serie larga: el hilo abre en el último mensaje, no en el primero. */
export const LeyendoHaciaArriba: Story = {
  args: { messages: [] },
  render: () => {
    const mensajes: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
      id: `m${i}`,
      author: i % 3 === 0 ? "Ana Ruiz" : "Andrés",
      body: `Mensaje ${i + 1}: ${i % 4 === 0 ? "un texto un poco más largo para ver cómo se parte el renglón y se mantiene dentro del globo" : "corto"}`,
      at: new Date(2026, 10, i < 12 ? 3 : 4, 9 + (i % 9), i),
      mine: i % 3 !== 0,
    }));
    return <ChatThread messages={mensajes} now={AHORA} onLoadOlder={() => undefined} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Mensaje 30: corto")).toBeVisible();
  },
};
