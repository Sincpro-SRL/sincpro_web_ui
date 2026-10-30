import { Menu } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, Mail, MoreHorizontal, Plus, Printer, Truck } from "lucide-react";

import { OnCanvas, OnChrome } from "../support/surface";

const meta = {
  title: "2 · Primitivas/Menu",
  component: Menu,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Dirigido por ITEMS y no por hijos, por dos motivos concretos: la lista de «Crear» sale del registro de documentos de la aplicación en vez de escribirse dos veces, y el teclado + ARIA se resuelven una vez — por hijos, cada consumidor tiene que cablear las flechas y no lo hace.",
      },
    },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/* NOTA — lo que este archivo YA NO muestra.
 *
 * Hubo una historia con `filtros`, `agrupar` y `favoritos` como tres menús
 * sueltos al lado de una lista. Se borró porque ese patrón quedó reemplazado:
 * los tres son la MISMA pregunta —«¿qué parte de esto estoy mirando?»— y ahora
 * viven en un solo panel embebido dentro de la `SearchBar`, donde las tres
 * columnas se ven a la vez.
 *
 * Se borra en vez de dejarse como referencia: una historia que muestra un
 * patrón abandonado es peor que ninguna, porque alguien la va a copiar. */

/** Los dos usos que quedan. Son el mismo componente con distintos datos. */
export const LosDosUsos: Story = {
  args: { label: "", groups: [] },
  render: () => (
    <OnCanvas>
      {/* Sólo ícono: el rótulo pasa a ser el nombre accesible. El `⋯` ya dice
          que hay más, así que dibujar la palabra sería decirlo dos veces. */}
      <Menu
        label="Más acciones"
        icon={MoreHorizontal}
        iconOnly
        align="end"
        groups={[
          {
            options: [
              { id: "dup", label: "Duplicar la factura" },
              { id: "nc", label: "Emitir nota de crédito…" },
              { id: "mail", label: "Enviar al cliente por correo" },
              { id: "sin", label: "Enviar a Impuestos Nacionales", badge: "en línea" },
            ],
          },
          { options: [{ id: "del", label: "Anular", disabled: true }] },
        ]}
      />
      <span className="text-meta text-muted">
        el desborde de la barra de una factura — lo que no entra en los tres botones
      </span>
    </OnCanvas>
  ),
};

/** Compacto: verbos cortos. «Agrupar» no reserva columna de icono;
 *  «Columnas» sí, porque hay un estado checked. */
export const Compacto: Story = {
  args: { label: "", groups: [] },
  render: () => (
    <OnCanvas>
      <Menu
        label="Columnas"
        groups={[
          {
            options: [
              { id: "number", label: "Número", checked: true },
              { id: "customer", label: "Cliente", checked: true },
              { id: "nit", label: "NIT", checked: false },
              { id: "due", label: "Vencimiento", checked: true },
            ],
          },
        ]}
        closeOnSelect={false}
      />
      <Menu
        label="Agrupar"
        groups={[
          {
            options: [
              { id: "none", label: "Sin agrupar" },
              { id: "customer", label: "Cliente" },
              { id: "state", label: "Estado" },
              { id: "salesperson", label: "Vendedor" },
            ],
          },
        ]}
      />
    </OnCanvas>
  ),
};

/** «Crear» sobre el chrome: la lista sale del registro de documentos, no del JSX. */
export const CrearSobreElCromo: Story = {
  args: { label: "", groups: [] },
  render: () => (
    <OnChrome wash>
      <Menu
        label="+ Crear"
        icon={Plus}
        surface="chrome"
        groups={[
          {
            label: "ventas",
            options: [
              {
                id: "cot",
                label: "Cotización",
                hint: "Una oferta al cliente, todavía sin compromiso",
              },
              {
                id: "ov",
                label: "Orden de venta",
                hint: "Reserva el stock y queda lista para facturar",
              },
              {
                id: "fac",
                label: "Factura",
                hint: "Se emite y se envía a Impuestos Nacionales",
                badge: "en línea",
              },
            ],
          },
          {
            label: "tesorería",
            options: [
              { id: "pago", label: "Pago recibido", hint: "Cobro de una o varias facturas" },
              {
                id: "ext",
                label: "Importar extracto",
                hint: "El extracto del banco, para conciliar",
              },
            ],
          },
        ]}
      />
    </OnChrome>
  ),
};

/** Submenús: «Imprimir ▸» y «Mover a ▸» abren sus opciones al costado, con la misma fila. Sin
 *  submenú eran nueve filas de «Imprimir factura», «Imprimir remito»… empujando al resto de
 *  los verbos fuera del panel. Probá el teclado: → abre el submenú, ← o Escape lo cierran y
 *  el foco vuelve a la fila que lo abrió. Con el mouse, podés cruzar en diagonal sin que se
 *  cierre. Los atajos se dibujan al final de la fila — los enlaza la aplicación, el menú
 *  sólo los enseña. */
export const Submenus: Story = {
  args: { label: "", groups: [] },
  render: () => (
    <OnCanvas>
      <Menu
        label="Acciones"
        icon={MoreHorizontal}
        align="end"
        groups={[
          {
            options: [
              { id: "dup", label: "Duplicar el remito", icon: Copy, shortcut: "Ctrl+D" },
              { id: "mail", label: "Enviar al cliente", icon: Mail, shortcut: "Ctrl+E" },
              {
                id: "print",
                label: "Imprimir",
                icon: Printer,
                items: [
                  { id: "print-invoice", label: "Factura", shortcut: "Ctrl+P" },
                  { id: "print-waybill", label: "Remito de salida" },
                  {
                    id: "print-labels",
                    label: "Etiquetas de bultos",
                    hint: "Una por bulto, 10 × 15 cm",
                  },
                ],
              },
              {
                id: "move",
                label: "Mover a",
                icon: Truck,
                items: [
                  {
                    id: "W-CEN",
                    label: "Almacén Central",
                    hint: "Av. Montes 1240, La Paz",
                  },
                  { id: "W-ALT", label: "Almacén El Alto", hint: "Zona Senkata" },
                  {
                    id: "W-SCZ",
                    label: "Almacén Santa Cruz",
                    hint: "Parque Industrial",
                  },
                  {
                    id: "W-TRA",
                    label: "Almacén Central — tránsito",
                    hint: "Sólo mercadería en camino",
                    disabled: true,
                  },
                ],
              },
            ],
          },
          { options: [{ id: "cancel", label: "Anular el remito" }] },
        ]}
      />
      <span className="text-meta text-muted">
        el menú de acciones de un remito: imprimir y mover tienen más de una respuesta
      </span>
    </OnCanvas>
  ),
};
