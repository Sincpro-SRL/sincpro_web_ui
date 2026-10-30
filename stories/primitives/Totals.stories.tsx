import {
  Totals,
  type TotalsCredit,
  type TotalsDeduction,
  type TotalsRow,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { money } from "../support/erp";

/**
 * Context: **el resumen de montos de una factura, de punta a punta.** Primero el desglose por
 * grupo de impuesto y el TOTAL; cuando entra un pago, cada pago en su fila —«Pagado el
 * 12/10/2026», restando—, lo que falta como «Importe adeudado», y abajo, aparte, los créditos
 * del cliente que todavía se pueden aplicar.
 *
 * La cifra grande cambia con el estado: en un borrador o una factura sin cobrar es el total;
 * con un pago parcial, lo que se debe —es la pregunta que trae quien la abre—; pagada, otra
 * vez el total, con la marca «Pagada». El componente no sabe qué es una factura: habla de
 * deducciones, saldo y créditos, y los montos le llegan ya formateados.
 *
 * Ninguna de estas acciones es la principal: «Desvincular» es secundaria (no destruye: el pago
 * vuelve como crédito y se aplica de nuevo con un toque) y «Aplicar» y «Abrir» son fantasma.
 */
const meta: Meta = {
  title: "2 · Primitivas/Totales",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const BASE = 3000;
const IVA = BASE * 0.13;
const IT = BASE * 0.03;
const TOTAL = BASE + IVA + IT;

/** El desglose de una factura boliviana: base imponible, IVA 13 % e IT 3 %. */
function breakdown(): TotalsRow[] {
  return [
    { label: "Base imponible", value: money(BASE) },
    { label: "IVA 13 %", detail: `sobre ${money(BASE)}`, value: money(IVA) },
    { label: "IT 3 %", value: money(IT) },
    { label: "Total", value: money(TOTAL), total: true },
  ];
}

type Payment = {
  id: string;
  date: string;
  amount: number;
  journal: string;
  reference: string;
  method: string;
};

const PAYMENTS: readonly Payment[] = [
  {
    id: "p1",
    date: "12/10/2026",
    amount: 1000,
    journal: "Banco BNB",
    reference: "PBNB/2026/0418",
    method: "Transferencia",
  },
  {
    id: "p2",
    date: "20/10/2026",
    amount: 500,
    journal: "Caja general",
    reference: "CAJA/2026/0127",
    method: "Efectivo",
  },
];

type Credit = { id: string; label: string; detail: string; amount: number };

const CREDIT_NOTE: Credit = {
  id: "nc12",
  label: "NC/2026/0012",
  detail: "Nota de crédito del 02/10/2026",
  amount: 350,
};

/** Una factura con lo que tiene aplicado y lo que podría aplicarse. Desvincular un pago lo
 *  devuelve a los créditos; aplicar un crédito lo suma a lo pagado. Lo que se deshace es
 *  la otra acción, no un «¿estás seguro?». */
function Invoice({
  payments: initialPayments,
  credits: initialCredits,
}: {
  payments: readonly Payment[];
  credits: readonly Credit[];
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [credits, setCredits] = useState(initialCredits);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const due = Math.max(TOTAL - paid, 0);

  const deductions: TotalsDeduction[] = payments.map((p) => ({
    label: `Pagado el ${p.date}`,
    value: money(p.amount),
    facts: [
      { label: "Importe", value: money(p.amount) },
      { label: "Fecha", value: p.date },
      { label: "Diario", value: p.journal },
      { label: "Método", value: p.method },
      { label: "Referencia", value: p.reference },
    ],
    onOpen: () => {},
    onRemove: () => {
      setPayments((all) => all.filter((one) => one.id !== p.id));
      setCredits((all) => [
        ...all,
        { id: p.id, label: p.reference, detail: `Pago del ${p.date}`, amount: p.amount },
      ]);
    },
  }));

  const available: TotalsCredit[] = credits.map((c) => ({
    label: c.label,
    detail: c.detail,
    value: money(c.amount),
    onApply: () => {
      setCredits((all) => all.filter((one) => one.id !== c.id));
      setPayments((all) => [
        ...all,
        {
          id: c.id,
          date: "30/10/2026",
          amount: Math.min(c.amount, due),
          journal: "Ventas",
          reference: c.label,
          method: "Nota de crédito",
        },
      ]);
    },
  }));

  return (
    <Totals
      rows={breakdown()}
      deductions={deductions}
      balance={{ label: "Importe adeudado", value: money(due) }}
      {...(due === 0 ? { settled: "Pagada" } : {})}
      credits={due === 0 ? [] : available}
    />
  );
}

/** **Borrador.** Sólo el desglose y el total, que es la cifra grande: todavía no se cobró
 *  nada, así que no hay saldo que mostrar. */
export const Borrador: Story = {
  render: () => <Totals rows={breakdown()} />,
};

/** **Publicada, sin cobrar.** El importe adeudado ya aparece, callado: es igual al total, y
 *  el total sigue siendo la cifra que manda. */
export const Publicada: Story = {
  render: () => (
    <Totals rows={breakdown()} balance={{ label: "Importe adeudado", value: money(TOTAL) }} />
  ),
};

/** **Pagada en parte.** Dos pagos, cada uno restando, y lo que falta es ahora la cifra
 *  grande; el total baja al tamaño del cuerpo. Abajo, la nota de crédito del cliente con su
 *  «Aplicar». Probá la `i` de un pago: el diario, el método y la referencia, y
 *  «Desvincular», que lo devuelve a los créditos. Con un lector de pantalla cada pago se
 *  oye como una frase: «Pagado el 12/10/2026, menos Bs. 1.000,00». */
export const PagadaEnParte: Story = {
  name: "Pagada en parte",
  render: () => <Invoice payments={PAYMENTS} credits={[CREDIT_NOTE]} />,
};

/** **Pagada.** Lo adeudado es cero: vuelve a mandar el total, con la marca «Pagada» —con
 *  palabra, no sólo con verde—. Los pagos siguen ahí, cada uno con su detalle. */
export const Pagada: Story = {
  render: () => (
    <Invoice
      payments={[
        ...PAYMENTS,
        {
          id: "p3",
          date: "28/10/2026",
          amount: TOTAL - 1500,
          journal: "Banco BNB",
          reference: "PBNB/2026/0466",
          method: "Transferencia",
        },
      ]}
      credits={[]}
    />
  ),
};

/** **En un teléfono.** El bloque ocupa el ancho; la etiqueta larga se parte y la cifra no:
 *  si no entra al lado, baja entera, a la derecha. */
export const Telefono: Story = {
  name: "Teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Invoice payments={PAYMENTS} credits={[CREDIT_NOTE]} />,
};
