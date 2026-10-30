import {
  AppFrame,
  Button,
  DataField,
  DatePicker,
  Drill,
  Field,
  FormSection,
  type LineItemColumn,
  LineItems,
  NumberInput,
  Picker,
  Record,
  RelationValue,
  Select,
  SheetGroup,
  SheetGroups,
  ToastProvider,
  useDrill,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2, CreditCard, Package, ShoppingCart, Truck, User } from "lucide-react";
import { useState } from "react";

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
 * Context: **abrir un registro desde adentro de otro.** El producto de una línea, el cliente
 * de un pedido, el asistente «Registrar pago» — y desde el producto, su proveedor. En Odoo
 * cada uno es un diálogo encima del anterior: tres velos, tres «×», y nadie sabe ya qué
 * cierra qué.
 *
 * Acá hay UN diálogo (`Drill`) y lo que cambia es lo que tiene adentro. Arriba, el rastro:
 * de dónde se abrió (el pedido, chico, como el contexto de un `Dialog`) y cada nivel del
 * camino, cada uno una vuelta atrás. «‹» y Escape suben un nivel; «×» y el velo vuelven al
 * pedido. Los niveles de atrás no se desmontan: lo que tipeaste en «Registrar pago» sigue
 * ahí después de mirar la deuda del cliente.
 *
 * Cada contexto es lo que un registro es —`Record` sin riel: nombre, estado, avisos,
 * grupos de campos, pestañas, líneas— o un formulario con su pie. Armado sólo con la API
 * pública: `tests/templates.test.ts` lo verifica.
 */
