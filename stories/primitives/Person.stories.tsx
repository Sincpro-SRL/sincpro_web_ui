import {
  ContactCard,
  type DataColumn,
  DataField,
  DataTable,
  Tag,
  UserChip,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { type Invoice, INVOICES, money, shortDate, subtotalOf } from "../support/erp";
import { SALES_TEAM, type Salesperson, salesperson } from "../support/erp-people";

/**
 * Context: **la persona como dato, y cómo llegar a ella.** En un ERP, la pregunta que sigue a
 * «¿quién es la vendedora de esta factura?» casi siempre es «¿cómo la contacto?». El chip de
 * la persona abre su tarjeta de contacto —correo, llamada, WhatsApp, su ficha— sin salir de la
 * pantalla. Y es un botón SOLO cuando tiene a dónde ir: sin contacto ni ficha es texto, y no le
 * cobra un Tab de más a quien usa el teclado en cada fila.
 */
const meta: Meta = {
  title: "2 · Primitivas/Personas · tarjeta de contacto",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function chipOf(person: Salesperson, onOpen: (name: string) => void) {
  return (
    <UserChip
      name={person.name}
      role={person.role}
      {...(person.photo === undefined ? {} : { src: person.photo })}
      contact={{
        ...(person.email === undefined ? {} : { email: person.email }),
        ...(person.phone === undefined ? {} : { phone: person.phone }),
        ...(person.whatsapp === undefined ? {} : { whatsapp: person.whatsapp }),
      }}
      onOpen={() => onOpen(person.name)}
    />
  );
}

/** **El equipo de ventas.** Cada vendedor abre su tarjeta: tocá un nombre, o llegá con Tab y
 *  apretá Enter. Escape la cierra y el foco vuelve al nombre. Carla no tiene teléfono: su
 *  tarjeta muestra solo lo que hay. */
export const Equipo: Story = {
  render: function Render() {
    const [opened, setOpened] = useState<string | null>(null);
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <ul className="divide-y divide-line rounded-box border border-line bg-surface">
          {SALES_TEAM.map((person) => (
            <li key={person.name} className="flex items-center gap-4 px-4 py-3">
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                {chipOf(person, setOpened)}
                <span className="truncate pl-8 text-micro text-muted">{person.role}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-meta tabular-nums text-ink">
                  {money(person.amount)}
                </span>
                <span className="text-micro text-muted">
                  {person.open === 0
                    ? "sin facturas abiertas"
                    : `${person.open} facturas abiertas`}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-micro text-muted">
          {opened === null
            ? "Todavía no abriste ninguna ficha."
            : `Abriste la ficha de «${opened}».`}
        </p>
      </div>
    );
  },
};

/** **En una columna de tabla.** El vendedor de cada factura, con su tarjeta. Apretar el chip
 *  abre la tarjeta y NO la fila: la fila tiene su propio clic. */
export const EnUnaTabla: Story = {
  render: function Render() {
    const [row, setRow] = useState<string | null>(null);
    const columns: readonly DataColumn<Invoice>[] = [
      { id: "number", header: "Número", value: (i) => i.number },
      { id: "customer", header: "Cliente", value: (i) => i.customer },
      { id: "date", header: "Fecha", value: (i) => shortDate(i.date) },
      {
        id: "salesperson",
        header: "Vendedor",
        value: (i) => i.salesperson,
        cell: (i) => {
          const person = salesperson(i.salesperson);
          return person === undefined ? (
            <UserChip name={i.salesperson} size="sm" />
          ) : (
            <UserChip
              name={person.name}
              size="sm"
              role={person.role}
              {...(person.photo === undefined ? {} : { src: person.photo })}
              contact={{
                ...(person.email === undefined ? {} : { email: person.email }),
                ...(person.phone === undefined ? {} : { phone: person.phone }),
                ...(person.whatsapp === undefined ? {} : { whatsapp: person.whatsapp }),
              }}
            />
          );
        },
      },
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
            onRowClick={(i) => setRow(i.number)}
          />
        </div>
        <p className="text-micro text-muted">
          {row === null ? "Ninguna fila abierta." : `Abriste la fila ${row}.`}
        </p>
      </div>
    );
  },
};

/** **Leída en un formulario, y la tarjeta suelta.** En la ficha de un cliente, «Vendedor
 *  asignado» es una persona: el chip va como valor de un `DataField`. `ContactCard` es la
 *  misma tarjeta sin chip, para el panel lateral de un registro. */
export const EnUnFormulario: Story = {
  render: () => {
    const josefa = SALES_TEAM[1]!;
    return (
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex w-96 flex-col gap-3 rounded-box border border-line bg-surface p-4">
          <DataField label="Cliente" value="Distribuidora Andina S.R.L." layout="inline" />
          <DataField
            label="Vendedor asignado"
            layout="inline"
            value={
              <UserChip
                name={josefa.name}
                size="sm"
                role={josefa.role}
                src={josefa.photo!}
                contact={{
                  email: josefa.email!,
                  phone: josefa.phone!,
                  whatsapp: josefa.whatsapp!,
                }}
              />
            }
          />
          <DataField
            label="Creado por"
            layout="inline"
            value={<UserChip name="Sistema" size="sm" />}
          />
          <DataField label="Estado" layout="inline" value={<Tag tone="good">al día</Tag>} />
        </div>
        <aside className="rounded-box border border-line bg-surface p-4">
          <p className="mb-3 text-micro font-medium text-muted">Su vendedora</p>
          <ContactCard
            name={josefa.name}
            role={josefa.role}
            src={josefa.photo!}
            contact={{
              email: josefa.email!,
              phone: josefa.phone!,
              whatsapp: josefa.whatsapp!,
            }}
            onOpen={() => {}}
          />
        </aside>
      </div>
    );
  },
};

/** **Con a dónde ir, y sin.** Arriba un chip sin contacto ni ficha: es texto, no se enfoca.
 *  Abajo el mismo nombre con su ficha: es un botón y abre la tarjeta solo con «Ver ficha». */
export const ConYSinDestino: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3 rounded-box border border-line bg-surface p-4">
      <UserChip name="Carla Rojas" detail="aprobó la nota de crédito" />
      <UserChip name="Carla Rojas" detail="aprobó la nota de crédito" onOpen={() => {}} />
    </div>
  ),
};
