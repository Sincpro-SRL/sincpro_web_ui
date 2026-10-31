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
  AssistedValue,
  assistEvent,
  AssistPending,
  AssistSuggestion,
  Button,
  Calendar,
  ChangeReview,
  DatePicker,
  Field,
  FormActions,
  FormSection,
  LineItems,
  List,
  type ListPresent,
  type Message,
  MessageComposer,
  Metric,
  Metrics,
  NavigationTree,
  type NavItem,
  NumberInput,
  type OpenTarget,
  Pagination,
  Record,
  RelationValue,
  SearchBar,
  type SearchCriteria,
  Select,
  SheetGroup,
  SheetGroups,
  type SortState,
  SystrayButton,
  Tag,
  TagsField,
  TextArea,
  TextInput,
  TopBar,
  type TopMenu,
  UserChip,
  useToast,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Bell,
  BookOpen,
  Boxes,
  ChartColumn,
  CreditCard,
  FileText,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  CUSTOMER_OPTIONS,
  type Invoice,
  type InvoiceLine,
  INVOICES,
  money,
  SALESPERSON_OPTIONS,
  shortDate,
  STAGES,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
} from "../support/erp";
import {
  applyLineProposals,
  ASSISTED_INVOICE,
  DRAFT_LINES_BEFORE,
  LINE_PROPOSALS,
  lineSummary,
  ORDER_SOURCE,
  SUGGESTED_TERM,
  TERM_SOURCE,
} from "../support/erp-assist";
import {
  blankLine,
  lineColumns,
  lineEditor,
  lineIsValid,
  lineTotals,
  restoreAt,
} from "../support/erp-lines";
import { customerCard, salesperson } from "../support/erp-people";
import { INVOICE_LABELS } from "../support/erp-tags";

/**
 * Context: **a module, the way it is used.** The views show one record and N records each on
 * its own; a person never sees them like that. They see the application bar, a list they
 * filter, a row they open, a record they edit and the way back. This is that, end to end,
 * built ONLY from the public API — if a template needs something the package does not
 * export, the package is missing it.
 *
 * Everything moves through the WORKSPACE (composer): the list, an invoice, a new one, the
 * customer and a line are views over references, and the template never keeps a «which
 * screen» state nor opens a dialog of its own. A row opens the invoice as the page (the crumb
 * comes back), its 👁 as a peek; the customer opens in a modal over the invoice («Abrir en…»
 * offers the rest); the pencil of a line opens that line in a modal. On a phone composer
 * translates: the modal is a sheet from the bottom. ⌘K is the workspace's own palette.
 *
 * The domain is the sales module of an ERP because it is the screen most business software
 * is made of: a list of documents with a state, and a document with lines and totals.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Facturas · un módulo de ERP",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un módulo completo armado sólo con la API pública, en el espacio de trabajo: la barra de la aplicación, la lista de facturas, la factura y una nueva. Una fila abre la factura como página (la miga vuelve) y su 👁 en vista previa; el cliente y la línea se abren en un modal sobre la factura. `Módulo` empieza en la lista; las otras historias empiezan en cada pantalla.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** The salesperson as a person: the chip opens the card with the ways to reach them. */
