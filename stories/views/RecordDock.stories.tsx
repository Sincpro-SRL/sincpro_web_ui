import {
  ActionDock,
  Block,
  Cell,
  DataField,
  type DockAction,
  Field,
  Record,
  SheetGroup,
  SheetGroups,
  Table,
  Td,
  TextInput,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
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

import { INVOICES, lineTotal, money, STAGES } from "../support/erp";

/**
 * Context: **una identidad propia para el ERP — las acciones flotando.** El estilo «settings»
 * hace flotar Guardar y Descartar abajo, y esa píldora leyó como algo nuestro. Acá se prueba la
 * misma píldora para TODAS las acciones del registro: arriba, sobre el papel, y se queda a la
 * vista mientras el registro baja — el riel, con las acciones, se iba con el primer gesto.
 *
 * Experimental: `Record.Dock` en lugar de `Record.Actions`. Las acciones son DATOS
 * (`DockAction`), así que qué se ve y qué espera en «Más» lo decide la píldora, no cada pantalla.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "4 · Vistas/Registro · acciones flotantes (experimental)",
  parameters: { layout: "fullscreen" },
};

export default meta;

type DockArgs = {
  placement: "top" | "bottom";
  align: "center" | "end";
  look: "chrome" | "canvas";
  visible: number;
};
type Story = StoryObj<DockArgs>;

const INVOICE = INVOICES.find((one) => one.state === "posted")!;
const REFERENCE = "OC-2026-0412";

/** The invoice's actions, as data: the primary, the ones that produce something, a print
 *  with its variants, the rare ones tucked, and the ones that undo, apart. */
function invoiceActions(did: (what: string) => void): DockAction[] {
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
const LINES = INVOICES.slice(0, 10)
  .flatMap((one) => one.lines)
  .map((line, at) => ({ ...line, id: `${line.id}-${at}` }));

function DockedInvoice(args: DockArgs) {
  const [reference, setReference] = useState(REFERENCE);
  const [kept, setKept] = useState(REFERENCE);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState("—");
  const changed = reference !== kept;
  return (
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
            placement={args.placement}
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
  );
}

/**
 * **Explorar.** Las acciones de una factura publicada en una píldora oscura, arriba, sobre el
 * papel: «Registrar pago» (la principal, dorada y última), «Enviar» e «Imprimir ▾» con sus
 * variantes, y en «Más ⋯» el resto — lo que deshace, aparte y al final. Bajá: la píldora se
 * queda. Escribí en «Referencia del cliente»: la misma píldora pasa a «1 cambio · Descartar ·
 * Guardar», y dice «Guardado».
 *
 * Probá los controles: abajo (el lugar del pulgar), al final del papel, clara, una o tres
 * visibles.
 */
export const Explorar: Story = {
  args: { placement: "top", align: "center", look: "chrome", visible: 2 },
  argTypes: {
    placement: { control: "inline-radio", options: ["top", "bottom"] },
    align: { control: "inline-radio", options: ["center", "end"] },
    look: { control: "inline-radio", options: ["chrome", "canvas"] },
    visible: { control: { type: "range", min: 0, max: 4, step: 1 } },
  },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const dock = await canvas.findByRole("toolbar", { name: "Acciones de la factura" });
    await expect(within(dock).getByRole("button", { name: "Registrar pago" })).toBeVisible();

    // A sub-action: «Imprimir ▾» opens its variants.
    await userEvent.click(within(dock).getByRole("button", { name: "Imprimir" }));
    await userEvent.click(await page.findByRole("menuitem", { name: "Remito" }));
    await waitFor(() => expect(canvas.getByText("Imprimir · Remito")).toBeVisible());

    // «Más»: the rest, and what undoes, apart and last.
    await userEvent.click(within(dock).getByRole("button", { name: "Más acciones" }));
    const voiding = await page.findByRole("menuitem", { name: /Anular en el SIAT/ });
    /* The menu comes in with a transition: seen once it has. */
    await waitFor(() => expect(voiding).toBeVisible());
    await userEvent.keyboard("{Escape}");

    // A change turns the same pill into Discard · Save, and it says «Guardado».
    const reference = canvas.getByRole("textbox", { name: "Referencia del cliente" });
    await userEvent.type(reference, "-B");
    const save = await within(dock).findByRole("button", { name: /Guardar/ });
    await expect(within(dock).queryByRole("button", { name: "Registrar pago" })).toBeNull();
    await userEvent.click(save);
    await waitFor(() =>
      expect(within(dock).getByRole("button", { name: "Registrar pago" })).toBeVisible(),
    );
  },
};

/** **Abajo**, el lugar del estilo «settings» y del pulgar: la misma píldora, con las mismas
 *  reglas. */
export const Abajo: Story = {
  args: { placement: "bottom", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
};

/** **Clara y al final del papel**: la píldora como una tarjeta sobre la página. */
export const ClaraAlFinal: Story = {
  name: "Clara, al final",
  args: { placement: "top", align: "end", look: "canvas", visible: 1 },
  render: (args) => <DockedInvoice {...args} />,
};

/**
 * **La regla de qué se ve**, con las mismas acciones y lugar para 0, 1, 2 y 3 secundarias. La
 * principal siempre, dorada y última; las que deshacen, nunca al lado de ella; lo que está
 * guardado a propósito (`tucked`), en «Más» aunque haya lugar; y un «Más» de una sola acción no
 * se dibuja — se dibuja esa acción.
 */
export const LaReglaDeQueSeVe: Story = {
  name: "La regla de qué se ve",
  /* Four docks side by side, four primaries: a gallery, not a screen. */
  tags: ["!screen"],
  render: () => (
    <div className="flex flex-col items-start gap-4 p-6">
      {[0, 1, 2, 3].map((visible) => (
        <div key={visible} className="flex items-center gap-4">
          <span className="w-24 text-meta text-muted">{`${visible} visibles`}</span>
          <ActionDock
            placement="inline"
            visible={visible}
            label={`Con ${visible} visibles`}
            actions={invoiceActions(() => {})}
          />
        </div>
      ))}
    </div>
  ),
};
