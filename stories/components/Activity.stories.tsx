import {
  Activity,
  type ActivityAlert,
  type ActivityEvent,
  Button,
  type Message,
  MessageComposer,
  type MessageKind,
  useActivity,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Context: **todo lo que rodea a un registro, en una línea de tiempo.** Arriba lo que es
 * cierto AHORA —los avisos, con su acción—; abajo lo que PASÓ —la conversación, con su
 * compositor, y el historial—, lo más nuevo primero. Cada parte se pliega sola: el
 * historial de un registro con seis meses encima es largo, y plegarlo es cómo la
 * conversación queda a mano. Partes por TIPO y no por día porque un aviso no tiene fecha:
 * es un estado, y agruparlo por día lo escondería en el día en que nació.
 *
 * En un registro (`Record.Activity`) va a la DERECHA de la hoja, unida a ella, cuando la
 * página es ancha —y ahí es también el carril de las notas de cada campo— y DEBAJO cuando
 * no; acá, suelta, se ve en las dos formas según el ancho del lienzo. Las notas alineadas
 * con su campo se ven en `4 · Vistas/Registro`.
 */
const meta = {
  title: "3 · Componentes/Actividad · avisos, conversación e historial",
  component: Activity,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Todo lo que rodea a un registro, en una línea de tiempo con partes que se pliegan: sus avisos (lo que es cierto ahora, con su acción), la conversación y el historial. A la derecha de la hoja cuando la página es ancha, debajo cuando no. Plegada sigue diciendo cuántos avisos y cuántas entradas hay.",
      },
    },
  },
} satisfies Meta<typeof Activity>;

export default meta;
type Story = StoryObj<typeof meta>;

/* La historia de UNA factura: FAC/2026/0118, de Distribuidora Andina S.R.L. */
const EVENTOS: ActivityEvent[] = [
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

const AVISOS: ActivityAlert[] = [
  {
    tone: "warn",
    title: "Vencida hace 5 días",
    children: "Quedan Bs. 9.300,00 pendientes desde el 25/10/2026.",
    action: (
      <Button role="ghost" size="sm">
        Registrar pago
      </Button>
    ),
  },
  {
    tone: "info",
    children: "El cliente tiene otras 2 facturas vencidas por Bs. 21.480,00.",
  },
];

/* The record beside the panel. `@container/page` is what `Record` declares: the same query
   puts the panel at the RIGHT of the record when the canvas is wide and below when not. */
function Escenario({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container/page bg-ground p-8 max-sm:p-3">
      <div className="flex flex-col gap-3 @beside/page:flex-row @beside/page:items-stretch @beside/page:gap-0">
        <div className="min-w-0 flex-1 rounded-box border border-line bg-surface p-4 @beside/page:rounded-r-none">
          <p className="text-body text-muted">La factura FAC/2026/0118.</p>
        </div>
        <div className="min-w-0 @beside/page:flex @beside/page:shrink-0">{children}</div>
      </div>
    </div>
  );
}

/** Lo normal: los avisos arriba, después la conversación y el historial. */
export const TodoJunto: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const panel = useActivity(true);
    return (
      <Escenario>
        <Activity
          open={panel.open}
          onToggle={panel.toggle}
          alerts={AVISOS}
          events={EVENTOS}
          messages={MENSAJES}
          composer={<MessageComposer kinds={FORMAS} onSend={() => {}} />}
        />
      </Escenario>
    );
  },
};

/** Sólo historial, que es lo que hay sin servicio de mensajes: sin `messages` no hay
 *  conversación que mostrar — ni vacía, porque «nadie escribió» sería mentira. */
export const SoloHistorial: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const panel = useActivity(true);
    return (
      <Escenario>
        <Activity open={panel.open} onToggle={panel.toggle} events={EVENTOS} />
      </Escenario>
    );
  },
};

/** Plegada sigue contestando «¿hay algo?» y «¿cuántos?»: los avisos con su tono, los
 *  mensajes y el historial. Al costado es una columna angosta; debajo, una barra. */
export const Plegado: Story = {
  args: { open: false, onToggle: () => {} },
  render: function Render() {
    const panel = useActivity(false);
    return (
      <Escenario>
        <Activity
          open={panel.open}
          onToggle={panel.toggle}
          alerts={AVISOS}
          events={EVENTOS}
          messages={MENSAJES}
        />
      </Escenario>
    );
  },
};

/** Un registro recién creado: nadie escribió y no pasó nada. Cada parte dice SU vacío
 *  —«todavía nadie escribió» no es lo mismo que «todavía no se registró nada»—, y el
 *  compositor sigue arriba: escribir es lo primero que se puede hacer. */
export const Vacio: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const panel = useActivity(true);
    return (
      <Escenario>
        <Activity
          open={panel.open}
          onToggle={panel.toggle}
          events={[]}
          messages={[]}
          composer={<MessageComposer kinds={FORMAS} onSend={() => {}} />}
        />
      </Escenario>
    );
  },
};

/** Siempre debajo (`layout="below"`): para un registro que se edita más de lo que se
 *  lee, donde la hoja necesita todo el ancho. */
export const SiempreDebajo: Story = {
  args: { open: true, onToggle: () => {} },
  render: function Render() {
    const panel = useActivity(true);
    return (
      <div className="flex flex-col gap-3 bg-ground p-8 max-sm:p-3">
        <div className="rounded-box border border-line bg-surface p-4">
          <p className="text-body text-muted">La factura FAC/2026/0118.</p>
        </div>
        <Activity
          layout="below"
          open={panel.open}
          onToggle={panel.toggle}
          events={EVENTOS}
          messages={MENSAJES}
        />
      </div>
    );
  },
};