function Salesperson({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const person = salesperson(name);
  if (person === undefined) return <UserChip name={name} size={size} />;
  return (
    <UserChip
      name={person.name}
      size={size}
      role={person.role}
      {...(person.photo === undefined ? {} : { src: person.photo })}
      contact={{
        ...(person.email === undefined ? {} : { email: person.email }),
        ...(person.phone === undefined ? {} : { phone: person.phone }),
        ...(person.whatsapp === undefined ? {} : { whatsapp: person.whatsapp }),
      }}
    />
  );
}

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
    id: "pedidos",
    label: "Pedidos",
    groups: [
      {
        options: [
          { id: "cotizaciones", label: "Cotizaciones" },
          { id: "pedidos", label: "Pedidos de venta" },
        ],
      },
    ],
  },
  {
    id: "facturacion",
    label: "Facturación",
    groups: [
      {
        options: [
          { id: "facturas", label: "Facturas", hint: `${INVOICES.length} este año` },
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

const ACCOUNT = [
  {
    options: [
      { id: "perfil", label: "Mi perfil", icon: UserCog },
      { id: "prefs", label: "Preferencias", icon: Settings },
    ],
  },
  { options: [{ id: "salir", label: "Cerrar sesión", icon: LogOut }] },
];

/* No padding and no card: inside an application the list and the record run edge to edge
   under the bar, the way an ERP screen does. A margin drew a strip of canvas between two dark
   bars and the screen read as two pieces. */
const MENU = (
  <TopBar
    apps={APPS}
    currentApp="ventas"
    menus={MENUS}
    systray={<SystrayButton icon={Bell} label="Avisos" count={2} tone="warn" />}
    user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
    userGroups={ACCOUNT}
  />
);

/* ==================================================================== *
 *  THE REFERENCES — the views never import each other, they open these
 * ==================================================================== */

const NEW_KEY = "nueva";

const invoicesRef: ResourceRef = { domain: "ventas", kind: "facturas" };
/** `reference`: a customer reference typed and not saved yet — the invoice opens with
 *  changes. A param, not part of the key: it is a face of the same record. */
const invoiceRef = (i: Invoice, reference?: string): ResourceRef => ({
  domain: "ventas",
  kind: "factura",
  id: i.id,
  ...(reference === undefined ? {} : { params: { reference } }),
});
const newInvoiceRef: ResourceRef = { domain: "ventas", kind: "factura-nueva" };
const assistedRef: ResourceRef = {
  domain: "ventas",
  kind: "factura-asistida",
  id: ASSISTED_INVOICE.number,
};
const customerRef = (taxId: string, name: string): ResourceRef => ({
  domain: "ventas",
  kind: "cliente",
  id: taxId,
  params: { name },
});
/** A line of an invoice (or of the new one): the owner travels with it, so the line view
 *  edits the same draft the invoice shows. `about` is what its header says it belongs to. */
const lineRef = (owner: string, about: string, id: string): ResourceRef => ({
  domain: "ventas",
  kind: "linea",
  id,
  params: { invoice: owner, about },
});

/** Where a relation opens: a modal at a size that holds a record, or what «Abrir en…» chose. */
const opened = (to: OpenTarget) =>
  to === "modal"
    ? { to: Destination.Modal, size: { w: 640, h: 440 } }
    : { to: to as (typeof Destination)[keyof typeof Destination] };

/** A line is a short form: a modal over the invoice — on a phone, a sheet from the bottom. */
const LINE_MODAL = { to: Destination.Modal, size: { w: 520, h: 560 } };

/* ==================================================================== *
 *  WHAT THE VIEWS SHARE — the lines being edited and the due dates moved
 * ==================================================================== */

/* One empty list, not a new `[]` per read: «nothing changed» is the same array. */
const NO_LINES: readonly InvoiceLine[] = [];
const initialLines = (key: string): readonly InvoiceLine[] =>
  key === ASSISTED_INVOICE.number
    ? DRAFT_LINES_BEFORE
    : (INVOICES.find((i) => i.id === key)?.lines ?? NO_LINES);

type Draft = { lines: readonly InvoiceLine[]; saved: readonly InvoiceLine[] };
const draftOf = (all: Readonly<Record<string, Draft>>, key: string): Draft =>
  all[key] ?? { lines: initialLines(key), saved: initialLines(key) };

/* The invoice and its line are two views of the same draft: a line changed in its modal is a
   change of the invoice, to save or discard in its rail like a field. And the list and the
   invoice are two views of the same records: a due date moved in the list is the invoice's.
   In an app this is the server (and the record's own draft). */
type Sales = {
  linesOf: (key: string) => readonly InvoiceLine[];
  savedOf: (key: string) => readonly InvoiceLine[];
  change: (
    key: string,
    next: (now: readonly InvoiceLine[]) => readonly InvoiceLine[],
  ) => void;
  save: (key: string) => void;
  discard: (key: string) => void;
  dueOf: (i: Invoice) => string;
  postpone: (id: string, iso: string) => void;
};
const SalesContext = createContext<Sales | null>(null);
function useSales(): Sales {
  const sales = useContext(SalesContext);
  if (sales === null) throw new Error("useSales outside SalesProvider");
  return sales;
}
function SalesProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Readonly<Record<string, Draft>>>({});
  const [due, setDue] = useState<Readonly<Record<string, string>>>({});
  /* The writes never change: a view that discards on unmount holds the same `discard` for
     its whole life, instead of running its cleanup — and discarding — on every edit. */
  const writes = useMemo(
    () => ({
      change: (key: string, next: (now: readonly InvoiceLine[]) => readonly InvoiceLine[]) =>
        setDrafts((all) => {
          const now = draftOf(all, key);
          return { ...all, [key]: { ...now, lines: next(now.lines) } };
        }),
      save: (key: string) =>
        setDrafts((all) => {
          const now = draftOf(all, key);
          return { ...all, [key]: { ...now, saved: now.lines } };
        }),
      discard: (key: string) =>
        setDrafts((all) => {
          const now = draftOf(all, key);
          return now.lines === now.saved
            ? all
            : { ...all, [key]: { ...now, lines: now.saved } };
        }),
      postpone: (id: string, iso: string) => setDue((all) => ({ ...all, [id]: iso })),
    }),
    [],
  );
  const sales = useMemo<Sales>(
    () => ({
      ...writes,
      linesOf: (key) => draftOf(drafts, key).lines,
      savedOf: (key) => draftOf(drafts, key).saved,
      dueOf: (i) => due[i.id] ?? i.due,
    }),
    [writes, drafts, due],
  );
  return <SalesContext value={sales}>{children}</SalesContext>;
}

/**
 * The lines of a document, as its view reads them. When the view goes away — the person left
 * and the workspace already asked whether to discard — what was not saved goes with it:
 * coming back to the invoice must not bring back lines that were thrown away.
 */
function useLines(key: string) {
  const sales = useSales();
  const { discard, change } = sales;
  useEffect(() => () => discard(key), [discard, key]);
  return {
    lines: sales.linesOf(key),
    saved: sales.savedOf(key),
    set: (next: readonly InvoiceLine[]) => change(key, () => next),
    change: (next: (now: readonly InvoiceLine[]) => readonly InvoiceLine[]) =>
      change(key, next),
    save: () => sales.save(key),
    discard: () => discard(key),
  };
}

/* ==================================================================== *
 *  N RECORDS — the list of invoices
 * ==================================================================== */

const PAGE_SIZE = 12;

type Quick = "all" | "overdue" | "draft" | "posted";

const QUICK: Record<Exclude<Quick, "all">, (i: Invoice) => boolean> = {
  overdue: (i) => i.state === "overdue",
  draft: (i) => i.state === "draft",
  posted: (i) => i.state === "posted",
};

/** The list, a VIEW of the workspace: a row opens the invoice as the page (with its crumb
 *  back), its 👁 as a peek; «Nueva factura» opens the new one as the page. */
function InvoiceList({ api }: ViewProps) {
  const { dueOf, postpone } = useSales();
  const crumbs = useCrumbs(api);
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [present, setPresent] = useState<ListPresent>("table");
  const [sort, setSort] = useState<SortState | null>(null);
  const [quick, setQuick] = useState<Quick>("all");
  const [page, setPage] = useState(0);
  const onNew = () => api.open(newInvoiceRef);

  /* Due dates changed from the list itself, without opening the invoice. */
  const filtered = (quick === "all" ? INVOICES : INVOICES.filter(QUICK[quick])).map((i) => {
    const due = dueOf(i);
    return due === i.due ? i : { ...i, due };
  });
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const receivable = INVOICES.filter((i) => i.state === "posted" || i.state === "overdue");

  const toggle = (next: Quick) => {
    setQuick((current) => (current === next ? "all" : next));
    setPage(0);
  };

  return (
    /* Edge to edge under the application bar: no border, no radius, no margin. And never
       `overflow-hidden` around it — that makes a scroll container and the sticky list bar would
       stick INSIDE it, pushed down by the application bar. */
    <List<Invoice>
      items={visible}
      keyOf={(i) => i.id}
      present={present}
      onPresentChange={setPresent}
      sort={sort}
      onSortChange={setSort}
      sortable={[
        { field: "date", label: "Fecha", value: (i: Invoice) => i.date },
        { field: "total", label: "Total", value: (i: Invoice) => subtotalOf(i) },
        { field: "customer", label: "Cliente", value: (i: Invoice) => i.customer },
      ]}
      /* The workspace's rule: a row opens the page; 👁 is the look without leaving. */
      rowClick="open"
      onOpen={(i) => api.open(invoiceRef(i))}
      onPeek={(i) => api.open(invoiceRef(i), { to: Destination.Peek })}
      filtered={quick !== "all"}
      empty={{
        sentence: "Todavía no hay facturas.",
        action: (
          <Button role="primary" size="sm" onClick={onNew}>
            Nueva factura
          </Button>
        ),
      }}
    >
      <List.Bar>
        <List.Crumbs crumbs={crumbs} />
        <List.Identity
          title="Facturas"
          description="lo que se le cobró a cada cliente"
          counters={[
            { label: "facturas", value: INVOICES.length },
            { label: "por cobrar", value: receivable.length },
          ]}
        />
        <List.Search>
          <SearchBar
            facets={[
              { id: "number", label: "en el número" },
              { id: "customer", label: "en el cliente" },
            ]}
            criteria={criteria}
            onCriteriaChange={setCriteria}
            placeholder="buscar una factura…"
          />
        </List.Search>
        <List.Actions>
          <Button role="primary" size="sm" onClick={onNew}>
            + Nueva factura
          </Button>
        </List.Actions>
        <List.Pagination>
          <Pagination
            from={filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}
            to={page * PAGE_SIZE + visible.length}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPrev={page === 0 ? undefined : () => setPage(page - 1)}
            onNext={
              (page + 1) * PAGE_SIZE >= filtered.length ? undefined : () => setPage(page + 1)
            }
          />
        </List.Pagination>
      </List.Bar>

      <List.Metrics>
        <Metrics>
          <Metric
            value={INVOICES.filter(QUICK.overdue).length}
            label="vencidas"
            tone="bad"
            icon={Wallet}
            active={quick === "overdue"}
            onClick={() => toggle("overdue")}
          />
          <Metric
            value={INVOICES.filter(QUICK.posted).length}
            label="por cobrar"
            tone="info"
            active={quick === "posted"}
            onClick={() => toggle("posted")}
          />
          <Metric
            value={INVOICES.filter(QUICK.draft).length}
            label="borradores"
            tone="warn"
            active={quick === "draft"}
            onClick={() => toggle("draft")}
          />
          <Metric
            value={money(receivable.reduce((sum, i) => sum + subtotalOf(i), 0))}
            label="saldo por cobrar"
          />
        </Metrics>
      </List.Metrics>

      <List.Table<Invoice>
        totals
        columns={[
          { id: "number", header: "Número", value: (i: Invoice) => i.number },
          { id: "customer", header: "Cliente", value: (i: Invoice) => i.customer },
          {
            id: "date",
            header: "Fecha",
            value: (i: Invoice) => shortDate(i.date),
            optional: true,
          },
          {
            id: "due",
            header: "Vence",
            value: (i: Invoice) => shortDate(i.due),
            optional: true,
            /* Postponing a due date is a one-field change: it is done in the cell, without
               opening the invoice. A paid or voided invoice no longer has a due date to move. */
            edit: {
              when: (i: Invoice) => i.state !== "paid" && i.state !== "cancelled",
              render: (i: Invoice, done: () => void) => (
                <Calendar
                  aria-label="Vence"
                  value={i.due}
                  onChange={(iso) => {
                    postpone(i.id, iso);
                    done();
                  }}
                />
              ),
            },
          },
          {
            id: "salesperson",
            header: "Vendedor",
            value: (i: Invoice) => i.salesperson,
            cell: (i: Invoice) => <Salesperson name={i.salesperson} size="sm" />,
            optional: true,
            defaultHidden: true,
          },
          {
            id: "state",
            header: "Estado",
            value: (i: Invoice) => STATE_LABEL[i.state],
            cell: (i: Invoice) => (
              <Tag tone={STATE_TONE[i.state]}>{STATE_LABEL[i.state]}</Tag>
            ),
          },
          {
            id: "total",
            header: "Total (Bs.)",
            value: (i: Invoice) => Math.round(subtotalOf(i) * 100) / 100,
            numeric: true,
            aggregate: "sum",
          },
        ]}
      />
      <List.Rows<Invoice>
        row={(i) => ({
          icon: Receipt,
          name: `${i.number} · ${i.customer}`,
          tags: <Tag tone={STATE_TONE[i.state]}>{STATE_LABEL[i.state]}</Tag>,
          meta: `${shortDate(i.date)} · ${money(subtotalOf(i))}`,
        })}
      />
      <List.Board<Invoice> />
    </List>
  );
}

/* ==================================================================== *
 *  ONE RECORD — the invoice
 * ==================================================================== */

const HISTORY: ActivityEvent[] = [
  {
    id: "e1",
    label: "se creó la factura",
    at: "2026-10-02T14:10:00Z",
    by: "Andrés Gutiérrez",
    moved: { to: "Borrador" },
  },
  {
    id: "e2",
    label: "se publicó",
    at: "2026-10-03T09:30:00Z",
    by: "Josefa Muñoz",
    tone: "info",
    moved: { from: "Borrador", to: "Publicada" },
    detail: "enviada por correo al cliente",
  },
  {
    id: "e3",
    label: "se registró un pago parcial",
    at: "2026-10-20T16:45:00Z",
    by: "Carla Rojas",
    tone: "good",
    detail: "Bs. 5.000,00 · transferencia BNB",
  },
];

const NOTES: Message[] = [
  {
    id: "m1",
    author: "Carla Rojas",
    at: "2026-10-21T10:02:00Z",
    body: "El cliente pidió pagar el saldo en dos cuotas. Lo confirmo con contabilidad.",
  },
];

/**
 * The lines of an invoice: the system's one2many. Editable while the invoice is a draft — in
 * place for a quantity or a discount, in the line's own view for the whole line — and only
 * read once it is posted. Removing a line does not ask; the notice offers «Deshacer».
 *
 * The pencil (and, on a phone, the press on a card) opens the line in the WORKSPACE
 * (`onOpenLine`), not in a dialog of this block: a line is a record too, and the workspace is
 * the one place that decides where records open. A posted invoice passes none: its lines are
 * read, and a pencil there would open a form that cannot save.
 */
function InvoiceLines({
  lines,
  onLinesChange,
  editable,
  onOpenLine,
}: {
  lines: readonly InvoiceLine[];
  onLinesChange?: (next: (now: readonly InvoiceLine[]) => readonly InvoiceLine[]) => void;
  editable: boolean;
  onOpenLine?: (id: string) => void;
}) {
  const set = (next: (now: readonly InvoiceLine[]) => readonly InvoiceLine[]) =>
    onLinesChange?.(next);
  return (
    <LineItems
      mode={editable ? "edit" : "read"}
      lines={lines}
      /* The line is written where it will live: «Agregar una línea» under the grid opens a
         row with the product to search in its cell; the pencil still opens the whole line. */
      columns={lineColumns({ productInCell: true })}
      adding="inline"
      getLineId={(l) => l.id}
      lineLabel={(l) => l.product || "línea nueva"}
      onChange={(id, next) => set((now) => now.map((l) => (l.id === id ? next : l)))}
      onAdd={(line) => set((now) => [...now, line])}
      newLine={blankLine}
      onRemove={(id) => set((now) => now.filter((l) => l.id !== id))}
      onRestore={(line, index) => set((now) => restoreAt(now, line, index))}
      totals={lineTotals(lines)}
      {...(editable && onOpenLine !== undefined ? { onOpenLine } : {})}
    />
  );
}

/** One invoice, a VIEW: its crumbs come from the workspace, the pager walks the invoices in
 *  place (no crumb per step), the customer opens in a modal over it and a line too. */
function InvoiceRecord({ api, resource }: ViewProps) {
  const invoice = INVOICES.find((i) => i.id === resource.id) ?? INVOICES[0]!;
  const index = INVOICES.indexOf(invoice);
  const edited = resource.params?.["reference"];
  const crumbs = useCrumbs(api);
  const { dueOf } = useSales();
  const { lines, saved: savedLines, change, save, discard } = useLines(invoice.id);
  const [page, setPage] = useState(edited === undefined ? "lineas" : "otros");
  const [reference, setReference] = useState(edited ?? "");
  const [notes, setNotes] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [saved, setSaved] = useState({ reference: "", notes: "" });
  const [paid, setPaid] = useState(false);
  const toast = useToast();
  const customer = customerCard(invoice.taxId);
  const state = paid ? "paid" : invoice.state;
  const stage = state === "overdue" ? "posted" : state;
  /* The lines are part of the record: changing one is a change to save or discard, like a
     field. Only a draft can change them. */
  const dirty =
    reference !== saved.reference || notes !== saved.notes || lines !== savedLines;
  const total = subtotalOf({ ...invoice, lines });
  const about = `${invoice.number} · ${invoice.customer}`;

  useEffect(() => api.setTitle(invoice.number), [api, invoice.number]);
  /* While something is unsaved, a crumb, the pager or a close asks before throwing it away. */
  useEffect(() => api.setDirty(dirty), [api, dirty]);

  /* Undo, not «are you sure?». Registering a payment is the most frequent action of this
     screen: a confirmation dialog on every one trains people to press «yes» without
     reading. The action happens at once and the notice offers the way back. */
  const registerPayment = () => {
    setPaid(true);
    toast.show({
      message: `Se registró el pago de ${money(total)}.`,
      tone: "good",
      action: { label: "Deshacer", onSelect: () => setPaid(false) },
    });
  };
  const sibling = (to: number) => () => api.replace(invoiceRef(INVOICES[to]!));

  return (
    <Record
      {...(dirty
        ? {
            dirty: {
              onSave: () => {
                setSaved({ reference, notes });
                save();
                toast.show({
                  message: "Se guardaron los cambios de la factura.",
                  tone: "good",
                });
              },
              onDiscard: () => {
                setReference(saved.reference);
                setNotes(saved.notes);
                discard();
              },
            },
          }
        : {})}
      identity={{
        icon: Receipt,
        title: invoice.number,
        tag: { label: STATE_LABEL[state], tone: STATE_TONE[state] },
        figure: {
          label: state === "paid" ? "Total pagado" : "Total",
          value: money(total),
        },
      }}
    >
      {/* A light rail: inside the application the bar above is already dark, and ONE
          dark band per screen is what keeps the record's own header readable as its top. */}
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Pager
          index={index + 1}
          total={INVOICES.length}
          onPrev={index === 0 ? undefined : sibling(index - 1)}
          onNext={index === INVOICES.length - 1 ? undefined : sibling(index + 1)}
        />
        <Record.Smart
          links={[
            { icon: CreditCard, count: state === "paid" ? 1 : 0, label: "pagos" },
            { icon: FileText, count: 1, label: "pedido" },
          ]}
        />
        <Record.Actions>
          {invoice.state === "draft" ? (
            <Button role="primary" size="sm">
              Publicar
            </Button>
          ) : null}
          {state === "posted" || state === "overdue" ? (
            <Button role="primary" size="sm" onClick={registerPayment}>
              Registrar pago
            </Button>
          ) : null}
          <Button role="secondary" size="sm">
            Imprimir
          </Button>
        </Record.Actions>
        <Record.Status
          stages={STAGES}
          current={stage === "cancelled" ? "draft" : stage}
          failed={state === "overdue" || state === "cancelled"}
        />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            {
              label: "Cliente",
              value: (
                <RelationValue
                  name={invoice.customer}
                  secondary={`NIT ${invoice.taxId}`}
                  {...(customer === undefined
                    ? {}
                    : {
                        summary: {
                          tag: customer.state,
                          facts: [
                            { label: "Deuda", value: customer.debt },
                            { label: "Límite de crédito", value: customer.credit },
                            { label: "Ciudad", value: customer.city },
                            { label: "Teléfono", value: customer.phone },
                          ],
                        },
                      })}
                  /* A many2one opens in a modal over the invoice by default; «Abrir en…»
                     offers a peek, beside or as the page. */
                  onOpenIn={(to) =>
                    api.open(customerRef(invoice.taxId, invoice.customer), opened(to))
                  }
                />
              ),
            },
            { label: "Emitida", value: shortDate(invoice.date) },
            { label: "Vence", value: shortDate(dueOf(invoice)) },
            {
              label: "Vendedor",
              value: <Salesperson name={invoice.salesperson} size="sm" />,
            },
          ]}
        />

        <Record.Pages current={page} onChange={setPage}>
          <Record.Page id="lineas" label="líneas" count={lines.length}>
            <InvoiceLines
              lines={lines}
              onLinesChange={change}
              editable={state === "draft"}
              onOpenLine={(id) => api.open(lineRef(invoice.id, about, id), LINE_MODAL)}
            />
          </Record.Page>
          <Record.Page id="otros" label="otra información">
            <Field
              label="Etiquetas"
              hint="Para encontrarla después: «exportación», «revisar con contabilidad»."
            >
              <TagsField value={labels} onChange={setLabels} options={INVOICE_LABELS} />
            </Field>
            <Field label="Referencia del cliente" hint="La orden de compra que nos mandó.">
              <TextInput
                value={reference}
                onChange={setReference}
                placeholder="OC-2026-…"
                mono
              />
            </Field>
            <Field label="Notas internas">
              <TextArea value={notes} onChange={setNotes} rows={3} />
            </Field>
          </Record.Page>
        </Record.Pages>
      </Record.Paper>

      <Record.Activity
        events={HISTORY}
        messages={NOTES}
        composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
      />
    </Record>
  );
}

/* ==================================================================== *
 *  A LINE — the whole line, a short form over its invoice
 * ==================================================================== */

/** The line, a MODAL of the workspace over the invoice that asked. Its draft lives here until
 *  «Listo»: then it becomes a change of the invoice (still to save in the invoice's rail).
 *  «Quitar la línea» is here too — on a phone the card has no trash — and it does not ask: the
 *  notice offers «Deshacer». */
function Line({ api, resource }: ViewProps) {
  const owner = resource.params?.["invoice"] ?? NEW_KEY;
  const about = resource.params?.["about"] ?? "";
  const { linesOf, change } = useSales();
  const toast = useToast();
  const lines = linesOf(owner);
  const index = lines.findIndex((l) => l.id === resource.id);
  const line = lines[index];
  const [draft, setDraft] = useState<InvoiceLine | undefined>(line);
  const [tried, setTried] = useState(false);
  useEffect(() => api.setTitle("Editar la línea"), [api]);
  useEffect(() => api.setDirty(draft !== line), [api, draft, line]);
  if (line === undefined || draft === undefined) return null;

  const leave = () => {
    api.setDirty(false);
    api.close();
  };
  const done = () => {
    if (!lineIsValid(draft)) {
      setTried(true);
      return;
    }
    change(owner, (now) => now.map((l) => (l.id === line.id ? draft : l)));
    leave();
  };
  const remove = () => {
    leave();
    change(owner, (now) => now.filter((l) => l.id !== line.id));
    toast.show({
      message: `Se quitó «${line.product || "línea nueva"}».`,
      action: {
        label: "Deshacer",
        onSelect: () => change(owner, (now) => restoreAt(now, line, index)),
      },
    });
  };

  return (
    <Record
      identity={{
        icon: Package,
        title: draft.product || "línea nueva",
        ...(about === "" ? {} : { subtitle: about }),
      }}
    >
      <Record.Paper>
        {/* One section, not the editor's bare fragment: the paper reads its children as slots
            and opens fragments, and the fields would sit beside the actions unkeyed. */}
        <FormSection>{lineEditor(draft, setDraft, { tried, isNew: false })}</FormSection>
        <FormActions
          danger={
            <Button role="ghost" size="sm" onClick={remove}>
              Quitar la línea
            </Button>
          }
          secondary={
            <Button role="ghost" size="sm" onClick={leave}>
              Cancelar
            </Button>
          }
          primary={
            <Button role="primary" size="sm" onClick={done}>
              Listo
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

/* ==================================================================== *
 *  THE CUSTOMER — what the invoice's many2one opens
 * ==================================================================== */

function Customer({ api, resource }: ViewProps) {
  const taxId = resource.id ?? "";
  const card = customerCard(taxId);
  const name = card?.name ?? resource.params?.["name"] ?? "Cliente";
  const invoices = INVOICES.filter((i) => i.taxId === taxId);
  const owed = invoices.filter((i) => i.state === "posted" || i.state === "overdue");
  useEffect(() => api.setTitle(name), [api, name]);
  return (
    <Record
      identity={{
        icon: Users,
        title: name,
        subtitle: card === undefined ? `NIT ${taxId}` : `NIT ${taxId} · ${card.city}`,
        ...(card === undefined
          ? {}
          : { tag: card.state, figure: { label: "Deuda", value: card.debt } }),
      }}
    >
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            ...(card === undefined
              ? []
              : [
                  { label: "Límite de crédito", value: card.credit },
                  { label: "Teléfono", value: card.phone },
                ]),
            { label: "Facturas este año", value: invoices.length },
            {
              label: "Por cobrar",
              value: money(owed.reduce((sum, i) => sum + subtotalOf(i), 0)),
            },
          ]}
        />
      </Record.Paper>
    </Record>
  );
}

/* ==================================================================== *
 *  A NEW RECORD — the same tree, with nothing written yet
 * ==================================================================== */

/** A new invoice, a VIEW opened as the page: «Descartar» is `api.close()` — the page goes one
 *  step back, to the list it came from. */
function NewInvoice({ api }: ViewProps) {
  const crumbs = useCrumbs(api);
  const { lines, change } = useLines(NEW_KEY);
  const [customer, setCustomer] = useState("");
  const [salesperson, setSalesperson] = useState<string>(SALESPERSON_OPTIONS[0]!.value);
  const [days, setDays] = useState<number | "">(30);
  const [issued, setIssued] = useState<string | null>("2026-10-30");
  const [reference, setReference] = useState("");
  const [page, setPage] = useState("lineas");
  /* The error shows after the first try to save, not before: a form that opens already
     red tells the person they did something wrong before they did anything. */
  const [tried, setTried] = useState(false);
  const missing = customer === "";
  const typed = customer !== "" || reference !== "" || lines.length > 0;
  useEffect(() => api.setDirty(typed), [api, typed]);
  const discard = () => {
    /* Discarding IS the answer to «discard?»: the workspace must not ask it again. */
    api.setDirty(false);
    api.close();
  };

  return (
    <Record identity={{ icon: Receipt, title: "Nueva factura", tag: { label: "Borrador" } }}>
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Actions>
          <Button role="primary" size="sm" onClick={() => setTried(true)}>
            Guardar
          </Button>
          <Button role="ghost" size="sm" onClick={discard}>
            Descartar
          </Button>
        </Record.Actions>
        <Record.Status stages={STAGES} current="draft" />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        {/* Two groups side by side, the way an ERP form reads: who it is for on the left,
            the terms on the right. Each group answers one question, so the eye does not
            have to sort twenty fields. */}
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente">
            <Field
              label="Cliente"
              required
              error={tried && missing ? "Elegí a quién se le factura." : undefined}
            >
              <Select
                value={customer}
                options={CUSTOMER_OPTIONS}
                onChange={setCustomer}
                placeholder="Elegí un cliente…"
              />
            </Field>
            <Field label="Referencia del cliente" hint="La orden de compra que nos mandó.">
              <TextInput value={reference} onChange={setReference} mono />
            </Field>
          </SheetGroup>
          <SheetGroup title="Condiciones">
            <Field label="Fecha de emisión" required>
              <DatePicker value={issued} onChange={setIssued} />
            </Field>
            <Field label="Vendedor">
              <Select
                value={salesperson}
                options={SALESPERSON_OPTIONS}
                onChange={setSalesperson}
              />
            </Field>
            <Field label="Plazo de pago" hint="En días desde la fecha de la factura.">
              <NumberInput value={days} min={0} onChange={setDays} />
            </Field>
          </SheetGroup>
        </SheetGroups>

        {/* What is sold, under who it is sold to — empty, said, with the way to add the
            first line right there. */}
        <Record.Pages current={page} onChange={setPage}>
          <Record.Page id="lineas" label="líneas" count={lines.length}>
            <InvoiceLines
              lines={lines}
              onLinesChange={change}
              editable
              onOpenLine={(id) => api.open(lineRef(NEW_KEY, "Nueva factura", id), LINE_MODAL)}
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

/* ==================================================================== *
 *  THE ASSISTANT — suggestions with a source, a preview, undo
 * ==================================================================== */

type Proposal = "idle" | "working" | "ready";

function AssistedInvoice({ api }: ViewProps) {
  const crumbs = useCrumbs(api);
  const { lines, set: setLines, change } = useLines(ASSISTED_INVOICE.number);
  const [days, setDays] = useState<number | "">(ASSISTED_INVOICE.termDays);
  const [termOpen, setTermOpen] = useState(true);
  const [termSet, setTermSet] = useState(false);
  const [proposal, setProposal] = useState<Proposal>("idle");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const total = subtotalOf({ ...INVOICES[0]!, lines });
  const about = `${ASSISTED_INVOICE.number} · ${ASSISTED_INVOICE.customer}`;

  const log = (event: ActivityEvent) => setEvents((now) => [event, ...now]);
  const unlog = (id: string) => setEvents((now) => now.filter((e) => e.id !== id));

  return (
    <Record
      identity={{
        icon: Receipt,
        title: ASSISTED_INVOICE.number,
        tag: { label: "Borrador" },
        figure: { label: "Total", value: money(total) },
      }}
    >
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Actions>
          <Button role="primary" size="sm">
            Publicar
          </Button>
          <Button
            role="secondary"
            size="sm"
            disabled={proposal !== "idle"}
            onClick={() => {
              setProposal("working");
              setTimeout(() => setProposal("ready"), 1200);
            }}
          >
            Desde la orden
          </Button>
        </Record.Actions>
        <Record.Status stages={STAGES} current="draft" />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente">
            <Field label="Cliente">
              <RelationValue
                name={ASSISTED_INVOICE.customer}
                secondary={`NIT ${ASSISTED_INVOICE.taxId}`}
                onOpenIn={(to) =>
                  api.open(
                    customerRef(ASSISTED_INVOICE.taxId, ASSISTED_INVOICE.customer),
                    opened(to),
                  )
                }
              />
            </Field>
          </SheetGroup>
          <SheetGroup title="Condiciones">
            <Field label="Plazo de pago" hint="En días desde la fecha de la factura.">
              <NumberInput value={days} min={0} onChange={setDays} unit="días" />
              {termOpen && days !== SUGGESTED_TERM ? (
                <AssistSuggestion
                  value={`${SUGGESTED_TERM} días`}
                  source={TERM_SOURCE}
                  field="Plazo de pago"
                  onAccept={() => {
                    const before = days;
                    setDays(SUGGESTED_TERM);
                    setTermSet(true);
                    log(
                      assistEvent({
                        id: "term",
                        label: `completó el plazo de pago en ${SUGGESTED_TERM} días`,
                        at: new Date(),
                        source: TERM_SOURCE,
                        acceptedBy: "Andrés Gutiérrez",
                      }),
                    );
                    return () => {
                      setDays(before);
                      setTermSet(false);
                      unlog("term");
                    };
                  }}
                  onDismiss={() => setTermOpen(false)}
                />
              ) : termSet ? (
                <AssistedValue
                  origin={{
                    at: new Date(),
                    source: TERM_SOURCE,
                    acceptedBy: "Andrés Gutiérrez",
                  }}
                >
                  {days} días
                </AssistedValue>
              ) : null}
            </Field>
          </SheetGroup>
        </SheetGroups>

        {proposal === "working" ? (
          <AssistPending
            label={`Leyendo la orden de compra ${"PO/2026/0042"}…`}
            rows={2}
            onCancel={() => setProposal("idle")}
          />
        ) : null}
        {proposal === "ready" ? (
          <ChangeReview
            emphasis="secondary"
            title="Completar las líneas desde la orden de compra"
            summary="Encontré 3 diferencias entre la factura y la orden. Elegí cuáles aplicar."
            source={ORDER_SOURCE}
            onApply={(ids) => {
              const before = lines;
              const lineIds = ids.filter((id) => id.startsWith("line-"));
              setLines(applyLineProposals(before, lineIds));
              setProposal("idle");
              log(
                assistEvent({
                  id: "lines",
                  label: `aplicó ${lineIds.length} cambios de líneas`,
                  at: new Date(),
                  source: ORDER_SOURCE,
                  acceptedBy: "Andrés Gutiérrez",
                }),
              );
              return () => {
                setLines(before);
                setProposal("ready");
                unlog("lines");
              };
            }}
            onDiscard={() => setProposal("idle")}
          >
            <ChangeReview.Group title="Líneas">
              {LINE_PROPOSALS.map((p) => (
                <ChangeReview.Change
                  key={p.id}
                  id={p.id}
                  label={p.line.product}
                  {...(p.kind === "add" ? {} : { before: lineSummary(p.before!) })}
                  {...(p.kind === "remove" ? {} : { after: lineSummary(p.line) })}
                  {...(p.unchosen === true
                    ? { unchosen: true, source: { label: "no figura en la orden" } }
                    : {})}
                />
              ))}
            </ChangeReview.Group>
          </ChangeReview>
        ) : null}

        <Record.Pages current="lineas">
          <Record.Page id="lineas" label="líneas" count={lines.length}>
            <InvoiceLines
              lines={lines}
              onLinesChange={change}
              editable
              onOpenLine={(id) =>
                api.open(lineRef(ASSISTED_INVOICE.number, about, id), LINE_MODAL)
              }
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>

      <Record.Activity defaultOpen events={events} messages={[]} />
    </Record>
  );
}

/* ==================================================================== *
 *  THE WORKSPACE — the views, and ⌘K over them
 * ==================================================================== */

const matching = (query: string) => (i: Invoice) =>
  `${i.number} ${i.customer}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"));

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "ventas",
    kind: "facturas",
    title: () => "Facturas",
    icon: Receipt,
    /* ⌘K lists it under «Ir a…», and offers «Nueva factura» while the person is on it. */
    goto: true,
    actions: () => [
      {
        id: "nueva-factura",
        label: "Nueva factura",
        icon: Receipt,
        shortcut: "Alt+N",
        keywords: ["vender", "cobrar"],
        run: (api) => api.open(newInvoiceRef),
      },
    ],
    load: async () => InvoiceList,
  },
  {
    domain: "ventas",
    kind: "factura",
    title: (ref) => INVOICES.find((i) => i.id === ref.id)?.number ?? "Factura",
    icon: Receipt,
    /* ⌘K finds an invoice by its number or its customer: «0118», «san gabriel». */
    search: async (query) =>
      INVOICES.filter(matching(query)).map((i) => ({
        ref: invoiceRef(i),
        label: i.number,
        detail: `${i.customer} · ${STATE_LABEL[i.state]}`,
      })),
    load: async () => InvoiceRecord,
  },
  {
    domain: "ventas",
    kind: "factura-nueva",
    title: () => "Nueva factura",
    icon: Receipt,
    load: async () => NewInvoice,
  },
  {
    domain: "ventas",
    kind: "factura-asistida",
    title: () => ASSISTED_INVOICE.number,
    icon: Receipt,
    load: async () => AssistedInvoice,
  },
  {
    domain: "ventas",
    kind: "cliente",
    title: (ref) => ref.params?.["name"] ?? "Cliente",
    icon: Users,
    load: async () => Customer,
  },
  {
    domain: "ventas",
    kind: "linea",
    title: () => "Editar la línea",
    icon: Package,
    load: async () => Line,
  },
];

function Sales({
  start,
  menu = MENU,
  sidebar,
}: {
  start: ResourceRef;
  menu?: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <SalesProvider>
      <Workspace
        views={VIEWS}
        start={start}
        menu={menu}
        {...(sidebar === undefined ? {} : { sidebar })}
      />
    </SalesProvider>
  );
}

const POSTED_WITH_MOST_LINES = INVOICES.filter((i) => i.state === "posted").reduce((a, b) =>
  b.lines.length > a.lines.length ? b : a,
);
const DRAFT = INVOICES.find((i) => i.state === "draft")!;
const OVERDUE = INVOICES.find((i) => i.state === "overdue")!;

/* ==================================================================== *
 *  THE STORIES
 * ==================================================================== */

/**
 * **El módulo, navegable.** Abrí una factura desde la lista (su 👁 la mira en vista previa),
 * recorrelas con el paginador del riel, volvé por las migas, y creá una nueva. Las métricas de
 * arriba filtran: son la pregunta que más se hace sobre una lista de facturas — ¿qué está
 * vencido?
 */
export const Modulo: Story = {
  name: "Módulo",
  render: () => <Sales start={invoicesRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* «Nueva factura» is a page of the workspace, and «Descartar» its way back to the list. */
    await userEvent.click(await canvas.findByRole("button", { name: "+ Nueva factura" }));
    await waitFor(() =>
      expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Nueva factura"),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Descartar" }));
    await expect(
      await canvas.findByRole("button", { name: "+ Nueva factura" }),
    ).toBeVisible();
  },
};

/** **La lista.** Tabla por defecto, con totales; las filas y el tablero están a un clic. */
export const Lista: Story = {
  render: () => <Sales start={invoicesRef} />,
};

/** **Una factura publicada** con saldo pendiente: las acciones del riel cambian con el estado.
 *  El cliente se abre en un modal sobre la factura; «Abrir en…» ofrece los demás lugares. */
export const Factura: Story = {
  render: () => <Sales start={invoiceRef(POSTED_WITH_MOST_LINES)} />,
};

/** **Una factura en borrador.** Las líneas todavía cambian: tocá una cantidad, abrí una línea
 *  con el lápiz —se abre en un modal sobre la factura— o agregá otra. Cada cambio prende
 *  «Guardar» y «Descartar» en el riel. */
export const FacturaBorrador: Story = {
  name: "Factura en borrador",
  render: () => <Sales start={invoiceRef(DRAFT)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    /* The pencil opens the line as a modal of the workspace, not as a dialog of the block. */
    const [pencil] = await canvas.findAllByRole("button", { name: "Editar la línea" });
    await userEvent.click(pencil!);
    const done = await page.findByRole("button", { name: "Listo" });
    const actions = within(done.closest<HTMLElement>("[data-form-actions]")!);
    /* Removing does not ask: the modal closes and the notice offers the way back. */
    await userEvent.click(actions.getByRole("button", { name: "Quitar la línea" }));
    await waitFor(() => expect(page.queryByRole("button", { name: "Listo" })).toBeNull());
    await userEvent.click(await page.findByRole("button", { name: "Deshacer" }));
  },
};

/** **Una factura en el teléfono.** El riel conserva dónde estoy, el paginador y «Imprimir»;
 *  la acción principal —«Registrar pago»— baja a una barra pegada al borde de abajo, bajo el
 *  pulgar, y la hoja scrollea detrás. Al final de la factura la barra se acomoda debajo de
 *  la última línea: no tapa nada. */
export const FacturaEnElTelefono: Story = {
  name: "Factura · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Sales start={invoiceRef(OVERDUE)} />,
};

/** **Cambios sin guardar, en el teléfono.** Con cambios, la barra de abajo deja de ofrecer
 *  «Registrar pago» y ofrece Descartar y Guardar: mientras haya algo sin guardar es lo único
 *  que se puede hacer, igual que en el riel de escritorio. */
export const FacturaConCambiosEnElTelefono: Story = {
  name: "Factura con cambios · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Sales start={invoiceRef(OVERDUE, "OC-2026-0412")} />,
};

/** **Una factura en borrador, en el teléfono.** Cada línea es una tarjeta: el producto, la
 *  cantidad por el precio debajo y el importe a la derecha. Tocá una y la línea se abre como
 *  una hoja desde abajo —el modal del espacio de trabajo, traducido al teléfono—; quitarla
 *  también se hace desde ahí. */
export const FacturaBorradorEnElTelefono: Story = {
  name: "Factura en borrador · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Sales start={invoiceRef(DRAFT)} />,
};

/** **Una factura vencida.** La barra de estado lo marca sin inventar una etapa nueva. */
export const FacturaVencida: Story = {
  render: () => <Sales start={invoiceRef(OVERDUE)} />,
};

/** **Una factura nueva.** El mismo árbol que una existente, sin paginador ni contadores:
 *  todavía no hay nada a dónde llevar. Guardar sin cliente marca el campo — recién ahí. */
export const NuevaFactura: Story = {
  render: () => <Sales start={newInvoiceRef} />,
};

/* ==================================================================== *
 *  WITH A SIDEBAR — the module's map on the left, ⌘K for everything else
 * ==================================================================== */

const SALES_NAV: NavItem[] = [
  {
    id: "ventas",
    label: "Ventas",
    icon: ShoppingCart,
    children: [
      { id: "cotizaciones", label: "Cotizaciones", count: 7 },
      { id: "pedidos", label: "Pedidos de venta", count: 3 },
      {
        id: "facturas",
        label: "Facturas",
        count: INVOICES.filter((i) => i.state === "overdue").length,
      },
      { id: "notas", label: "Notas de crédito" },
      { id: "pagos", label: "Pagos recibidos" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    children: [
      { id: "clientes.todos", label: "Todos los clientes" },
      { id: "clientes.precios", label: "Listas de precios" },
    ],
  },
  {
    id: "informes",
    label: "Informes",
    icon: ChartColumn,
    children: [
      { id: "informes.ventas", label: "Ventas por vendedor" },
      { id: "informes.cobranza", label: "Antigüedad de saldos" },
    ],
  },
];

/* With a sidebar the sidebar IS the module's navigation: the same menus in the bar would be
   two routes to every screen (37 targets on first view, Hick index 5.25 — measured). The bar
   keeps the app switcher and the global actions. */
const MENU_WITH_SIDEBAR = (
  <TopBar
    apps={APPS}
    currentApp="ventas"
    systray={<SystrayButton icon={Bell} label="Avisos" count={2} tone="warn" />}
    user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
    userGroups={ACCOUNT}
  />
);

/**
 * **Con barra lateral.** El mapa del módulo a la izquierda —se queda pegado debajo de la barra
 * de la aplicación mientras la lista scrollea— y ⌘K (Ctrl+K) para todo lo demás: es la paleta
 * del espacio de trabajo. Escribí «nueva» y Enter para crear una factura, o el número o el
 * cliente de una para abrirla. La barra de la lista se sigue pegando debajo de la de arriba,
 * al lado del árbol.
 */
export const ConBarraLateral: Story = {
  name: "Con barra lateral",
  render: function Render() {
    const [current, setCurrent] = useState("facturas");
    return (
      <Sales
        start={invoicesRef}
        menu={MENU_WITH_SIDEBAR}
        sidebar={
          <NavigationTree items={SALES_NAV} current={current} onNavigate={setCurrent} />
        }
      />
    );
  },
};

/** **Sugerencias del asistente.** El plazo de pago aparece sugerido con su fuente («las
 *  últimas 5 facturas del cliente»): aceptalo y mirá el aviso «Deshacer». Con «Completar desde
 *  la orden de compra» el asistente trabaja sin bloquear, y propone líneas con vista previa:
 *  elegí cuáles aplicar. Lo aplicado queda marcado con el robot y en el historial. */
export const FacturaSugerenciasDelAsistente: Story = {
  name: "Factura · sugerencias del asistente",
  render: () => <Sales start={assistedRef} />,
};
