import {
  Destination,
  type ResourceRef,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  Field,
  FormActions,
  Keypad,
  type LineItemColumn,
  LineItems,
  List,
  Pane,
  Panes,
  RadioGroup,
  Record,
  RecordCard,
  SearchField,
  SegmentedControl,
  Tags,
  Totals,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Banknote,
  Bike,
  CreditCard,
  QrCode,
  Receipt,
  ShoppingBag,
  Store,
  Utensils,
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
 * Context: **el punto de venta de una cafetería** — la pantalla de quien cobra, en una tablet o
 * un monitor táctil. Dos secciones fijas, una al lado de la otra (`Panes`): el MENÚ como grilla
 * de mosaicos (`List present="tiles"`) con sus categorías grandes a la vista
 * (`List.Filters` + `Tags size="lg"`), y el TICKET (`Record` + `LineItems` + `Keypad`). Tocar un
 * producto lo suma —el mosaico dice cuántos van en la esquina—; el teclado cambia la cantidad,
 * el descuento o el precio de la línea en curso. «Cobrar» abre el cobro como modal del
 * workspace (composer): el método en tarjetas grandes, lo recibido con el teclado y el vuelto.
 *
 * Nada aquí es «un POS» del paquete: son la lista, el registro, los chips, la tarjeta y el
 * teclado de siempre. Lo táctil lo decide la aplicación (`data-pointer="touch"`), no el
 * navegador: una caja es un monitor táctil con un mouse enchufado.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Punto de venta · caja táctil",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Tocá productos: se suman al ticket. El teclado cambia la cantidad, el descuento o el precio de la última línea. «Cobrar» abre el cobro: método en tarjetas, lo recibido con el teclado y el vuelto.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ---------------------------------------------------------------- *
 *  The till's state — shared by the ticket and the payment modal
 * ---------------------------------------------------------------- */

type Mode = "here" | "away" | "delivery";
type Till = {
  lines: readonly TicketLine[];
  current: string | null;
  mode: Mode;
  number: number;
  add: (item: MenuItem) => void;
  change: (id: string, next: TicketLine) => void;
  remove: (id: string) => void;
  select: (id: string) => void;
  setMode: (mode: Mode) => void;
  close: () => readonly TicketLine[];
  restore: (lines: readonly TicketLine[], number: number) => void;
};

const TillContext = createContext<Till | null>(null);
function useTill(): Till {
  const till = useContext(TillContext);
  if (till === null) throw new Error("useTill outside TillProvider");
  return till;
}

function TillProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<readonly TicketLine[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("here");
  const [number, setNumber] = useState(117);
  const till: Till = {
    lines,
    current,
    mode,
    number,
    add: (item) => {
      const there = lines.find((l) => l.item === item.id && l.discount === 0);
      if (there !== undefined) {
        setLines(
          lines.map((l) => (l.id === there.id ? { ...l, quantity: l.quantity + 1 } : l)),
        );
        setCurrent(there.id);
        return;
      }
      const id = `l${Date.now()}${lines.length}`;
      setLines([
        ...lines,
        { id, item: item.id, name: item.name, quantity: 1, price: item.price, discount: 0 },
      ]);
      setCurrent(id);
    },
    change: (id, next) => setLines(lines.map((l) => (l.id === id ? next : l))),
    remove: (id) => {
      setLines(lines.filter((l) => l.id !== id));
      if (current === id) setCurrent(null);
    },
    select: setCurrent,
    setMode,
    close: () => {
      const was = lines;
      setLines([]);
      setCurrent(null);
      setNumber(number + 1);
      return was;
    },
    restore: (was, at) => {
      setLines(was);
      setNumber(at);
    },
  };
  return <TillContext.Provider value={till}>{children}</TillContext.Provider>;
}

const totalOf = (lines: readonly TicketLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + lineAmount(l), 0) * 100) / 100;

const chargeRef = (total: number): ResourceRef => ({
  domain: "caja",
  kind: "cobro",
  params: { total: String(total) },
});
const tillRef: ResourceRef = { domain: "caja", kind: "venta" };