const meta: Meta = {
  title: "5 · Plantillas/Subcontextos · abrir desde el registro",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un pedido confirmado. Abrí el producto de una línea, desde el producto su proveedor (con el `Picker` o el enlace) y volvé por el rastro; o tocá «Registrar pago» y, desde el asistente, abrí el cliente. Todo en UN diálogo: en el teléfono es una hoja desde abajo.",
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

/* ==================================================================== *
 *  THE ORDER — the page, and every context it opens
 * ==================================================================== */

function SaleOrder({ open = [] }: { open?: readonly string[] }) {
  const drill = useDrill(open);
  const toast = useToast();

  /* Which product and which supplier the contexts are about. The contexts are written
     with the CURRENT state, so they are never a stale copy of what was opened. */
  const [productName, setProductName] = useState(PRODUCTS[0]!.name);
  const [chosen, setChosen] = useState<Record<string, string>>(
    Object.fromEntries(PRODUCTS.map((p) => [p.name, p.supplier])),
  );
  const [supplierId, setSupplierId] = useState(SUPPLIERS[0]!.id);
  const [productPage, setProductPage] = useState("general");

  /* The wizard's draft lives here, so it survives a look at the customer and back. */
  const [amount, setAmount] = useState<number | "">(ORDER.balance);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [date, setDate] = useState<string | null>("2026-10-30");
  const [paid, setPaid] = useState(0);

  const product = PRODUCTS.find((p) => p.name === productName)!;
  const supplier = supplierOf(supplierId);
  const balance = ORDER.balance - paid;

  const openProduct = (name: string) => {
    setProductName(name);
    setProductPage("general");
    drill.open("product");
  };
  const openSupplier = (id: string) => {
    setSupplierId(id);
    drill.open("supplier");
  };

  const register = () => {
    const before = paid;
    setPaid(before + (amount === "" ? 0 : amount));
    drill.close();
    toast.show({
      message: `Se registró el pago de ${bs(amount === "" ? 0 : amount)}.`,
      tone: "good",
      action: { label: "Deshacer", onSelect: () => setPaid(before) },
    });
  };

  const columns: LineItemColumn<DrillLine>[] = [
    {
      id: "product",
      header: "Producto",
      value: (l) => l.product,
      /* The line's related record, one press away: the name is a link that opens the
         product as the first level of the drill. */
      cell: (l) => (
        <RelationValue
          name={l.product}
          secondary={PRODUCTS.find((p) => p.name === l.product)?.sku}
          onOpen={() => openProduct(l.product)}
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
    <>
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
          <Record.Crumbs
            crumbs={[{ label: "Ventas" }, { label: "Pedidos" }, { label: ORDER.number }]}
          />
          <Record.Actions>
            {balance > 0 ? (
              <Button role="primary" size="sm" onClick={() => drill.open("payment")}>
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
              <Button role="secondary" size="sm" onClick={() => drill.open("customer")}>
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
                <Button role="ghost" size="sm" onClick={() => openProduct(name)}>
                  Ver el producto
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
                    onOpen={() => drill.open("customer")}
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

      {/* ONE dialog for every context this page opens. Which ones are open is the path
          `useDrill` holds; each context is written here, with the current state. */}
      <Drill state={drill} origin={{ kind: "pedido", label: ORDER.number }}>
        <Drill.Context id="customer" title={CUSTOMER.name} flush>
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
        </Drill.Context>

        <Drill.Context id="product" title={product.name} flush>
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
              <Record.Pages current={productPage} onChange={setProductPage}>
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
                <Record.Page id="purchase" label="compra" icon={Truck}>
                  {/* The edit face of the relation: choose the supplier, and «open» it —
                      one level deeper in the SAME dialog. */}
                  <Field label="Proveedor">
                    <Picker
                      items={SUPPLIER_ITEMS}
                      value={chosen[product.name]}
                      onChange={(id) => setChosen((all) => ({ ...all, [product.name]: id }))}
                      onOpen={openSupplier}
                    />
                  </Field>
                </Record.Page>
              </Record.Pages>
            </Record.Paper>
          </Record>
        </Drill.Context>

        <Drill.Context
          id="supplier"
          title={supplier.name}
          flush
          footer={
            <Button role="secondary" size="sm" onClick={drill.back}>
              Listo
            </Button>
          }
        >
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
                        /* And from the supplier back to one of its products: the same
                           product already open is a step back, not a fourth level. */
                        cell: (p) =>
                          PRODUCTS.some((one) => one.name === p.product) ? (
                            <RelationValue
                              name={p.product}
                              onOpen={() => openProduct(p.product)}
                            />
                          ) : (
                            p.product
                          ),
                      },
                      {
                        id: "minimum",
                        header: "Mínimo",
                        value: (p) => p.minimum,
                        numeric: true,
                      },
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
        </Drill.Context>

        <Drill.Context
          id="payment"
          title="Registrar pago"
          subtitle={`El saldo de ${ORDER.number} baja en el momento; se puede deshacer.`}
          footer={
            <>
              <Button role="ghost" size="sm" onClick={drill.back}>
                Cancelar
              </Button>
              <Button
                role="primary"
                size="sm"
                icon={CreditCard}
                disabled={amount === "" || amount <= 0}
                onClick={register}
              >
                Registrar pago
              </Button>
            </>
          }
        >
          <FormSection columns={2}>
            <Field label="Cliente">
              {/* From the wizard to the customer and back: the amount typed here is
                  still here when the customer closes. */}
              <RelationValue
                name={CUSTOMER.name}
                secondary={`deuda ${bs(CUSTOMER.debt)}`}
                onOpen={() => drill.open("customer")}
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
        </Drill.Context>
      </Drill>
    </>
  );
}

function Page({ open }: { open?: readonly string[] }) {
  return (
    <ToastProvider>
      <AppFrame>
        <SaleOrder {...(open === undefined ? {} : { open })} />
      </AppFrame>
    </ToastProvider>
  );
}

/** **Un pedido y lo que abre.** Tocá el nombre de un producto en las líneas: se abre el
 *  producto. En su pestaña «compra», el `Picker` del proveedor tiene «abrir»: el proveedor
 *  se abre UN nivel más adentro del mismo diálogo, y el rastro de arriba dice el camino
 *  —«pedido S00142 › Impresora térmica…»—. Desde el proveedor, uno de sus productos vuelve
 *  al producto en lugar de abrir un cuarto nivel. «‹» o Escape suben; «×» vuelve al pedido. */
export const PedidoDeVenta: Story = {
  name: "Pedido · producto › proveedor",
  render: () => <Page />,
};

/** **El asistente, con un desvío.** «Registrar pago» abre el formulario en el diálogo;
 *  desde ahí, el cliente se abre un nivel más adentro. Cambiá el monto, mirá el cliente y
 *  volvé: el monto sigue ahí, porque el nivel de atrás no se desmonta. */
export const RegistrarPago: Story = {
  name: "Registrar pago › cliente",
  render: () => <Page open={["payment"]} />,
};

/** **En el teléfono, dos niveles adentro.** El mismo diálogo es una hoja que sube desde
 *  abajo: el «‹» arriba a la izquierda, donde empieza la vista, y el pie con la acción bajo
 *  el pulgar. */
export const EnElTelefono: Story = {
  name: "En el teléfono",
  globals: { viewport: { value: "telefono", isRotated: false } },
  render: () => <Page open={["product", "supplier"]} />,
};
