import {
  type DataColumn,
  Field,
  LookupDialog,
  Picker,
  type PickerItem,
  Tag,
  TagsField,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { type Product, PRODUCTS } from "../support/erp-catalog";
import { CUSTOMER_CARDS, type CustomerCard } from "../support/erp-people";

const meta: Meta = {
  title: "3 · Componentes/Buscar más · elegir de una tabla",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Un campo que apunta a otro registro ofrece ocho nombres; cuando el que se busca no está entre ellos —o hacen falta sus columnas para distinguir dos parecidos— el campo abre **Buscar más…**: la misma búsqueda, las columnas del registro, y uno (many2one) o varios (many2many) elegidos. La ventana se arrastra por su encabezado para ver el formulario de atrás, y `onExpand` la acopla al espacio de trabajo.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

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
  {
    id: "price",
    header: "Precio (Bs.)",
    value: (p) => p.price,
    numeric: true,
  },
  { id: "stock", header: "Existencias", value: (p) => p.stock, numeric: true },
];

const CUSTOMER_ITEMS: PickerItem[] = CUSTOMER_CARDS.map((c) => ({
  id: c.taxId,
  name: c.name,
  meta: `NIT ${c.taxId} · ${c.city}`,
}));

/** **many2one.** «Buscar más…» es la última opción del desplegable, siempre. Elegir una fila
 *  de la tabla elige el cliente y cierra; lo escrito en el campo llega como búsqueda. */
export const UnoDeUnaTabla: Story = {
  render: function Render() {
    const [value, setValue] = useState<string>();
    const [lookup, setLookup] = useState<string | null>(null);
    return (
      <div className="max-w-md rounded-box border border-line bg-surface p-4">
        <Field label="Cliente">
          <Picker
            items={CUSTOMER_ITEMS}
            {...(value === undefined ? {} : { value })}
            onChange={setValue}
            onBrowseAll={(query) => setLookup(query)}
          />
        </Field>
        <LookupDialog<CustomerCard>
          open={lookup !== null}
          title="Elegir un cliente"
          subtitle="Factura FAC/2026/0121 · borrador"
          items={CUSTOMER_CARDS}
          keyOf={(c) => c.taxId}
          columns={CUSTOMER_COLUMNS}
          {...(lookup === null ? {} : { query: lookup, onQueryChange: setLookup })}
          {...(value === undefined ? {} : { value: [value] })}
          onPick={([id]) => {
            if (id !== undefined) setValue(id);
            setLookup(null);
          }}
          onClose={() => setLookup(null)}
          onCreate={() => setLookup(null)}
        />
      </div>
    );
  },
};

const PRODUCT_TAGS = PRODUCTS.map((p) => ({ value: p.id, label: p.name }));

/** **many2many.** Las filas se tildan —un clic en la fila o en su casilla— y «Elegir N»
 *  confirma. Lo que el campo ya tiene arranca tildado: confirmar no lo pierde. */
export const VariosDeUnaTabla: Story = {
  render: function Render() {
    const [value, setValue] = useState<string[]>(["P2"]);
    const [lookup, setLookup] = useState<string | null>(null);
    return (
      <div className="max-w-xl rounded-box border border-line bg-surface p-4">
        <Field label="Productos del contrato">
          <TagsField
            value={value}
            onChange={setValue}
            options={PRODUCT_TAGS}
            onBrowseAll={(query) => setLookup(query)}
          />
        </Field>
        <LookupDialog<Product>
          open={lookup !== null}
          title="Agregar productos"
          pick="many"
          items={PRODUCTS}
          keyOf={(p) => p.id}
          columns={PRODUCT_COLUMNS}
          {...(lookup === null ? {} : { query: lookup, onQueryChange: setLookup })}
          value={value}
          onPick={(ids) => {
            setValue(ids);
            setLookup(null);
          }}
          onClose={() => setLookup(null)}
        />
      </div>
    );
  },
};

/** **Desde el servidor.** Con `remote` la tabla no filtra: muestra lo que la respuesta
 *  trae, y el pie lleva lo que el servidor sabe — cuántos hay en total. */
export const DesdeElServidor: Story = {
  render: function Render() {
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<readonly CustomerCard[]>(CUSTOMER_CARDS);
    useEffect(() => {
      const wanted = query.trim().toLocaleLowerCase("es");
      const answer = window.setTimeout(
        () =>
          setRows(
            CUSTOMER_CARDS.filter(
              (c) =>
                c.name.toLocaleLowerCase("es").includes(wanted) || c.taxId.includes(wanted),
            ),
          ),
        250,
      );
      return () => window.clearTimeout(answer);
    }, [query]);
    const [open, setOpen] = useState(true);
    const [value, setValue] = useState<string>();
    return (
      <div className="max-w-md rounded-box border border-line bg-surface p-4">
        <Field label="Cliente">
          <Picker
            items={CUSTOMER_ITEMS}
            {...(value === undefined ? {} : { value })}
            onChange={setValue}
            onBrowseAll={(typed) => {
              setQuery(typed);
              setOpen(true);
            }}
          />
        </Field>
        <LookupDialog<CustomerCard>
          open={open}
          title="Elegir un cliente"
          items={rows}
          keyOf={(c) => c.taxId}
          columns={CUSTOMER_COLUMNS}
          query={query}
          onQueryChange={setQuery}
          remote
          footerStart={
            <span className="text-meta text-muted">mostrando los primeros 80 de 1.204</span>
          }
          onPick={([id]) => {
            if (id !== undefined) setValue(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          onExpand={() => {}}
        />
      </div>
    );
  },
};
