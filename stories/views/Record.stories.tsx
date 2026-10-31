import {
  type ActivityEvent,
  Block,
  Button,
  Cell,
  Copyable,
  DataField,
  type Message,
  MessageComposer,
  Record,
  Table,
  Td,
  Th,
  THead,
  Tr,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Receipt, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

import { type InvoiceLine, lineTotal, money } from "../support/erp";
import { ORDER_EVENTS, ORDER_MESSAGES, ORDER_STAGES as STAGES } from "../support/erp-lists";

/**
 * Context: **UN registro, armado.** Las piezas sueltas —el riel, la barra de
 * estado, los contadores— viven en `3 · Componentes/Registro`; acá están compuestas,
 * que es lo que una persona ve.
 *
 * Es el árbol completo y en un solo lugar. Tenerlo dos veces es la garantía de
 * que uno se queda atrás: ya pasó una vez en este sistema, con una pantalla
 * entera en «Patrones» y otra en «Arquetipos».
 *
 * ── Lo que el árbol dice en voz alta ────────────────────────────────
 *
 * Si no hay `<Record.Pager />`, no hay paginador. La forma de un registro es
 * opcional de una manera que una lista de props no puede decir —`pager={undefined}`
 * esconde la geometría adentro de un tipo— y por eso esto se escribe como un
 * árbol.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Registro · UN registro",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un registro entero: el riel con su lugar y sus acciones, la hoja con los hechos y el cuaderno, y la actividad a la derecha. Las piezas por separado están en `3 · Componentes/Registro`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** The four lines of S00142. They add up to the total the rail and the list show. */
const LINEAS: readonly InvoiceLine[] = [
  {
    id: "l1",
    product: "Implementación Odoo — módulo de ventas",
    quantity: 1,
    unitPrice: 12500,
    discount: 0,
  },
  {
    id: "l2",
    product: "Licencia de usuario adicional",
    quantity: 12,
    unitPrice: 350,
    discount: 10,
  },
  {
    id: "l3",
    product: "Capacitación presencial (por hora)",
    quantity: 16,
    unitPrice: 420,
    discount: 0,
  },
  {
    id: "l4",
    product: "Desarrollo a medida (por hora)",
    quantity: 125,
    unitPrice: 280,
    discount: 0,
  },
];

const EVENTOS: ActivityEvent[] = ORDER_EVENTS;
const MENSAJES: Message[] = ORDER_MESSAGES.slice(0, 1);

const CLIENTE = "Importadora y Exportadora del Oriente Boliviano Ltda.";

/**
 * **El registro completo: un pedido de venta.** Riel oscuro arriba con dónde
 * estoy, en cuál de ochenta voy, los contadores que llevan a otro lado, lo que se
 * puede producir y en qué etapa está. Abajo la hoja: los hechos y el cuaderno.
 *
 * Mirá la división de los botones, que es la que más se equivoca: los
 * **contadores** LLEVAN a otro registro y las **acciones** PRODUCEN algo sobre
 * éste. Un «ver las entregas» puesto como acción promete que va a pasar algo acá,
 * y lo que hace es irse.
 *
 * La **actividad** —avisos, conversación e historial— va a la DERECHA de la hoja, unida a
 * ella, cuando la página es ancha, y debajo cuando no. Arranca abierta: en una pantalla
 * grande se ve de una lo que tiene el registro; plegarla deja una tira con sus cuentas.
 */
export const Completo: Story = {
  render: function Render() {
    const [page, setPage] = useState("lineas");

    return (
      <div className="min-h-dvh bg-ground">
        <Record
          identity={{
            icon: ShoppingCart,
            title: `S00142 · ${CLIENTE}`,
            tag: { label: "pedido de venta", tone: "info" },
          }}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[
                { label: "Ventas", onClick: () => {} },
                { label: "Pedidos", onClick: () => {} },
                { label: "S00142" },
              ]}
            />
            <Record.Pager index={12} total={80} onPrev={() => {}} onNext={() => {}} />
            {/* LLEVAN a otro lado. Un cero se dibuja apagado y sin clic: decir
                que no hay ninguna es información. */}
            <Record.Smart
              links={[
                { icon: Truck, count: 2, label: "entregas", onClick: () => {} },
                { icon: Receipt, count: 1, label: "facturas", onClick: () => {} },
                { icon: RotateCcw, count: 0, label: "devoluciones" },
              ]}
            />
            {/* PRODUCEN algo sobre este registro. */}
            <Record.Actions>
              <Button role="primary" size="sm">
                Crear factura
              </Button>
              <Button role="secondary" size="sm">
                Enviar por correo
              </Button>
            </Record.Actions>
            <Record.Status stages={STAGES} current="sale" />
          </Record.Rail>

          <Record.Paper layout="horizontal">
            <Record.Facts
              fields={[
                { label: "Cliente", value: CLIENTE },
                { label: "NIT", value: "3214569870" },
                { label: "Fecha del pedido", value: "28/10/2026" },
                { label: "Total", value: "Bs. 58.000,00" },
                {
                  label: "Orden de compra del cliente",
                  value: <Copyable value="OC-2026-00871" mono />,
                },
              ]}
            />

            <Record.Pages current={page} onChange={setPage}>
              <Record.Page id="lineas" label="líneas" count={LINEAS.length}>
                <Block title="lo que se vende" flush>
                  <Table height={220}>
                    <THead>
                      <Th>producto</Th>
                      <Th numeric>cantidad</Th>
                      <Th numeric>precio unitario</Th>
                      <Th numeric>descuento</Th>
                      <Th numeric>subtotal</Th>
                    </THead>
                    <tbody>
                      {LINEAS.map((linea) => (
                        <Tr key={linea.id}>
                          <Td>{linea.product}</Td>
                          <Td numeric>
                            <Cell value={linea.quantity} />
                          </Td>
                          <Td numeric>{money(linea.unitPrice)}</Td>
                          <Td numeric>
                            {linea.discount === 0 ? "—" : `${linea.discount} %`}
                          </Td>
                          <Td numeric>{money(lineTotal(linea))}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </Block>
              </Record.Page>

              <Record.Page id="entregas" label="entregas" count={2}>
                <DataField label="Almacén" value="Central El Alto" />
                <DataField label="Política de entrega" value="cuando esté todo listo" />
              </Record.Page>

              <Record.Page id="otra" label="otra información">
                <DataField label="Vendedor" value="Andrés Gutiérrez" />
                <DataField label="Términos de pago" value="30 días" />
              </Record.Page>
            </Record.Pages>
          </Record.Paper>

          <Record.Activity
            events={EVENTOS}
            messages={MENSAJES}
            composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
          />
        </Record>
      </div>
    );
  },
};

/**
 * **El riel oscuro, a propósito.** El default es el riel claro: la barra de la
 * aplicación es la única banda oscura de la pantalla, y un riel oscuro debajo se
 * lee como un segundo encabezado. `<Record.Rail surface="chrome">` queda para un
 * registro que es dueño de la única banda oscura —sin barra de aplicación
 * encima—. Los botones, las migas, la barra de estado y el paginador toman la
 * superficie del riel; ninguno la repite.
 */
export const RielOscuro: Story = {
  render: function Render() {
    return (
      <div className="min-h-dvh bg-ground">
        <Record
          identity={{
            icon: ShoppingCart,
            title: `S00142 · ${CLIENTE}`,
            tag: { label: "pedido de venta", tone: "info" },
          }}
        >
          <Record.Rail surface="chrome">
            <Record.Crumbs
              crumbs={[
                { label: "Ventas", onClick: () => {} },
                { label: "Pedidos", onClick: () => {} },
                { label: "S00142" },
              ]}
            />
            <Record.Pager index={12} total={80} onPrev={() => {}} onNext={() => {}} />
            <Record.Actions>
              <Button role="primary" size="sm">
                Crear factura
              </Button>
              <Button role="secondary" size="sm">
                Enviar por correo
              </Button>
            </Record.Actions>
            <Record.Status stages={STAGES} current="sale" />
          </Record.Rail>

          <Record.Paper layout="horizontal">
            <Record.Facts
              fields={[
                { label: "Cliente", value: CLIENTE },
                { label: "NIT", value: "3214569870" },
                { label: "Total", value: "Bs. 58.000,00" },
              ]}
            />
          </Record.Paper>
        </Record>
      </div>
    );
  },
};

/**
 * **Archivado.** Lo que el registro ES ahora va cruzado en la esquina del papel —una palabra
 * con su tono, nunca solo color— y antes de leer un campo ya se sabe que este cliente no está
 * activo. Al pie, quién lo creó y quién lo tocó por última vez: la primera pregunta frente a
 * un dato que parece mal.
 */
export const Archivado: Story = {
  render: function Render() {
    return (
      <div className="min-h-dvh bg-ground">
        <Record
          identity={{
            icon: ShoppingCart,
            title: `S00098 · ${CLIENTE}`,
            tag: { label: "cancelado", tone: "neutral" },
          }}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[
                { label: "Ventas", onClick: () => {} },
                { label: "Pedidos", onClick: () => {} },
                { label: "S00098" },
              ]}
            />
            <Record.Actions>
              <Button role="secondary" size="sm">
                Restaurar
              </Button>
            </Record.Actions>
          </Record.Rail>
          <Record.Paper layout="horizontal">
            <Record.Ribbon label="Archivado" tone="neutral" />
            <Record.Facts
              fields={[
                { label: "Cliente", value: CLIENTE },
                { label: "NIT", value: "3214569870" },
                { label: "Total", value: "Bs. 58.000,00" },
              ]}
            />
            <Record.Audit
              created={{ by: "Josefa Muñoz", at: "02/09/2026 11:40" }}
              updated={{ by: "Andrés Gutiérrez", at: "28/10/2026 17:05" }}
            />
          </Record.Paper>
        </Record>
      </div>
    );
  },
};

/**
 * **Sin riel.** Es lo que quiere un DIÁLOGO: adentro de uno no se navega —las
 * migas y el paginador no tienen a dónde llevar— y el título y las acciones los
 * pone la superficie que lo abrió.
 *
 * No es otro componente ni otra vista: es el mismo árbol sin `<Record.Rail>`. Eso
 * es lo que el árbol permite decir y una lista de props no.
 */
export const SinRiel: Story = {
  render: function Render() {
    const [page, setPage] = useState("lineas");
    return (
      <div className="bg-ground p-8">
        <div className="mx-auto max-w-[44rem] overflow-hidden rounded-panel border border-line-strong bg-surface shadow-float">
          <Record
            identity={{
              icon: ShoppingCart,
              title: "S00141 · Distribuidora Andina S.R.L.",
              tag: { label: "pedido de venta", tone: "info" },
            }}
          >
            <Record.Paper>
              <Record.Facts
                fields={[
                  { label: "Fecha del pedido", value: "27/10/2026" },
                  { label: "Total", value: "Bs. 14.300,00" },
                ]}
              />
              <Record.Pages current={page} onChange={setPage}>
                <Record.Page id="lineas" label="líneas">
                  <p className="text-body text-muted">
                    El mismo árbol, sin riel. Lo que cambia es el anfitrión.
                  </p>
                </Record.Page>
                <Record.Page id="entregas" label="entregas" count={2}>
                  <DataField label="Almacén" value="Central El Alto" />
                </Record.Page>
              </Record.Pages>
            </Record.Paper>
          </Record>
        </div>
      </div>
    );
  },
};

const RIEL = (
  <Record.Rail>
    <Record.Crumbs
      crumbs={[
        { label: "Ventas", onClick: () => {} },
        { label: "Pedidos", onClick: () => {} },
        { label: "S00142" },
      ]}
    />
    <Record.Actions>
      <Button role="primary" size="sm">
        Crear factura
      </Button>
    </Record.Actions>
  </Record.Rail>
);

/**
 * **La actividad a la DERECHA — el default en una página ancha.** Una columna de
 * `--container-activity` unida a la hoja, la pareja centrada: se lee de izquierda a
 * derecha, el registro y después lo que tiene. Arriba, compactos, los AVISOS: los del
 * registro y las notas de sus campos y líneas, cada una diciendo de qué es y llevando a
 * ella. Debajo, siempre a la vista, la LÍNEA DE TIEMPO: mensajes, notas internas y eventos
 * intercalados por fecha, separados por día, con filtros.
 *
 * Achicá la ventana: por debajo de `--container-beside` la actividad baja y queda debajo
 * de la hoja. Es una consulta de
 * CONTENEDOR, no de ventana: en este producto la ventana puede ser enorme y el panel
 * angosto igual.
 */
export const ActividadALaDerecha: Story = {
  render: () => (
    <Record
      identity={{
        icon: ShoppingCart,
        title: "S00142",
        tag: { label: "pedido de venta" },
      }}
    >
      {RIEL}
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            { label: "Cliente", value: CLIENTE },
            { label: "Total", value: "Bs. 58.000,00" },
            {
              label: "Fecha del pedido",
              value: "28/10/2026",
              note: {
                tone: "warn",
                label: "Entrega prometida en 2 días",
                detail: "La impresora todavía no llegó al depósito.",
              },
            },
          ]}
        />
      </Record.Paper>
      <Record.Activity
        defaultOpen
        events={EVENTOS}
        messages={MENSAJES}
        composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
      />
    </Record>
  ),
};

