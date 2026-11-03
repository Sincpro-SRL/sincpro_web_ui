import {
  Field,
  FormModeProvider,
  type TagOption,
  TagsField,
  TextInput,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { CUSTOMER_CATEGORIES, INVOICE_LABELS } from "../support/erp-tags";

/**
 * Context: **el many2many de un ERP**: las categorías de un cliente, las etiquetas de una
 * factura. Se lee como `Tags` y se edita en el mismo lugar: las fichas elegidas, con su × (o
 * Backspace sobre la ficha), y una entrada después de la última que agrega la siguiente.
 * Escribí unas letras y Enter agrega la primera que coincide; Backspace con la entrada vacía
 * quita la última. El valor es un `string[]` de ids, lo que guarda el backend.
 */
const meta: Meta = {
  title: "2 · Primitivas/Etiquetas múltiples",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "`TagsField`: fichas removibles (el `TagGroup` de React Aria) más un `ComboBox` de React Aria para agregar una más. Las elegidas no vuelven a ofrecerse; «Crear «…»» aparece sólo con `onCreate` y cuando lo escrito no nombra ninguna etiqueta. Dentro de `Field` toma su rótulo, ayuda y error; en modo lectura dibuja `Tags`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-box border border-line bg-surface p-4">
      {children}
    </div>
  );
}

/** **La ficha de un cliente.** Las categorías deciden la lista de precios y el crédito, así
 *  que se ven enteras: un multiselect cerrado las escondería detrás de «3 elegidas». Se puede
 *  crear una categoría nueva escribiéndola. */
export const FichaDeCliente: Story = {
  render: function Render() {
    const [options, setOptions] = useState<readonly TagOption[]>(CUSTOMER_CATEGORIES);
    const [categorias, setCategorias] = useState<string[]>([
      "cat-mayorista",
      "cat-credito30",
      "cat-retencion",
    ]);
    const [nombre, setNombre] = useState("Distribuidora Andina de Alimentos S.R.L.");
    return (
      <Box>
        <Field label="Cliente" required>
          <TextInput value={nombre} onChange={setNombre} />
        </Field>
        <Field label="NIT">
          <TextInput value="1023456027" onChange={() => {}} />
        </Field>
        <Field
          label="Categorías"
          hint="Deciden la lista de precios y las condiciones de crédito."
        >
          <TagsField
            value={categorias}
            onChange={setCategorias}
            options={options}
            onCreate={(label) => {
              const id = `cat-${label.toLowerCase().replace(/\s+/g, "-")}`;
              setOptions((now) => [...now, { value: id, label }]);
              return id;
            }}
          />
        </Field>
        <p className="text-micro text-muted tabular-nums">
          valor: {JSON.stringify(categorias)}
        </p>
      </Box>
    );
  },
};

/** **Catálogo cerrado y con error.** Sin `onCreate` no hay «Crear»: las etiquetas de una
 *  factura las define contabilidad. El error va debajo, como en cualquier campo. */
export const CatalogoCerrado: Story = {
  render: function Render() {
    const [etiquetas, setEtiquetas] = useState<string[]>([]);
    return (
      <Box>
        <Field
          label="Etiquetas de la factura"
          error={etiquetas.length === 0 ? "Elegí al menos una etiqueta." : undefined}
        >
          <TagsField value={etiquetas} onChange={setEtiquetas} options={INVOICE_LABELS} />
        </Field>
      </Box>
    );
  },
};

/** **Lectura.** La misma ficha en modo lectura: las categorías son `Tags`, con el tono de lo
 *  que significan; sin ninguna, dice «sin definir» en vez de dejar un hueco. */
export const Lectura: Story = {
  render: () => (
    <Box>
      <FormModeProvider value="read">
        <Field label="Categorías">
          <TagsField
            value={["cat-mayorista", "cat-exportacion", "cat-suspendido", "cat-vip"]}
            options={CUSTOMER_CATEGORIES}
          />
        </Field>
        <Field label="Etiquetas de la factura">
          <TagsField value={[]} options={INVOICE_LABELS} />
        </Field>
      </FormModeProvider>
    </Box>
  ),
};

/** **Deshabilitado.** Las fichas se leen pero no se quitan, y no hay entrada para agregar. */
export const Deshabilitado: Story = {
  render: () => (
    <Box>
      <Field label="Categorías" hint="Las define el área de créditos.">
        <TagsField
          value={["cat-mayorista", "cat-credito60"]}
          options={CUSTOMER_CATEGORIES}
          disabled
        />
      </Field>
    </Box>
  ),
};

const PRODUCTOS = Array.from({ length: 3000 }, (_, i) => ({
  value: `P-${i}`,
  label: `Producto ${i + 1}`,
  code: `SKU-${String(i).padStart(5, "0")}`,
}));

/** Lo busca el servidor: un many2many sobre tres mil productos. Con `onSearch` el campo no
 *  filtra lo que tiene: avisa lo que se escribe y ofrece lo que le contestan — acá, buscando
 *  por un código que la etiqueta no muestra. Los elegidos nunca vuelven como opción. */
export const LoBuscaElServidor: Story = {
  render: function Render() {
    const [elegidos, setElegidos] = useState<string[]>([]);
    const [opciones, setOpciones] = useState<TagOption[]>([]);
    const nombres = useRef(new Map<string, TagOption>());
    const buscar = (texto: string) => {
      window.setTimeout(() => {
        const q = texto.trim().toLowerCase();
        const hallados = PRODUCTOS.filter(
          (p) => q === "" || `${p.label} ${p.code}`.toLowerCase().includes(q),
        )
          .slice(0, 10)
          .map(({ value, label }) => ({ value, label }));
        for (const o of hallados) nombres.current.set(o.value, o);
        setOpciones(hallados);
      }, 120);
    };
    useEffect(() => buscar(""), []);
    // The chosen ones go along for their labels; the field never offers them again.
    const conElegidos = [
      ...opciones,
      ...elegidos
        .filter((id) => !opciones.some((o) => o.value === id))
        .map((id) => nombres.current.get(id))
        .filter((o): o is TagOption => o !== undefined),
    ];
    return (
      <div className="max-w-xl">
        <Field label="Productos">
          <TagsField
            value={elegidos}
            onChange={setElegidos}
            options={conElegidos}
            onSearch={buscar}
          />
        </Field>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const campo = await canvas.findByRole("combobox", { name: "Productos" });
    await userEvent.click(campo);
    await waitFor(() => expect(page.getAllByRole("option").length).toBeGreaterThan(0));
    // A code no label shows: only the server can match it.
    await userEvent.type(campo, "SKU-02500");
    await userEvent.click(await page.findByRole("option", { name: "Producto 2501" }));
    await expect(await canvas.findByText("Producto 2501")).toBeVisible();
    // Chosen, it is not offered again.
    await userEvent.type(campo, "SKU-02500");
    await waitFor(() =>
      expect(page.queryByRole("option", { name: "Producto 2501" })).toBeNull(),
    );
    /* Close the list before the a11y check: while it is open React Aria hides the rest of
       the page (`aria-hidden`), and axe reads that state, not the page a person leaves. */
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("listbox")).toBeNull());
    /* And React Aria has given the page back: it un-hides on the next frame. */
    await waitFor(() =>
      expect(canvasElement.querySelector('div[aria-hidden="true"]')).toBeNull(),
    );
  },
};
