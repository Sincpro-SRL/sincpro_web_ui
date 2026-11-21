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
  type LineItemColumn,
  LineItems,
  List,
  Outcome,
  RadioGroup,
  Record,
  RecordCard,
  SearchField,
  Stepper,
  Tag,
  Tags,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bike, CreditCard, QrCode, ShoppingCart, Store, Truck } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  bs,
  CATEGORIES,
  MENU,
  type MenuCategory,
  type MenuItem,
} from "../../support/erp-pos";

/**
 * Context: **una tienda en línea** — la vitrina y el pedido, con las piezas del ERP. La
 * vitrina es una lista en mosaicos grandes (`List.Tiles size="lg"`) con las categorías y las
 * facetas como filtros rápidos (`List.Filters`): cuántos deja cada una, varias a la vez. El
 * PEDIDO es otra vista, abierta como panel al costado (composer), que no sabe de la vitrina:
 * las dos leen el mismo pedido. «Pagar el pedido» abre el pago como modal: el envío y el pago
 * como opciones grandes (`RadioGroup look="cards"`). Precio rebajado: el «antes» en una
 * etiqueta.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Mostrador/Tienda en línea · vitrina y pedido",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Tocá un producto: se suma a tu pedido, al costado. Las categorías y las facetas filtran y dicen cuántos dejan. «Pagar el pedido» abre el pago con la entrega.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

type CartLine = { id: string; name: string; price: number; quantity: number };
type Cart = {
  lines: readonly CartLine[];
  add: (item: MenuItem) => void;
  change: (id: string, next: CartLine) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const CartContext = createContext<Cart | null>(null);
function useCart(): Cart {
  const cart = useContext(CartContext);
  if (cart === null) throw new Error("useCart outside CartProvider");
  return cart;
}
function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<readonly CartLine[]>([]);
  const cart: Cart = {
    lines,
    add: (item) =>
      setLines((now) =>
        now.some((l) => l.id === item.id)
          ? now.map((l) => (l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
          : [...now, { id: item.id, name: item.name, price: item.price, quantity: 1 }],
      ),
    change: (id, next) => setLines((now) => now.map((l) => (l.id === id ? next : l))),
    remove: (id) => setLines((now) => now.filter((l) => l.id !== id)),
    clear: () => setLines([]),
  };
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}
const totalOf = (lines: readonly CartLine[]) =>
  lines.reduce((s, l) => s + l.price * l.quantity, 0);

const shopRef: ResourceRef = { domain: "tienda", kind: "vitrina" };
const cartRef: ResourceRef = { domain: "tienda", kind: "pedido" };
const checkoutRef = (total: number): ResourceRef => ({
  domain: "tienda",
  kind: "checkout",
  params: { total: String(total) },
});

/* ---------------------------------------------------------------- *
 *  The shop window
 * ---------------------------------------------------------------- */

type Facet = "stock" | "promo";