/**
 * **La actividad siempre DEBAJO** (`layout="below"`): para un registro que se edita más
 * de lo que se lee, donde la hoja necesita todo el ancho. Es una tarjeta propia bajo la
 * hoja, al ancho de la hoja — no la última fila del formulario: es sobre el registro, no
 * parte de él.
 */
export const ActividadDebajo: Story = {
  render: () => (
    <Record
      identity={{
        icon: ShoppingCart,
        title: "S00142",
        tag: { label: "pedido de venta" },
      }}
    >
      {RIEL}
      <Record.Paper>
        <Record.Facts
          fields={[
            { label: "Cliente", value: CLIENTE },
            { label: "Total", value: "Bs. 58.000,00" },
          ]}
        />
      </Record.Paper>
      <Record.Activity
        layout="below"
        defaultOpen
        events={EVENTOS}
        messages={MENSAJES}
        composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
      />
    </Record>
  ),
};

/** La ficha todavía no llegó. No es un vacío: el riel, el nombre, los hechos y
 *  las solapas ya ocupan su lugar. Un pedido que tarda en llegar no tiene por
 *  qué decir «no hay nada». */
export const Cargando: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <Record.Skeleton label="Cargando el pedido…" />
    </div>
  ),
};

/**
 * **Sólo la historia, sin mensajes.** Es lo que hay hoy en la mayoría de los
 * registros: sin servicio de mensajería no se le pasan `messages`, y entonces el
 * panel no dibuja el filtro — con una sola fuente, «todo» y esa fuente son la
 * misma lista.
 *
 * Mirá la línea de tiempo: el riel une los puntos y es lo que hace que se lea
 * como una cronología y no como renglones con fecha. El color vive en el punto y
 * el texto se queda en tinta: un renglón entero en rojo no se lee más urgente,
 * se lee peor — y con tres seguidos deja de significar nada.
 *
 * Y las tres cosas que un evento tenía que decir y no decía: **quién** lo hizo,
 * **de qué a qué** cambió el estado, y **qué falló**, entero. Un evento rojo que
 * dice «la factura no se pudo emitir» y nada más manda a alguien a los logs, y
 * quien mira esta pantalla muchas veces no tiene acceso a los logs.
 */
