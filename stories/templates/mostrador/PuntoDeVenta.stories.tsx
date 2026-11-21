import {
  Destination,
  type ResourceRef,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  Field,
  FormActions,
  FormSection,
  Keypad,
  type LineItemColumn,
  LineItems,
  List,
  Outcome,
  Pane,
  Panes,
  Picker,
  RadioGroup,
  Receipt as ReceiptTicket,
  type ReceiptProps,
  Record,
  RecordCard,
  SearchField,
  SegmentedControl,
  Tag,
  Tags,
  TextInput,
  TopBar,
  Totals,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Banknote,
  Bike,
  Coffee,
  CreditCard,
  LayoutGrid,
  ListOrdered,
  Lock,
  MonitorSmartphone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingBasket,
  Store,
  Utensils,
  X,
} from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  bs,
  CATEGORIES,
  lineAmount,
  MENU,
  type MenuCategory,
  type MenuItem,
  type TicketLine,
} from "../../support/erp-pos";

/**
 * Context: **el punto de venta de una cafetería** — la pantalla de quien cobra todo el día, en
 * una tablet o un monitor táctil. Se trabaja con PEDIDOS, no con un carrito: varios abiertos a
 * la vez (la mesa 4 sigue pidiendo mientras se cobra un «para llevar»), cada uno con su canal y
 * su cliente. Lo que se hace cien veces por turno está a un toque y con atajo: sumar un
 * producto, cambiar la cantidad con el teclado, «Nuevo pedido» (F2), «Cobrar» (F9) y
 * «Cancelar pedido» — sin «¿seguro?», con «Deshacer», como todo lo que se puede revertir.
 *
 * El cobro decide el COMPROBANTE: factura (NIT o CI y razón social, como pide el SIN) o nota de
 * venta; en efectivo, montos rápidos y el vuelto. Desde el menú «Caja 1» de la barra: los
 * PEDIDOS DEL DÍA (reabrir uno abierto, reimprimir o anular uno cobrado) y el CIERRE DE CAJA
 * (lo esperado por método contra lo contado).
 *
 * Nada aquí es «un POS» del paquete: son la lista en mosaicos, el registro, los chips, la
 * tarjeta, el teclado, el dock de acciones y el workspace de siempre. Lo táctil lo decide la
 * aplicación (`data-pointer="touch"`): una caja es un monitor táctil con un mouse enchufado.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Punto de venta · pedidos, factura y caja",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Pedidos abiertos en paralelo, cliente con NIT, teclado, cobro con factura o nota de venta y vuelto, cancelar con «Deshacer». En el menú «Caja 1»: pedidos del día y cierre de caja.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ---------------------------------------------------------------- *
 *  The domain — orders, customers, payments (example data)
 * ---------------------------------------------------------------- */

type Channel = "here" | "away" | "delivery";
type Customer = { taxId: string; name: string };
type Method = "Efectivo" | "QR" | "Tarjeta";
type Payment = {
  method: Method;
  received: number;
  change: number;
  document: "factura" | "nota";
  /** The invoice's number, when there is one. */
  invoice?: string;
  customer: Customer;
};
type OrderState = "open" | "paid" | "cancelled";
type Order = {
  id: number;
  channel: Channel;
  table: string;
  customer: Customer;
  lines: readonly TicketLine[];
  state: OrderState;
  payment?: Payment;
  time: string;
  /** When it was opened — epoch ms, for how long a table has been waiting. */
  openedAt?: number;
};

/** The final consumer: what an invoice carries when the customer gives no tax id. */
const NO_NAME: Customer = { taxId: "0", name: "Sin nombre" };
const CUSTOMERS: readonly Customer[] = [
  NO_NAME,
  { taxId: "1028457021", name: "Distribuidora Andina S.R.L." },
  { taxId: "4587123018", name: "Ferretería El Progreso" },
  { taxId: "6012345", name: "José Mamani Quispe" },
  { taxId: "1020304050", name: "Clínica San Gabriel S.A." },
];

