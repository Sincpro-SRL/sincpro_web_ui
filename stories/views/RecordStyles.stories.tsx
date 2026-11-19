import {
  ActionDock,
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
 * Context: **la misma API, dos estilos.** El registro se escribe igual —`Record.Dock` con sus
 * acciones como DATOS (`DockAction`)— y el estilo de la aplicación decide cómo se dibuja:
 *
 * - **Tradicional** (`classic`): el riel de un ERP — la banda con las migas, los contadores y el
 *   paginador; las acciones como botones en su segunda fila, junto al estado.
 * - **Limpio** (`clean`): las migas son el título de la página, con el paginador en su línea; un
 *   escalón abajo, los contadores y el estado en pasos; la banda es el fondo; y las acciones
 *   FLOTAN en una píldora abajo, al centro — la decisión. Arriba sigue disponible.
 *
 * Se elige una vez, alrededor de la app (`RecordStyleProvider`), o por registro (`Record look`).
 * Experimental.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "4 · Vistas/Registro · estilos (experimental)",
  parameters: { layout: "fullscreen" },
};

export default meta;

type DockArgs = {
  style: "classic" | "clean";
  /** `auto`: what the style says — the rail in classic, the bottom in clean. */
  placement: "auto" | "rail" | "top" | "bottom";
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
async function actionsWork(canvasElement: HTMLElement) {
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

/**
 * **Limpio — la decisión.** Las migas son el título («Ventas › Facturas › FAC/2026/0119»), el
 * paginador en su línea; abajo, más chicos, los contadores y el estado en pasos. Las acciones
 * flotan en una píldora ABAJO, al centro: «Enviar», «Imprimir ▾», «⋯» y «Registrar pago» dorada y
 * última. Escribí en «Referencia del cliente»: la misma píldora pasa a «1 cambio · Descartar ·
 * Guardar», y dice «Guardado».
 */
export const Limpio: Story = {
  args: { style: "clean", placement: "auto", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/**
 * **Tradicional**, con el MISMO código: las mismas `DockAction` son los botones del riel —la
 * principal primero y dorada, las secundarias, «⋯» con el resto—, y Guardar / Descartar ocupan
 * su lugar mientras hay cambios.
 */
export const Tradicional: Story = {
  args: { style: "classic", placement: "auto", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/** **Limpio, la píldora arriba**: descansa en el riel, al centro, y flota arriba cuando el riel
 *  se va. */
export const LimpioArriba: Story = {
  name: "Limpio, la píldora arriba",
  args: { style: "clean", placement: "top", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
};

/** **Explorar**: el estilo, dónde va la píldora, su color, cuántas visibles. */
export const Explorar: Story = {
  args: { style: "clean", placement: "auto", align: "center", look: "chrome", visible: 2 },
  argTypes: {
    style: { control: "inline-radio", options: ["classic", "clean"] },
    placement: { control: "inline-radio", options: ["auto", "rail", "top", "bottom"] },
    align: { control: "inline-radio", options: ["center", "end"] },
    look: { control: "inline-radio", options: ["chrome", "canvas"] },
    visible: { control: { type: "range", min: 0, max: 4, step: 1 } },
  },
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