export const SoloLaHistoria: Story = {
  render: function Render() {
    return (
      <div className="bg-ground p-8">
        <Record identity={{ icon: ShoppingCart, title: "S00142" }}>
          {RIEL}
          <Record.Paper>
            <Record.Facts fields={[{ label: "Total", value: "Bs. 58.000,00" }]} />
          </Record.Paper>
          <Record.Activity defaultOpen events={EVENTOS} />
        </Record>
      </div>
    );
  },
};

/**
 * **Los avisos, anclados.** Ningún aviso va entre los campos: ahí empujaban el formulario
 * hacia abajo y se leían como un campo más. Se reparten por lo que le piden a la persona:
 *
 * - **Lo que está mal** (`tone="bad"`, y el `error` de la operación) queda siempre a la
 *   vista, AFUERA de la hoja: entre el riel y el papel.
 * - **El resto** vive en la sección «Avisos» de la ACTIVIDAD, cada uno con su título, su
 *   frase y su acción; el riel guarda UN indicador —«⚠ 2 avisos», con el tono del más
 *   urgente— que abre la actividad y lleva el foco a esos avisos. Un registro sin
 *   actividad (un modal, un cajón) los abre en un popover desde el mismo indicador.
 * - **Lo que es de UN campo** no es un aviso del registro: es la `note` del campo. Una
 *   marca (`Flag`) al lado del rótulo dice DÓNDE y abre la frase; en la actividad, la nota
 *   se lista con los avisos y lleva de vuelta al campo. Un lector de pantalla la oye con el
 *   campo.
 */
