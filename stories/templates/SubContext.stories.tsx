import {
  Destination,
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  DataField,
  DatePicker,
  Field,
  FormActions,
  FormSection,
  type LineItemColumn,
  LineItems,
  NumberInput,
  type OpenTarget,
  Picker,
  Record,
  RelationValue,
  Select,
  SheetGroup,
  SheetGroups,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2, CreditCard, Package, ShoppingCart, User } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  bs,
  CUSTOMER,
  type DrillLine,
  type DrillSupplier,
  ORDER,
  ORDER_LINES,
  PAYMENT_METHODS,
  PRODUCTS,
  SUPPLIERS,
} from "../support/erp-drill";
import { ORDER_STAGES } from "../support/erp-lists";

/**
 * Context: **abrir un registro desde adentro de otro** — el producto de una línea, el cliente
 * de un pedido, el asistente «Registrar pago», y desde el producto su proveedor — en el ESPACIO
 * DE TRABAJO (composer). La página nunca abre un diálogo propio: cada cosa es una vista, y el
 * gesto elige DÓNDE:
 *
 *   - modal (por defecto en un many2one) — sobre ESTA superficie; la de atrás espera
 *   - vista previa — un cajón: mirar sin salir
 *   - al costado — un panel que se queda: comparar, seguir
 *   - como página — reemplaza la página; la miga vuelve
 *
 * El nombre de un relacional abre en el primero; «Abrir en…» a su lado ofrece los demás
 * (`RelationValue onOpenIn`, `Picker onOpen(id, to)`). Desde adentro de un modal, un registro
 * relacionado se abre al costado o en vista previa: otro modal reemplazaría al primero y perdería lo
 * escrito. En el teléfono composer traduce: panel y ventana son la página, el modal una hoja.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Subcontextos · abrir desde el registro",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un pedido confirmado, en el espacio de trabajo. El producto de una línea, el cliente y el proveedor se abren en MODAL por defecto; «Abrir en…» al lado de cada nombre ofrece vista previa, al costado o como página. «Registrar pago» es un modal sobre el pedido, y desde él el cliente se abre al costado. En el teléfono composer lo traduce solo.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const supplierOf = (id: string): DrillSupplier => SUPPLIERS.find((s) => s.id === id)!;

const SUPPLIER_ITEMS = SUPPLIERS.map((s) => ({
  id: s.id,
  name: s.name,
  meta: `${s.leadDays} días`,
  haystack: s.taxId,
}));

/* The lines whose product has nothing on hand: each one is a notice on the order. */
const OUT_OF_STOCK = ORDER_LINES.map((l) => l.product).filter(
  (name) => PRODUCTS.find((p) => p.name === name)?.onHand === 0,
);

const total = ORDER_LINES.reduce((sum, l) => sum + l.quantity * l.price, 0);

const orderRef = (open?: string): ResourceRef => ({
  domain: "ventas",
  kind: "pedido",
  id: ORDER.number,
  ...(open === undefined ? {} : { params: { open } }),
});
const customerRef: ResourceRef = { domain: "ventas", kind: "cliente", id: CUSTOMER.taxId };
const productRef = (name: string): ResourceRef => ({
  domain: "ventas",
  kind: "producto",
  id: name,
});
const supplierRef = (id: string): ResourceRef => ({
  domain: "ventas",
  kind: "proveedor",
  id,
});
const paymentRef: ResourceRef = { domain: "ventas", kind: "pago", id: ORDER.number };

/** A modal over the surface, at a size that holds a record. */
const opened = (to: OpenTarget) =>
  to === "modal"
    ? { to: Destination.Modal, size: { w: 760, h: 560 } }
    : { to: to as (typeof Destination)[keyof typeof Destination] };

/* What the views share — the payments of the order and each product's supplier. In an app,
   the server. */
