import {
  Destination,
  type ResourceRef,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  DatePicker,
  Field,
  FormActions,
  FormSection,
  type LineItemColumn,
  LineItems,
  List,
  NumberInput,
  Record,
  Select,
  Tag,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, Receipt } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  type Invoice,
  INVOICES,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
  taxOf,
} from "../support/erp";
import { bs, PAYMENT_METHODS } from "../support/erp-drill";

/**
 * Context: **an operation over N records, done in one sitting** — Odoo's wizard (a transient
 * model; «asistente» in Odoo's Spanish, a word this repo keeps for the AI): «Registrar pago» for the three invoices chosen in the list. It is not a third view.
 * It is ONE record that only lives while the person fills it — a `Record` with no rail, no
 * activity and no audit, because it has no history yet — whose body holds the N records it
 * acts on as lines. Where it opens and how it answers is the workspace's:
 *
 *   - the list opens it as a CHOOSER (`api.pick`) with the chosen ids in its reference, so it
 *     survives a reload and a move to another surface;
 *   - the wizard answers with what was decided (`api.answer`) — the payments — and only then
 *     does the list apply them, with an undo instead of a «¿seguro?»;
 *   - closing it without answering changes nothing.
 *
 * The wizard does not know the list, and the list does not know the wizard's fields: they meet
 * in a reference and an answer, the same contract a many2one's «Buscar más…» uses.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Operación · sobre N registros",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Elegí facturas en la lista y «Registrar pago»: se abre la operación en MODAL con las facturas elegidas como líneas —el monto de cada una se puede bajar—, la fecha y el método. Confirmar contesta a la lista con los pagos y la lista los aplica, con «Deshacer». Cerrarla no cambia nada. La operación es un registro que vive mientras se llena, no una tercera vista.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** A payment of one invoice, as the wizard decides it. */
type Payment = { invoice: string; amount: number };

/** One line of the wizard: an invoice and how much of its balance is paid now. */
type Line = {
  id: string;
  number: string;
  customer: string;
  balance: number;
  amount: number | "";
};

const dueOf = (invoice: Invoice) => subtotalOf(invoice) + taxOf(invoice);
const OPEN = INVOICES.filter(
  (one) => one.state === "posted" || one.state === "overdue",
).slice(0, 8);

/* What the two views share — what has been paid. In an app, the server. */
type Ledger = {
  paid: Readonly<Record<string, number>>;
  apply: (payments: readonly Payment[]) => void;
  undo: (payments: readonly Payment[]) => void;
};
const LedgerContext = createContext<Ledger | null>(null);

function useLedger(): Ledger {
  const ledger = useContext(LedgerContext);
  if (ledger === null) throw new Error("useLedger outside LedgerProvider");
  return ledger;
}