export const ConAvisos: Story = {
  render: function Render() {
    const [sent, setSent] = useState(true);
    return (
      <div className="bg-ground p-8 max-sm:p-0">
        <Record
          identity={{
            icon: Receipt,
            title: "FAC/2026/0115",
            subtitle: CLIENTE,
            tag: { label: "vencida", tone: "bad" },
            figure: { label: "Saldo", value: "Bs. 12.480,00" },
          }}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[{ label: "Facturas", onClick: () => {} }, { label: "FAC/2026/0115" }]}
            />
            <Record.Smart links={[{ icon: Truck, count: 1, label: "entregas" }]} />
            <Record.Actions>
              <Button role="primary" size="sm">
                Registrar pago
              </Button>
            </Record.Actions>
          </Record.Rail>

          <Record.Paper layout="horizontal">
            {/* Lo que está mal: siempre a la vista, entre el riel y el papel. */}
            <Record.Notice tone="bad">
              El SIN rechazó la factura: el NIT 3214569870 no está habilitado para facturar.
            </Record.Notice>
            {/* El resto: al indicador del riel, en orden de urgencia. */}
            <Record.Notice
              tone="warn"
              title="Posible factura duplicada"
              action={
                <Button role="ghost" size="sm">
                  Ver FAC/2026/0098
                </Button>
              }
            >
              FAC/2026/0098 tiene el mismo cliente y el mismo monto.
            </Record.Notice>
            {sent ? (
              <Record.Notice tone="good" onDismiss={() => setSent(false)}>
                Se envió por correo al cliente el 30/10/2026.
              </Record.Notice>
            ) : null}

            {/* Lo que es de UN campo: su nota — una marca junto al rótulo, y en la actividad. */}
            <Record.Facts
              fields={[
                {
                  label: "Cliente",
                  value: CLIENTE,
                  note: {
                    tone: "info",
                    label: "Tiene una nota de crédito sin aplicar",
                    detail: "NC/2026/0012 por Bs. 1.200,00.",
                    action: (
                      <Button role="ghost" size="sm">
                        Aplicar
                      </Button>
                    ),
                  },
                },
                { label: "Emitida", value: "18/09/2026" },
                /* One note per row of facts: two cards at the same height would overlap in
                   the margin — the margin has no layout of its own to stack them. */
                { label: "Vence", value: "18/10/2026" },
              ]}
            />
            <Record.Pages current="otra">
              <Record.Page id="lineas" label="líneas" count={LINEAS.length}>
                <DataField label="Líneas" value={`${LINEAS.length} productos`} />
              </Record.Page>
              <Record.Page id="otra" label="otra información">
                <DataField label="Vendedor" value="Andrés Gutiérrez" />
                <DataField
                  label="Plazo de pago"
                  value="30 días"
                  note={{
                    tone: "info",
                    label: "El cliente suele pagar a 45 días",
                    detail: "Promedio de las últimas 12 facturas.",
                  }}
                />
              </Record.Page>
            </Record.Pages>
          </Record.Paper>

          {/* Con panel de actividad, «⚠ N avisos» del riel lo abre y lleva el foco a sus
              avisos: a la derecha en una página ancha, debajo (con scroll) en una angosta. */}
          <Record.Activity
            events={EVENTOS}
            messages={MENSAJES}
            composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
          />
        </Record>
      </div>
    );
  },
};
