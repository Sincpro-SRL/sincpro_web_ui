import {
  ButtonLink,
  type DataColumn,
  DataTable,
  KeyValue,
  Preview,
  type RelationSummary,
  RelationValue,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2, Package, Truck } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { type Invoice, INVOICES, shortDate, subtotalOf } from "../support/erp";
import { PRODUCTS } from "../support/erp-catalog";
import { CUSTOMER_CARDS, type CustomerCard, customerCard } from "../support/erp-people";

/**
 * Context: **la vista previa de un registro sin salir de la pantalla.** El cliente de una factura,
 * el producto de una línea: quién o qué es, al dejar el mouse sobre su nombre, al llegar con
 * Tab o con una pulsación larga en el celular. Es el `PreviewTrigger` de React Aria: un
 * popover NO modal que puede tener acciones adentro —a diferencia del tooltip, que es un
 * rótulo y no se recorre—. No se roba el foco al abrirse: el que recorre la tabla con Tab
 * sigue de largo; si quiere entrar, Tab desde el nombre entra a la tarjeta y Escape vuelve.
 *
 * Espera 600 ms antes de abrirse: en una tabla el mouse cruza nombres todo el día camino a
 * otra cosa, y una tarjeta que tapa cuatro filas en cada pasada es ruido. Una vez abierta,
 * la del vecino se abre al instante: comparar los clientes de seis facturas es bajar por la
 * columna, no esperar seis veces.
 */
const meta: Meta = {
  title: "2 · Primitivas/Relacional a uno/Resumen al pasar el mouse",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function summaryOf(c: CustomerCard): RelationSummary {
  return {
    tag: c.state,
    facts: [
      { label: "Deuda", value: c.debt },
      { label: "Límite de crédito", value: c.credit },
      { label: "Ciudad", value: c.city },
      { label: "Teléfono", value: c.phone },
    ],
  };
}

const bs = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const units = new Intl.NumberFormat("es-BO");

/** **El cliente de la factura, con vista previa.** Dejá el mouse sobre el nombre —o llegá con Tab—
 *  y aparece su resumen: deuda, crédito, ciudad, teléfono y «Abrir». No hay `i` al lado: un
 *  solo camino al resumen, no dos. Apretar el nombre sigue llevando a la ficha. */
export const ClienteDeLaFactura: Story = {
  render: function Render() {
    const [opened, setOpened] = useState<string | null>(null);
    const c = CUSTOMER_CARDS[1]!;
    return (
      <div className="flex max-w-md flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-box border border-line bg-surface p-4">
          <span className="text-micro font-medium text-muted">Cliente</span>
          <RelationValue
            name={c.name}
            secondary={`NIT ${c.taxId}`}
            media={{ icon: Building2 }}
            summary={summaryOf(c)}
            onOpen={() => setOpened(c.name)}
          />
        </div>
        <p className="text-micro text-muted">
          {opened === null
            ? "Todavía no abriste ningún cliente."
            : `Abriste la ficha de «${opened}».`}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    /* Resting the mouse on the name opens the card — on a page just loaded, before any click
       (React Aria only opened it once a press had said «pointer»). */
    await userEvent.hover(within(canvasElement).getByRole("link", { name: /Ferretería/ }));
    const card = await within(document.body).findByRole("dialog", {}, { timeout: 3000 });
    await waitFor(() =>
      expect(within(card).getByRole("button", { name: /Abrir/ })).toBeVisible(),
    );
  },
};

/** **Una columna de clientes.** Acá es donde la vista previa paga: treinta `i`, una por fila,
 *  dicen treinta veces lo mismo. Bajá con el mouse por la columna: el primero espera, los
 *  siguientes se abren al instante. La vista previa no abre la fila; la fila tiene su clic. */
export const EnUnaTabla: Story = {
  render: function Render() {
    const [last, setLast] = useState<string | null>(null);
    const columns: readonly DataColumn<Invoice>[] = [
      { id: "number", header: "Número", value: (i) => i.number },
      {
        id: "customer",
        header: "Cliente",
        value: (i) => i.customer,
        text: (i) => `${i.customer} — NIT ${i.taxId}`,
        cell: (i) => {
          const c = customerCard(i.taxId);
          return (
            <RelationValue
              name={i.customer}
              secondary={`NIT ${i.taxId}`}
              {...(c === undefined ? {} : { summary: summaryOf(c) })}
              onOpen={() => setLast(`el cliente «${i.customer}»`)}
            />
          );
        },
      },
      { id: "date", header: "Fecha", value: (i) => shortDate(i.date) },
      {
        id: "total",
        header: "Total (Bs.)",
        value: (i) => Math.round(subtotalOf(i) * 100) / 100,
        numeric: true,
      },
    ];
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-box border border-line bg-surface">
          <DataTable
            data={INVOICES.slice(0, 8)}
            columns={columns}
            getRowId={(i) => i.id}
            onRowClick={(i) => setLast(`la factura ${i.number}`)}
          />
        </div>
        <p className="text-micro text-muted">
          {last === null ? "Nada abierto todavía." : `Abriste ${last}.`}
        </p>
      </div>
    );
  },
};

/** **El producto de una línea, con contenido propio.** `preview` también acepta lo que vos
 *  quieras mostrar: acá el precio de lista, el stock y la categoría, con la foto del
 *  producto. En el celular se abre con una pulsación larga sobre el nombre. */
export const ProductoDeUnaLinea: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3 rounded-box border border-line bg-surface p-4">
      {PRODUCTS.slice(0, 4).map((p) => (
        <RelationValue
          key={p.id}
          name={p.name}
          secondary={p.sku}
          media={p.photo === undefined ? { icon: Package } : { src: p.photo, alt: "" }}
          href={`#producto-${p.id}`}
          preview={
            <dl className="grid w-64 grid-cols-2 gap-3">
              <KeyValue label="precio de lista" value={`Bs. ${bs.format(p.price)}`} />
              <KeyValue label="en stock" value={units.format(p.stock)} />
              <KeyValue label="categoría" value={p.category} />
              <KeyValue label="código" value={p.sku} />
            </dl>
          }
        />
      ))}
    </div>
  ),
};

/** **`Preview` a mano.** Cualquier botón o enlace del sistema puede ser el disparador —sin
 *  adaptadores—. Acá, el remito de una entrega: el enlace lleva al documento; la vista previa dice
 *  lo que casi siempre se quiere saber antes de abrirlo. */
export const AMano: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-2 rounded-box border border-line bg-surface p-4">
      <span className="text-micro font-medium text-muted">Entrega de la factura</span>
      <span className="flex">
        <Preview
          label="Resumen del remito R-0418"
          trigger={
            <ButtonLink href="#remito-0418" role="ghost" size="sm" icon={Truck}>
              Remito R-0418
            </ButtonLink>
          }
        >
          <dl className="grid w-64 grid-cols-2 gap-3">
            <KeyValue label="despachado" value="28/10/2026" />
            <KeyValue label="bultos" value="12" />
            <KeyValue label="transportista" value="Trans Andina" />
            <KeyValue label="destino" value="El Alto" />
          </dl>
        </Preview>
      </span>
    </div>
  ),
};
