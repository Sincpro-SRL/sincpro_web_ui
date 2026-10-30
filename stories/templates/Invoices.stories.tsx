import {
  type AppEntry,
  AppFrame,
  AssistedValue,
  assistEvent,
  AssistPending,
  AssistSuggestion,
  Button,
  Calendar,
  ChangeReview,
  Chatter,
  type ChatterEvent,
  CommandPalette,
  DatePicker,
  Field,
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
  Pagination,
  type PaletteCommand,
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
  ToastProvider,
  TopBar,
  type TopMenu,
  useChatter,
  useCommandPaletteShortcut,
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
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

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

/**
 * Context: **a module, the way it is used.** The views show one record and N records each on
 * its own; a person never sees them like that. They see the application bar, a list they
 * filter, a row they open, a record they edit and the way back. This is that, end to end,
 * built ONLY from the public API — if a template needs something the package does not
 * export, the package is missing it.
 *
 * The domain is the sales module of an ERP because it is the screen most business software
 * is made of: a list of documents with a state, and a document with lines and totals.
 */
const meta: Meta = {
  title: "5 · Plantillas/Facturas · un módulo de ERP",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un módulo completo armado sólo con la API pública: la barra de la aplicación, la lista de facturas, la factura y una nueva. `Módulo` es navegable; las otras historias muestran cada pantalla suelta.",
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

function Frame({ children }: { children: React.ReactNode }) {
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
            userGroups={ACCOUNT}
          />
        }
      >
        {/* No padding and no card: inside an application the list and the record run
            edge to edge under the bar, the way an ERP screen does. A margin here drew a
            strip of canvas between two dark bars and the screen read as two pieces. */}
        {children}
      </AppFrame>
    </ToastProvider>
  );
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

function InvoiceList({
  onOpen,
  onNew,
}: {
  onOpen?: (invoice: Invoice) => void;
  onNew?: () => void;
}) {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [present, setPresent] = useState<ListPresent>("table");
  const [sort, setSort] = useState<SortState | null>(null);
  const [quick, setQuick] = useState<Quick>("all");
  const [page, setPage] = useState(0);
  /* Due dates changed from the list itself, without opening the invoice. */
  const [dueOf, setDueOf] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      (quick === "all" ? INVOICES : INVOICES.filter(QUICK[quick])).map((i) =>
        dueOf[i.id] === undefined ? i : { ...i, due: dueOf[i.id]! },
      ),
    [quick, dueOf],
  );
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
      onOpen={onOpen}
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
        <List.Crumbs crumbs={[{ label: "Ventas" }, { label: "Facturas" }]} />
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
                    setDueOf((current) => ({ ...current, [i.id]: iso }));
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

const HISTORY: ChatterEvent[] = [
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
 * place for a quantity or a discount, in the editor for the whole line — and only read once
 * it is posted. Removing a line does not ask; the notice offers «Deshacer».
 */
function InvoiceLines({
  lines,
  onLinesChange,
  editable,
  about,
}: {
  lines: readonly InvoiceLine[];
  onLinesChange?: (next: readonly InvoiceLine[]) => void;
  editable: boolean;
  /** What the editor is about, in its header: the invoice's number and customer. */
  about: string;
}) {
  const set = (next: readonly InvoiceLine[]) => onLinesChange?.(next);
  return (
    <LineItems
      mode={editable ? "edit" : "read"}
      lines={lines}
      columns={lineColumns()}
      getLineId={(l) => l.id}
      lineLabel={(l) => l.product || "línea nueva"}
      onChange={(id, next) => set(lines.map((l) => (l.id === id ? next : l)))}
      onAdd={(line) => set([...lines, line])}
      newLine={blankLine}
      onRemove={(id) => set(lines.filter((l) => l.id !== id))}
      onRestore={(line, index) => set(restoreAt(lines, line, index))}
      editor={lineEditor}
      isValid={lineIsValid}
      context={{ kind: "factura", label: about }}
      totals={lineTotals(lines)}
    />
  );
}

function InvoiceRecord({
  invoice,
  position,
  edited,
  onBack,
  onPrev,
  onNext,
}: {
  invoice: Invoice;
  position?: { index: number; total: number };
  /** A customer reference typed and not saved yet: the record opens with changes. */
  edited?: string;
  onBack?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [page, setPage] = useState(edited === undefined ? "lineas" : "otros");
  const [reference, setReference] = useState(edited ?? "");
  const [notes, setNotes] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [saved, setSaved] = useState({ reference: "", notes: "" });
  /* The lines are part of the record: changing one is a change to save or discard, like a
     field. Only a draft can change them. */
  const [lines, setLines] = useState<readonly InvoiceLine[]>(invoice.lines);
  const [savedLines, setSavedLines] = useState<readonly InvoiceLine[]>(invoice.lines);
  const [paid, setPaid] = useState(false);
  const chatter = useChatter(false);
  const toast = useToast();
  const customer = customerCard(invoice.taxId);
  const state = paid ? "paid" : invoice.state;
  const stage = state === "overdue" ? "posted" : state;
  const dirty =
    reference !== saved.reference || notes !== saved.notes || lines !== savedLines;
  const total = subtotalOf({ ...invoice, lines });

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

  return (
    <Record
      {...(dirty
        ? {
            dirty: {
              onSave: () => {
                setSaved({ reference, notes });
                setSavedLines(lines);
                toast.show({
                  message: "Se guardaron los cambios de la factura.",
                  tone: "good",
                });
              },
              onDiscard: () => {
                setReference(saved.reference);
                setNotes(saved.notes);
                setLines(savedLines);
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
        <Record.Crumbs
          crumbs={[
            { label: "Ventas" },
            { label: "Facturas", onClick: onBack },
            { label: invoice.number },
          ]}
        />
        {position === undefined ? null : (
          <Record.Pager
            index={position.index}
            total={position.total}
            onPrev={onPrev}
            onNext={onNext}
          />
        )}
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
                  onOpen={() =>
                    toast.show({ message: `Se abriría la ficha de ${invoice.customer}.` })
                  }
                />
              ),
            },
            { label: "Emitida", value: shortDate(invoice.date) },
            { label: "Vence", value: shortDate(invoice.due) },
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
              onLinesChange={setLines}
              editable={state === "draft"}
              about={`${invoice.number} · ${invoice.customer}`}
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

      <Record.Chatter>
        <Chatter
          open={chatter.open}
          onToggle={chatter.toggle}
          events={HISTORY}
          messages={NOTES}
          composer={<MessageComposer kinds={[writeANote()]} onSend={() => {}} />}
        />
      </Record.Chatter>
    </Record>
  );
}

/* ==================================================================== *
 *  A NEW RECORD — the same tree, with nothing written yet
 * ==================================================================== */

function NewInvoice({ onBack }: { onBack?: () => void }) {
  const [customer, setCustomer] = useState("");
  const [salesperson, setSalesperson] = useState<string>(SALESPERSON_OPTIONS[0]!.value);
  const [days, setDays] = useState<number | "">(30);
  const [issued, setIssued] = useState<string | null>("2026-10-30");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<readonly InvoiceLine[]>([]);
  const [page, setPage] = useState("lineas");
  /* The error shows after the first try to save, not before: a form that opens already
     red tells the person they did something wrong before they did anything. */
  const [tried, setTried] = useState(false);
  const missing = customer === "";

  return (
    <Record identity={{ icon: Receipt, title: "Nueva factura", tag: { label: "Borrador" } }}>
      <Record.Rail>
        <Record.Crumbs
          crumbs={[{ label: "Facturas", onClick: onBack }, { label: "Nueva" }]}
        />
        <Record.Actions>
          <Button role="primary" size="sm" onClick={() => setTried(true)}>
            Guardar
          </Button>
          <Button role="ghost" size="sm" onClick={onBack}>
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
              onLinesChange={setLines}
              editable
              about="Nueva factura"
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

/* ==================================================================== *
 *  THE STORIES
 * ==================================================================== */

type Screen = { kind: "list" } | { kind: "record"; index: number } | { kind: "new" };

/**
 * **El módulo, navegable.** Abrí una factura desde la lista, recorrelas con el paginador del
 * riel, volvé por las migas, y creá una nueva. Las métricas de arriba filtran: son la
 * pregunta que más se hace sobre una lista de facturas — ¿qué está vencido?
 */
export const Modulo: Story = {
  name: "Módulo",
  render: function Render() {
    const [screen, setScreen] = useState<Screen>({ kind: "list" });
    const back = () => setScreen({ kind: "list" });

    return (
      <Frame>
        {screen.kind === "list" ? (
          <InvoiceList
            onOpen={(invoice) =>
              setScreen({ kind: "record", index: INVOICES.indexOf(invoice) })
            }
            onNew={() => setScreen({ kind: "new" })}
          />
        ) : screen.kind === "new" ? (
          <NewInvoice onBack={back} />
        ) : (
          <InvoiceRecord
            key={screen.index}
            invoice={INVOICES[screen.index]!}
            position={{ index: screen.index + 1, total: INVOICES.length }}
            onBack={back}
            onPrev={
              screen.index === 0
                ? undefined
                : () => setScreen({ kind: "record", index: screen.index - 1 })
            }
            onNext={
              screen.index === INVOICES.length - 1
                ? undefined
                : () => setScreen({ kind: "record", index: screen.index + 1 })
            }
          />
        )}
      </Frame>
    );
  },
};

/** **La lista.** Tabla por defecto, con totales; las filas y el tablero están a un clic. */
export const Lista: Story = {
  render: () => (
    <Frame>
      <InvoiceList />
    </Frame>
  ),
};

/** **Una factura publicada** con saldo pendiente: las acciones del riel cambian con el estado. */
export const Factura: Story = {
  render: () => (
    <Frame>
      <InvoiceRecord
        invoice={INVOICES.filter((i) => i.state === "posted").reduce((a, b) =>
          b.lines.length > a.lines.length ? b : a,
        )}
        position={{ index: 2, total: INVOICES.length }}
      />
    </Frame>
  ),
};

/** **Una factura en borrador.** Las líneas todavía cambian: tocá una cantidad, abrí una línea
 *  con el lápiz o agregá otra. Cada cambio prende «Guardar» y «Descartar» en el riel. */
export const FacturaBorrador: Story = {
  name: "Factura en borrador",
  render: () => (
    <Frame>
      <InvoiceRecord invoice={INVOICES.find((i) => i.state === "draft")!} />
    </Frame>
  ),
};

/** **Una factura en el teléfono.** El riel conserva dónde estoy, el paginador y «Imprimir»;
 *  la acción principal —«Registrar pago»— baja a una barra pegada al borde de abajo, bajo el
 *  pulgar, y la hoja scrollea detrás. Al final de la factura la barra se acomoda debajo de
 *  la última línea: no tapa nada. */
export const FacturaEnElTelefono: Story = {
  name: "Factura · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => (
    <Frame>
      <InvoiceRecord
        invoice={INVOICES.find((i) => i.state === "overdue")!}
        position={{ index: 3, total: INVOICES.length }}
      />
    </Frame>
  ),
};

/** **Cambios sin guardar, en el teléfono.** Con cambios, la barra de abajo deja de ofrecer
 *  «Registrar pago» y ofrece Descartar y Guardar: mientras haya algo sin guardar es lo único
 *  que se puede hacer, igual que en el riel de escritorio. */
export const FacturaConCambiosEnElTelefono: Story = {
  name: "Factura con cambios · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => (
    <Frame>
      <InvoiceRecord
        invoice={INVOICES.find((i) => i.state === "overdue")!}
        edited="OC-2026-0412"
      />
    </Frame>
  ),
};

/** **Una factura en borrador, en el teléfono.** Cada línea es una tarjeta: el producto, la
 *  cantidad por el precio debajo y el importe a la derecha. Tocá una y se abre el editor de
 *  la línea como una hoja desde abajo; quitarla también se hace desde ahí. */
export const FacturaBorradorEnElTelefono: Story = {
  name: "Factura en borrador · en el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => (
    <Frame>
      <InvoiceRecord invoice={INVOICES.find((i) => i.state === "draft")!} />
    </Frame>
  ),
};

/** **Una factura vencida.** La barra de estado lo marca sin inventar una etapa nueva. */
export const FacturaVencida: Story = {
  render: () => (
    <Frame>
      <InvoiceRecord invoice={INVOICES.find((i) => i.state === "overdue")!} />
    </Frame>
  ),
};

/** **Una factura nueva.** El mismo árbol que una existente, sin paginador ni contadores:
 *  todavía no hay nada a dónde llevar. Guardar sin cliente marca el campo — recién ahí. */
export const NuevaFactura: Story = {
  render: () => (
    <Frame>
      <NewInvoice />
    </Frame>
  ),
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

const SALES_COMMANDS: PaletteCommand[] = [
  { id: "facturas", label: "Facturas", section: "Ir a…", icon: Receipt },
  { id: "cotizaciones", label: "Cotizaciones", section: "Ir a…", icon: FileText },
  { id: "pedidos", label: "Pedidos de venta", section: "Ir a…", icon: FileText },
  { id: "pagos", label: "Pagos recibidos", section: "Ir a…", icon: CreditCard },
  { id: "clientes.todos", label: "Clientes", section: "Ir a…", icon: Users },
  {
    id: "nueva-factura",
    label: "Nueva factura",
    section: "Crear…",
    icon: Receipt,
    shortcut: "Alt+N",
    keywords: ["vender", "cobrar"],
  },
  { id: "nuevo-cliente", label: "Nuevo cliente", section: "Crear…", icon: Users },
];

/**
 * **Con barra lateral.** El mapa del módulo a la izquierda —se queda pegado debajo de la barra
 * de la aplicación mientras la lista scrollea— y ⌘K (Ctrl+K) para todo lo demás: escribí
 * «pag» y Enter. La barra de la lista se sigue pegando debajo de la de arriba, al lado del
 * árbol.
 */
export const ConBarraLateral: Story = {
  name: "Con barra lateral",
  render: function Render() {
    const [current, setCurrent] = useState("facturas");
    const [palette, setPalette] = useState(false);
    useCommandPaletteShortcut(setPalette);

    return (
      <>
        <AppFrame
          menu={
            <TopBar
              apps={APPS}
              currentApp="ventas"
              /* With a sidebar the sidebar IS the module's navigation: the same menus in
                 the bar would be two routes to every screen (37 targets on first view,
                 Hick index 5.25 — measured). The bar keeps the app switcher and the
                 global actions. */
              systray={<SystrayButton icon={Bell} label="Avisos" count={2} tone="warn" />}
              user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
              userGroups={ACCOUNT}
            />
          }
          sidebar={
            <NavigationTree items={SALES_NAV} current={current} onNavigate={setCurrent} />
          }
        >
          <InvoiceList />
        </AppFrame>
        <CommandPalette
          open={palette}
          onOpenChange={setPalette}
          commands={SALES_COMMANDS}
          onRun={(id) => {
            if (SALES_COMMANDS.some((c) => c.id === id && c.section === "Ir a…"))
              setCurrent(id);
          }}
          placeholder="Buscá una pantalla o una acción…"
        />
      </>
    );
  },
};

/* ==================================================================== *
 *  THE ASSISTANT — suggestions with a source, a preview, undo
 * ==================================================================== */

type Proposal = "idle" | "working" | "ready";

function AssistedInvoice() {
  const [days, setDays] = useState<number | "">(ASSISTED_INVOICE.termDays);
  const [termOpen, setTermOpen] = useState(true);
  const [termSet, setTermSet] = useState(false);
  const [lines, setLines] = useState<readonly InvoiceLine[]>(DRAFT_LINES_BEFORE);
  const [proposal, setProposal] = useState<Proposal>("idle");
  const [events, setEvents] = useState<ChatterEvent[]>([]);
  const chatter = useChatter(true);
  const total = subtotalOf({ ...INVOICES[0]!, lines });

  const log = (event: ChatterEvent) => setEvents((now) => [event, ...now]);
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
        <Record.Crumbs
          crumbs={[
            { label: "Ventas" },
            { label: "Facturas" },
            { label: ASSISTED_INVOICE.number },
          ]}
        />
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
              onLinesChange={setLines}
              editable
              about={`${ASSISTED_INVOICE.number} · ${ASSISTED_INVOICE.customer}`}
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>

      <Record.Chatter>
        <Chatter
          open={chatter.open}
          onToggle={chatter.toggle}
          events={events}
          messages={[]}
        />
      </Record.Chatter>
    </Record>
  );
}

/** **Sugerencias del asistente.** El plazo de pago aparece sugerido con su fuente («las
 *  últimas 5 facturas del cliente»): aceptalo y mirá el aviso «Deshacer». Con «Completar desde
 *  la orden de compra» el asistente trabaja sin bloquear, y propone líneas con vista previa:
 *  elegí cuáles aplicar. Lo aplicado queda marcado con el robot y en el historial. */
export const FacturaSugerenciasDelAsistente: Story = {
  name: "Factura · sugerencias del asistente",
  render: () => (
    <Frame>
      <AssistedInvoice />
    </Frame>
  ),
};