/* ---------------------------------------------------------------- *
 *  The till: the menu and the ticket
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [keypadMode, setKeypadMode] = useState<KeypadMode>("quantity");
  const [typed, setTyped] = useState<string | null>(null);
  useEffect(() => api.setTitle(`Caja 1 · Ticket ${till.number}`), [api, till.number]);

  const found = MENU.filter(
    (m) =>
      query === "" || m.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  const shown = found.filter((m) => category === "all" || m.category === category);
  const inTicket = (item: MenuItem) =>
    till.lines.filter((l) => l.item === item.id).reduce((sum, l) => sum + l.quantity, 0);
  const line = till.lines.find((l) => l.id === till.current) ?? till.lines.at(-1);
  const total = totalOf(till.lines);
  const gross = till.lines.reduce((sum, l) => sum + l.quantity * l.price, 0);

  /* The pad writes into the current line, a calculator's way: the first key REPLACES the
     line's value (a «3» on a line of one is three, not thirteen), the next ones append. */
  const lineValue =
    line === undefined
      ? ""
      : String(
          keypadMode === "quantity"
            ? line.quantity
            : keypadMode === "discount"
              ? line.discount
              : line.price,
        );
  const shownValue = typed ?? lineValue;
  const type = (text: string) => {
    setTyped(text);
    if (line === undefined) return;
    const n = text === "" ? 0 : Number(text);
    if (Number.isNaN(n)) return;
    if (keypadMode === "quantity") {
      if (n === 0 && text !== "") return;
      till.change(line.id, { ...line, quantity: Math.max(1, n) });
    } else if (keypadMode === "discount")
      till.change(line.id, { ...line, discount: Math.min(100, n) });
    else till.change(line.id, { ...line, price: n });
  };
  const choose = (item: MenuItem) => {
    till.add(item);
    setTyped(null);
    setKeypadMode("quantity");
  };

  const charge = () =>
    api.pick<string>(
      chargeRef(total),
      (method) => {
        const number = till.number;
        const was = till.close();
        toast.show({
          message: `Ticket ${number} cobrado · ${bs(totalOf(was))} en ${method}.`,
          tone: "good",
          action: { label: "Deshacer", onSelect: () => till.restore(was, number) },
        });
      },
      { to: Destination.Modal, size: { w: 720, h: 600 } },
    );

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
              const count = inTicket(m);
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

      <Pane size="narrow" label="Ticket">
        <Record
          identity={{
            icon: Receipt,
            title: `Ticket ${till.number}`,
            subtitle: `${till.lines.length} ${till.lines.length === 1 ? "línea" : "líneas"}`,
            figure: { label: "total", value: bs(total) },
          }}
        >
          <Record.Rail>
            <Record.Actions>
              <Button
                role="primary"
                size="lg"
                icon={Banknote}
                disabled={total <= 0}
                onClick={charge}
              >
                {`Cobrar ${bs(total)}`}
              </Button>
            </Record.Actions>
          </Record.Rail>
          <Record.Paper>
            <SegmentedControl
              aria-label="Cómo se lleva"
              value={till.mode}
              onChange={(next) => till.setMode(next as Mode)}
              options={[
                { value: "here", label: "Comer aquí", icon: Utensils },
                { value: "away", label: "Para llevar", icon: ShoppingBag },
                { value: "delivery", label: "Delivery", icon: Bike },
              ]}
            />
            <LineItems<TicketLine>
              lines={till.lines}
              columns={TICKET_COLUMNS}
              getLineId={(l) => l.id}
              lineLabel={(l) => l.name}
              onRemove={till.remove}
              onOpenLine={(id) => {
                till.select(id);
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
            <Field
              label={
                line === undefined
                  ? "Tocá un producto"
                  : `${line.name} · ${KEYPAD_MODES.find((m) => m.value === keypadMode)!.label} ${shownValue === "" ? "—" : shownValue.replace(".", ",")}`
              }
            >
              <Keypad
                value={typed ?? ""}
                onChange={type}
                decimals={keypadMode === "quantity" ? 0 : 2}
                disabled={line === undefined}
              />
            </Field>
          </Record.Paper>
        </Record>
      </Pane>
    </Panes>
  );
}

