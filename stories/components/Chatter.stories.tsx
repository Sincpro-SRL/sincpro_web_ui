import {
  Chatter,
  type ChatterEvent,
  type Message,
  MessageComposer,
  type MessageKind,
  useChatter,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "3 · Componentes/Chatter · eventos y mensajes",
  component: Chatter,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Lo que el sistema anotó y lo que la gente escribió, en un solo lugar y MEZCLADO por defecto: la pregunta que alguien tiene es «qué pasó acá», no «qué pasó acá según el sistema». Las otras dos pestañas son un recorte de la primera, para cuando ya sabés qué mitad querés. Las pestañas las decide el componente y no cada pantalla — qué le pasó a un registro es la misma pregunta en todos lados, así que la respuesta es del componente.",
      },
    },
  },
} satisfies Meta<typeof Chatter>;

export default meta;
type Story = StoryObj<typeof meta>;

/* La historia de UNA factura: FAC/2026/0118, de Distribuidora Andina S.R.L. */
const EVENTOS: ChatterEvent[] = [
  {
    id: "e1",
    label: "se creó el borrador de la factura",
    at: "2026-10-02T14:10:00Z",
    by: "Andrés Gutiérrez",
    detail: "3 líneas · Bs. 14.300,00",
  },
  {
    id: "e2",
    label: "cambió de estado",
    at: "2026-10-03T09:30:00Z",
    tone: "info",
    by: "Josefa Muñoz",
    moved: { from: "borrador", to: "publicada" },
  },
  {
    id: "e3",
    label: "se envió por correo al cliente",
    at: "2026-10-03T09:31:00Z",
    tone: "info",
    detail: "a compras@distribuidoraandina.com.bo · con el PDF y el XML",
  },
  {
    id: "e4",
    label: "se registró un pago parcial",
    at: "2026-10-12T16:45:00Z",
    tone: "good",
    by: "Carla Rojas",
    moved: { from: "publicada", to: "pago parcial" },
    detail: "Bs. 5.000,00 por transferencia al Banco Nacional de Bolivia",
  },
  {
    id: "e5",
    label: "venció sin el pago completo",
    at: "2026-10-25T00:00:00Z",
    tone: "bad",
    moved: { from: "pago parcial", to: "vencida" },
    error:
      "Saldo pendiente de Bs. 9.300,00 al vencimiento (25/10/2026). El cliente tiene otras 2 facturas vencidas por Bs. 21.480,00 en total.",
  },
];

const MENSAJES: Message[] = [
  {
    id: "m1",
    author: "Carla Rojas",
    at: "2026-10-27T08:35:00Z",
    body: "La factura venció con Bs. 9.300 pendientes. ¿Les damos los 15 días extra que pidieron en la reunión o bloqueamos los pedidos nuevos hasta que paguen?",
  },
  {
    id: "m2",
    author: "Josefa Muñoz",
    at: "2026-10-27T09:02:00Z",
    internal: true,
    body: "Démosles los 15 días, pero sin pedidos nuevos a crédito mientras tanto. Ya tienen dos más vencidas.",
  },
];

const FORMAS: MessageKind[] = [
  {
    id: "message",
    label: "Enviar mensaje",
    recipients: ["compras@distribuidoraandina.com.bo", "cobranzas@sincpro.com.bo"],
  },
  writeANote(),
  { id: "whatsapp", label: "WhatsApp", recipients: ["+591 700 12345"] },
];

function Escenario({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container flex flex-col gap-3 bg-ground p-8 @4xl:flex-row @4xl:items-start">
      <div className="min-w-0 flex-1 rounded-box border border-line bg-surface p-4">
        <p className="text-body text-muted">La factura FAC/2026/0118.</p>
      </div>
      {children}
    </div>
  );
}

/** Lo normal: las dos fuentes, mezcladas. La pestaña «todo» es la que abre. */
export const TodoJunto: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const chatter = useChatter(true);
    return (
      <Escenario>
        <Chatter
          open={chatter.open}
          onToggle={chatter.toggle}
          events={EVENTOS}
          messages={MENSAJES}
          composer={<MessageComposer kinds={FORMAS} onSend={() => {}} />}
        />
      </Escenario>
    );
  },
};

/** Sólo eventos, que es lo que hay hoy: sin servicio de mensajes no se le pasan
 *  `messages`, y entonces no dibuja pestañas — con una sola fuente, «todo» y esa
 *  fuente son la misma lista. */
export const SoloEventos: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const chatter = useChatter(true);
    return (
      <Escenario>
        <Chatter open={chatter.open} onToggle={chatter.toggle} events={EVENTOS} />
      </Escenario>
    );
  },
};

/** Plegado sigue contestando «¿hay algo?» y «¿cuántos?» — la misma regla que
 *  `SmartButton`, para que el clic que abre no sea el que descubre que estaba
 *  vacío. Tira al costado, barra abajo. */
export const Plegado: Story = {
  args: { open: false, onToggle: () => {} },
  render: function Render() {
    const chatter = useChatter(false);
    return (
      <Escenario>
        <Chatter
          open={chatter.open}
          onToggle={chatter.toggle}
          events={EVENTOS}
          messages={MENSAJES}
        />
      </Escenario>
    );
  },
};

/**
 * **A página completa**: debajo del registro y a todo el ancho, como una hoja
 * propia. Es lo que quiere una pantalla de registro entera — la conversación no
 * es un costado del formulario, es la otra mitad de la página.
 *
 * Dos cosas cambian respecto de la variante al costado, y ninguna es cosmética:
 * el texto se acota a una MEDIDA de lectura en vez de estirarse de punta a punta
 * —un párrafo de 1700 px es una línea que se pierde al volver al principio—, y
 * plegar deja de tener sentido mientras haya ancho: acá el plegado es de
 * pantalla chica.
 */
export const PaginaCompleta: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const chatter = useChatter(true);
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="rounded-box border border-line bg-surface p-4">
          <p className="text-body text-muted">La factura FAC/2026/0118, a todo el ancho.</p>
        </div>
        <Chatter
          layout="page"
          open={chatter.open}
          onToggle={chatter.toggle}
          events={EVENTOS}
          messages={MENSAJES}
          composer={<MessageComposer kinds={FORMAS} onSend={() => {}} />}
        />
      </div>
    );
  },
};

/** La misma hoja, plegada. En una pantalla chica el chatter se reduce a una
 *  BANDA a todo el ancho —y no a una tira vertical al costado, porque en una
 *  hoja no hay costado que ganar— que sigue diciendo cuántos hay. */
export const PaginaPlegada: Story = {
  args: { open: false, onToggle: () => {} },
  render: function Render() {
    const chatter = useChatter(false);
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="rounded-box border border-line bg-surface p-4">
          <p className="text-body text-muted">La factura FAC/2026/0118, a todo el ancho.</p>
        </div>
        <Chatter
          layout="page"
          open={chatter.open}
          onToggle={chatter.toggle}
          events={EVENTOS}
          messages={MENSAJES}
        />
      </div>
    );
  },
};
