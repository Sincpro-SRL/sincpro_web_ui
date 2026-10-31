import {
  Destination,
  RecordLink as WorkspaceLink,
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  Field,
  List,
  Lookup,
  Picker,
  type PickerItem,
  Record,
  SheetGroup,
  SheetGroups,
  Tag,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Workspace } from "../support/composer";
import {
  ORDER_STAGES,
  orderName,
  SALES_ORDERS,
  type SalesOrder,
  STAGE_LABEL,
  STAGE_TONE,
} from "../support/erp-lists";
import { CUSTOMER_CARDS, type CustomerCard } from "../support/erp-people";

/**
 * web-ui INSIDE the workspace — how the two packages meet.
 *
 * Context: web-ui draws a record and a list; the composer decides where each opens and how
 * people move between them. They never import each other: the views below are web-ui, they
 * receive the composer's `api`, and every «open» in them is one call —
 *
 *   - a row of the list           → `api.open(ref)`: the PAGE, and the breadcrumb remembers
 *   - its 👁                      → `api.open(ref, { to: "peek" })`: a drawer, the list stays
 *   - a customer in a column      → the composer's link: peek, side panel or window
 *   - «Buscar más…» of a field    → `api.pick(chooser, onPick)`: a WINDOW that answers, drawn
 *                                    with web-ui's `Lookup`, that moves and docks
 *   - the record's crumbs         → `useCrumbs(api)` into `Record.Crumbs`
 *
 * The adapter (skin, colours, registry) is `stories/support/composer.tsx`; in an app it is
 * `@sincpro/web-framework`'s `<SincproApp>`.
 */

const ORDERS: ResourceRef = { domain: "ventas", kind: "pedidos" };
const orderRef = (order: SalesOrder): ResourceRef => ({
  domain: "ventas",
  kind: "pedido",
  id: order.id,
});
const customerRef = (taxId: string): ResourceRef => ({
  domain: "ventas",
  kind: "cliente",
  id: taxId,
});
const chooser = (query: string): ResourceRef => ({
  domain: "ventas",
  kind: "elegir-cliente",
  ...(query === "" ? {} : { params: { q: query } }),
});

const CUSTOMER_ITEMS: PickerItem[] = CUSTOMER_CARDS.map((c) => ({
  id: c.taxId,
  name: c.name,
  meta: `NIT ${c.taxId} · ${c.city}`,
}));

const CUSTOMER_COLUMNS: DataColumn<CustomerCard>[] = [
  { id: "name", header: "Cliente", value: (c) => c.name },
  { id: "taxId", header: "NIT", value: (c) => c.taxId, mono: true },
  { id: "city", header: "Ciudad", value: (c) => c.city },
  { id: "debt", header: "Deuda", value: (c) => c.debt, numeric: true },
  {
    id: "state",
    header: "Estado",
    value: (c) => c.state.label,
    cell: (c) => <Tag tone={c.state.tone}>{c.state.label}</Tag>,
  },
];

/* ---------------------------------------------------------------- *
 *  The views — web-ui, handed the composer's api
 * ---------------------------------------------------------------- */

function Pedidos({ api }: ViewProps) {
  const crumbs = useCrumbs(api);
  return (
    <List<SalesOrder>
      items={SALES_ORDERS}
      keyOf={(o) => o.id}
      /* The workspace's rule: a row opens the PAGE. The look is the 👁. */
      rowClick="open"
      onOpen={(o) => api.open(orderRef(o))}
      onPeek={(o) => api.open(orderRef(o), { to: Destination.Peek })}
      present="table"
    >
      <List.Bar>
        <List.Crumbs crumbs={crumbs} />
        <List.Identity title="Pedidos" description="cotizaciones y pedidos de venta" />
      </List.Bar>
      <List.Table<SalesOrder>
        totals
        columns={[
          { id: "number", header: "Pedido", value: (o) => o.number },
          {
            id: "customer",
            header: "Cliente",
            value: (o) => o.customer,
            cell: (o) => (
              <WorkspaceLink api={api} resource={customerRef(o.taxId)}>
                {o.customer}
              </WorkspaceLink>
            ),
          },
          { id: "salesperson", header: "Vendedor", value: (o) => o.salesperson },
          {
            id: "stage",
            header: "Estado",
            value: (o) => STAGE_LABEL[o.stage],
            cell: (o) => <Tag tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Tag>,
          },
          {
            id: "total",
            header: "Total (Bs.)",
            value: (o) => o.total,
            numeric: true,
            aggregate: "sum",
          },
        ]}
      />
    </List>
  );
}

