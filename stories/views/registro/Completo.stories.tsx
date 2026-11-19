import {
  Block,
  Button,
  Cell,
  Copyable,
  DataField,
  MessageComposer,
  Record,
  Table,
  Td,
  Th,
  THead,
  Tr,
  writeANote,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { Receipt, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";

import { lineTotal, money } from "../../support/erp";
import { ORDER_STAGES as STAGES } from "../../support/erp-lists";
import { CLIENTE, EVENTOS, LINEAS, MENSAJES } from "./shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Registro/Completo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un registro entero: el riel con su lugar y sus acciones, la hoja con los hechos y el cuaderno, y la actividad. Las piezas por separado están en `3 · Componentes/Registro`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

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
              created={{ by: "Josefa Muñoz", at: "2026-09-02T11:40:00" }}
              updated={{ by: "Andrés Gutiérrez", at: "2026-10-28T17:05:00" }}
            />
          </Record.Paper>
        </Record>
      </div>
    );
  },
};
