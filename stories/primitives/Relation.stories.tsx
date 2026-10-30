import {
  type DataColumn,
  DataTable,
  Field,
  FormModeProvider,
  Picker,
  type PickerItem,
  RelationCard,
  type RelationSummary,
  RelationValue,
  SegmentedControl,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2 } from "lucide-react";
import { useState } from "react";

import { type Invoice, INVOICES, shortDate, subtotalOf } from "../support/erp";
import { CUSTOMER_CARDS, type CustomerCard, customerCard } from "../support/erp-people";

/**
 * Context: **una relación a uno (many2one) como valor.** El cliente de una factura no es un
 * texto: es otro registro. Su nombre va como enlace a su ficha, con el NIT abajo, chico y
 * callado, y su resumen a un toque del botón `i`: el resumen tiene datos Y una acción
 * («Abrir»), así que es un diálogo en un popover —se entra con el teclado, Escape lo cierra y
 * el foco vuelve— y no un tooltip, que es para pocas palabras y no se puede recorrer.
 *
 * En un formulario es la cara de LECTURA del campo; la de edición es `Picker`. Se pasa el
 * picker como `editor` y el campo dibuja uno u otro según el modo.
 */
const meta: Meta = {
  title: "2 · Primitivas/Relaciones · a uno",
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

const ITEMS: readonly PickerItem[] = CUSTOMER_CARDS.map((c) => ({
  id: c.taxId,
  name: c.name,
  meta: `NIT ${c.taxId} · ${c.city}`,
  haystack: c.taxId,
  icon: Building2,
}));

/** **El cliente de la factura.** El nombre lleva a su ficha; la `i` abre el resumen: deuda,
 *  crédito, ciudad y teléfono, y «Abrir». Probalo con el teclado: Tab hasta la `i`, Enter,
 *  Escape. */
export const ClienteDeLaFactura: Story = {
  render: function Render() {
    const [opened, setOpened] = useState<string | null>(null);
    const c = CUSTOMER_CARDS[3]!;
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
};

/** **En una columna de tabla.** El cliente de cada factura, con su NIT y su resumen. Apretar el
 *  nombre o la `i` no abre la fila: la fila tiene su propio clic. */
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
            data={INVOICES.slice(0, 6)}
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

/** **Leer y editar el mismo campo.** En lectura el cliente es una relación con su resumen; en
 *  edición es el `Picker` de siempre (con su botón de abrir). Un solo elemento en el `Field`:
 *  `<RelationValue … editor={<Picker … />} />`. */
export const LecturaYEdicion: Story = {
  render: function Render() {
    const [mode, setMode] = useState<"read" | "edit">("read");
    const [customer, setCustomer] = useState(CUSTOMER_CARDS[1]!.taxId);
    const [salesOrder, setSalesOrder] = useState<string>("");
    const [opened, setOpened] = useState<string | null>(null);
    const chosen = customerCard(customer);
    const open = (id: string) => setOpened(customerCard(id)?.name ?? id);
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <SegmentedControl
          aria-label="Modo del formulario"
          size="sm"
          value={mode}
          onChange={(next) => setMode(next as "read" | "edit")}
          options={[
            { value: "read", label: "Leer" },
            { value: "edit", label: "Editar" },
          ]}
        />
        <FormModeProvider value={mode}>
          <div className="flex flex-col gap-3 rounded-box border border-line bg-surface p-4">
            <Field label="Cliente" layout="inline">
              <RelationValue
                name={chosen?.name ?? null}
                {...(chosen === undefined
                  ? {}
                  : { secondary: `NIT ${chosen.taxId}`, summary: summaryOf(chosen) })}
                onOpen={() => open(customer)}
                editor={
                  <Picker
                    items={ITEMS}
                    value={customer}
                    onChange={setCustomer}
                    onOpen={open}
                  />
                }
              />
            </Field>
            <Field label="Pedido de origen" layout="inline">
              <RelationValue
                name={salesOrder === "" ? null : salesOrder}
                editor={
                  <Picker
                    items={[
                      { id: "SO/2026/0412", name: "SO/2026/0412" },
                      { id: "SO/2026/0398", name: "SO/2026/0398" },
                    ]}
                    value={salesOrder}
                    onChange={setSalesOrder}
                  />
                }
              />
            </Field>
          </div>
        </FormModeProvider>
        <p className="text-micro text-muted">
          {opened === null
            ? "Todavía no abriste ningún cliente."
            : `Abriste la ficha de «${opened}».`}
        </p>
      </div>
    );
  },
};

/** **Vacío, sin destino y la tarjeta suelta.** Sin cliente se dice «Sin asignar», no se deja un
 *  hueco. Sin `onOpen` ni `href` el nombre es texto. `RelationCard` es el mismo resumen sin el
 *  enlace, para el panel lateral de un registro. */
export const VacioYTarjeta: Story = {
  render: () => {
    const c = CUSTOMER_CARDS[0]!;
    return (
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex w-80 flex-col gap-3 rounded-box border border-line bg-surface p-4">
          <RelationValue name={null} />
          <RelationValue name="Ferretería El Progreso" secondary="NIT 4587123018" />
        </div>
        <aside className="rounded-box border border-line bg-surface p-4">
          <RelationCard
            name={c.name}
            secondary={`NIT ${c.taxId}`}
            media={{ icon: Building2 }}
            summary={summaryOf(c)}
            onOpen={() => {}}
          />
        </aside>
      </div>
    );
  },
};