type Sales = {
  paid: number;
  setPaid: (next: number) => void;
  chosen: Readonly<Record<string, string>>;
  choose: (product: string, supplier: string) => void;
};
const SalesContext = createContext<Sales | null>(null);
function useSales(): Sales {
  const sales = useContext(SalesContext);
  if (sales === null) throw new Error("useSales outside SalesProvider");
  return sales;
}
function SalesProvider({ children }: { children: ReactNode }) {
  const [paid, setPaid] = useState(0);
  const [chosen, setChosen] = useState<Record<string, string>>(
    Object.fromEntries(PRODUCTS.map((p) => [p.name, p.supplier])),
  );
  const sales = useMemo<Sales>(
    () => ({
      paid,
      setPaid,
      chosen,
      choose: (product, supplier) => setChosen((all) => ({ ...all, [product]: supplier })),
    }),
    [paid, chosen],
  );
  return <SalesContext value={sales}>{children}</SalesContext>;
}

/* ==================================================================== *
 *  THE ORDER — the page; everything it opens is another view
 * ==================================================================== */

function SaleOrder({ api, resource }: ViewProps) {
  const { paid } = useSales();
  const crumbs = useCrumbs(api);
  const balance = ORDER.balance - paid;
  const openProduct = (name: string, to: OpenTarget = "modal") =>
    api.open(productRef(name), opened(to));
  const openCustomer = (to: OpenTarget = "modal") => api.open(customerRef, opened(to));
  const openPayment = () =>
    api.open(paymentRef, { to: Destination.Modal, size: { w: 640, h: 460 } });

  /* A story can start with something open: the payment, or a product (on the phone). */
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const what = resource.params?.["open"];
    if (what === "pago") openPayment();
    if (what === "producto") openProduct(PRODUCTS[0]!.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: LineItemColumn<DrillLine>[] = [
    {
      id: "product",
      header: "Producto",
      value: (l) => l.product,
      cell: (l) => (
        <RelationValue
          name={l.product}
          secondary={PRODUCTS.find((p) => p.name === l.product)?.sku}
          onOpenIn={(to) => openProduct(l.product, to)}
        />
      ),
    },
    { id: "quantity", header: "Cantidad", value: (l) => l.quantity, numeric: true },
    {
      id: "price",
      header: "Precio",
      value: (l) => l.price,
      cell: (l) => bs(l.price),
      numeric: true,
    },
    {
      id: "amount",
      header: "Importe",
      value: (l) => l.quantity * l.price,
      cell: (l) => bs(l.quantity * l.price),
      numeric: true,
    },
  ];

  return (
    <Record
      identity={{
        icon: ShoppingCart,
        title: ORDER.number,
        subtitle: CUSTOMER.name,
        tag: { label: "pedido de venta", tone: "info" },
        figure: { label: "Saldo", value: bs(balance) },
      }}
    >
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Actions>
          {balance > 0 ? (
            <Button role="primary" size="sm" onClick={openPayment}>
              Registrar pago
            </Button>
          ) : null}
          <Button role="secondary" size="sm">
            Imprimir
          </Button>
        </Record.Actions>
        <Record.Status stages={ORDER_STAGES} current="sale" />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        <Record.Notice
          tone="info"
          action={
            <Button role="secondary" size="sm" onClick={() => openCustomer("peek")}>
              Ver el cliente
            </Button>
          }
        >
          {CUSTOMER.name} tiene {bs(CUSTOMER.credit)} en créditos pendientes.
        </Record.Notice>
        {OUT_OF_STOCK.map((name) => (
          <Record.Notice
            key={name}
            tone="warn"
            action={
              <Button role="ghost" size="sm" onClick={() => openProduct(name, "side")}>
                Ver el producto al costado
              </Button>
            }
          >
            No hay existencias de «{name}»: la entrega va a esperar la compra.
          </Record.Notice>
        ))}
        <Record.Facts
          fields={[
            {
              label: "Cliente",
              value: (
                <RelationValue
                  name={CUSTOMER.name}
                  secondary={`NIT ${CUSTOMER.taxId}`}
                  onOpenIn={openCustomer}
                />
              ),
            },
            { label: "Fecha", value: ORDER.date },
            { label: "Total", value: bs(total) },
          ]}
        />
        <Record.Pages current="lines">
          <Record.Page id="lines" label="líneas" count={ORDER_LINES.length}>
            <LineItems
              lines={ORDER_LINES}
              columns={columns}
              getLineId={(l) => l.id}
              mode="read"
              totals={[{ label: "Total", value: bs(total), total: true }]}
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

function Customer({ api }: ViewProps) {
  useEffect(() => api.setTitle(CUSTOMER.name), [api]);
  return (
    <Record
      identity={{
        icon: User,
        title: CUSTOMER.name,
        subtitle: `NIT ${CUSTOMER.taxId} · ${CUSTOMER.city}`,
        figure: { label: "Deuda", value: bs(CUSTOMER.debt) },
      }}
    >
      <Record.Notice tone="info">
        Tiene {bs(CUSTOMER.credit)} en créditos pendientes de aplicar.
      </Record.Notice>
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            { label: "Teléfono", value: CUSTOMER.phone },
            { label: "Límite de crédito", value: bs(CUSTOMER.limit) },
            { label: "Disponible", value: bs(CUSTOMER.limit - CUSTOMER.debt) },
          ]}
        />
      </Record.Paper>
    </Record>
  );
}

function Product({ api, resource }: ViewProps) {
  const { chosen, choose } = useSales();
  const product = PRODUCTS.find((p) => p.name === resource.id) ?? PRODUCTS[0]!;
  const [page, setPage] = useState("general");
  useEffect(() => api.setTitle(product.name), [api, product.name]);
  return (
    <Record
      identity={{
        icon: Package,
        title: product.name,
        subtitle: `${product.sku} · ${product.category}`,
        figure: { label: "Precio de venta", value: bs(product.price) },
      }}
    >
      <Record.Paper layout="horizontal">
        {product.onHand === 0 ? (
          <Record.Notice tone="warn">
            Sin existencias. El proveedor entrega en{" "}
            {supplierOf(chosen[product.name]!).leadDays} días.
          </Record.Notice>
        ) : null}
        <Record.Pages current={page} onChange={setPage}>
          <Record.Page id="general" label="general">
            <SheetGroups>
              <SheetGroup title="Venta">
                <DataField label="Precio de venta" value={bs(product.price)} />
                <DataField label="Código" value={product.sku} mono />
              </SheetGroup>
              <SheetGroup title="Inventario">
                <DataField label="Existencias" value={`${product.onHand} unid.`} />
                <DataField label="Costo" value={bs(product.cost)} />
              </SheetGroup>
            </SheetGroups>
          </Record.Page>
          <Record.Page id="purchase" label="compra">
            {/* The edit face of a many2one: choose the supplier, and open it — in a modal by
                default, or «Abrir en…» a peek, beside, or as the page. */}
            <Field label="Proveedor">
              <Picker
                items={SUPPLIER_ITEMS}
                value={chosen[product.name]}
                onChange={(id) => choose(product.name, id)}
                onOpen={(id, to) => api.open(supplierRef(id), opened(to))}
              />
            </Field>
          </Record.Page>
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

function Supplier({ api, resource }: ViewProps) {
  const supplier = supplierOf(resource.id ?? SUPPLIERS[0]!.id);
  useEffect(() => api.setTitle(supplier.name), [api, supplier.name]);
  return (
    <Record
      identity={{
        icon: Building2,
        title: supplier.name,
        subtitle: `NIT ${supplier.taxId} · ${supplier.city}`,
        figure: { label: "Entrega", value: `${supplier.leadDays} días` },
      }}
    >
      <Record.Paper layout="horizontal">
        <Record.Pages current="prices">
          <Record.Page id="prices" label="precios" count={supplier.prices.length}>
            <LineItems
              lines={supplier.prices}
              getLineId={(p) => p.id}
              mode="read"
              columns={[
                {
                  id: "product",
                  header: "Producto",
                  value: (p) => p.product,
                  cell: (p) =>
                    PRODUCTS.some((one) => one.name === p.product) ? (
                      <RelationValue
                        name={p.product}
                        onOpenIn={(to) => api.open(productRef(p.product), opened(to))}
                      />
                    ) : (
                      p.product
                    ),
                },
                { id: "minimum", header: "Mínimo", value: (p) => p.minimum, numeric: true },
                {
                  id: "price",
                  header: "Precio",
                  value: (p) => p.price,
                  cell: (p) => bs(p.price),
                  numeric: true,
                },
              ]}
            />
          </Record.Page>
        </Record.Pages>
      </Record.Paper>
    </Record>
  );
}

/** «Registrar pago» — a short task, a MODAL over the order. Its draft lives in the view, so it
 *  survives a look at the customer BESIDE (another modal would replace this one). */
function Payment({ api }: ViewProps) {
  const { paid, setPaid } = useSales();
  const toast = useToast();
  const [amount, setAmount] = useState<number | "">(ORDER.balance - paid);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [date, setDate] = useState<string | null>("2026-10-30");
  useEffect(() => api.setTitle("Registrar pago"), [api]);
  useEffect(() => api.setDirty(amount !== ORDER.balance - paid), [api, amount, paid]);
  const register = () => {
    const before = paid;
    setPaid(before + (amount === "" ? 0 : amount));
    api.setDirty(false);
    api.close();
    toast.show({
      message: `Se registró el pago de ${bs(amount === "" ? 0 : amount)}.`,
      tone: "good",
      action: { label: "Deshacer", onSelect: () => setPaid(before) },
    });
  };
  return (
    <Record
      identity={{
        icon: CreditCard,
        title: "Registrar pago",
        subtitle: `El saldo de ${ORDER.number} baja en el momento; se puede deshacer.`,
      }}
    >
      <Record.Paper>
        <FormSection columns={2}>
          <Field label="Cliente">
            <RelationValue
              name={CUSTOMER.name}
              secondary={`deuda ${bs(CUSTOMER.debt)}`}
              openTargets={["side", "peek", "page"]}
              onOpenIn={(to) => api.open(customerRef, opened(to))}
            />
          </Field>
          <Field label="Monto" required>
            <NumberInput value={amount} onChange={setAmount} min={0} unit="Bs." />
          </Field>
          <Field label="Método">
            <Select value={method} options={PAYMENT_METHODS} onChange={setMethod} />
          </Field>
          <Field label="Fecha">
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
    kind: "pedido",
    title: () => ORDER.number,
    icon: ShoppingCart,
    load: async () => SaleOrder,
  },
  {
    domain: "ventas",
    kind: "cliente",
    title: () => CUSTOMER.name,
    icon: User,
    load: async () => Customer,
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
    kind: "proveedor",
    title: (ref) => SUPPLIERS.find((s) => s.id === ref.id)?.name ?? "Proveedor",
    icon: Building2,
    load: async () => Supplier,
  },
  {
    domain: "ventas",
    kind: "pago",
    title: () => "Registrar pago",
    icon: CreditCard,
    load: async () => Payment,
  },
];

function Page({ start }: { start: ResourceRef }) {
  return (
    <SalesProvider>
      <Workspace views={VIEWS} start={start} />
    </SalesProvider>
  );
}

/** **Un pedido y lo que abre.** El nombre de un producto abre el producto en un MODAL; «…» al
 *  lado ofrece vista previa, al costado o como página. En su pestaña «compra», el proveedor se abre
 *  igual desde el `Picker`. El aviso de existencias lo abre al costado, para comparar. */
export const PedidoDeVenta: Story = {
  name: "Pedido · producto › proveedor",
  render: () => <Page start={orderRef()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    /* The product of a line opens in a modal by default. */
    const [link] = await canvas.findAllByRole("link", { name: PRODUCTS[0]!.name });
    await userEvent.click(link!);
    await waitFor(() =>
      expect(page.getAllByText(PRODUCTS[0]!.sku).length).toBeGreaterThan(1),
    );
  },
};

/** **El asistente, con un desvío.** «Registrar pago» es un modal sobre el pedido; desde él, el
 *  cliente se abre AL COSTADO — el monto escrito sigue ahí. */
export const RegistrarPago: Story = {
  name: "Registrar pago › cliente",
  render: () => <Page start={orderRef("pago")} />,
};

/** **En el teléfono.** El mismo espacio de trabajo: composer traduce el modal en una hoja que
 *  sube desde abajo, y el panel y la ventana en la página con su miga. */
export const EnElTelefono: Story = {
  name: "En el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Page start={orderRef("producto")} />,
};
