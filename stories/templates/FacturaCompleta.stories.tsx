import {
  type ActivityEvent,
  type AppEntry,
  AppFrame,
  Button,
  Copyable,
  type DataColumn,
  DataField,
  DatePicker,
  DateValue,
  Drill,
  Field,
  FormSection,
  LineItems,
  List,
  type ListPresent,
  Menu,
  type Message,
  MessageComposer,
  NumberInput,
  Picker,
  Record,
  RelationValue,
  SearchField,
  Select,
  SheetGroup,
  SheetGroups,
  type SortState,
  SystrayButton,
  Tag,
  Tags,
  TagsField,
  TextInput,
  ToastProvider,
  TopBar,
  type TopMenu,
  type TotalsProps,
  useDrill,
  useToast,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  BookOpen,
  Boxes,
  Copy,
  CreditCard,
  FileCheck2,
  FileText,
  Landmark,
  ListTree,
  MoreHorizontal,
  Package,
  Receipt,
  ScrollText,
  ShoppingCart,
  Truck,
  Undo2,
  User,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { money, STAGES } from "../support/erp";
import {
  ACCOUNTS,
  amountOf,
  ANALYTIC,
  CREDIT_NOTE,
  figuresOf,
  FULL_LINES,
  type FullLine,
  journalOf,
  PAYMENTS,
  SIAT,
  subtotalOf,
  TAXES,
} from "../support/erp-invoice-full";
import { customerCard } from "../support/erp-people";

/**
 * Context: **the invoice the size of a real one.** The module's invoice (three lines, four
 * facts, two tabs) is the easy case, and an easy case does not test a system — the pieces it
 * lacks only show up with real data. This is the screen as Odoo users live it: fourteen lines
 * read in three sections with notes between them, ten fields per line of which a screen shows
 * five (the rest behind the columns menu), two taxes, a payment applied and the rest still
 * due, the journal entry the invoice produced, the electronic invoicing data of Bolivia's
 * SIAT, six smart buttons, seven actions, a dense header in groups and the history.
 *
 * Built ONLY from the public API, like every template: when it needs something the package
 * does not export, the package is missing it — that is what this screen is for.
 */
const meta: Meta = {
  title: "5 · Plantillas/Factura completa · un registro con todo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una factura del tamaño de una real: líneas por secciones con notas, columnas opcionales, impuestos por línea, pagos aplicados, el asiento contable, la facturación electrónica del SIAT y la cabecera densa. Armada sólo con la API pública.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ==================================================================== *
 *  THE APPLICATION FRAME
 * ==================================================================== */

const APPS: AppEntry[] = [
  {
    id: "ventas",
    label: "Ventas",
    icon: ShoppingCart,
    hint: "Cotizaciones, pedidos y facturas",
  },
  { id: "compras", label: "Compras", icon: Truck, hint: "Proveedores y órdenes de compra" },
  { id: "inventario", label: "Inventario", icon: Boxes, hint: "Existencias y movimientos" },
  {
    id: "contabilidad",
    label: "Contabilidad",
    icon: BookOpen,
    hint: "Asientos y conciliación",
  },
];

const MENUS: TopMenu[] = [
  {
    id: "facturacion",
    label: "Facturación",
    groups: [
      {
        options: [
          { id: "facturas", label: "Facturas" },
          { id: "notas", label: "Notas de crédito" },
          { id: "pagos", label: "Pagos recibidos" },
        ],
      },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    groups: [{ options: [{ id: "clientes", label: "Clientes" }] }],
  },
];

function Frame({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppFrame
        menu={
          <TopBar
            apps={APPS}
            currentApp="ventas"
            menus={MENUS}
            systray={<SystrayButton icon={Bell} label="Avisos" count={2} tone="warn" />}
            user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
          />
        }
      >
        {children}
      </AppFrame>
    </ToastProvider>
  );
}

/* ==================================================================== *
 *  THE LINES — sections, notes, optional columns, taxes per line
 * ==================================================================== */

const PRODUCTS = FULL_LINES.filter((l) => l.kind === "line").map((l) => ({
  id: l.product,
  name: l.product,
  meta: money(l.price),
  haystack: l.sku,
}));

const number = (v: number) => v.toLocaleString("es-BO");

function lineColumns(editable: boolean, openProduct: (name: string) => void) {
  const taxTags = (l: FullLine) =>
    TAXES.filter((t) => l.taxes.includes(t.value)).map((t) => ({
      id: t.value,
      label: t.label,
      ...(t.tone === undefined ? {} : { tone: t.tone }),
    }));
  return [
    {
      id: "product",
      header: "Producto",
      value: (l: FullLine) => l.product,
      text: (l: FullLine) => `${l.product} ${l.sku} ${l.label}`,
      cell: (l: FullLine) => (
        <RelationValue
          name={l.product || "—"}
          {...(l.label === "" ? {} : { secondary: l.label })}
          {...(l.product === "" ? {} : { onOpen: () => openProduct(l.product) })}
        />
      ),
      ...(editable
        ? {
            edit: (l: FullLine, set: (next: FullLine) => void) => (
              <Picker
                aria-label="Producto"
                items={PRODUCTS}
                value={l.product}
                onChange={(name) =>
                  set({
                    ...l,
                    product: name,
                    price: FULL_LINES.find((one) => one.product === name)?.price ?? l.price,
                  })
                }
                placeholder="Buscá un producto o su código…"
              />
            ),
          }
        : {}),
    },
    {
      id: "account",
      header: "Cuenta",
      value: (l: FullLine) => l.account,
      optional: true,
      defaultHidden: true,
    },
    {
      id: "analytic",
      header: "Analítica",
      value: (l: FullLine) => l.analytic,
      optional: true,
      defaultHidden: true,
    },
    {
      id: "quantity",
      header: "Cantidad",
      numeric: true,
      width: 110,
      value: (l: FullLine) => l.quantity,
      cell: (l: FullLine) => number(l.quantity),
      brief: (l: FullLine) => `${number(l.quantity)} ${l.uom} × ${money(l.price)}`,
      ...(editable
        ? {
            edit: (l: FullLine, set: (next: FullLine) => void) => (
              <NumberInput
                aria-label="Cantidad"
                value={l.quantity}
                min={0}
                onChange={(v) => set({ ...l, quantity: v === "" ? 0 : v })}
              />
            ),
          }
        : {}),
    },
    {
      id: "uom",
      header: "Unidad",
      value: (l: FullLine) => l.uom,
      optional: true,
      stack: "hidden" as const,
    },
    {
      id: "price",
      header: "Precio",
      numeric: true,
      width: 130,
      value: (l: FullLine) => l.price,
      cell: (l: FullLine) => money(l.price),
      stack: "hidden" as const,
    },
    {
      id: "discount",
      header: "Desc. %",
      numeric: true,
      width: 100,
      value: (l: FullLine) => l.discount,
      cell: (l: FullLine) => (l.discount === 0 ? "—" : `${number(l.discount)} %`),
      brief: (l: FullLine) => (l.discount === 0 ? null : `desc. ${number(l.discount)} %`),
      optional: true,
      ...(editable
        ? {
            edit: (l: FullLine, set: (next: FullLine) => void) => (
              <NumberInput
                aria-label="Descuento %"
                value={l.discount}
                min={0}
                max={100}
                onChange={(v) => set({ ...l, discount: v === "" ? 0 : v })}
              />
            ),
          }
        : {}),
    },
    {
      id: "taxes",
      header: "Impuestos",
      value: (l: FullLine) => l.taxes.join(" "),
      cell: (l: FullLine) => <Tags items={taxTags(l)} />,
      optional: true,
      stack: "hidden" as const,
      ...(editable
        ? {
            edit: (l: FullLine, set: (next: FullLine) => void) => (
              <TagsField
                aria-label="Impuestos"
                value={l.taxes}
                options={TAXES}
                onChange={(taxes) => set({ ...l, taxes })}
              />
            ),
          }
        : {}),
    },
    {
      id: "amount",
      header: "Importe",
      numeric: true,
      width: 140,
      value: (l: FullLine) => amountOf(l),
      cell: (l: FullLine) => money(amountOf(l)),
      subtotal: subtotalOf,
      stack: "amount" as const,
    },
  ];
}

let next = 500;
const blank = (kind: FullLine["kind"]) => (): FullLine => {
  next += 1;
  return {
    id: `n${next}`,
    kind,
    product: "",
    label: "",
    sku: "",
    account: ACCOUNTS[0]!,
    analytic: ANALYTIC[0]!,
    quantity: kind === "line" ? 1 : 0,
    uom: "unidad",
    price: 0,
    discount: 0,
    taxes: kind === "line" ? ["iva", "it"] : [],
  };
};

/* ==================================================================== *
 *  THE JOURNAL ENTRY — what the invoice wrote in the books
 * ==================================================================== */

type JournalRow = ReturnType<typeof journalOf>[number];

const JOURNAL_COLUMNS: DataColumn<JournalRow>[] = [
  { id: "account", header: "Cuenta", value: (j) => j.account },
  { id: "label", header: "Etiqueta", value: (j) => j.label },
  {
    id: "debit",
    header: "Debe",
    numeric: true,
    aggregate: "sum",
    format: money,
    value: (j) => Math.round(j.debit * 100) / 100,
    cell: (j) => (j.debit === 0 ? "—" : money(j.debit)),
  },
  {
    id: "credit",
    header: "Haber",
    numeric: true,
    aggregate: "sum",
    format: money,
    value: (j) => Math.round(j.credit * 100) / 100,
    cell: (j) => (j.credit === 0 ? "—" : money(j.credit)),
  },
];

/** The journal items as a COLLECTION inside the record: searched, sorted, and seen as a
 *  table, as rows or as a spreadsheet — the same capabilities as the list of a module,
 *  because a one2many with forty rows is a list too. */
function JournalItems({ lines }: { lines: readonly FullLine[] }) {
  const [present, setPresent] = useState<ListPresent>("table");
  const [sort, setSort] = useState<SortState | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("es-BO");
  const items = journalOf(lines).filter(
    (j) => q === "" || `${j.account} ${j.label}`.toLocaleLowerCase("es-BO").includes(q),
  );
  return (
    <List<JournalRow>
      embedded
      items={items}
      keyOf={(j) => j.id}
      present={present}
      onPresentChange={setPresent}
      sort={sort}
      onSortChange={setSort}
      sortable={[
        { field: "account", label: "cuenta", value: (j: JournalRow) => j.account },
        { field: "debit", label: "debe", value: (j: JournalRow) => j.debit },
        { field: "credit", label: "haber", value: (j: JournalRow) => j.credit },
      ]}
      filtered={q !== ""}
      empty={{ sentence: "Esta factura todavía no escribió nada en los libros." }}
    >
      <List.Bar>
        <List.Search>
          <SearchField
            aria-label="Buscar en los apuntes"
            value={query}
            onChange={setQuery}
            placeholder="Buscar una cuenta…"
          />
        </List.Search>
      </List.Bar>
      <List.Rows<JournalRow>
        row={(j) => ({
          name: j.account,
          meta: j.debit > 0 ? `debe ${money(j.debit)}` : `haber ${money(j.credit)}`,
        })}
      />
      <List.Table<JournalRow> totals columns={JOURNAL_COLUMNS} />
      {/* Without columns of its own, the spreadsheet reads the table's. */}
      <List.Sheet<JournalRow> />
    </List>
  );
}

/* ==================================================================== *
 *  THE RECORD
 * ==================================================================== */

/* What people wrote about the invoice — interleaved with the events by time in the
   timeline: the customer asked for a split payment BEFORE the first payment arrived. */
const MESSAGES: Message[] = [
  {
    id: "m1",
    author: "Lic. Mónica Vargas",
    at: "2026-10-14T13:20:00Z",
    body: "Recibimos la factura. ¿Podemos pagarla en dos partes? La primera esta semana.",
  },
  {
    id: "m2",
    author: "Carla Rojas",
    at: "2026-10-14T15:05:00Z",
    body: "Sí, sin problema: el saldo vence el 12/11. Les mando el detalle por correo.",
  },
  {
    id: "m3",
    author: "Carla Rojas",
    at: "2026-10-20T13:30:00Z",
    body: "Entró el primer pago. Ojo: la impresora térmica está sin stock, avisar antes de despachar.",
    internal: true,
  },
  {
    id: "m4",
    author: "Tesorería",
    at: "2026-10-27T20:45:00Z",
    body: "El cheque del Banco Unión se acreditó. Queda el saldo de Bs. 31.490,00.",
    internal: true,
  },
];

const HISTORY: ActivityEvent[] = [
  {
    id: "e1",
    label: "se creó la factura",
    at: "2026-10-12T15:10:00Z",
    by: "Carla Rojas",
    moved: { to: "Borrador" },
  },
  {
    id: "e2",
    label: "se publicó y se envió al SIAT",
    at: "2026-10-13T14:42:00Z",
    by: "Carla Rojas",
    tone: "info",
    moved: { from: "Borrador", to: "Publicada" },
    detail: "el SIAT la validó en 3 segundos",
  },
  {
    id: "e3",
    label: "se registró un pago",
    at: "2026-10-20T13:05:00Z",
    by: "Tesorería",
    tone: "good",
    detail: "Bs. 30.000,00 · transferencia BNB",
  },
  {
    id: "e4",
    label: "se registró un pago",
    at: "2026-10-27T20:30:00Z",
    by: "Tesorería",
    tone: "good",
    detail: "Bs. 15.000,00 · cheque Banco Unión",
  },
];

function FullInvoice({ draft = false }: { draft?: boolean }) {
  const toast = useToast();
  const [page, setPage] = useState("lineas");
  const [lines, setLines] = useState<readonly FullLine[]>(FULL_LINES);
  const [reference, setReference] = useState("OC-CSG-2026-0412");
  const f = figuresOf(lines);
  const customer = customerCard("1020304050");
  const say = (message: string) => () => toast.show({ message });
  /* One dialog for everything opened from inside the invoice: a line, its product, the
     customer, the payment wizard — a trail «FAC/2026/0115 › Línea › Producto», never a
     modal over a modal. */
  const drill = useDrill();
  const [lineId, setLineId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>(FULL_LINES[1]!.product);
  const [paying, setPaying] = useState<number | "">("");
  const openProduct = (name: string) => {
    setProductName(name);
    drill.open("product");
  };
  const openLine = lines.find((l) => l.id === lineId) ?? null;
  const product = FULL_LINES.find((l) => l.product === productName) ?? FULL_LINES[1]!;
  const soldOf = (name: string) =>
    lines.filter((l) => l.product === name).reduce((a, l) => a + l.quantity, 0);
  const [applied, setApplied] = useState<string[]>(draft ? [] : PAYMENTS.map((p) => p.id));
  const payments = PAYMENTS.filter((p) => applied.includes(p.id));
  /* What the money summary says: the taxes and the total; once posted, each payment
     deducted with its detail, what is still due, and the credit note that could pay part. */
  const totals: TotalsProps = {
    rows: [
      { label: "Base imponible", value: money(f.base) },
      { label: "IVA 13 %", value: money(f.iva), detail: "incluido en el precio" },
      { label: "IT 3 %", value: money(f.it), detail: "a cargo de la empresa" },
      { label: "Total", value: money(f.total), total: true },
    ],
    ...(draft
      ? {}
      : {
          deductions: payments.map((p) => ({
            label: `Pagado el ${p.date.slice(8, 10)}/${p.date.slice(5, 7)}/${p.date.slice(0, 4)}`,
            value: money(p.amount),
            detail: `${p.method} · ${p.journal}`,
            facts: [
              { label: "Diario", value: p.journal },
              { label: "Referencia", value: p.reference },
              { label: "Método", value: p.method },
            ],
            onOpen: say(`Se abriría el pago ${p.reference}`),
            onRemove: () => setApplied((ids) => ids.filter((id) => id !== p.id)),
          })),
          balance: {
            label: "Importe adeudado",
            value: money(f.total - payments.reduce((a, p) => a + p.amount, 0)),
          },
          credits: [
            {
              label: CREDIT_NOTE.number,
              value: money(CREDIT_NOTE.amount),
              detail: "nota de crédito del 02/10/2026",
              onApply: say(`Se aplicaría ${CREDIT_NOTE.number}`),
            },
            ...PAYMENTS.filter((p) => !applied.includes(p.id)).map((p) => ({
              label: p.reference,
              value: money(p.amount),
              detail: `pago desvinculado · ${p.journal}`,
              onApply: () => setApplied((ids) => [...ids, p.id]),
            })),
          ],
        }),
  };

  return (
    <Record
      identity={{
        icon: Receipt,
        title: draft ? "Borrador de factura" : "FAC/2026/0115",
        tag: draft ? { label: "Borrador" } : { label: "En proceso de pago", tone: "warn" },
        figure: draft
          ? { label: "Total", value: money(f.total) }
          : {
              label: "Importe adeudado",
              value: money(f.total - payments.reduce((a, p) => a + p.amount, 0)),
            },
      }}
    >
      {/* What is true of the whole invoice, said once, above its parts. */}
      {draft ? (
        <Record.Notice tone="info">
          Al publicarla se envía al SIAT y ya no se puede cambiar: revisá los impuestos de
          cada línea.
        </Record.Notice>
      ) : (
        <Record.Notice
          tone="warn"
          title="Pagada en parte"
          action={
            <Button role="secondary" size="sm" onClick={() => drill.open("payment")}>
              Registrar el resto
            </Button>
          }
        >
          Faltan {money(f.total - payments.reduce((a, p) => a + p.amount, 0))}; vence el
          12/11/2026.
        </Record.Notice>
      )}
      <Record.Rail>
        <Record.Crumbs
          crumbs={[
            { label: "Ventas" },
            { label: "Facturas" },
            { label: draft ? "Nueva" : "FAC/2026/0115" },
          ]}
        />
        <Record.Pager
          index={1}
          total={32}
          onPrev={say("Factura anterior")}
          onNext={say("Factura siguiente")}
        />
        <Record.Smart
          links={[
            { icon: CreditCard, count: draft ? 0 : PAYMENTS.length, label: "pagos" },
            { icon: BookOpen, count: draft ? 0 : 1, label: "asiento" },
            { icon: ShoppingCart, count: 1, label: "pedido" },
            { icon: Truck, count: 2, label: "entregas" },
            { icon: FileText, count: 1, label: "nota de crédito" },
            { icon: Landmark, count: draft ? 0 : 1, label: "SIAT" },
          ]}
        />
        <Record.Actions>
          {/* Each action its own child, not a fragment: the rail reads the children to move
              the primary one to the thumb bar on a phone, and a fragment hides it. */}
          <Button
            role="primary"
            size="sm"
            onClick={
              draft
                ? say("Se publicaría y enviaría al SIAT")
                : () => {
                    setPaying(
                      Math.round(
                        (f.total - payments.reduce((a, p) => a + p.amount, 0)) * 100,
                      ) / 100,
                    );
                    drill.open("payment");
                  }
            }
          >
            {draft ? "Publicar" : "Registrar pago"}
          </Button>
          <Button
            role="secondary"
            size="sm"
            onClick={say(draft ? "Vista previa" : "Enviar e imprimir")}
          >
            {draft ? "Vista previa" : "Enviar e imprimir"}
          </Button>
          {/* Three visible at most: the rest in the actions ⋯, grouped by what they do. */}
          <Menu
            label="Más acciones"
            icon={MoreHorizontal}
            iconOnly
            chevron={false}
            size="sm"
            onSelect={(id) => toast.show({ message: `Acción: ${id}` })}
            groups={[
              {
                options: [
                  { id: "Nota de crédito", label: "Nota de crédito", icon: Undo2 },
                  { id: "Duplicar", label: "Duplicar", icon: Copy },
                  {
                    id: "imprimir",
                    label: "Imprimir",
                    icon: ScrollText,
                    items: [
                      { id: "Imprimir factura", label: "Factura" },
                      { id: "Imprimir con pagos", label: "Factura con pagos" },
                      { id: "Imprimir remito", label: "Remito" },
                    ],
                  },
                ],
              },
              {
                options: [
                  { id: "Restablecer a borrador", label: "Restablecer a borrador" },
                  { id: "Anular en el SIAT", label: "Anular en el SIAT" },
                ],
              },
            ]}
          />
        </Record.Actions>
        <Record.Status stages={STAGES} current={draft ? "draft" : "posted"} />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        <Record.Audit
          created={{ by: "Carla Rojas", at: "12/10/2026 09:14" }}
          updated={{ by: "Tesorería", at: "hace 3 días" }}
        />
        {/* The dense header of a real invoice: who it is for, and on what terms — two groups,
            twelve fields, each group answering one question. */}
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente" icon={FileCheck2}>
            <DataField
              label="Cliente"
              /* What concerns the customer is said next to the customer — a comment in the
                 margin, not a band over the whole form. */
              {...(draft
                ? {}
                : {
                    note: {
                      tone: "info" as const,
                      label: "Tiene una nota de crédito sin aplicar",
                      detail: `${CREDIT_NOTE.number} por ${money(CREDIT_NOTE.amount)}: se puede descontar de esta factura.`,
                      action: (
                        <Button
                          role="ghost"
                          size="sm"
                          onClick={say(`Se aplicaría ${CREDIT_NOTE.number}`)}
                        >
                          Aplicar
                        </Button>
                      ),
                    },
                  })}
              value={
                <RelationValue
                  name="Clínica San Gabriel S.A."
                  secondary="NIT 1020304050"
                  {...(customer === undefined
                    ? {}
                    : {
                        summary: {
                          tag: customer.state,
                          facts: [
                            { label: "Deuda", value: customer.debt },
                            { label: "Límite de crédito", value: customer.credit },
                            { label: "Ciudad", value: customer.city },
                          ],
                        },
                      })}
                  onOpen={() => drill.open("customer")}
                />
              }
            />
            <DataField
              label="Dirección de entrega"
              value="Av. Ballivián 1240, Calacoto · La Paz"
            />
            <DataField label="Contacto de cobranza" value="Lic. Mónica Vargas · 7712 3344" />
            {draft ? (
              <DataField
                label="Referencia del cliente"
                value={
                  <TextInput
                    aria-label="Referencia del cliente"
                    value={reference}
                    onChange={setReference}
                    mono
                  />
                }
              />
            ) : (
              <DataField label="Referencia del cliente" value={reference} mono />
            )}
            <DataField label="Referencia de pago" value="FAC/2026/0115" mono />
          </SheetGroup>
          <SheetGroup title="Condiciones" icon={ListTree}>
            <DataField
              label="Fecha de la factura"
              value={<DateValue when="2026-10-13" format="date" />}
            />
            <DataField
              label="Vencimiento"
              value={<DateValue when="2026-11-12" format="date" />}
            />
            <DataField label="Términos de pago" value="30 días · 50 % anticipo" />
            <DataField label="Diario" value="Facturas de cliente" />
            <DataField label="Moneda" value={<Tag>BOB</Tag>} />
            <DataField label="Vendedor" value="Carla Rojas · Equipo corporativo" />
          </SheetGroup>
        </SheetGroups>

        <Record.Pages current={page} onChange={setPage}>
          <Record.Page
            id="lineas"
            label="líneas de factura"
            count={lines.filter((l) => l.kind === "line").length}
          >
            <LineItems<FullLine>
              lines={lines}
              columns={lineColumns(draft, openProduct)}
              /* What is wrong with ONE line is said on that line, not over the document. */
              flag={(l) =>
                l.id === "1"
                  ? {
                      tone: "bad",
                      label: "Sin existencias",
                      owner: `Línea 1 · ${l.product}`,
                      detail:
                        "Se piden 3 y hay 0 en el depósito central. Llegan 10 el 04/11/2026.",
                    }
                  : l.id === "4"
                    ? {
                        tone: "warn",
                        label: "Existencias justas",
                        owner: `Línea 4 · ${l.product}`,
                        detail: "Se piden 3 y quedan 3: no queda ninguna para otra venta.",
                      }
                    : l.id === "14"
                      ? {
                          tone: "info",
                          label: "Precio negativo",
                          owner: `Línea 14 · ${l.product}`,
                          detail: "Un ajuste: resta del total en lugar de sumar.",
                        }
                      : null
              }
              onOpenLine={(id) => {
                setLineId(id);
                drill.open("line");
              }}
              getLineId={(l) => l.id}
              lineLabel={(l) => l.product || "línea nueva"}
              mode={draft ? "edit" : "read"}
              adding="inline"
              searchFrom={10}
              onChange={(id, nextLine) =>
                setLines((all) => all.map((l) => (l.id === id ? nextLine : l)))
              }
              onAdd={(l) => setLines((all) => [...all, l])}
              onRemove={(id) => setLines((all) => all.filter((l) => l.id !== id))}
              newLine={blank("line")}
              structure={{
                kind: (l) => l.kind,
                text: (l) => l.product,
                withText: (l, product) => ({ ...l, product }),
                newSection: blank("section"),
                newNote: blank("note"),
              }}
              totals={totals}
            />
          </Record.Page>

          <Record.Page id="asiento" label="apuntes contables" icon={BookOpen}>
            <JournalItems lines={lines} />
          </Record.Page>

          <Record.Page id="otros" label="otra información">
            <SheetGroups columns={2}>
              <SheetGroup title="Ventas">
                <DataField label="Equipo de ventas" value="Corporativo · La Paz" />
                <DataField label="Pedido de origen" value="S00142" mono />
                <DataField label="Posición fiscal" value="Régimen general" />
              </SheetGroup>
              <SheetGroup title="Contabilidad">
                <DataField
                  label="Cuenta bancaria receptora"
                  value="BNB 1000-2233-44 · BOB"
                  mono
                />
                <DataField
                  label="Cuenta por cobrar"
                  value="1.1.03.01 Cuentas por cobrar clientes"
                />
                <DataField
                  label="Nota de crédito disponible"
                  value={`${CREDIT_NOTE.number} · ${money(CREDIT_NOTE.amount)}`}
                />
              </SheetGroup>
            </SheetGroups>
          </Record.Page>

          <Record.Page id="siat" label="facturación electrónica" icon={Landmark}>
            <SheetGroups columns={2}>
              <SheetGroup title="Respuesta del SIAT">
                <DataField
                  label="Estado"
                  value={draft ? "sin enviar" : <Tag tone="good">validada</Tag>}
                />
                <DataField
                  label="CUF"
                  value={draft ? null : <Copyable value={SIAT.cuf} mono />}
                />
                <DataField
                  label="Código de control"
                  value={draft ? null : SIAT.control}
                  mono
                />
                <DataField label="Recibida" value={draft ? null : SIAT.received} />
              </SheetGroup>
              <SheetGroup title="Documento">
                <DataField label="Modalidad" value={SIAT.modality} />
                <DataField label="Documento sector" value={SIAT.sector} />
                <DataField label="Leyenda" value={SIAT.legend} />
              </SheetGroup>
            </SheetGroups>
          </Record.Page>
        </Record.Pages>
      </Record.Paper>

      <Drill
        state={drill}
        origin={{ kind: "factura", label: draft ? "Borrador" : "FAC/2026/0115" }}
      >
        <Drill.Context
          id="line"
          title={openLine?.product || "Línea"}
          footer={
            <Button role="secondary" size="sm" onClick={drill.back}>
              Listo
            </Button>
          }
        >
          {openLine === null ? null : (
            <FormSection columns={2}>
              <Field label="Producto">
                <RelationValue
                  name={openLine.product}
                  secondary={openLine.sku}
                  onOpen={() => openProduct(openLine.product)}
                />
              </Field>
              <DataField label="Etiqueta" value={openLine.label || null} />
              <DataField label="Cuenta" value={openLine.account} />
              <DataField label="Analítica" value={openLine.analytic} />
              <DataField
                label="Cantidad"
                value={`${number(openLine.quantity)} ${openLine.uom}`}
              />
              <DataField label="Precio unitario" value={money(openLine.price)} />
              <DataField
                label="Descuento"
                value={openLine.discount === 0 ? null : `${number(openLine.discount)} %`}
              />
              <DataField
                label="Impuestos"
                value={
                  <Tags
                    items={TAXES.filter((t) => openLine.taxes.includes(t.value)).map((t) => ({
                      id: t.value,
                      label: t.label,
                    }))}
                  />
                }
              />
              <DataField label="Importe" value={money(amountOf(openLine))} />
            </FormSection>
          )}
        </Drill.Context>

        <Drill.Context id="product" title={product.product} flush>
          <Record
            identity={{
              icon: Package,
              title: product.product,
              subtitle: `${product.sku} · ${product.label}`,
              figure: { label: "Precio de venta", value: money(product.price) },
            }}
          >
            <Record.Paper layout="horizontal">
              <Record.Facts
                fields={[
                  { label: "Unidad", value: product.uom },
                  { label: "Cuenta de ingresos", value: product.account },
                  {
                    label: "En esta factura",
                    value: `${number(soldOf(product.product))} ${product.uom}`,
                  },
                ]}
              />
            </Record.Paper>
          </Record>
        </Drill.Context>

        <Drill.Context id="customer" title="Clínica San Gabriel S.A." flush>
          <Record
            identity={{
              icon: User,
              title: "Clínica San Gabriel S.A.",
              subtitle: "NIT 1020304050 · La Paz",
              figure: { label: "Deuda", value: customer?.debt ?? "—" },
            }}
          >
            <Record.Notice tone="info">
              Tiene {CREDIT_NOTE.number} por {money(CREDIT_NOTE.amount)} sin aplicar.
            </Record.Notice>
            <Record.Paper layout="horizontal">
              <Record.Facts
                fields={[
                  { label: "Límite de crédito", value: customer?.credit ?? "—" },
                  { label: "Ciudad", value: customer?.city ?? "—" },
                  { label: "Teléfono", value: customer?.phone ?? "—" },
                ]}
              />
            </Record.Paper>
          </Record>
        </Drill.Context>

        <Drill.Context
          id="payment"
          title="Registrar pago"
          subtitle="El saldo baja en el momento; se puede deshacer."
          footer={
            <>
              <Button role="ghost" size="sm" onClick={drill.back}>
                Cancelar
              </Button>
              <Button
                role="primary"
                size="sm"
                icon={CreditCard}
                disabled={paying === "" || paying <= 0}
                onClick={() => {
                  drill.close();
                  toast.show({
                    message: `Se registró un pago de ${money(paying === "" ? 0 : paying)}.`,
                    tone: "good",
                  });
                }}
              >
                Registrar pago
              </Button>
            </>
          }
        >
          <FormSection columns={2}>
            <Field label="Cliente">
              <RelationValue
                name="Clínica San Gabriel S.A."
                secondary={`deuda ${customer?.debt ?? "—"}`}
                onOpen={() => drill.open("customer")}
              />
            </Field>
            <Field label="Monto" required>
              <NumberInput value={paying} onChange={setPaying} min={0} unit="Bs." />
            </Field>
            <Field label="Diario">
              <Select
                value="bnb"
                options={[
                  { value: "bnb", label: "Banco BNB" },
                  { value: "union", label: "Banco Unión" },
                  { value: "caja", label: "Caja central" },
                ]}
                onChange={() => {}}
              />
            </Field>
            <Field label="Fecha del pago">
              <DatePicker value="2026-10-30" onChange={() => {}} />
            </Field>
          </FormSection>
        </Drill.Context>
      </Drill>

      <Record.Activity
        events={HISTORY}
        messages={MESSAGES}
        composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
      />
    </Record>
  );
}

/**
 * **Publicada, con un pago aplicado y el resto adeudado.** Catorce líneas en tres secciones
 * con notas; la cuenta, la analítica y la unidad esperan en el menú «columnas». Debajo, el
 * desglose de impuestos, el total, cada pago y lo que falta cobrar. En «apuntes contables», el
 * asiento que la factura escribió —debe igual a haber—; en «facturación electrónica», lo que
 * contestó el SIAT.
 */
export const Publicada: Story = {
  render: () => (
    <Frame>
      <FullInvoice />
    </Frame>
  ),
};

/**
 * **El borrador, para escribirla.** Las mismas catorce líneas, ahora editables: el producto se
 * busca en la celda, los impuestos son fichas, «Agregar una sección» y «Agregar una nota» van
 * abajo de la grilla, y `Tab` pasado el último campo empieza la línea siguiente.
 */
export const Borrador: Story = {
  render: () => (
    <Frame>
      <FullInvoice draft />
    </Frame>
  ),
};
