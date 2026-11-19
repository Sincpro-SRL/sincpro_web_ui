import {
  Button,
  DataField,
  DensityProvider,
  MessageComposer,
  Record,
  writeANote,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { Receipt, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { expect, within } from "storybook/test";

import { CLIENTE, EVENTOS, LINEAS, MENSAJES, RIEL } from "./shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Registro/Actividad y avisos",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Lo que está alrededor del registro: avisos, conversación e historial — a la derecha de la hoja, debajo, o solo.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

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

/**
 * **Quién y cuándo, en un diálogo.** El pie del papel habla como el formulario que cierra:
 * una etiqueta y su valor, la persona como el chip de cualquier campo de persona y la fecha
 * escrita por el sistema (DD/MM/AAAA HH:mm), no una frase con lo que la aplicación mandó.
 * En compacto el cuerpo no tiene margen lateral, y el pie tampoco: arranca en la misma
 * vertical que los campos. Sin autor —una importación, una sincronización— dice solo cuándo.
 */
export const AuditoriaEnDialogo: Story = {
  render: function Render() {
    return (
      <div className="bg-ground p-8">
        <div className="mx-auto max-w-[36rem] overflow-hidden rounded-panel border border-line-strong bg-surface p-4 shadow-float">
          <DensityProvider value="compact">
            <Record identity={{ icon: ShoppingCart, title: "S00141" }}>
              <Record.Paper>
                <Record.Facts
                  fields={[
                    { label: "Cliente", value: "Distribuidora Andina S.R.L." },
                    { label: "Total", value: "Bs. 14.300,00" },
                  ]}
                />
                <Record.Audit
                  created={{ at: "2026-09-02T11:40:00" }}
                  updated={{
                    by: { name: "Josefa Muñoz", role: "Tesorería", onOpen: () => {} },
                    at: new Date(2026, 9, 28, 17, 5),
                  }}
                />
              </Record.Paper>
            </Record>
          </DensityProvider>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const created = await canvas.findByText("Creado");
    const footer = created.closest("dl")!;
    /* The footer starts on the same vertical as the facts it closes. */
    const fact = canvas.getByText("Cliente").closest("dl")!;
    await expect(Math.round(footer.getBoundingClientRect().left)).toBe(
      Math.round(fact.getBoundingClientRect().left),
    );
    /* No author: only when, never «por —». */
    await expect(created.nextElementSibling).toHaveTextContent(/^02\/09\/2026 11:40$/);
    /* The author is the chip, and it opens the person's card. */
    await expect(canvas.getByRole("button", { name: /Josefa Muñoz/ })).toBeVisible();
    await expect(canvas.getByText("28/10/2026 17:05")).toBeVisible();
  },
};