function ShopWindow({ api }: ViewProps) {
  const cart = useCart();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MenuCategory | "all">("all");
  const [facets, setFacets] = useState<readonly Facet[]>([]);
  useEffect(() => api.setTitle("Café Illimani · tienda"), [api]);

  const passes = (m: MenuItem, without?: "category" | Facet) =>
    (query === "" ||
      m.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es"))) &&
    (without === "category" || category === "all" || m.category === category) &&
    (without === "stock" || !facets.includes("stock") || m.stock > 0) &&
    (without === "promo" || !facets.includes("promo") || m.before !== undefined);
  const shown = MENU.filter((m) => passes(m));
  const toggle = (f: Facet) =>
    setFacets((now) => (now.includes(f) ? now.filter((one) => one !== f) : [...now, f]));
  const inCart = (m: MenuItem) => cart.lines.find((l) => l.id === m.id)?.quantity ?? 0;

  return (
    <List<MenuItem>
      items={shown}
      keyOf={(m) => m.id}
      present="tiles"
      onChoose={(m) => {
        cart.add(m);
        toast.show({ message: `${m.name} sumado a tu pedido.`, tone: "good" });
      }}
      filtered={query !== "" || category !== "all" || facets.length > 0}
      empty={{ sentence: "Nada con esos filtros." }}
    >
      <List.Bar>
        <List.Identity title="Tienda" description="pedí en línea, retirá o te lo llevamos" />
        <List.Search>
          <SearchField value={query} onChange={setQuery} placeholder="Buscar en la tienda…" />
        </List.Search>
      </List.Bar>
      <List.Filters>
        <Tags
          size="md"
          scroll
          label="Categorías"
          items={[{ id: "all", label: "Todo" }, ...CATEGORIES].map((c) => ({
            id: c.id,
            label: c.label,
            count: MENU.filter(
              (m) => passes(m, "category") && (c.id === "all" || m.category === c.id),
            ).length,
            selected: category === c.id,
            onSelect: () => setCategory(c.id as MenuCategory | "all"),
          }))}
        />
        <Tags
          size="md"
          multiple
          label="Facetas"
          items={[
            { id: "stock" as const, label: "Disponible hoy" },
            { id: "promo" as const, label: "En promoción", tone: "warn" as const },
          ].map((f) => ({
            ...f,
            count: MENU.filter(
              (m) =>
                passes(m, f.id) && (f.id === "stock" ? m.stock > 0 : m.before !== undefined),
            ).length,
            selected: facets.includes(f.id),
            onSelect: () => toggle(f.id),
          }))}
        />
      </List.Filters>
      <List.Tiles<MenuItem>
        size="lg"
        card={(m, ways) => {
          const count = inCart(m);
          return (
            <RecordCard
              layout="tile"
              title={m.name}
              subtitle={m.description}
              figure={bs(m.price)}
              media={{ src: m.photo, alt: "" }}
              {...(m.before === undefined
                ? {}
                : { tags: <Tag tone="warn">{`antes ${bs(m.before)}`}</Tag> })}
              {...(m.stock === 0 ? { meta: "Agotado" } : {})}
              {...(count === 0 ? {} : { badge: count })}
              disabled={m.stock === 0}
              {...(ways.press === undefined ? {} : { onOpen: ways.press })}
            />
          );
        }}
      />
    </List>
  );
}

/* ---------------------------------------------------------------- *
 *  The cart — another view, beside the window
 * ---------------------------------------------------------------- */

const CART_COLUMNS: readonly LineItemColumn<CartLine>[] = [
  { id: "name", header: "Producto", value: (l) => l.name },
  {
    id: "quantity",
    header: "Cant.",
    numeric: true,
    value: (l) => l.quantity,
    edit: (l, set) => (
      <Stepper
        value={l.quantity}
        min={1}
        unitLabel={l.name}
        onChange={(quantity) => set({ ...l, quantity })}
      />
    ),
  },
  {
    id: "amount",
    header: "Importe",
    numeric: true,
    value: (l) => l.price * l.quantity,
    cell: (l) => bs(l.price * l.quantity),
  },
];

function CartView({ api }: ViewProps) {
  const cart = useCart();
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const total = totalOf(cart.lines);
  useEffect(() => api.setTitle("Tu pedido"), [api]);
  const pay = () =>
    api.pick<string>(
      checkoutRef(total),
      (summary) => {
        cart.clear();
        setConfirmed(summary);
      },
      { to: Destination.Modal, size: { w: 680, h: 560 } },
    );
  return (
    <Record
      identity={{
        icon: ShoppingCart,
        title: "Tu pedido",
        subtitle:
          cart.lines.length === 0 ? "Todavía vacío" : `${cart.lines.length} productos`,
        figure: { label: "total", value: bs(total) },
      }}
    >
      <Record.Rail>
        <Record.Actions>
          <Button role="primary" disabled={total === 0} onClick={pay}>
            {`Pagar el pedido ${bs(total)}`}
          </Button>
        </Record.Actions>
      </Record.Rail>
      <Record.Paper>
        {confirmed !== null && cart.lines.length === 0 ? (
          /* The end of a purchase is the page, not a toast: the number to quote, what
             follows, and the way back to the shop. */
          <Outcome
            title="Pedido confirmado"
            figure="1042"
            figureLabel="Tu pedido"
            detail={`Pagado ${confirmed}. Te avisamos por WhatsApp cuando salga.`}
            action={
              <Button role="secondary" onClick={() => setConfirmed(null)}>
                Seguir comprando
              </Button>
            }
          />
        ) : (
          <LineItems<CartLine>
            lines={cart.lines}
            columns={CART_COLUMNS}
            getLineId={(l) => l.id}
            lineLabel={(l) => l.name}
            onChange={cart.change}
            onRemove={cart.remove}
            totals={[{ label: "Total", value: bs(total), total: true }]}
          />
        )}
      </Record.Paper>
    </Record>
  );
}

/* ---------------------------------------------------------------- *
 *  The checkout — a modal over the cart
 * ---------------------------------------------------------------- */

function Checkout({ api, resource }: ViewProps) {
  const total = Number(resource.params?.["total"] ?? "0");
  const [shipping, setShipping] = useState<string | null>(null);
  const [payment, setPayment] = useState<string | null>("qr");
  const fee = shipping === "delivery" ? 12 : shipping === "courier" ? 25 : 0;
  return (
    <Record
      identity={{
        icon: CreditCard,
        title: "Pagar",
        figure: { label: "total", value: bs(total + fee) },
      }}
    >
      <Record.Paper>
        <Field label="Entrega" required>
          <RadioGroup
            look="cards"
            value={shipping}
            onChange={setShipping}
            options={[
              {
                value: "pickup",
                label: "Retiro en tienda",
                icon: Store,
                description: "Gratis · listo en 15 min",
              },
              {
                value: "delivery",
                label: "Delivery",
                icon: Bike,
                description: "Bs 12 · zona Sur",
              },
              {
                value: "courier",
                label: "Envío a otra ciudad",
                icon: Truck,
                description: "Bs 25 · 1 a 2 días",
              },
            ]}
          />
        </Field>
        <Field label="Pago">
          <RadioGroup
            look="cards"
            value={payment}
            onChange={setPayment}
            options={[
              { value: "qr", label: "QR Simple", icon: QrCode },
              { value: "card", label: "Tarjeta", icon: CreditCard },
            ]}
          />
        </Field>
        <FormActions
          secondary={
            <Button role="ghost" onClick={() => api.close()}>
              Seguir comprando
            </Button>
          }
          primary={
            <Button
              role="primary"
              disabled={shipping === null || payment === null}
              onClick={() =>
                api.answer(`${bs(total + fee)} con ${payment === "qr" ? "QR" : "tarjeta"}`)
              }
            >
              {`Confirmar pedido · ${bs(total + fee)}`}
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "tienda",
    kind: "vitrina",
    title: () => "Tienda",
    icon: Store,
    load: async () => ShopWindow,
  },
  {
    domain: "tienda",
    kind: "pedido",
    title: () => "Tu pedido",
    icon: ShoppingCart,
    load: async () => CartView,
  },
  {
    domain: "tienda",
    kind: "checkout",
    title: () => "Pagar",
    icon: CreditCard,
    load: async () => Checkout,
  },
];

/** **Comprar.** Tocá un latte y dos salteñas; el pedido del costado los suma. «Pagar el pedido»:
 *  elegí la entrega y confirmá. */
export const Comprar: Story = {
  render: () => (
    <CartProvider>
      <Workspace views={VIEWS} start={shopRef} panels={[{ ref: cartRef }]} />
    </CartProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(await canvas.findByRole("button", { name: "Latte de vainilla" }));
    await userEvent.click(canvas.getByRole("button", { name: "Salteña de pollo" }));
    await userEvent.click(canvas.getByRole("button", { name: "Salteña de pollo" }));
    const pay = await canvas.findByRole("button", { name: "Pagar el pedido Bs 46,00" });
    await userEvent.click(pay);
    const dialog = within(await page.findByRole("dialog", { name: "Pagar" }));
    await userEvent.click(await dialog.findByText("Delivery"));
    await userEvent.click(
      dialog.getByRole("button", { name: "Confirmar pedido · Bs 58,00" }),
    );
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Pagar" })).toBeNull());
    await expect(await canvas.findByText("Pedido confirmado")).toBeVisible();
    await expect(canvas.getByText("1042")).toBeVisible();
  },
};
