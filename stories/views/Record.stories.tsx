import {
  Block,
  Button,
  Cell,
  Chatter,
  type ChatterEvent,
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
  useChatter,
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
  title: "4 · Vistas/Registro · UN registro",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un registro entero: el riel con su lugar y sus acciones, la hoja con los hechos y el cuaderno, y el chatter al costado. Las piezas por separado están en `3 · Componentes/Registro`.",
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

const EVENTOS: ChatterEvent[] = ORDER_EVENTS;
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
 * El chatter va al costado cuando hay ancho y abajo cuando no. Arranca plegado:
 * abierto, se lleva una columna de 22rem en cada registro que abrís, antes de
 * que nadie la haya pedido.
 */
export const Completo: Story = {
  render: function Render() {
    const [page, setPage] = useState("lineas");
    const chatter = useChatter(false);

    return (
      <div className="bg-ground p-8">
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

          <Record.Chatter>
            <Chatter
              open={chatter.open}
              onToggle={chatter.toggle}
              events={EVENTOS}
              messages={MENSAJES}
              composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
            />
          </Record.Chatter>
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
      <div className="bg-ground p-8">
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

/**
 * **El chatter ABAJO — el default.** Debajo del registro y a todo el ancho, como
 * hoja propia.
 *
 * Es el default y no por comodidad: un formulario necesita su ancho para que los
 * campos no se apilen, y una columna de 22rem al costado se lo come en cuanto la
 * pantalla no sobra. Abajo, la conversación no compite con el registro.
 *
 * En esta variante plegar es de pantalla chica: mientras haya ancho, plegarlo
 * esconde media pantalla para no ganar nada.
 */
export const ChatterAbajo: Story = {
  render: function Render() {
    const chatter = useChatter(true);
    return (
      <div className="bg-ground p-8">
        <Record
          identity={{
            icon: ShoppingCart,
            title: "S00142",
            tag: { label: "pedido de venta" },
          }}
        >
          <Record.Paper>
            <Record.Facts
              fields={[
                { label: "Cliente", value: CLIENTE },
                { label: "Total", value: "Bs. 58.000,00" },
              ]}
            />
          </Record.Paper>

          <Record.Chatter layout="page">
            <Chatter
              layout="page"
              open={chatter.open}
              onToggle={chatter.toggle}
              events={EVENTOS}
              messages={MENSAJES}
              composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
            />
          </Record.Chatter>
        </Record>
      </div>
    );
  },
};

/**
 * **El chatter AL COSTADO.** La otra variante, y la que hay que pedir
 * explícitamente con `layout="aside"`.
 *
 * Es para un registro que se LEE más de lo que se edita: ahí tener la historia a
 * la vista mientras se mira el dato vale el ancho que cuesta. En un formulario
 * no — le come el ancho a los campos y los apila.
 *
 * **Responde al tamaño.** Al costado sólo cuando hay ancho; en una pantalla
 * angosta —o en un panel de 380 px con otros tres abiertos— baja solo y se pone
 * debajo. Por eso la regla es una consulta de CONTENEDOR y no de ventana: en
 * este producto la ventana puede ser enorme y el panel angosto igual.
 *
 * Achicá la ventana y mirá cómo pasa de columna a fila.
 */
export const ChatterAlCostado: Story = {
  render: function Render() {
    const chatter = useChatter(true);
    return (
      <div className="bg-ground p-8">
        <Record
          identity={{
            icon: ShoppingCart,
            title: "S00142",
            tag: { label: "pedido de venta" },
          }}
        >
          <Record.Paper layout="horizontal">
            <Record.Facts
              fields={[
                { label: "Cliente", value: CLIENTE },
                { label: "Total", value: "Bs. 58.000,00" },
                { label: "Fecha del pedido", value: "28/10/2026" },
              ]}
            />
          </Record.Paper>

          <Record.Chatter layout="aside">
            <Chatter
              layout="aside"
              open={chatter.open}
              onToggle={chatter.toggle}
              events={EVENTOS}
              messages={MENSAJES}
              composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
            />
          </Record.Chatter>
        </Record>
      </div>
    );
  },
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
 * chatter no dibuja pestañas — con una sola fuente, «todo» y esa fuente son la
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
    const chatter = useChatter(true);
    return (
      <div className="bg-ground p-8">
        <Record identity={{ icon: ShoppingCart, title: "S00142" }}>
          <Record.Paper>
            <Record.Facts fields={[{ label: "Total", value: "Bs. 58.000,00" }]} />
          </Record.Paper>
          <Record.Chatter>
            <Chatter open={chatter.open} onToggle={chatter.toggle} events={EVENTOS} />
          </Record.Chatter>
        </Record>
      </div>
    );
  },
};