function LedgerProvider({ children }: { children: ReactNode }) {
  const [paid, setPaid] = useState<Readonly<Record<string, number>>>({});
  const shift = (payments: readonly Payment[], sign: 1 | -1) =>
    setPaid((now) => {
      const next = { ...now };
      for (const p of payments) next[p.invoice] = (next[p.invoice] ?? 0) + sign * p.amount;
      return next;
    });
  return (
    <LedgerContext.Provider
      value={{ paid, apply: (p) => shift(p, 1), undo: (p) => shift(p, -1) }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

const balanceOf = (invoice: Invoice, paid: Readonly<Record<string, number>>) =>
  Math.max(0, dueOf(invoice) - (paid[invoice.id] ?? 0));

const wizardRef = (ids: readonly string[]): ResourceRef => ({
  domain: "cobranza",
  kind: "registrar-pago",
  params: { facturas: ids.join(",") },
});
const listRef: ResourceRef = { domain: "cobranza", kind: "facturas" };

/** The list: choose invoices, and «Registrar pago» opens the wizard over the chosen. */
function Invoices({ api }: ViewProps) {
  const { paid, apply, undo } = useLedger();
  const toast = useToast();
  const [chosen, setChosen] = useState<string[]>([]);
  useEffect(() => api.setTitle("Facturas por cobrar"), [api]);

  const columns: DataColumn<Invoice>[] = [
    { id: "number", header: "número", value: (d) => d.number },
    { id: "customer", header: "cliente", value: (d) => d.customer },
    {
      id: "state",
      header: "estado",
      value: (d) => (balanceOf(d, paid) === 0 ? "Pagada" : STATE_LABEL[d.state]),
      cell: (d) =>
        balanceOf(d, paid) === 0 ? (
          <Tag tone="good">Pagada</Tag>
        ) : (
          <Tag tone={STATE_TONE[d.state]}>{STATE_LABEL[d.state]}</Tag>
        ),
    },
    {
      id: "balance",
      header: "saldo",
      value: (d) => balanceOf(d, paid),
      cell: (d) => bs(balanceOf(d, paid)),
      numeric: true,
      aggregate: "sum",
      format: bs,
    },
  ];

  const pay = () =>
    api.pick<readonly Payment[]>(
      wizardRef(chosen),
      (payments) => {
        apply(payments);
        setChosen([]);
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        toast.show({
          message: `Se registraron ${payments.length} pagos por ${bs(total)}.`,
          tone: "good",
          action: { label: "Deshacer", onSelect: () => undo(payments) },
        });
      },
      { to: Destination.Modal, size: { w: 760, h: 560 } },
    );

  return (
    <List<Invoice>
      items={OPEN}
      keyOf={(d) => d.id}
      present="table"
      selection={{
        has: (id) => chosen.includes(id),
        toggle: (id) =>
          setChosen((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id])),
        count: chosen.length,
        clear: () => setChosen([]),
        actions: (
          <Button role="primary" size="sm" icon={CreditCard} onClick={pay}>
            Registrar pago
          </Button>
        ),
      }}
    >
      <List.Bar>
        <List.Identity title="Facturas por cobrar" />
      </List.Bar>
      <List.Table<Invoice> columns={columns} totals />
    </List>
  );
}

const LINE_COLUMNS: readonly LineItemColumn<Line>[] = [
  { id: "number", header: "factura", value: (l) => l.number },
  { id: "customer", header: "cliente", value: (l) => l.customer },
  {
    id: "balance",
    header: "saldo",
    value: (l) => l.balance,
    cell: (l) => bs(l.balance),
    numeric: true,
  },
  {
    id: "amount",
    header: "a pagar",
    value: (l) => (l.amount === "" ? 0 : l.amount),
    cell: (l) => bs(l.amount === "" ? 0 : l.amount),
    numeric: true,
    edit: (l, set) => (
      <NumberInput
        aria-label={`A pagar de ${l.number}`}
        value={l.amount}
        onChange={(amount) => set({ ...l, amount })}
        min={0}
        max={l.balance}
        unit="Bs."
      />
    ),
  },
];

/** The wizard: a record that lives while it is filled. The invoices are its lines. */
function RegisterPayment({ resource, api }: ViewProps) {
  const { paid } = useLedger();
  const ids = (resource.params?.["facturas"] ?? "").split(",").filter((id) => id !== "");
  const [lines, setLines] = useState<Line[]>(() =>
    OPEN.filter((one) => ids.includes(one.id)).map((one) => ({
      id: one.id,
      number: one.number,
      customer: one.customer,
      balance: balanceOf(one, paid),
      amount: balanceOf(one, paid),
    })),
  );
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [date, setDate] = useState<string | null>("2026-11-03");
  const total = lines.reduce((sum, l) => sum + (l.amount === "" ? 0 : l.amount), 0);
  const customers = new Set(lines.map((l) => l.customer)).size;
  useEffect(() => api.setTitle("Registrar pago"), [api]);
  useEffect(() => api.setDirty(true), [api]);

  const confirm = () => {
    api.setDirty(false);
    api.answer(
      lines
        .filter((l) => l.amount !== "" && l.amount > 0)
        .map((l) => ({ invoice: l.id, amount: l.amount as number })),
    );
  };

  return (
    <Record
      identity={{
        icon: CreditCard,
        title: "Registrar pago",
        subtitle: `${lines.length} facturas de ${customers} ${customers === 1 ? "cliente" : "clientes"}`,
      }}
    >
      <Record.Paper>
        <FormSection columns={2}>
          <Field label="Método">
            <Select value={method} options={PAYMENT_METHODS} onChange={setMethod} />
          </Field>
          <Field label="Fecha" required>
            <DatePicker value={date} onChange={setDate} />
          </Field>
        </FormSection>
        <LineItems<Line>
          lines={lines}
          columns={LINE_COLUMNS}
          getLineId={(l) => l.id}
          lineLabel={(l) => l.number}
          onChange={(id, next) =>
            setLines((now) => now.map((one) => (one.id === id ? next : one)))
          }
          totals={[{ label: "Total a registrar", value: bs(total), total: true }]}
        />
        <FormActions
          secondary={
            <Button role="ghost" size="sm" onClick={() => api.close()}>
              Cancelar
            </Button>
          }
          primary={
            <Button
              role="primary"
              size="sm"
              icon={CreditCard}
              disabled={total <= 0 || date === null}
              onClick={confirm}
            >
              {`Registrar ${bs(total)}`}
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "cobranza",
    kind: "facturas",
    title: () => "Facturas por cobrar",
    icon: Receipt,
    load: async () => Invoices,
  },
  {
    domain: "cobranza",
    kind: "registrar-pago",
    title: () => "Registrar pago",
    icon: CreditCard,
    load: async () => RegisterPayment,
  },
];

/** **Pagar varias facturas de una vez.** Elegí dos o más y «Registrar pago»: la operación se
 *  abre con ellas como líneas, cada una con su saldo y lo que se paga ahora. Al confirmar, la
 *  lista las marca pagadas y ofrece deshacer. */
export const PagarVarias: Story = {
  name: "Registrar pago de N facturas",
  render: () => (
    <LedgerProvider>
      <Workspace views={VIEWS} start={listRef} />
    </LedgerProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const [first, second] = OPEN;
    /* Choose two invoices: the selection offers the operation. */
    const boxes = await canvas.findAllByRole("checkbox", { name: "Elegir la fila" });
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    await userEvent.click(canvas.getByRole("button", { name: "Registrar pago" }));
    /* The wizard holds exactly the chosen ones, and adds them up. */
    const dialog = within(await page.findByRole("dialog"));
    await expect(await dialog.findByText(first!.number)).toBeVisible();
    await expect(dialog.getByText(second!.number)).toBeVisible();
    const total = dueOf(first!) + dueOf(second!);
    await userEvent.click(dialog.getByRole("button", { name: `Registrar ${bs(total)}` }));
    /* Answered: the list applies it, and offers the way back. */
    await waitFor(() => expect(page.queryByRole("dialog")).toBeNull());
    await expect(await page.findByText(/Se registraron 2 pagos/)).toBeVisible();
    await expect(canvas.getAllByText("Pagada").length).toBeGreaterThanOrEqual(2);
  },
};
