/* The data and the pieces the stories of this folder share. Not a story file. */
import {
  Block,
  Cell,
  DataField,
  type DockAction,
  Field,
  Record,
  RecordStyleProvider,
  SheetGroup,
  SheetGroups,
  Table,
  Td,
  TextInput,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui";
import {
  Ban,
  BookOpen,
  Copy,
  CreditCard,
  Link2,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  Truck,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { INVOICES, lineTotal, money, STAGES } from "../../support/erp";

export type DockArgs = {
  style: "traditional" | "modern";
  /** `auto`: what the style says — the rail in classic, the bottom in clean. */
  placement: "auto" | "rail" | "top" | "bottom";
  align: "center" | "end";
  look: "chrome" | "canvas";
  visible: number;
};

export const INVOICE = INVOICES.find((one) => one.state === "posted")!;
export const REFERENCE = "OC-2026-0412";

/** The invoice's actions, as data: the primary, the ones that produce something, a print
 *  with its variants, the rare ones tucked, and the ones that undo, apart. */
export function invoiceActions(did: (what: string) => void): DockAction[] {
  return [
    {
      id: "pay",
      label: "Registrar pago",
      icon: CreditCard,
      primary: true,
      onSelect: () => did("Registrar pago"),
    },
    { id: "send", label: "Enviar", icon: Send, onSelect: () => did("Enviar") },
    {
      id: "print",
      label: "Imprimir",
      icon: Printer,
      items: [
        {
          id: "print-invoice",
          label: "Factura",
          shortcut: "Ctrl+P",
          onSelect: () => did("Imprimir · Factura"),
        },
        {
          id: "print-payments",
          label: "Factura con pagos",
          onSelect: () => did("Imprimir · Factura con pagos"),
        },
        { id: "print-note", label: "Remito", onSelect: () => did("Imprimir · Remito") },
        {
          id: "print-labels",
          label: "Etiquetas de envío",
          onSelect: () => did("Imprimir · Etiquetas de envío"),
        },
      ],
    },
    {
      id: "credit",
      label: "Nota de crédito",
      icon: Undo2,
      onSelect: () => did("Nota de crédito"),
    },
    { id: "copy", label: "Duplicar", icon: Copy, onSelect: () => did("Duplicar") },
    {
      id: "share",
      label: "Copiar el enlace",
      icon: Link2,
      tucked: true,
      onSelect: () => did("Copiar el enlace"),
    },
    {
      id: "draft",
      label: "Restablecer a borrador",
      icon: RotateCcw,
      danger: true,
      onSelect: () => did("Restablecer a borrador"),
    },
    {
      id: "void",
      label: "Anular en el SIAT",
      icon: Ban,
      danger: true,
      hint: "La anulación se informa a Impuestos",
      onSelect: () => did("Anular en el SIAT"),
    },
  ];
}

/* Enough lines to scroll: the dock stays in view while the paper goes by. */
export const LINES = INVOICES.slice(0, 10)
  .flatMap((one) => one.lines)
  .map((line, at) => ({ ...line, id: `${line.id}-${at}` }));

export function DockedInvoice(args: DockArgs) {
  const [reference, setReference] = useState(REFERENCE);
  const [kept, setKept] = useState(REFERENCE);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState("—");
  const changed = reference !== kept;
  return (
    <RecordStyleProvider value={args.style}>
      <div className="min-h-dvh bg-ground">
        <Record
          identity={{
            icon: Receipt,
            title: INVOICE.number,
            subtitle: INVOICE.customer,
            tag: { label: "Publicada", tone: "info" },
            figure: {
              label: "Total",
              value: money(INVOICE.lines.reduce((a, l) => a + lineTotal(l), 0)),
            },
          }}
          {...(changed
            ? {
                dirty: {
                  changes: 1,
                  saving,
                  onDiscard: () => setReference(kept),
                  onSave: () => {
                    setSaving(true);
                    setTimeout(() => {
                      setKept(reference);
                      setSaving(false);
                    }, 400);
                  },
                },
              }
            : {})}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[
                { label: "Ventas", onClick: () => {} },
                { label: "Facturas", onClick: () => {} },
                { label: INVOICE.number },
              ]}
            />
            <Record.Pager index={12} total={32} onPrev={() => {}} onNext={() => {}} />
            <Record.Smart
              links={[
                { icon: CreditCard, count: 1, label: "pagos", onClick: () => {} },
                { icon: BookOpen, count: 1, label: "asiento", onClick: () => {} },
                { icon: Truck, count: 2, label: "entregas", onClick: () => {} },
              ]}
            />
            <Record.Dock
              actions={invoiceActions(setLast)}
              label="Acciones de la factura"
              {...(args.placement === "auto" ? {} : { placement: args.placement })}
              align={args.align}
              look={args.look}
              visible={args.visible}
            />
            <Record.Status stages={STAGES} current="posted" />
          </Record.Rail>
          <Record.Paper layout="horizontal">
            <SheetGroups columns={2}>
              <SheetGroup title="Referencias">
                <Field label="Referencia del cliente">
                  <TextInput value={reference} onChange={setReference} />
                </Field>
                <DataField label="Última acción" value={last} />
              </SheetGroup>
            </SheetGroups>
            <Block title="lo que se vende" flush>
              <Table>
                <THead>
                  <Th>producto</Th>
                  <Th numeric>cantidad</Th>
                  <Th numeric>precio unitario</Th>
                  <Th numeric>subtotal</Th>
                </THead>
                <tbody>
                  {LINES.map((line) => (
                    <Tr key={line.id}>
                      <Td>{line.product}</Td>
                      <Td numeric>
                        <Cell value={line.quantity} />
                      </Td>
                      <Td numeric>{money(line.unitPrice)}</Td>
                      <Td numeric>{money(lineTotal(line))}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Block>
          </Record.Paper>
        </Record>
      </div>
    </RecordStyleProvider>
  );
}

/** What every style proves the same way: the actions, a sub-action, «Más», and a change that
 *  turns them into Discard · Save. */
export async function actionsWork(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const page = within(document.body);
  const dock = () => canvas.getByRole("toolbar", { name: "Acciones de la factura" });
  await canvas.findByRole("toolbar", { name: "Acciones de la factura" });
  await expect(within(dock()).getByRole("button", { name: "Registrar pago" })).toBeVisible();

  // A sub-action: «Imprimir ▾» opens its variants.
  await userEvent.click(within(dock()).getByRole("button", { name: "Imprimir" }));
  await userEvent.click(await page.findByRole("menuitem", { name: "Remito" }));
  await waitFor(() => expect(canvas.getByText("Imprimir · Remito")).toBeVisible());

  // «Más»: the rest, and what undoes, apart and last.
  await userEvent.click(within(dock()).getByRole("button", { name: "Más acciones" }));
  const voiding = await page.findByRole("menuitem", { name: /Anular en el SIAT/ });
  /* The menu comes in with a transition: seen once it has. */
  await waitFor(() => expect(voiding).toBeVisible());
  await userEvent.keyboard("{Escape}");

  // A change: Discard · Save where the actions were, and back after saving.
  const reference = canvas.getByRole("textbox", { name: "Referencia del cliente" });
  await userEvent.type(reference, "-B");
  const save = await canvas.findByRole("button", { name: /Guardar/ });
  await expect(canvas.queryByRole("button", { name: "Registrar pago" })).toBeNull();
  await userEvent.click(save);
  await waitFor(() =>
    expect(canvas.getByRole("button", { name: "Registrar pago" })).toBeVisible(),
  );
}
