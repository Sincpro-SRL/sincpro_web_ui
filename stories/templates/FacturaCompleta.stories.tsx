import {
  Destination,
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  type ActivityEvent,
  type AppEntry,
  Button,
  Copyable,
  type DataColumn,
  DataField,
  DatePicker,
  DateValue,
  Field,
  FormActions,
  FormSection,
  LineItems,
  List,
  type ListPresent,
  Menu,
  type Message,
  MessageComposer,
  NumberInput,
  type OpenTarget,
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
  TopBar,
  type TopMenu,
  type TotalsProps,
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
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { expect, userEvent, within } from "storybook/test";

import { Workspace } from "../support/composer";
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
 * It lives in the WORKSPACE (composer), like every template: the invoice is a view, and what
 * it opens — a line, its product, the customer, «Registrar pago» — is another view the
 * workspace places. A relation opens in a MODAL by default and «Abrir en…» offers the rest
 * (peek, beside, as the page); from inside a modal a related record opens beside or in a peek,
 * because another modal would replace the first one and lose what was typed.
 *
 * Built ONLY from the public API: when it needs something the package does not export, the
 * package is missing it — that is what this screen is for.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Factura completa · un registro con todo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una factura del tamaño de una real, en el espacio de trabajo: líneas por secciones con notas, columnas opcionales, impuestos por línea, pagos aplicados, el asiento contable, la facturación electrónica del SIAT y la cabecera densa. La línea, el producto y el cliente se abren en MODAL; «Abrir en…» ofrece vista previa, al costado o como página. «Registrar pago» es un modal sobre la factura. Armada sólo con la API pública.",
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

const MENU = (
  <TopBar
    apps={APPS}
    currentApp="ventas"
    menus={MENUS}
    systray={<SystrayButton icon={Bell} label="Avisos" count={2} tone="warn" />}
    user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
  />
);

/* ==================================================================== *
 *  THE REFERENCES — what each view is, and where it opens
 * ==================================================================== */

const CUSTOMER_NAME = "Clínica San Gabriel S.A.";
const CUSTOMER_TAX_ID = "1020304050";

const invoiceRef = (draft: boolean): ResourceRef => ({
  domain: "ventas",
  kind: "factura",
  id: draft ? "borrador" : "FAC/2026/0115",
});
const lineRef = (id: string): ResourceRef => ({ domain: "ventas", kind: "linea", id });
const productRef = (name: string): ResourceRef => ({
  domain: "ventas",
  kind: "producto",
  id: name,
});
const customerRef: ResourceRef = { domain: "ventas", kind: "cliente", id: CUSTOMER_TAX_ID };
const paymentRef: ResourceRef = { domain: "ventas", kind: "pago", id: "FAC/2026/0115" };

/** A modal over the surface, at a size that holds a record; the rest as the person chose. */
const opened = (to: OpenTarget) =>
  to === "modal"
    ? { to: Destination.Modal, size: { w: 760, h: 560 } }
    : { to: to as (typeof Destination)[keyof typeof Destination] };

/** From INSIDE a modal: beside, a peek or the page — never a second modal over the first. */
const FROM_A_MODAL: readonly OpenTarget[] = ["side", "peek", "page"];

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

/** The product of a line is a many2one: its name opens it in a modal over the invoice, and
 *  «Abrir en…» beside it offers a peek, beside or the page — read or being edited alike. */
function lineColumns(editable: boolean, openProduct: (name: string, to: OpenTarget) => void) {
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
          {...(l.product === ""
            ? {}
            : { onOpenIn: (to: OpenTarget) => openProduct(l.product, to) })}
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
                onOpen={openProduct}
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

/* ==================================================================== *
 *  WHAT THE VIEWS SHARE — in an app, the server
 * ==================================================================== */

/** A payment registered from this screen: it lowers the balance at once and can be undone. */
type Received = { id: string; amount: number; journal: string; date: string };

const JOURNALS = [
  { value: "bnb", label: "Banco BNB" },
  { value: "union", label: "Banco Unión" },
  { value: "caja", label: "Caja central" },
];

/* The invoice, its lines and its payments are read by several views at once — the line in
   a modal reads the line the grid just changed — so they live above the workspace. */
type Invoice = {
  draft: boolean;
  lines: readonly FullLine[];
  setLines: (update: (all: readonly FullLine[]) => readonly FullLine[]) => void;
  applied: readonly string[];
  setApplied: (update: (ids: readonly string[]) => readonly string[]) => void;
  received: readonly Received[];
  receive: (payment: Received) => void;
  unreceive: (id: string) => void;
  /** What is still due: the total less every payment applied or registered. */
  balance: number;
};
const InvoiceContext = createContext<Invoice | null>(null);
function useInvoice(): Invoice {
  const invoice = useContext(InvoiceContext);
  if (invoice === null) throw new Error("useInvoice outside InvoiceProvider");
  return invoice;
}
function InvoiceProvider({ draft, children }: { draft: boolean; children: ReactNode }) {
  const [lines, setLines] = useState<readonly FullLine[]>(FULL_LINES);
  const [applied, setApplied] = useState<readonly string[]>(
    draft ? [] : PAYMENTS.map((p) => p.id),
  );
  const [received, setReceived] = useState<readonly Received[]>([]);
  const invoice = useMemo<Invoice>(() => {
    const paid =
      PAYMENTS.filter((p) => applied.includes(p.id)).reduce((a, p) => a + p.amount, 0) +
      received.reduce((a, p) => a + p.amount, 0);
    return {
      draft,
      lines,
      setLines,
      applied,
      setApplied,
      received,
      receive: (payment) => setReceived((all) => [...all, payment]),
      unreceive: (id) => setReceived((all) => all.filter((p) => p.id !== id)),
      balance: Math.round((figuresOf(lines).total - paid) * 100) / 100,
    };
  }, [draft, lines, applied, received]);
  return <InvoiceContext value={invoice}>{children}</InvoiceContext>;
}

const dated = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/* ==================================================================== *
 *  THE INVOICE — the page; everything it opens is another view
 * ==================================================================== */

function FullInvoice({ api }: ViewProps) {
  const { draft, lines, setLines, applied, setApplied, received, unreceive, balance } =
    useInvoice();
  const toast = useToast();
  const crumbs = useCrumbs(api);
  const [page, setPage] = useState("lineas");
  const [reference, setReference] = useState("OC-CSG-2026-0412");
  const f = figuresOf(lines);
  const customer = customerCard(CUSTOMER_TAX_ID);
  const say = (message: string) => () => toast.show({ message });
  /* Every sub-context is a view of the workspace: a line, its product and the customer in a
     modal by default (or wherever «Abrir en…» says); the payment a modal over the invoice. */
  const openProduct = (name: string, to: OpenTarget = "modal") =>
    api.open(productRef(name), opened(to));
  const openCustomer = (to: OpenTarget = "modal") => api.open(customerRef, opened(to));
  const openLine = (id: string) => api.open(lineRef(id), opened("modal"));
  const openPayment = () =>
    api.open(paymentRef, { to: Destination.Modal, size: { w: 640, h: 460 } });
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
          deductions: [
            ...payments.map((p) => ({
              label: `Pagado el ${dated(p.date)}`,
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
            /* What «Registrar pago» added a moment ago — removable like the others. */
            ...received.map((p) => ({
              label: `Pagado el ${dated(p.date)}`,
              value: money(p.amount),
              detail: `registrado recién · ${p.journal}`,
              onRemove: () => unreceive(p.id),
            })),
          ],
          balance: { label: "Importe adeudado", value: money(balance) },
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
          : { label: "Importe adeudado", value: money(balance) },
      }}
    >
      {/* What is true of the whole invoice, said once, above its parts. */}
      {draft ? (
        <Record.Notice tone="info">
          Al publicarla se envía al SIAT y ya no se puede cambiar: revisá los impuestos de
          cada línea.
        </Record.Notice>
      ) : balance > 0 ? (
        <Record.Notice
          tone="warn"
          title="Pagada en parte"
          action={
            <Button role="secondary" size="sm" onClick={openPayment}>
              Registrar el resto
            </Button>
          }
        >
          Faltan {money(balance)}; vence el 12/11/2026.
        </Record.Notice>
      ) : null}
      <Record.Rail>
        {/* The application's place, then the workspace's own trail (this page, and the pages
            it came from — each a link back). */}
        <Record.Crumbs crumbs={[{ label: "Ventas" }, { label: "Facturas" }, ...crumbs]} />
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
            onClick={draft ? say("Se publicaría y enviaría al SIAT") : openPayment}
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
                  name={CUSTOMER_NAME}
                  secondary={`NIT ${CUSTOMER_TAX_ID}`}
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
                  onOpenIn={openCustomer}
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
              /* The whole line is a sub-record: a modal over the invoice, like a many2one. */
              onOpenLine={openLine}
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

      <Record.Activity
        events={HISTORY}
        messages={MESSAGES}
        composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
      />
    </Record>
  );
}

/* ==================================================================== *
 *  WHAT THE INVOICE OPENS — each one a view
 * ==================================================================== */

/** One line, whole — the ten fields the grid shows five of. A modal over the invoice; its
 *  product opens BESIDE or in a peek, so the line stays where it was. */
function Line({ api, resource }: ViewProps) {
  const { lines } = useInvoice();
  const line = lines.find((l) => l.id === resource.id) ?? null;
  const title = line?.product || "Línea";
  useEffect(() => api.setTitle(title), [api, title]);
  if (line === null) return null;
  return (
    <Record identity={{ icon: ListTree, title, subtitle: line.label || line.sku }}>
      <Record.Paper>
        <FormSection columns={2}>
          <Field label="Producto">
            <RelationValue
              name={line.product}
              secondary={line.sku}
              openTargets={FROM_A_MODAL}
              onOpenIn={(to) => api.open(productRef(line.product), opened(to))}
            />
          </Field>
          <DataField label="Etiqueta" value={line.label || null} />
          <DataField label="Cuenta" value={line.account} />
          <DataField label="Analítica" value={line.analytic} />
          <DataField label="Cantidad" value={`${number(line.quantity)} ${line.uom}`} />
          <DataField label="Precio unitario" value={money(line.price)} />
          <DataField
            label="Descuento"
            value={line.discount === 0 ? null : `${number(line.discount)} %`}
          />
          <DataField
            label="Impuestos"
            value={
              <Tags
                items={TAXES.filter((t) => line.taxes.includes(t.value)).map((t) => ({
                  id: t.value,
                  label: t.label,
                }))}
              />
            }
          />
          <DataField label="Importe" value={money(amountOf(line))} />
        </FormSection>
        <FormActions
          primary={
            <Button role="secondary" size="sm" onClick={() => api.close()}>
              Listo
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

function Product({ api, resource }: ViewProps) {
  const { lines } = useInvoice();
  const product = FULL_LINES.find((l) => l.product === resource.id) ?? FULL_LINES[1]!;
  useEffect(() => api.setTitle(product.product), [api, product.product]);
  /* What THIS invoice sells of it — read from the lines as they are now, draft edits too. */
  const sold = lines
    .filter((l) => l.product === product.product)
    .reduce((a, l) => a + l.quantity, 0);
  return (
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
            { label: "En esta factura", value: `${number(sold)} ${product.uom}` },
          ]}
        />
      </Record.Paper>
    </Record>
  );
}

function Customer({ api }: ViewProps) {
  const customer = customerCard(CUSTOMER_TAX_ID);
  useEffect(() => api.setTitle(CUSTOMER_NAME), [api]);
  return (
    <Record
      identity={{
        icon: User,
        title: CUSTOMER_NAME,
        subtitle: `NIT ${CUSTOMER_TAX_ID} · La Paz`,
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
  );
}

let receipts = 0;

/** «Registrar pago» — a short task, a MODAL over the invoice. Its draft lives in the view, so
 *  it survives a look at the customer BESIDE (another modal would replace this one); while
 *  the amount differs from the balance, leaving it asks first. */
function Payment({ api }: ViewProps) {
  const { balance, receive, unreceive } = useInvoice();
  const toast = useToast();
  const customer = customerCard(CUSTOMER_TAX_ID);
  const [due] = useState(balance);
  const [amount, setAmount] = useState<number | "">(due);
  const [journal, setJournal] = useState(JOURNALS[0]!.value);
  const [date, setDate] = useState<string | null>("2026-10-30");
  useEffect(() => api.setTitle("Registrar pago"), [api]);
  useEffect(() => api.setDirty(amount !== due), [api, amount, due]);
  const register = () => {
    const paid = amount === "" ? 0 : amount;
    receipts += 1;
    const id = `r${receipts}`;
    receive({
      id,
      amount: paid,
      journal: JOURNALS.find((j) => j.value === journal)?.label ?? journal,
      date: date ?? "2026-10-30",
    });
    api.setDirty(false);
    api.close();
    toast.show({
      message: `Se registró un pago de ${money(paid)}.`,
      tone: "good",
      action: { label: "Deshacer", onSelect: () => unreceive(id) },
    });
  };
  return (
    <Record
      identity={{
        icon: CreditCard,
        title: "Registrar pago",
        subtitle: "El saldo baja en el momento; se puede deshacer.",
      }}
    >
      <Record.Paper>
        <FormSection columns={2}>
          <Field label="Cliente">
            <RelationValue
              name={CUSTOMER_NAME}
              secondary={`deuda ${customer?.debt ?? "—"}`}
              openTargets={FROM_A_MODAL}
              onOpenIn={(to) => api.open(customerRef, opened(to))}
            />
          </Field>
          <Field label="Monto" required>
            <NumberInput value={amount} onChange={setAmount} min={0} unit="Bs." />
          </Field>
          <Field label="Diario">
            <Select value={journal} options={JOURNALS} onChange={setJournal} />
          </Field>
          <Field label="Fecha del pago">
            <DatePicker value={date} onChange={setDate} />
          </Field>
        </FormSection>
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
              disabled={amount === "" || amount <= 0}
              onClick={register}
            >
              Registrar pago
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "ventas",
    kind: "factura",
    title: (ref) => (ref.id === "borrador" ? "Borrador" : (ref.id ?? "Factura")),
    icon: Receipt,
    load: async () => FullInvoice,
  },
  {
    domain: "ventas",
    kind: "linea",
    title: () => "Línea",
    icon: ListTree,
    load: async () => Line,
  },
  {
    domain: "ventas",
    kind: "producto",
    title: (ref) => ref.id ?? "Producto",
    icon: Package,
    load: async () => Product,
  },
  {
    domain: "ventas",
    kind: "cliente",
    title: () => CUSTOMER_NAME,
    icon: User,
    load: async () => Customer,
  },
  {
    domain: "ventas",
    kind: "pago",
    title: () => "Registrar pago",
    icon: CreditCard,
    load: async () => Payment,
  },
];

function Page({ draft = false }: { draft?: boolean }) {
  return (
    <InvoiceProvider draft={draft}>
      <Workspace views={VIEWS} start={invoiceRef(draft)} menu={MENU} />
    </InvoiceProvider>
  );
}

/**
 * **Publicada, con un pago aplicado y el resto adeudado.** Catorce líneas en tres secciones
 * con notas; la cuenta, la analítica y la unidad esperan en el menú «columnas». Debajo, el
 * desglose de impuestos, el total, cada pago y lo que falta cobrar. En «apuntes contables», el
 * asiento que la factura escribió —debe igual a haber—; en «facturación electrónica», lo que
 * contestó el SIAT. El cliente se abre en un MODAL sobre la factura; «Registrar pago» también,
 * y desde él el cliente va al costado.
 */
export const Publicada: Story = {
  render: () => <Page />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    /* The customer, a many2one, opens in a composer modal over the invoice. */
    const [customer] = await canvas.findAllByRole("link", { name: CUSTOMER_NAME });
    await userEvent.click(customer!);
    const dialog = await page.findByRole("dialog", { name: CUSTOMER_NAME });
    await expect(
      await within(dialog).findByText(`NIT ${CUSTOMER_TAX_ID} · La Paz`),
    ).toBeVisible();
  },
};

/**
 * **El borrador, para escribirla.** Las mismas catorce líneas, ahora editables: el producto se
 * busca en la celda, los impuestos son fichas, «Agregar una sección» y «Agregar una nota» van
 * abajo de la grilla, y `Tab` pasado el último campo empieza la línea siguiente. El lápiz de
 * una línea la abre entera en un MODAL; su producto, desde ahí, al costado.
 */
export const Borrador: Story = {
  render: () => <Page draft />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const first = FULL_LINES.find((l) => l.kind === "line")!;
    /* The pencil of a line opens the whole line in a composer modal. */
    const [edit] = await canvas.findAllByRole("button", { name: "Editar la línea" });
    await userEvent.click(edit!);
    const dialog = await page.findByRole("dialog", { name: first.product });
    await expect(await within(dialog).findByText("Precio unitario")).toBeVisible();
  },
};