/* ---------------------------------------------------------------- *
 *  The payment: method, what was received, the change
 * ---------------------------------------------------------------- */

const METHODS = [
  { value: "efectivo", label: "Efectivo", icon: Banknote, description: "Con vuelto" },
  { value: "QR", label: "QR", icon: QrCode, description: "Simple · cualquier banco" },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard, description: "Débito o crédito" },
];

function Charge({ api, resource }: ViewProps) {
  const total = Number(resource.params?.["total"] ?? "0");
  const [method, setMethod] = useState<string | null>("efectivo");
  const [received, setReceived] = useState("");
  const cash = method === "efectivo";
  const got = received === "" ? 0 : Number(received);
  const change = Math.round((got - total) * 100) / 100;
  const short = cash && got < total;
  return (
    <Record
      identity={{
        icon: Banknote,
        title: "Cobrar",
        figure: { label: "a cobrar", value: bs(total) },
      }}
    >
      <Record.Paper>
        <Field label="Método de pago">
          <RadioGroup look="cards" value={method} onChange={setMethod} options={METHODS} />
        </Field>
        {cash ? (
          <>
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
                { label: "Recibido", value: bs(got) },
                { label: "Vuelto", value: short ? "—" : bs(change), total: true },
              ]}
            />
          </>
        ) : null}
        <FormActions
          secondary={
            <Button role="ghost" onClick={() => api.close()}>
              Volver al ticket
            </Button>
          }
          primary={
            <Button
              role="primary"
              size="lg"
              disabled={method === null || short}
              onClick={() => api.answer(METHODS.find((m) => m.value === method)!.label)}
            >
              {cash && !short && change > 0
                ? `Cobrar · vuelto ${bs(change)}`
                : `Cobrar ${bs(total)}`}
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "caja",
    kind: "venta",
    title: () => "Caja 1",
    icon: Store,
    load: async () => Sale,
  },
  {
    domain: "caja",
    kind: "cobro",
    title: () => "Cobrar",
    icon: Banknote,
    load: async () => Charge,
  },
];

/** **Vender y cobrar.** Tocá dos capuchinos y una salteña, cambiá la cantidad con el teclado y
 *  cobrá en efectivo: el vuelto se calcula con lo recibido. Táctil por decisión de la
 *  aplicación (`data-pointer="touch"`). */
export const Vender: Story = {
  name: "Vender y cobrar",
  render: () => (
    <TillProvider>
      <Workspace views={VIEWS} start={tillRef} pointer="touch" />
    </TillProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const menu = within(await canvas.findByRole("region", { name: "Menú" }));
    const ticket = within(canvas.getByRole("region", { name: "Ticket" }));
    /* Two taps on a tile: one line, quantity two, and the tile says so on its corner. */
    await userEvent.click(await menu.findByRole("button", { name: "Capuchino" }));
    await userEvent.click(menu.getByRole("button", { name: "Capuchino" }));
    await userEvent.click(menu.getByRole("row", { name: /Salteñas/ }));
    await userEvent.click(menu.getByRole("button", { name: "Salteña de pollo" }));
    /* The pad writes into the current line: three salteñas. */
    await userEvent.click(ticket.getByRole("button", { name: "3" }));
    const charge = ticket.getByRole("button", { name: `Cobrar ${"Bs 76,00"}` });
    await expect(charge).toBeEnabled();
    await userEvent.click(charge);
    /* The payment: cash, 100 received, the change. */
    const dialog = within(await page.findByRole("dialog", { name: "Cobrar" }));
    await userEvent.click(await dialog.findByRole("button", { name: "1" }));
    for (const key of ["0", "0"])
      await userEvent.click(dialog.getByRole("button", { name: key }));
    const confirm = dialog.getByRole("button", { name: "Cobrar · vuelto Bs 24,00" });
    await userEvent.click(confirm);
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Cobrar" })).toBeNull());
    await expect(await page.findByText(/Ticket 117 cobrado/)).toBeVisible();
    await expect(ticket.getByRole("heading", { name: "Ticket 118" })).toBeVisible();
  },
};
