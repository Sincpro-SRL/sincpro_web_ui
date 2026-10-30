import {
  Calendar,
  type DataColumn,
  DataTable,
  Field,
  Picker,
  type PickerItem,
  Select,
  Tag,
  UserChip,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  type Invoice,
  INVOICES,
  money,
  shortDate,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
} from "../support/erp";

/**
 * Context: **cambiar un valor sin salir de la lista.** El vendedor de una factura, su
 * vencimiento: abrir el registro para cambiar un campo y volver son tres pantallas por un
 * valor, y se pierde la fila en la que estabas. Una columna declara `edit` y su celda se
 * vuelve un botón que abre un popover con el control del sistema — un `Picker`, un
 * `Calendar`, un `Select` — anclado a la celda. Escape o un clic afuera cierran sin cambiar
 * nada; elegir confirma, cierra y devuelve el foco a la celda.
 */
const meta: Meta = {
  title: "3 · Componentes/Datos/Edición en la celda",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`DataColumn.edit = { render: (fila, listo) => editor, when? }`. El lápiz aparece sólo al pasar el puntero o con el foco del teclado: doce lápices encendidos en una columna son ruido. Sin `edit`, la tabla se dibuja exactamente igual que antes.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SALESPEOPLE: readonly PickerItem[] = [
  { id: "Andrés Gutiérrez", name: "Andrés Gutiérrez", meta: "Ventas corporativas · La Paz" },
  { id: "Josefa Muñoz", name: "Josefa Muñoz", meta: "Ventas mayoristas · Santa Cruz" },
  { id: "Carla Rojas", name: "Carla Rojas", meta: "Cuentas clave · Cochabamba" },
  { id: "Marcelo Quispe Mamani", name: "Marcelo Quispe Mamani", meta: "Ventas · El Alto" },
];

const STAGES = [
  { value: "draft", label: "Borrador" },
  { value: "posted", label: "Publicada" },
  { value: "overdue", label: "Vencida" },
];

/* «Hoy» fijo, para que la columna de vencidas no cambie según el día en que se mira. */
const TODAY = "2026-11-20";

/** Una factura pagada o anulada ya no se toca: su celda se lee, no se edita. */
const open = (invoice: Invoice) => invoice.state !== "paid" && invoice.state !== "cancelled";

function columnsFor(update: (id: string, patch: Partial<Invoice>) => void) {
  const columns: DataColumn<Invoice>[] = [
    {
      id: "number",
      header: "número",
      value: (d) => d.number,
      cell: (d) => <span className="font-medium">{d.number}</span>,
      width: 150,
    },
    { id: "customer", header: "cliente", value: (d) => d.customer },
    {
      id: "salesperson",
      header: "vendedor",
      value: (d) => d.salesperson,
      cell: (d) => <UserChip name={d.salesperson} size="sm" />,
      width: 210,
      edit: {
        render: (d, done) => (
          <Field label="Vendedor">
            <Picker
              items={SALESPEOPLE}
              value={d.salesperson}
              onChange={(id) => {
                update(d.id, { salesperson: id });
                done();
              }}
            />
          </Field>
        ),
      },
    },
    {
      id: "due",
      header: "vence",
      value: (d) => d.due,
      cell: (d) => shortDate(d.due),
      tone: (d) => (open(d) && d.due < TODAY ? "bad" : undefined),
      note: (d) =>
        open(d) && d.due < TODAY ? "Vencida: ya pasó la fecha de pago." : undefined,
      width: 130,
      edit: {
        when: open,
        render: (d, done) => (
          <Calendar
            value={d.due}
            onChange={(iso) => {
              update(d.id, { due: iso });
              done();
            }}
          />
        ),
      },
    },
    {
      id: "state",
      header: "estado",
      value: (d) => STATE_LABEL[d.state],
      cell: (d) => <Tag tone={STATE_TONE[d.state]}>{STATE_LABEL[d.state]}</Tag>,
      width: 140,
      edit: {
        when: open,
        render: (d, done) => (
          <Field label="Estado">
            <Select
              value={d.state}
              options={STAGES}
              onChange={(next) => {
                update(d.id, { state: next as Invoice["state"] });
                done();
              }}
            />
          </Field>
        ),
      },
    },
    {
      id: "total",
      header: "total",
      value: (d) => subtotalOf(d),
      cell: (d) => money(subtotalOf(d)),
      numeric: true,
      aggregate: "sum",
      width: 150,
    },
  ];
  return columns;
}

/** **Facturas: vendedor, vencimiento y estado desde la lista.** Pasá el puntero por una celda
 *  de esas columnas (o llegá con Tab) y aparece el lápiz; Enter o un clic abre el editor. Las
 *  pagadas y anuladas no se editan: su vencimiento y su estado se leen, sin botón. */
export const FacturasEditablesEnLaLista: Story = {
  render: function Render() {
    const [rows, setRows] = useState<readonly Invoice[]>(INVOICES.slice(0, 10));
    const [opened, setOpened] = useState<string | null>(null);
    const update = (id: string, patch: Partial<Invoice>) =>
      setRows((now) => now.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    return (
      <div className="flex flex-col gap-3">
        <DataTable
          data={rows}
          columns={columnsFor(update)}
          getRowId={(d) => d.id}
          onRowClick={(d) => setOpened(d.number)}
          totals
        />
        <p className="text-micro text-muted">
          La fila sigue abriendo su registro con un clic; la celda editable no lo abre.
          {opened === null ? null : ` Abriste ${opened}.`}
        </p>
      </div>
    );
  },
};
