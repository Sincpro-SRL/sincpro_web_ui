import {
  Destination,
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  Field,
  filterCriteria,
  hasNamed,
  List,
  type OpenTarget,
  Pagination,
  Picker,
  type PickerItem,
  Record,
  SearchBar,
  type SearchCriteria,
  SheetGroup,
  SheetGroups,
  type SortState,
  Tag,
  TagsField,
  toggleNamed,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Package, User } from "lucide-react";
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
import { type Product, PRODUCTS } from "../support/erp-catalog";
import { CUSTOMER_CARDS, type CustomerCard } from "../support/erp-people";
import { keepMatching } from "../support/local-criteria";

/**
 * Context: **«Buscar más…»** — cuando el registro no está entre los ocho del desplegable. No es
 * un diálogo propio con otra tabla: es la MISMA lista del producto (barra de búsqueda con
 * facetas y filtros, orden, páginas, filas o tabla) en modo ELEGIR (`List onChoose`), abierta por
 * el espacio de trabajo como modal que contesta: `api.pick(ref, alContestar, { to: Modal })` y la
 * lista llama `api.answer(…)`.
 *
 *   - many2one: un clic en la fila la elige y el modal se cierra.
 *   - many2many: AGREGA. Lo que el campo ya tiene no se lista; se tildan los nuevos y «Agregar N»
 *     (en la barra de la selección) contesta sólo esos.
 *
 * Elegido, el campo ofrece abrir el registro: modal por defecto y «Abrir en…» para el resto; una
 * etiqueta del many2many se abre en vista previa.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Buscar más · elegir de la lista",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una cotización en el espacio de trabajo. «Buscar más…» del cliente abre la lista de clientes como modal que CONTESTA: buscador con facetas y filtros, orden, páginas, tabla o filas; un clic elige. «Buscar más…» de los productos AGREGA: lo que ya está no se lista y «Agregar N» devuelve sólo los nuevos. Elegido, el cliente se abre en modal (o «Abrir en…»); una etiqueta, en vista previa.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* ==================================================================== *
 *  DATA — thirty customers, so there is something to search, sort and page
 * ==================================================================== */

const CITIES = ["La Paz", "Cochabamba", "Santa Cruz", "El Alto", "Sucre", "Tarija"];
const CUSTOMERS: CustomerCard[] = Array.from({ length: 30 }, (_, i) => {
  const base = CUSTOMER_CARDS[i % CUSTOMER_CARDS.length]!;
  return i < CUSTOMER_CARDS.length
    ? base
    : {
        ...base,
        name: `${base.name.split(" ")[0]} ${["Norte", "Sur", "Central", "Express", "Andina"][i % 5]} ${i}`,
        taxId: String(2_000_000_000 + i * 7_919),
        city: CITIES[i % CITIES.length]!,
      };
});

