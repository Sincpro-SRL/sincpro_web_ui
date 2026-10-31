import {
  Destination,
  RecordLink as WorkspaceLink,
  type ResourceRef,
  useCrumbs,
  useViewTool,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  Field,
  List,
  Picker,
  type PickerItem,
  Record,
  RecordCard,
  SearchField,
  SheetGroup,
  SheetGroups,
  Tag,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

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
 *   - «Buscar más…» of a field    → `api.pick(chooser, onPick, { to: "modal" })`: a modal over
 *                                    this surface only, drawn with web-ui's `Lookup`, answering
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
  const [orders, setOrders] = useState<SalesOrder[]>(SALES_ORDERS);
  const [present, setPresent] = useState<"table" | "board">("table");
  return (
    <List<SalesOrder>
      items={orders}
      keyOf={(o) => o.id}
      /* The workspace's rule: a row opens the PAGE. The look is the 👁. */
      rowClick="open"
      onOpen={(o) => api.open(orderRef(o))}
      onPeek={(o) => api.open(orderRef(o), { to: Destination.Peek })}
      present={present}
      onPresentChange={(next) => setPresent(next as "table" | "board")}
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
      {/* The same orders by stage. The customer in a card is a link to ANOTHER record, inside a
          card that drags: `draggable={false}` lets the card drag and the name only click
          (composer 1.4). */}
      <List.Board<SalesOrder>
        card={(o) => (
          <RecordCard
            title={o.number}
            subtitle={
              <WorkspaceLink api={api} resource={customerRef(o.taxId)} draggable={false}>
                {o.customer}
              </WorkspaceLink>
            }
            figure={`Bs. ${o.total.toLocaleString("es-BO")}`}
            onOpen={() => api.open(orderRef(o))}
          />
        )}
        stages={{
          of: (o) => o.stage,
          columns: [
            { id: "quotation", label: STAGE_LABEL.quotation },
            { id: "order", label: STAGE_LABEL.order, tone: "info" },
            { id: "invoiced", label: STAGE_LABEL.invoiced, tone: "good" },
          ],
          nameOf: (o) => o.number,
          total: (inside) =>
            `Bs. ${inside.reduce((sum, o) => sum + o.total, 0).toLocaleString("es-BO")}`,
          onMove: (o, to) =>
            setOrders((all) =>
              all.map((one) =>
                one.id === o.id ? { ...one, stage: to as SalesOrder["stage"] } : one,
              ),
            ),
        }}
      />
    </List>
  );
}

function Pedido({ resource, api }: ViewProps) {
  const order = SALES_ORDERS.find((o) => o.id === resource.id) ?? SALES_ORDERS[0]!;
  const crumbs = useCrumbs(api);
  const [customer, setCustomer] = useState(order.taxId);
  useEffect(() => api.setTitle(order.number), [api, order.number]);
  /* What THIS screen can do, offered to the browser's agent (WebMCP) while the view is open —
     named after the record it acts on, so with two orders open the agent tells them apart. */
  useViewTool(api, {
    name: `confirmar_pedido.${order.number}`,
    description: `Confirmar el pedido ${order.number} de ${order.customer}`,
    execute: () => `Pedido ${order.number} confirmado`,
  });
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
                /* «Buscar más…» asks the WORKSPACE: a modal over THIS surface only (the rest of
                   the workspace keeps answering) that moves by its title and answers the field. */
                onBrowseAll={(query) =>
                  api.pick(
                    chooser(query),
                    (picked) => {
                      if (picked.id !== undefined) setCustomer(picked.id);
                    },
                    /* Wide enough for the customer's columns: a chooser at the default size
                       cut the state column off. */
                    { to: Destination.Modal, size: { w: 760, h: 520 } },
                  )
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

/** The chooser a field asks for with `api.pick`: web-ui's `List` in choosing mode — its row
 *  ANSWERS the field (`api.answer`), it does not open nor peek (the composer's rule). */
function ElegirCliente({ resource, api }: ViewProps) {
  const [query, setQuery] = useState(resource.params?.["q"] ?? "");
  const wanted = query.trim().toLocaleLowerCase("es");
  const shown = CUSTOMER_CARDS.filter((c) =>
    `${c.name} ${c.taxId} ${c.city}`.toLocaleLowerCase("es").includes(wanted),
  );
  return (
    <List<CustomerCard>
      embedded
      items={shown}
      keyOf={(c) => c.taxId}
      present="table"
      onChoose={(c) => api.answer(customerRef(c.taxId))}
    >
      <List.Bar>
        <List.Search>
          <SearchField value={query} onChange={setQuery} placeholder="Buscar un cliente…" />
        </List.Search>
      </List.Bar>
      <List.Table<CustomerCard> columns={CUSTOMER_COLUMNS} />
    </List>
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
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Espacio de trabajo · web-ui dentro del composer",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las vistas son web-ui; DÓNDE se abre cada cosa lo decide el composer. Una fila abre la página con su miga, el 👁 abre una vista previa, un cliente en la columna se abre al costado o en ventana, y «Buscar más…» de un campo pide un modal que contesta (`api.pick` hacia el modal), dibujada con `Lookup`. El composer es dependencia SOLO del Storybook; en una app, el adaptador es `<SincproApp>` de web-framework.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** Empieza en la lista. Probá: una fila (página y miga), su 👁 (vista previa), un cliente
 *  (vista previa, panel o ventana con los íconos del enlace), ⌘K. */
export const DesdeLaLista: Story = {
  render: () => <Workspace views={VIEWS} start={ORDERS} />,
};

/** Empieza en un pedido. «Cliente» → «Buscar más…» abre un modal SOBRE el pedido (el resto
 *  del espacio de trabajo sigue respondiendo); elegir una fila contesta al campo y lo cierra. */
export const BuscarMasEnModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const [field] = await canvas.findAllByRole("combobox");
    await userEvent.click(field!);
    await userEvent.click(await page.findByRole("option", { name: /Buscar más/ }));
    /* A modal of the workspace answers the field. */
    await userEvent.click(await page.findByText("Panadería Doña Julia"));
    await waitFor(() => expect(field).toHaveValue("Panadería Doña Julia"));
  },
  render: () => <Workspace views={VIEWS} start={orderRef(SALES_ORDERS[0]!)} />,
};