function Pedido({ resource, api }: ViewProps) {
  const order = SALES_ORDERS.find((o) => o.id === resource.id) ?? SALES_ORDERS[0]!;
  const crumbs = useCrumbs(api);
  const [customer, setCustomer] = useState(order.taxId);
  useEffect(() => api.setTitle(order.number), [api, order.number]);
  const card = CUSTOMER_CARDS.find((c) => c.taxId === customer);
  return (
    <Record
      identity={{
        icon: ShoppingCart,
        title: orderName({ ...order, customer: card?.name ?? order.customer }),
        tag: { label: STAGE_LABEL[order.stage], tone: STAGE_TONE[order.stage] },
        figure: { label: "Total", value: `Bs. ${order.total.toLocaleString("es-BO")}` },
      }}
    >
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Actions>
          <Button role="primary" size="sm">
            Confirmar
          </Button>
        </Record.Actions>
        <Record.Status
          stages={ORDER_STAGES}
          current={order.stage === "quotation" ? "draft" : "sale"}
        />
      </Record.Rail>
      <Record.Paper layout="horizontal">
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente">
            <Field label="Cliente">
              <Picker
                items={CUSTOMER_ITEMS}
                value={customer}
                onChange={setCustomer}
                /* «Buscar más…» asks the WORKSPACE: a window that answers, not a modal over
                   the form — it moves, docks, and the order stays readable behind it. */
                onBrowseAll={(query) =>
                  api.pick(chooser(query), (picked) => {
                    if (picked.id !== undefined) setCustomer(picked.id);
                  })
                }
                onOpen={(id) => api.open(customerRef(id), { to: Destination.Window })}
              />
            </Field>
          </SheetGroup>
          <SheetGroup title="Condiciones">
            <Field label="Vendedor">
              <Picker
                items={[{ id: order.salesperson, name: order.salesperson }]}
                value={order.salesperson}
              />
            </Field>
          </SheetGroup>
        </SheetGroups>
        <Record.Audit
          created={{ by: order.salesperson, at: order.date }}
          updated={{ by: "Tesorería", at: "hace 2 días" }}
        />
      </Record.Paper>
    </Record>
  );
}

function Cliente({ resource, api }: ViewProps) {
  const card = CUSTOMER_CARDS.find((c) => c.taxId === resource.id);
  useEffect(() => api.setTitle(card?.name ?? null), [api, card?.name]);
  if (card === undefined) return null;
  return (
    <Record
      identity={{
        icon: User,
        title: card.name,
        tag: { label: card.state.label, tone: card.state.tone },
      }}
    >
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            { label: "NIT", value: card.taxId },
            { label: "Ciudad", value: card.city },
            { label: "Teléfono", value: card.phone },
            { label: "Deuda", value: card.debt },
            { label: "Crédito", value: card.credit },
          ]}
        />
      </Record.Paper>
    </Record>
  );
}

/** The chooser a field asks for with `api.pick`: web-ui's `Lookup`, answering the workspace. */
function ElegirCliente({ resource, api }: ViewProps) {
  const [query, setQuery] = useState(resource.params?.["q"] ?? "");
  return (
    <Lookup<CustomerCard>
      items={CUSTOMER_CARDS}
      keyOf={(c) => c.taxId}
      columns={CUSTOMER_COLUMNS}
      query={query}
      onQueryChange={setQuery}
      onPick={(id) => api.answer(customerRef(id))}
      inset
    />
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "ventas",
    kind: "pedidos",
    title: () => "Pedidos",
    icon: ShoppingCart,
    goto: true,
    load: async () => Pedidos,
  },
  {
    domain: "ventas",
    kind: "pedido",
    title: (ref) => SALES_ORDERS.find((o) => o.id === ref.id)?.number ?? "Pedido",
    icon: ShoppingCart,
    search: async (query) =>
      SALES_ORDERS.filter((o) =>
        orderName(o).toLowerCase().includes(query.toLowerCase()),
      ).map((o) => ({ ref: orderRef(o), label: o.number, detail: o.customer })),
    load: async () => Pedido,
  },
  {
    domain: "ventas",
    kind: "cliente",
    title: (ref) => CUSTOMER_CARDS.find((c) => c.taxId === ref.id)?.name ?? "Cliente",
    icon: User,
    load: async () => Cliente,
  },
  {
    domain: "ventas",
    kind: "elegir-cliente",
    title: () => "Elegir un cliente",
    icon: User,
    load: async () => ElegirCliente,
  },
];

const meta: Meta = {
  title: "5 · Plantillas/Espacio de trabajo · web-ui dentro del composer",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las vistas son web-ui; DÓNDE se abre cada cosa lo decide el composer. Una fila abre la página con su miga, el 👁 abre un vistazo, un cliente en la columna se abre al costado o en ventana, y «Buscar más…» de un campo pide una ventana que contesta (`api.pick`), dibujada con `Lookup`. El composer es dependencia SOLO del Storybook; en una app, el adaptador es `<SincproApp>` de web-framework.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Empieza en la lista. Probá: una fila (página y miga), su 👁 (vistazo), un cliente
 *  (vistazo, panel o ventana con los íconos del enlace), ⌘K. */
export const DesdeLaLista: Story = {
  render: () => <Workspace views={VIEWS} start={ORDERS} />,
};

/** Empieza en un pedido. «Cliente» → «Buscar más…» abre una ventana del espacio de trabajo
 *  que se mueve y se acopla; elegir una fila contesta al campo y cierra la ventana. */
export const BuscarMasEnVentana: Story = {
  render: () => <Workspace views={VIEWS} start={orderRef(SALES_ORDERS[0]!)} />,
};