const CUSTOMER_ITEMS: PickerItem[] = CUSTOMERS.map((c) => ({
  id: c.taxId,
  name: c.name,
  avatar: true,
  meta: `${c.city} · ${c.phone}`,
  tags: <Tag tone={c.state.tone}>{c.state.label}</Tag>,
  aside: c.debt,
  haystack: c.taxId,
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

const PRODUCT_COLUMNS: DataColumn<Product>[] = [
  { id: "name", header: "Producto", value: (p) => p.name },
  { id: "sku", header: "Código", value: (p) => p.sku, mono: true },
  { id: "category", header: "Categoría", value: (p) => p.category },
  { id: "price", header: "Precio (Bs.)", value: (p) => p.price, numeric: true },
];
const PRODUCT_TAGS = PRODUCTS.map((p) => ({ value: p.id, label: p.name }));

const FACETS = [
  { id: "name", label: "cliente" },
  { id: "taxId", label: "NIT" },
  { id: "city", label: "ciudad" },
];
const NAMED = [
  {
    id: "overdue",
    label: "con deuda vencida",
    where: { field: "state", operator: "=", value: "con deuda vencida" },
  },
  { id: "clear", label: "al día", where: { field: "state", operator: "=", value: "al día" } },
];
const read = (c: CustomerCard, field: string) =>
  field === "state" ? c.state.label : (c as unknown as Record<string, unknown>)[field];
const PAGE = 8;

/* ==================================================================== *
 *  REFERENCES and what the views share
 * ==================================================================== */

const quoteRef: ResourceRef = { domain: "ventas", kind: "cotizacion", id: "nueva" };
const customerRef = (id: string): ResourceRef => ({ domain: "ventas", kind: "cliente", id });
const productRef = (id: string): ResourceRef => ({ domain: "ventas", kind: "producto", id });
const customerChooser = (query: string): ResourceRef => ({
  domain: "ventas",
  kind: "elegir-cliente",
  params: { q: query },
});
const productChooser = (held: readonly string[]): ResourceRef => ({
  domain: "ventas",
  kind: "elegir-productos",
  params: { held: held.join(",") },
});

/** A modal over the surface, at a size that holds a record; the rest as they are. */
const opened = (to: OpenTarget) =>
  to === "modal"
    ? { to: Destination.Modal, size: { w: 760, h: 520 } }
    : { to: to as (typeof Destination)[keyof typeof Destination] };
/** A chooser is a list: wide enough for its columns, tall enough for a page of eight. */
const CHOOSER = { to: Destination.Modal, size: { w: 880, h: 600 } };

type Quote = {
  customer: string | undefined;
  setCustomer: (id: string) => void;
  products: readonly string[];
  setProducts: (ids: string[]) => void;
};
const QuoteContext = createContext<Quote | null>(null);
function useQuote(): Quote {
  const quote = useContext(QuoteContext);
  if (quote === null) throw new Error("useQuote outside QuoteProvider");
  return quote;
}
function QuoteProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<string>();
  const [products, setProducts] = useState<string[]>(["P2"]);
  const quote = useMemo<Quote>(
    () => ({ customer, setCustomer, products, setProducts }),
    [customer, products],
  );
  return <QuoteContext value={quote}>{children}</QuoteContext>;
}

/* ==================================================================== *
 *  THE QUOTE — the page whose fields ask
 * ==================================================================== */

function Quotation({ api }: ViewProps) {
  const { customer, setCustomer, products, setProducts } = useQuote();
  const crumbs = useCrumbs(api);
  return (
    <Record
      identity={{ icon: FileText, title: "Cotización nueva", tag: { label: "Borrador" } }}
    >
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Actions>
          <Button role="primary" size="sm" disabled={customer === undefined}>
            Confirmar
          </Button>
        </Record.Actions>
      </Record.Rail>
      <Record.Paper layout="horizontal">
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente">
            <Field label="Cliente">
              <Picker
                items={CUSTOMER_ITEMS}
                {...(customer === undefined ? {} : { value: customer })}
                onChange={setCustomer}
                onBrowseAll={(query) =>
                  api.pick<string>(customerChooser(query), setCustomer, CHOOSER)
                }
                onOpen={(id, to) => api.open(customerRef(id), opened(to))}
              />
            </Field>
          </SheetGroup>
          <SheetGroup title="Productos del contrato">
            <Field label="Productos">
              <TagsField
                value={products}
                onChange={setProducts}
                options={PRODUCT_TAGS}
                onBrowseAll={() =>
                  api.pick<string[]>(
                    productChooser(products),
                    (added) => setProducts([...products, ...added]),
                    CHOOSER,
                  )
                }
                onOpen={(id, to) => api.open(productRef(id), opened(to))}
              />
            </Field>
          </SheetGroup>
        </SheetGroups>
      </Record.Paper>
    </Record>
  );
}

/* ==================================================================== *
 *  THE CHOOSERS — the same List as anywhere, in choosing mode
 * ==================================================================== */

/** many2one: the customers' list with its whole search; a press on a row answers. */
function ChooseCustomer({ resource, api }: ViewProps) {
  const initial = resource.params?.["q"] ?? "";
  const [criteria, setCriteria] = useState<SearchCriteria[]>(() =>
    initial === ""
      ? []
      : [
          filterCriteria(
            { field: "name", operator: "like", value: initial },
            `cliente contiene ${initial}`,
          ),
        ],
  );
  const [sort, setSort] = useState<SortState | null>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(0);
  const found = keepMatching(CUSTOMERS, criteria, read).sort((a, b) => {
    if (sort === null) return 0;
    const [x, y] = [String(read(a, sort.key)), String(read(b, sort.key))];
    return sort.direction === "asc" ? x.localeCompare(y, "es") : y.localeCompare(x, "es");
  });
  const from = Math.min(page * PAGE, Math.max(0, found.length - 1));
  const shown = found.slice(from, from + PAGE);
  return (
    <List<CustomerCard>
      embedded
      items={shown}
      keyOf={(c) => c.taxId}
      sortable={[
        { field: "name", label: "Cliente" },
        { field: "city", label: "Ciudad" },
      ]}
      sort={sort}
      onSortChange={setSort}
      present="table"
      onChoose={(c) => api.answer(c.taxId)}
    >
      <List.Bar>
        <List.Search>
          <SearchBar
            facets={FACETS}
            criteria={criteria}
            onCriteriaChange={(next) => {
              setCriteria(next);
              setPage(0);
            }}
            placeholder="buscar un cliente, un NIT, una ciudad…"
            filters={[
              {
                options: NAMED.map((one) => ({
                  id: one.id,
                  label: one.label,
                  checked: hasNamed(criteria, one.id),
                })),
              },
            ]}
            onFilterSelect={(id) => {
              const one = NAMED.find((each) => each.id === id);
              if (one !== undefined) setCriteria(toggleNamed(criteria, one));
            }}
          />
        </List.Search>
        <List.Pagination>
          <Pagination
            from={found.length === 0 ? 0 : from + 1}
            to={from + shown.length}
            total={found.length}
            {...(from > 0 ? { onPrev: () => setPage((p) => p - 1) } : {})}
            {...(from + PAGE < found.length ? { onNext: () => setPage((p) => p + 1) } : {})}
          />
        </List.Pagination>
      </List.Bar>
      <List.Table<CustomerCard> columns={CUSTOMER_COLUMNS} />
      <List.Rows<CustomerCard>
        row={(c) => ({
          name: c.name,
          meta: `NIT ${c.taxId} · ${c.city}`,
          avatar: { name: c.name },
        })}
      />
    </List>
  );
}

/** many2many: it ADDS. What the field holds is not listed; the ticked ones answer at once. */
function ChooseProducts({ resource, api }: ViewProps) {
  const held = new Set((resource.params?.["held"] ?? "").split(",").filter(Boolean));
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const shown = PRODUCTS.filter(
    (p) =>
      !held.has(p.id) &&
      p.name.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <List<Product>
      embedded
      items={shown}
      keyOf={(p) => p.id}
      present="table"
      onChoose={(p) => toggle(p.id)}
      selection={{
        has: (id) => ticked.has(id),
        toggle,
        count: ticked.size,
        clear: () => setTicked(new Set()),
        actions: (
          <Button role="primary" size="sm" onClick={() => api.answer([...ticked])}>
            {`Agregar ${ticked.size}`}
          </Button>
        ),
      }}
    >
      <List.Bar>
        <List.Search>
          <SearchBar
            facets={[{ id: "name", label: "producto" }]}
            criteria={
              query === ""
                ? []
                : [
                    filterCriteria(
                      { field: "name", operator: "like", value: query },
                      `producto contiene ${query}`,
                    ),
                  ]
            }
            onCriteriaChange={(next) => {
              const one = next.at(-1);
              setQuery(
                one?.kind === "filter" && one.where !== undefined && "value" in one.where
                  ? String(one.where.value)
                  : "",
              );
            }}
            placeholder="buscar un producto…"
          />
        </List.Search>
      </List.Bar>
      <List.Table<Product> columns={PRODUCT_COLUMNS} />
    </List>
  );
}

/* ==================================================================== *
 *  WHAT A CHOSEN VALUE OPENS
 * ==================================================================== */

function Customer({ resource, api }: ViewProps) {
  const card = CUSTOMERS.find((c) => c.taxId === resource.id);
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

function ProductView({ resource, api }: ViewProps) {
  const product = PRODUCTS.find((p) => p.id === resource.id);
  useEffect(() => api.setTitle(product?.name ?? null), [api, product?.name]);
  if (product === undefined) return null;
  return (
    <Record identity={{ icon: Package, title: product.name, subtitle: product.sku }}>
      <Record.Paper layout="horizontal">
        <Record.Facts
          fields={[
            { label: "Categoría", value: product.category },
            { label: "Precio", value: `Bs. ${product.price.toLocaleString("es-BO")}` },
            { label: "En stock", value: String(product.stock) },
          ]}
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "ventas",
    kind: "cotizacion",
    title: () => "Cotización nueva",
    icon: FileText,
    load: async () => Quotation,
  },
  {
    domain: "ventas",
    kind: "elegir-cliente",
    title: () => "Elegir un cliente",
    icon: User,
    load: async () => ChooseCustomer,
  },
  {
    domain: "ventas",
    kind: "elegir-productos",
    title: () => "Agregar productos",
    icon: Package,
    load: async () => ChooseProducts,
  },
  {
    domain: "ventas",
    kind: "cliente",
    title: (ref) => CUSTOMERS.find((c) => c.taxId === ref.id)?.name ?? "Cliente",
    icon: User,
    load: async () => Customer,
  },
  {
    domain: "ventas",
    kind: "producto",
    title: (ref) => PRODUCTS.find((p) => p.id === ref.id)?.name ?? "Producto",
    icon: Package,
    load: async () => ProductView,
  },
];

function Page() {
  return (
    <QuoteProvider>
      <Workspace views={VIEWS} start={quoteRef} />
    </QuoteProvider>
  );
}

/** **many2one.** Escribí «ferre» en el cliente y elegí «Buscar más…»: la lista de clientes se
 *  abre como modal, ya buscando lo escrito. Un clic elige y cierra; el cliente elegido se abre
 *  en modal con el botón del campo, o en otro lado con «Abrir en…». */
export const UnoDeLaLista: Story = {
  name: "many2one · elegir uno",
  render: () => <Page />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const field = await canvas.findByRole("combobox", { name: "Cliente" });
    await userEvent.click(field);
    await userEvent.type(field, "ferre");
    await userEvent.click(await page.findByRole("option", { name: /Buscar más/ }));
    /* The list's own search, already holding what was typed; a chooser offers no 👁 / ↗. */
    const dialog = within(await page.findByRole("dialog"));
    await waitFor(() => expect(dialog.getByText("cliente contiene ferre")).toBeVisible());
    await expect(
      dialog.queryAllByRole("button", { name: /^Vista previa|^Abrir/ }),
    ).toHaveLength(0);
    await userEvent.click(dialog.getByText("Ferretería El Progreso"));
    await waitFor(() => expect(field).toHaveValue("Ferretería El Progreso"));
  },
};

/** **many2many: AGREGAR.** «Buscar más…» de los productos lista sólo lo que el campo NO tiene;
 *  se tildan los nuevos y «Agregar N» los suma sin tocar los que ya estaban. Una etiqueta se
 *  abre en vista previa. */
export const VariosParaAgregar: Story = {
  name: "many2many · agregar varios",
  render: () => <Page />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const input = await canvas.findByRole("combobox", { name: "Productos" });
    await userEvent.click(input);
    await userEvent.click(await page.findByRole("option", { name: /Buscar más/ }));
    const dialog = within(await page.findByRole("dialog"));
    /* What the field holds is not offered again. */
    await waitFor(() =>
      expect(dialog.getByText("Licencia de usuario adicional")).toBeVisible(),
    );
    await expect(dialog.queryByText("Soporte mensual (plan estándar)")).toBeNull();
    await userEvent.click(dialog.getByText("Licencia de usuario adicional"));
    await userEvent.click(dialog.getByText("Rollo de papel térmico 80×80 (caja de 50)"));
    await userEvent.click(dialog.getByRole("button", { name: "Agregar 2" }));
    await waitFor(() =>
      expect(canvas.getByText("Licencia de usuario adicional")).toBeVisible(),
    );
  },
};