const CHANNEL_LABEL: Record<Channel, string> = {
  here: "Comer aquí",
  away: "Para llevar",
  delivery: "Delivery",
};
const STATE: Record<OrderState, { label: string; tone: "info" | "good" | "neutral" }> = {
  open: { label: "Abierto", tone: "info" },
  paid: { label: "Cobrado", tone: "good" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

const line = (id: string, itemId: string, quantity: number): TicketLine => {
  const item = MENU.find((m) => m.id === itemId)!;
  return { id, item: item.id, name: item.name, quantity, price: item.price, discount: 0 };
};
const totalOf = (lines: readonly TicketLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + lineAmount(l), 0) * 100) / 100;
const itemsOf = (order: Order) => order.lines.reduce((sum, l) => sum + l.quantity, 0);

/* The morning so far: three sold, one cancelled, the table 4 still open. */
const SEED: readonly Order[] = [
  {
    id: 112,
    channel: "here",
    table: "Mesa 2",
    customer: CUSTOMERS[1]!,
    lines: [line("a1", "m2", 2), line("a2", "m9", 4)],
    state: "paid",
    payment: {
      method: "Efectivo",
      received: 100,
      change: 12,
      document: "factura",
      invoice: "00045",
      customer: CUSTOMERS[1]!,
    },
    time: "08:12",
  },
  {
    id: 113,
    channel: "away",
    table: "",
    customer: NO_NAME,
    lines: [line("b1", "m1", 1), line("b2", "m14", 1)],
    state: "paid",
    payment: { method: "QR", received: 25, change: 0, document: "nota", customer: NO_NAME },
    time: "08:40",
  },
  {
    id: 114,
    channel: "away",
    table: "",
    customer: NO_NAME,
    lines: [line("c1", "m12", 1)],
    state: "cancelled",
    time: "09:05",
  },
  {
    id: 115,
    channel: "delivery",
    table: "PedidosYa",
    customer: CUSTOMERS[3]!,
    lines: [line("d1", "m10", 3), line("d2", "m6", 2)],
    state: "paid",
    payment: {
      method: "Tarjeta",
      received: 68,
      change: 0,
      document: "factura",
      invoice: "00046",
      customer: CUSTOMERS[3]!,
    },
    time: "09:31",
  },
  {
    id: 116,
    channel: "here",
    table: "Mesa 4",
    customer: NO_NAME,
    lines: [line("e1", "m5", 2), line("e2", "m9", 2)],
    state: "open",
    time: "09:48",
    openedAt: Date.now() - 34 * 60_000,
  },
  {
    id: 117,
    channel: "away",
    table: "",
    customer: NO_NAME,
    lines: [],
    state: "open",
    time: "10:02",
  },
];

/* ---------------------------------------------------------------- *
 *  The till's state — the server, in a real application
 * ---------------------------------------------------------------- */

type Till = {
  orders: readonly Order[];
  currentLine: string | null;
  order: Order;
  select: (id: number) => void;
  newOrder: () => void;
  /** The open order of a table, or a new one for it. */
  forTable: (table: string) => void;
  update: (id: number, change: Partial<Order>) => void;
  add: (item: MenuItem) => void;
  setLine: (lineId: string | null) => void;
  /** Each returns its undo. */
  cancel: (id: number) => () => void;
  pay: (id: number, payment: Payment) => () => void;
  voidSale: (id: number) => () => void;
  nextInvoice: string;
};

const TillContext = createContext<Till | null>(null);
function useTill(): Till {
  const till = useContext(TillContext);
  if (till === null) throw new Error("useTill outside TillProvider");
  return till;
}

function TillProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<readonly Order[]>(SEED);
  const [current, setCurrent] = useState(117);
  const [currentLine, setCurrentLine] = useState<string | null>(null);
  const order = orders.find((o) => o.id === current) ?? orders.at(-1)!;
  const invoices = orders.filter((o) => o.payment?.invoice !== undefined).length;
  const set = (id: number, change: Partial<Order>) =>
    setOrders((now) => now.map((o) => (o.id === id ? { ...o, ...change } : o)));
  const newOrderIn = (now: readonly Order[], table = "") => {
    const id = Math.max(...now.map((o) => o.id)) + 1;
    setOrders([
      ...now,
      {
        id,
        channel: table === "" ? "away" : "here",
        table,
        customer: NO_NAME,
        lines: [],
        state: "open",
        time: "10:15",
        openedAt: Date.now(),
      },
    ]);
    setCurrent(id);
    setCurrentLine(null);
  };
  /* After closing one, the till goes to another open order — or a new one: it is never left
     without an order to sell on. */
  const moveOn = (closed: number, now: readonly Order[]) => {
    const open = now.find((o) => o.state === "open" && o.id !== closed);
    if (open !== undefined) {
      setCurrent(open.id);
      setCurrentLine(null);
    } else newOrderIn(now);
  };
  const till: Till = {
    orders,
    currentLine,
    order,
    select: (id) => {
      setCurrent(id);
      setCurrentLine(null);
    },
    newOrder: () => newOrderIn(orders),
    forTable: (table) => {
      const open = orders.find((o) => o.state === "open" && o.table === table);
      if (open === undefined) newOrderIn(orders, table);
      else {
        setCurrent(open.id);
        setCurrentLine(null);
      }
    },
    update: set,
    add: (item) => {
      const there = order.lines.find((l) => l.item === item.id && l.discount === 0);
      if (there !== undefined) {
        set(order.id, {
          lines: order.lines.map((l) =>
            l.id === there.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        });
        setCurrentLine(there.id);
        return;
      }
      const id = `${order.id}-${order.lines.length}-${item.id}`;
      set(order.id, {
        lines: [
          ...order.lines,
          { id, item: item.id, name: item.name, quantity: 1, price: item.price, discount: 0 },
        ],
      });
      setCurrentLine(id);
    },
    setLine: setCurrentLine,
    cancel: (id) => {
      const before = orders;
      const next = orders.map((o) =>
        o.id === id ? { ...o, state: "cancelled" as const } : o,
      );
      setOrders(next);
      moveOn(id, next);
      return () => {
        setOrders(before);
        setCurrent(id);
      };
    },
    pay: (id, payment) => {
      const before = orders;
      const next = orders.map((o) =>
        o.id === id ? { ...o, state: "paid" as const, payment } : o,
      );
      setOrders(next);
      moveOn(id, next);
      return () => {
        setOrders(before);
        setCurrent(id);
      };
    },
    voidSale: (id) => {
      const before = orders;
      setOrders(orders.map((o) => (o.id === id ? { ...o, state: "cancelled" as const } : o)));
      return () => setOrders(before);
    },
    nextInvoice: String(45 + invoices).padStart(5, "0"),
  };
  return <TillContext.Provider value={till}>{children}</TillContext.Provider>;
}

/* The workspace's references: the views never import each other, they open these. */
const saleRef: ResourceRef = { domain: "caja", kind: "venta" };
const ordersRef: ResourceRef = { domain: "caja", kind: "pedidos" };
const closingRef: ResourceRef = { domain: "caja", kind: "cierre" };
const chargeRef = (id: number): ResourceRef => ({
  domain: "caja",
  kind: "cobro",
  params: { pedido: String(id) },
});
const tablesRef: ResourceRef = { domain: "caja", kind: "mesas" };
const customerRef: ResourceRef = { domain: "caja", kind: "cliente" };
const orderRef = (id: number): ResourceRef => ({
  domain: "caja",
  kind: "pedido",
  id: String(id),
});

/* ---------------------------------------------------------------- *
 *  Vender — the menu and the order
 * ---------------------------------------------------------------- */

const TICKET_COLUMNS: readonly LineItemColumn<TicketLine>[] = [
  { id: "name", header: "Producto", value: (l) => l.name },
  {
    id: "quantity",
    header: "Cant.",
    numeric: true,
    value: (l) => l.quantity,
    brief: (l) =>
      `${l.quantity} × ${bs(l.price)}${l.discount === 0 ? "" : ` · −${l.discount} %`}`,
  },
  {
    id: "amount",
    header: "Importe",
    numeric: true,
    value: (l) => lineAmount(l),
    cell: (l) => bs(lineAmount(l)),
  },
];

type KeypadMode = "quantity" | "discount" | "price";
const KEYPAD_MODES: readonly { value: KeypadMode; label: string }[] = [
  { value: "quantity", label: "Cant." },
  { value: "discount", label: "% Desc." },
  { value: "price", label: "Precio" },
];

function Sale({ api }: ViewProps) {
  const till = useTill();
  const toast = useToast();
  const { order } = till;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [keypadMode, setKeypadMode] = useState<KeypadMode>("quantity");
  const [typed, setTyped] = useState<string | null>(null);
  useEffect(() => api.setTitle(`Caja 1 · Pedido ${order.id}`), [api, order.id]);

  const found = MENU.filter(
    (m) =>
      query === "" || m.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  const shown = found.filter((m) => category === "all" || m.category === category);
  const inOrder = (item: MenuItem) =>
    order.lines.filter((l) => l.item === item.id).reduce((sum, l) => sum + l.quantity, 0);
  const current = order.lines.find((l) => l.id === till.currentLine) ?? order.lines.at(-1);
  const total = totalOf(order.lines);
  const gross = order.lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const open = till.orders.filter((o) => o.state === "open");

  /* The pad writes into the current line, a calculator's way: the first key REPLACES the
     line's value (a «3» on a line of one is three, not thirteen), the next ones append. */
  const lineValue =
    current === undefined
      ? ""
      : String(
          keypadMode === "quantity"
            ? current.quantity
            : keypadMode === "discount"
              ? current.discount
              : current.price,
        );
  const shownValue = typed ?? lineValue;
  const setLines = (lines: readonly TicketLine[]) => till.update(order.id, { lines });
  const type = (text: string) => {
    setTyped(text);
    if (current === undefined) return;
    const n = text === "" ? 0 : Number(text);
    if (Number.isNaN(n)) return;
    const next =
      keypadMode === "quantity"
        ? { ...current, quantity: Math.max(1, n) }
        : keypadMode === "discount"
          ? { ...current, discount: Math.min(100, n) }
          : { ...current, price: n };
    setLines(order.lines.map((l) => (l.id === current.id ? next : l)));
  };
  const choose = (item: MenuItem) => {
    till.add(item);
    setTyped(null);
    setKeypadMode("quantity");
  };

  const charge = () =>
    api.pick<Payment>(
      chargeRef(order.id),
      (payment) => {
        const id = order.id;
        const undo = till.pay(id, payment);
        const document =
          payment.document === "factura"
            ? `factura ${payment.invoice} a ${payment.customer.name}`
            : "nota de venta";
        const change = payment.change > 0 ? ` · vuelto ${bs(payment.change)}` : "";
        toast.show({
          message: `Pedido ${id} cobrado · ${payment.method} · ${document}${change}.`,
          tone: "good",
          action: { label: "Deshacer", onSelect: undo },
        });
      },
      { to: Destination.Modal, size: { w: 760, h: 640 } },
    );
  const cancel = () => {
    const id = order.id;
    const undo = till.cancel(id);
    toast.show({
      message: `Pedido ${id} cancelado.`,
      action: { label: "Deshacer", onSelect: undo },
    });
  };

  return (
    <Panes>
      <Pane label="Menú">
        <List<MenuItem>
          items={shown}
          keyOf={(m) => m.id}
          present="tiles"
          onChoose={choose}
          filtered={query !== "" || category !== "all"}
          empty={{ sentence: "Nada en el menú con ese nombre." }}
        >
          <List.Bar>
            <List.Identity title="Menú" description="Café Illimani · Caja 1" />
            <List.Search>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Buscar un producto…"
              />
            </List.Search>
          </List.Bar>
          <List.Filters>
            <Tags
              size="lg"
              scroll
              label="Categorías"
              items={[{ id: "all", label: "Todo" }, ...CATEGORIES].map((c) => ({
                id: c.id,
                label: c.label,
                count: found.filter((m) => c.id === "all" || m.category === c.id).length,
                selected: category === c.id,
                onSelect: () => setCategory(c.id as MenuCategory | "all"),
              }))}
            />
          </List.Filters>
          <List.Tiles<MenuItem>
            size="sm"
            card={(m, ways) => {
              const count = inOrder(m);
              return (
                <RecordCard
                  layout="tile"
                  title={m.name}
                  figure={bs(m.price)}
                  media={{ src: m.photo, alt: "" }}
                  {...(m.stock === 0
                    ? { meta: "Agotado" }
                    : m.stock < 5
                      ? { meta: `Quedan ${m.stock}` }
                      : {})}
                  {...(count === 0 ? {} : { badge: count })}
                  disabled={m.stock === 0}
                  {...(ways.press === undefined ? {} : { onOpen: ways.press })}
                />
              );
            }}
          />
        </List>
      </Pane>

      <Pane size="narrow" label="Pedido">
        <Record
          identity={{
            icon: Receipt,
            title: `Pedido ${order.id}`,
            subtitle: [CHANNEL_LABEL[order.channel], order.table, order.customer.name]
              .filter((part) => part !== "")
              .join(" · "),
            figure: { label: "total", value: bs(total) },
          }}
        >
          <Record.Rail>
            <Record.Dock
              label="Acciones del pedido"
              visible={3}
              actions={[
                {
                  id: "charge",
                  label: `Cobrar ${bs(total)}`,
                  icon: Banknote,
                  primary: true,
                  shortcut: "F9",
                  disabled: total <= 0,
                  onSelect: charge,
                },
                {
                  id: "new",
                  label: "Nuevo pedido",
                  icon: Plus,
                  shortcut: "F2",
                  onSelect: till.newOrder,
                },
                /* Undone with «Deshacer», so it is not tucked away as a danger: cancelling is
                   something a till does many times a shift. */
                {
                  id: "cancel",
                  label: "Cancelar pedido",
                  icon: X,
                  disabled: order.lines.length === 0,
                  onSelect: cancel,
                },
                {
                  id: "tables",
                  label: "Mesas",
                  icon: LayoutGrid,
                  tucked: true,
                  onSelect: () => api.open(tablesRef),
                },
                {
                  id: "orders",
                  label: "Pedidos del día",
                  icon: ListOrdered,
                  tucked: true,
                  onSelect: () => api.open(ordersRef),
                },
              ]}
            />
          </Record.Rail>
          <Record.Paper>
            <Tags
              size="md"
              scroll
              label="Pedidos abiertos"
              items={open.map((o) => ({
                id: String(o.id),
                label: `${o.id}${o.table === "" ? "" : ` · ${o.table}`}`,
                count: itemsOf(o),
                selected: o.id === order.id,
                onSelect: () => {
                  till.select(o.id);
                  setTyped(null);
                },
              }))}
            />
            <SegmentedControl
              aria-label="Cómo se lleva"
              value={order.channel}
              onChange={(next) => till.update(order.id, { channel: next as Channel })}
              options={[
                { value: "here", label: "Comer aquí", icon: Utensils },
                { value: "away", label: "Para llevar", icon: ShoppingBag },
                { value: "delivery", label: "Delivery", icon: Bike },
              ]}
            />
            <Field label="Cliente">
              <Picker
                items={CUSTOMERS.map((c) => ({
                  id: c.taxId,
                  name: c.name,
                  meta: c.taxId === "0" ? "consumidor final" : `NIT ${c.taxId}`,
                }))}
                value={order.customer.taxId}
                onChange={(taxId) =>
                  till.update(order.id, {
                    customer: CUSTOMERS.find((c) => c.taxId === taxId) ?? NO_NAME,
                  })
                }
                placeholder="Buscar por nombre o NIT…"
              />
            </Field>
            <LineItems<TicketLine>
              lines={order.lines}
              columns={TICKET_COLUMNS}
              getLineId={(l) => l.id}
              lineLabel={(l) => l.name}
              onRemove={(id) => setLines(order.lines.filter((l) => l.id !== id))}
              onOpenLine={(id) => {
                till.setLine(id);
                setTyped(null);
              }}
              totals={[
                { label: "Subtotal", value: bs(gross) },
                ...(gross === total
                  ? []
                  : [{ label: "Descuentos", value: `− ${bs(gross - total)}` }]),
                { label: "Total", value: bs(total), total: true },
              ]}
            />
            <SegmentedControl
              aria-label="Qué escribe el teclado"
              value={keypadMode}
              onChange={(next) => {
                setKeypadMode(next as KeypadMode);
                setTyped(null);
              }}
              options={KEYPAD_MODES}
            />
            <Keypad
              value={typed ?? ""}
              onChange={type}
              decimals={keypadMode === "quantity" ? 0 : 2}
              disabled={current === undefined}
              screen={{
                label:
                  current === undefined
                    ? "Tocá un producto"
                    : `${current.name} · ${KEYPAD_MODES.find((m) => m.value === keypadMode)!.label}`,
                value: shownValue === "" ? "—" : shownValue.replace(".", ","),
              }}
            />
          </Record.Paper>
        </Record>
      </Pane>
    </Panes>
  );
}

/* ---------------------------------------------------------------- *
 *  Cobrar — method, the document (invoice or sale note), the change
 * ---------------------------------------------------------------- */

const METHODS = [
  { value: "Efectivo", label: "Efectivo", icon: Banknote, description: "Con vuelto" },
  { value: "QR", label: "QR", icon: QrCode, description: "Simple · cualquier banco" },
  { value: "Tarjeta", label: "Tarjeta", icon: CreditCard, description: "Débito o crédito" },
];

function Charge({ api, resource }: ViewProps) {
  const till = useTill();
  const order =
    till.orders.find((o) => o.id === Number(resource.params?.["pedido"])) ?? till.order;
  const total = totalOf(order.lines);
  const known = order.customer.taxId !== "0";
  const [method, setMethod] = useState<string | null>("Efectivo");
  const [document, setDocument] = useState<"factura" | "nota">(known ? "factura" : "nota");
  const [taxId, setTaxId] = useState(known ? order.customer.taxId : "");
  const [name, setName] = useState(known ? order.customer.name : "");
  const [received, setReceived] = useState("");
  const cash = method === "Efectivo";
  const got = received === "" ? 0 : Number(received);
  const change = Math.round((got - total) * 100) / 100;
  const short = cash && got < total;
  const invoiceMissing =
    document === "factura" && (taxId.trim() === "" || name.trim() === "");
  const confirm = () =>
    api.answer({
      method: method as Method,
      received: cash ? got : total,
      change: cash ? change : 0,
      document,
      ...(document === "factura" ? { invoice: till.nextInvoice } : {}),
      customer:
        document === "factura" ? { taxId: taxId.trim(), name: name.trim() } : order.customer,
    });
  const quick = [
    { id: "exact", label: "Exacto", amount: total },
    { id: "50", label: "Bs 50", amount: 50 },
    { id: "100", label: "Bs 100", amount: 100 },
    { id: "200", label: "Bs 200", amount: 200 },
  ].filter((one) => one.id === "exact" || one.amount > total);
  return (
    <Record
      identity={{
        icon: Banknote,
        title: `Cobrar pedido ${order.id}`,
        figure: { label: "a cobrar", value: bs(total) },
      }}
    >
      <Record.Paper>
        <Field label="Método de pago">
          <RadioGroup look="cards" value={method} onChange={setMethod} options={METHODS} />
        </Field>
        <Field label="Comprobante">
          <SegmentedControl
            value={document}
            onChange={(next) => setDocument(next as "factura" | "nota")}
            options={[
              { value: "factura", label: "Factura", icon: Receipt },
              { value: "nota", label: "Nota de venta" },
            ]}
          />
        </Field>
        {document === "factura" ? (
          <FormSection columns={2}>
            <Field label="NIT o CI" required hint="0 para un consumidor final">
              <TextInput value={taxId} onChange={setTaxId} placeholder="1028457021" />
            </Field>
            <Field label="Razón social" required>
              <TextInput value={name} onChange={setName} placeholder="Nombre o empresa" />
            </Field>
          </FormSection>
        ) : null}
        {cash ? (
          <>
            <Tags
              size="md"
              label="Montos rápidos"
              items={quick.map((one) => ({
                id: one.id,
                label: one.label,
                onSelect: () => setReceived(String(one.amount)),
              }))}
            />
            <Field label={`Recibido ${received === "" ? "—" : bs(got)}`}>
              <Keypad
                value={received}
                onChange={setReceived}
                decimals={2}
                extra="double-zero"
              />
            </Field>
            <Totals
              rows={[
                { label: "A cobrar", value: bs(total) },
                { label: "Recibido", value: received === "" ? "—" : bs(got) },
                { label: "Vuelto", value: short ? "—" : bs(change), total: true },
              ]}
            />
          </>
        ) : null}
        <FormActions
          secondary={
            <Button role="ghost" onClick={() => api.close()}>
              Volver al pedido
            </Button>
          }
          primary={
            <Button
              role="primary"
              size="lg"
              disabled={method === null || short || invoiceMissing}
              onClick={confirm}
            >
              {`${document === "factura" ? "Cobrar y facturar" : "Cobrar"} ${bs(total)}${cash && !short && change > 0 ? ` · vuelto ${bs(change)}` : ""}`}
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

/* ---------------------------------------------------------------- *
 *  Pedidos del día — and one order, opened over the list
 * ---------------------------------------------------------------- */

const documentOf = (o: Order) =>
  o.payment === undefined
    ? "—"
    : o.payment.document === "factura"
      ? `Factura ${o.payment.invoice}`
      : "Nota de venta";

const ORDER_COLUMNS: DataColumn<Order>[] = [
  { id: "id", header: "pedido", value: (o) => o.id, mono: true },
  { id: "time", header: "hora", value: (o) => o.time },
  {
    id: "channel",
    header: "canal",
    value: (o) => CHANNEL_LABEL[o.channel],
    cell: (o) => [CHANNEL_LABEL[o.channel], o.table].filter((p) => p !== "").join(" · "),
  },
  {
    id: "customer",
    header: "cliente",
    value: (o) => o.payment?.customer.name ?? o.customer.name,
  },
  { id: "document", header: "comprobante", value: documentOf },
  {
    id: "state",
    header: "estado",
    value: (o) => o.state,
    cell: (o) => <Tag tone={STATE[o.state].tone}>{STATE[o.state].label}</Tag>,
  },
  {
    id: "total",
    header: "total",
    value: (o) => totalOf(o.lines),
    cell: (o) => bs(totalOf(o.lines)),
    numeric: true,
  },
];

function Orders({ api }: ViewProps) {
  const till = useTill();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<OrderState | "all">("all");
  useEffect(() => api.setTitle("Pedidos del día"), [api]);
  const count = (s: OrderState) => till.orders.filter((o) => o.state === s).length;
  const wanted = query.toLocaleLowerCase("es");
  const shown = [...till.orders]
    .reverse()
    .filter(
      (o) =>
        (state === "all" || o.state === state) &&
        (query === "" ||
          `${o.id} ${o.customer.name} ${o.payment?.customer.name ?? ""}`
            .toLocaleLowerCase("es")
            .includes(wanted)),
    );
  const sold = till.orders
    .filter((o) => o.state === "paid")
    .reduce((sum, o) => sum + totalOf(o.lines), 0);
  const counter = (s: OrderState, label: string) => ({
    label,
    value: count(s),
    onClick: () => setState((now) => (now === s ? "all" : s)),
    active: state === s,
    ...(s === "open" ? { tone: "info" as const } : {}),
  });
  return (
    <List<Order>
      items={shown}
      keyOf={(o) => String(o.id)}
      present="table"
      onChoose={(o) =>
        api.open(orderRef(o.id), { to: Destination.Modal, size: { w: 680, h: 560 } })
      }
      filtered={query !== "" || state !== "all"}
      empty={{ sentence: "Ningún pedido con ese filtro." }}
    >
      <List.Bar>
        <List.Identity
          title="Pedidos del día"
          description={`Caja 1 · vendido ${bs(sold)}`}
          counters={[
            counter("open", "abiertos"),
            counter("paid", "cobrados"),
            counter("cancelled", "cancelados"),
          ]}
        />
        <List.Search>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por número o cliente…"
          />
        </List.Search>
      </List.Bar>
      <List.Table<Order> columns={ORDER_COLUMNS} />
    </List>
  );
}

/* An order as its ticket: the same words the printer gets. */
function ticketOf(order: Order): ReceiptProps {
  const paid = order.payment;
  const where = [CHANNEL_LABEL[order.channel], order.table]
    .filter((p) => p !== "")
    .join(" · ");
  return {
    issuer: "Café Illimani",
    issuerLines: ["NIT 1023456028", "Av. Arce 2631, La Paz"],
    document:
      paid === undefined
        ? `PEDIDO ${order.id}`
        : paid.document === "factura"
          ? `FACTURA N.º ${paid.invoice}`
          : "NOTA DE VENTA",
    facts: [
      { label: "Pedido", value: String(order.id) },
      { label: "Hora", value: order.time },
      { label: "Canal", value: where },
      ...(paid === undefined
        ? []
        : [
            { label: "Cliente", value: paid.customer.name },
            ...(paid.customer.taxId === "0"
              ? []
              : [{ label: "NIT/CI", value: paid.customer.taxId }]),
          ]),
    ],
    lines: order.lines.map((l) => ({
      quantity: l.quantity,
      name: l.name,
      amount: bs(lineAmount(l)),
      ...(l.discount === 0 ? {} : { note: `descuento ${l.discount} %` }),
    })),
    totals: [
      { label: "Total", value: bs(totalOf(order.lines)), total: true },
      ...(paid === undefined
        ? []
        : [
            { label: paid.method, value: bs(paid.received) },
            { label: "Vuelto", value: bs(paid.change) },
          ]),
    ],
    footer: order.state === "cancelled" ? ["— ANULADO —"] : ["¡Gracias por su compra!"],
  };
}

function OrderDetail({ api, resource }: ViewProps) {
  const till = useTill();
  const toast = useToast();
  const order = till.orders.find((o) => String(o.id) === resource.id)!;
  const total = totalOf(order.lines);
  const facts = order.payment;
  return (
    <Record
      identity={{
        icon: Receipt,
        title: `Pedido ${order.id}`,
        subtitle: `${STATE[order.state].label} · ${order.time}${facts === undefined ? "" : ` · ${facts.method}`}`,
        figure: { label: "total", value: bs(total) },
      }}
    >
      <Record.Paper>
        {/* The order IS its ticket: what was printed, as it was printed. */}
        <ReceiptTicket {...ticketOf(order)} />
        <FormActions
          secondary={
            order.state === "paid" ? (
              <Button
                role="danger"
                icon={RotateCcw}
                onClick={() => {
                  const undo = till.voidSale(order.id);
                  api.close();
                  toast.show({
                    message: `Venta ${order.id} anulada.`,
                    action: { label: "Deshacer", onSelect: undo },
                  });
                }}
              >
                Anular venta
              </Button>
            ) : (
              <Button role="ghost" onClick={() => api.close()}>
                Cerrar
              </Button>
            )
          }
          primary={
            order.state === "open" ? (
              <Button
                role="primary"
                onClick={() => {
                  till.select(order.id);
                  api.close();
                  api.open(saleRef);
                }}
              >
                Seguir en la caja
              </Button>
            ) : order.state === "paid" ? (
              <Button
                role="secondary"
                icon={Printer}
                onClick={() =>
                  toast.show({
                    message: `Pedido ${order.id} enviado a la impresora.`,
                    tone: "good",
                  })
                }
              >
                Reimprimir
              </Button>
            ) : undefined
          }
        />
      </Record.Paper>
    </Record>
  );
}

/* ---------------------------------------------------------------- *
 *  Cierre de caja — what was expected against what was counted
 * ---------------------------------------------------------------- */

const OPENING = 200;

function Closing({ api }: ViewProps) {
  const till = useTill();
  const toast = useToast();
  const [counted, setCounted] = useState("");
  useEffect(() => api.setTitle("Cierre de caja"), [api]);
  const paid = till.orders.filter((o) => o.state === "paid");
  const by = (m: Method) =>
    paid.filter((o) => o.payment?.method === m).reduce((sum, o) => sum + totalOf(o.lines), 0);
  const expected = OPENING + by("Efectivo");
  const got = counted === "" ? 0 : Number(counted);
  const difference = Math.round((got - expected) * 100) / 100;
  const open = till.orders.filter((o) => o.state === "open" && o.lines.length > 0).length;
  return (
    <Record
      identity={{
        icon: Lock,
        title: "Cierre de caja · Caja 1",
        subtitle: `Turno de María Quispe · ${paid.length} ventas`,
        figure: {
          label: "vendido",
          value: bs(paid.reduce((sum, o) => sum + totalOf(o.lines), 0)),
        },
      }}
    >
      <Record.Paper>
        <Totals
          rows={[
            { label: "Efectivo", value: bs(by("Efectivo")) },
            { label: "QR", value: bs(by("QR")) },
            { label: "Tarjeta", value: bs(by("Tarjeta")) },
            {
              label: "Cancelados",
              value: String(till.orders.filter((o) => o.state === "cancelled").length),
            },
          ]}
        />
        <Field
          label={`Efectivo contado ${counted === "" ? "—" : bs(got)}`}
          {...(open > 0
            ? { hint: `Quedan ${open} pedidos abiertos: pasan al turno siguiente` }
            : {})}
        >
          <Keypad value={counted} onChange={setCounted} decimals={2} extra="double-zero" />
        </Field>
        <Totals
          rows={[
            { label: "Fondo inicial", value: bs(OPENING) },
            { label: "Ventas en efectivo", value: bs(by("Efectivo")) },
            { label: "Esperado en caja", value: bs(expected) },
            { label: "Contado", value: counted === "" ? "—" : bs(got) },
            {
              label: "Diferencia",
              value: counted === "" ? "—" : `${difference > 0 ? "+" : ""}${bs(difference)}`,
              total: true,
            },
          ]}
        />
        <FormActions
          primary={
            <Button
              role="primary"
              icon={Lock}
              disabled={counted === ""}
              onClick={() =>
                toast.show({
                  message: `Caja 1 cerrada · diferencia ${bs(difference)}.`,
                  tone: difference === 0 ? "good" : "warn",
                })
              }
            >
              Cerrar la caja
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

/* ---------------------------------------------------------------- *
 *  Mesas — the room, each table with its order and how long it waits
 * ---------------------------------------------------------------- */

type Table = { id: string; name: string };
const TABLES: readonly Table[] = Array.from({ length: 8 }, (_, i) => ({
  id: `t${i + 1}`,
  name: `Mesa ${i + 1}`,
}));

function Tables({ api }: ViewProps) {
  const till = useTill();
  useEffect(() => api.setTitle("Mesas"), [api]);
  const orderOf = (table: string) =>
    till.orders.find((o) => o.state === "open" && o.table === table);
  const busy = TABLES.filter((t) => orderOf(t.name) !== undefined).length;
  return (
    <List<Table>
      items={TABLES}
      keyOf={(t) => t.id}
      present="tiles"
      onChoose={(table) => {
        till.forTable(table.name);
        api.open(saleRef);
      }}
    >
      <List.Bar>
        <List.Identity
          title="Mesas"
          description="el salón · tocá una mesa para atenderla"
          counters={[
            { label: "ocupadas", value: busy, tone: "info" },
            { label: "libres", value: TABLES.length - busy },
          ]}
        />
      </List.Bar>
      <List.Tiles<Table>
        size="md"
        card={(table, ways) => {
          const open = orderOf(table.name);
          const press = ways.press === undefined ? {} : { onOpen: ways.press };
          return open === undefined ? (
            <RecordCard title={table.name} subtitle="Libre" {...press} />
          ) : (
            /* Occupied: what it has, how much, and how long since it sat down — amber at 30
               minutes, red at an hour, so the waiter sees who is waiting. */
            <RecordCard
              title={table.name}
              subtitle={`Pedido ${open.id} · ${itemsOf(open)} productos`}
              figure={bs(totalOf(open.lines))}
              elapsed={{ since: open.openedAt ?? Date.now(), warnAfter: 30, badAfter: 60 }}
              {...press}
            />
          );
        }}
      />
    </List>
  );
}

/* ---------------------------------------------------------------- *
 *  Pantalla del cliente — the order being rung up, across the counter
 * ---------------------------------------------------------------- */

function CustomerDisplay({ api }: ViewProps) {
  const till = useTill();
  useEffect(() => api.setTitle("Pantalla del cliente"), [api]);
  const { order } = till;
  if (order.lines.length === 0) {
    return (
      <Outcome
        tone="info"
        icon={Coffee}
        title="¡Bienvenido a Café Illimani!"
        detail="Tu pedido aparece aquí mientras lo cargamos."
      />
    );
  }
  return (
    <ReceiptTicket
      look="screen"
      issuer="Café Illimani"
      document={`TU PEDIDO · ${order.id}`}
      lines={order.lines.map((l) => ({
        quantity: l.quantity,
        name: l.name,
        amount: bs(lineAmount(l)),
      }))}
      totals={[{ label: "Total", value: bs(totalOf(order.lines)), total: true }]}
      footer={["Pagá con QR, tarjeta o efectivo en la caja"]}
    />
  );
}

/* ---------------------------------------------------------------- *
 *  The workspace and its bar
 * ---------------------------------------------------------------- */

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "caja",
    kind: "mesas",
    title: () => "Mesas",
    icon: LayoutGrid,
    load: async () => Tables,
  },
  {
    domain: "caja",
    kind: "cliente",
    title: () => "Pantalla del cliente",
    icon: MonitorSmartphone,
    load: async () => CustomerDisplay,
  },
  {
    domain: "caja",
    kind: "venta",
    title: () => "Vender",
    icon: ShoppingBasket,
    load: async () => Sale,
  },
  {
    domain: "caja",
    kind: "cobro",
    title: () => "Cobrar",
    icon: Banknote,
    load: async () => Charge,
  },
  {
    domain: "caja",
    kind: "pedidos",
    title: () => "Pedidos del día",
    icon: ListOrdered,
    load: async () => Orders,
  },
  {
    domain: "caja",
    kind: "pedido",
    title: (ref) => `Pedido ${ref.id ?? ""}`,
    icon: Receipt,
    load: async () => OrderDetail,
  },
  {
    domain: "caja",
    kind: "cierre",
    title: () => "Cierre de caja",
    icon: Lock,
    load: async () => Closing,
  },
];

const DESTINATIONS: Readonly<Record<string, ResourceRef>> = {
  venta: saleRef,
  mesas: tablesRef,
  pedidos: ordersRef,
  cierre: closingRef,
};

/* The till's bar: one menu, «Caja 1», with the three places of a shift. */
const bar = (go: (ref: ResourceRef) => void) => (
  <TopBar
    app={{ label: "Punto de venta", icon: Store }}
    menus={[
      {
        id: "caja",
        label: "Caja 1",
        groups: [
          {
            options: [
              { id: "venta", label: "Vender", icon: ShoppingBasket },
              { id: "mesas", label: "Mesas", icon: LayoutGrid },
              { id: "pedidos", label: "Pedidos del día", icon: ListOrdered },
              { id: "cierre", label: "Cierre de caja", icon: Lock },
            ],
          },
        ],
      },
    ]}
    onMenuSelect={(_menu, option) => {
      const to = DESTINATIONS[option];
      if (to !== undefined) go(to);
    }}
    user={{ name: "María Quispe", detail: "Cajera · turno mañana" }}
  />
);

function TillScreen({
  start,
  panels,
}: {
  start: ResourceRef;
  panels?: readonly { ref: ResourceRef; zone?: "left" | "right" | "bottom" }[];
}) {
  return (
    <TillProvider>
      <Workspace
        views={VIEWS}
        start={start}
        menu={bar}
        pointer="touch"
        {...(panels === undefined ? {} : { panels })}
      />
    </TillProvider>
  );
}

/** **Vender, facturar y cobrar.** Dos capuchinos y tres salteñas (el «3» del teclado),
 *  «Cobrar» (F9): factura con NIT, Bs 100 en efectivo y el vuelto. La caja pasa sola al pedido
 *  abierto de la Mesa 4. */
export const Vender: Story = {
  name: "Vender, facturar y cobrar",
  render: () => <TillScreen start={saleRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const menu = within(await canvas.findByRole("region", { name: "Menú" }));
    const order = within(canvas.getByRole("region", { name: "Pedido" }));
    await userEvent.click(await menu.findByRole("button", { name: "Capuchino" }));
    await userEvent.click(menu.getByRole("button", { name: "Capuchino" }));
    await userEvent.click(menu.getByRole("row", { name: /Salteñas/ }));
    await userEvent.click(menu.getByRole("button", { name: "Salteña de pollo" }));
    /* The pad writes into the current line: three salteñas, not thirteen. */
    await userEvent.click(order.getByRole("button", { name: "3" }));
    await userEvent.click(canvas.getByRole("button", { name: /^Cobrar Bs 76,00/ }));
    const dialog = within(await page.findByRole("dialog", { name: "Cobrar" }));
    await userEvent.click(await dialog.findByRole("radio", { name: /Factura/ }));
    await userEvent.type(dialog.getByRole("textbox", { name: /NIT o CI/ }), "1028457021");
    await userEvent.type(
      dialog.getByRole("textbox", { name: /Razón social/ }),
      "Distribuidora Andina S.R.L.",
    );
    await userEvent.click(dialog.getByRole("row", { name: "Bs 100" }));
    await userEvent.click(
      dialog.getByRole("button", { name: "Cobrar y facturar Bs 76,00 · vuelto Bs 24,00" }),
    );
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Cobrar" })).toBeNull());
    await expect(
      await page.findByText(/Pedido 117 cobrado · Efectivo · factura 00047/),
    ).toBeVisible();
    /* The till moves on to the open order of table 4. */
    await expect(order.getByRole("heading", { name: "Pedido 116" })).toBeVisible();
  },
};

/** **Cancelar rápido.** Un toque en «Cancelar pedido», sin «¿seguro?»: el aviso ofrece
 *  «Deshacer», y la caja sigue con otro pedido. */
export const Cancelar: Story = {
  name: "Cancelar rápido, con deshacer",
  render: () => <TillScreen start={saleRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const order = within(await canvas.findByRole("region", { name: "Pedido" }));
    await userEvent.click(await order.findByRole("row", { name: /116 · Mesa 4/ }));
    await expect(order.getByRole("heading", { name: "Pedido 116" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /Cancelar pedido/ }));
    await expect(await page.findByText("Pedido 116 cancelado.")).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "Deshacer" }));
    await expect(await order.findByRole("heading", { name: "Pedido 116" })).toBeVisible();
  },
};

/** **Pedidos del día.** Los abiertos, cobrados y cancelados, con su comprobante; las cifras
 *  filtran. Un pedido cobrado se reimprime o se anula (con deshacer). */
export const PedidosDelDia: Story = {
  name: "Pedidos del día",
  render: () => <TillScreen start={ordersRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(await canvas.findByRole("button", { name: /cobrados/ }));
    await expect(canvas.queryByText("Mesa 4")).toBeNull();
    await userEvent.click(canvas.getByText("Factura 00046"));
    const dialog = within(await page.findByRole("dialog", { name: "Pedido 115" }));
    await expect(await dialog.findByText(/José Mamani Quispe/)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Anular venta" }));
    await expect(await page.findByText("Venta 115 anulada.")).toBeVisible();
  },
};

/** **Cierre de caja.** Lo vendido por método, el fondo inicial y lo contado con el teclado:
 *  la diferencia sale sola. */
export const CierreDeCaja: Story = {
  name: "Cierre de caja",
  render: () => <TillScreen start={closingRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Esperado en caja")).toBeVisible();
    for (const key of ["2", "8", "8"])
      await userEvent.click(canvas.getByRole("button", { name: key }));
    await expect(canvas.getAllByText("Bs 0,00").length).toBeGreaterThan(0);
  },
};

/** **Las mesas.** El salón de un vistazo: libres y ocupadas, con lo que tienen, cuánto llevan
 *  y cuánto esperan. Tocá la Mesa 4: la caja abre su pedido. */
export const Mesas: Story = {
  render: () => <TillScreen start={tablesRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Mesa 4" }));
    await expect(await canvas.findByRole("heading", { name: "Pedido 116" })).toBeVisible();
  },
};

/** **La pantalla del cliente**, al costado: lo que se carga en la caja aparece del otro lado
 *  del mostrador, en vivo. */
export const PantallaDelCliente: Story = {
  name: "Pantalla del cliente",
  render: () => <TillScreen start={saleRef} panels={[{ ref: customerRef }]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("¡Bienvenido a Café Illimani!")).toBeVisible();
    const menu = within(await canvas.findByRole("region", { name: "Menú" }));
    await userEvent.click(await menu.findByRole("button", { name: "Capuchino" }));
    await expect(await canvas.findByText("TU PEDIDO · 117")).toBeVisible();
  },
};
