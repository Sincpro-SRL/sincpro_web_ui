import {
  List,
  Pagination,
  SearchBar,
  type SearchCriteria,
  ViewStyleProvider,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Download, Mail, Plus, Printer, Upload } from "lucide-react";
import { useState } from "react";
import { expect, waitFor, within } from "storybook/test";

import { ORDER_COUNTERS } from "../../support/erp-lists";
import type { Item } from "../lista/shared";
import { COLUMNAS, FACETAS, filaDe, ITEMS, ORDENABLES } from "../lista/shared";
import type { DockArgs } from "./shared";
import { actionsWork, DockedInvoice } from "./shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Compartido/Estilos · tradicional y moderno",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<DockArgs>;

/**
 * **Un registro, moderno.** Las migas son el título («Ventas › Facturas › FAC/2026/0119»), con los
 * contadores en su línea —cajas, como en el tradicional— y el paginador en su píldora; un escalón
 * abajo, el estado. Las acciones flotan en una píldora ABAJO, al centro: «Enviar», «Imprimir ▾»,
 * «⋯» y «Registrar pago» dorada y última. Escribí en «Referencia del cliente»: la misma píldora
 * pasa a «1 cambio · Descartar · Guardar», y dice «Guardado».
 */
export const Moderno: Story = {
  name: "Registro · moderno",
  args: { style: "modern", placement: "auto", align: "center", look: "chrome", visible: 2 },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/**
 * **Tradicional**, con el MISMO código: las mismas `DockAction` son los botones del riel —la
 * principal primero y dorada, las secundarias, «⋯» con el resto—, y Guardar / Descartar ocupan
 * su lugar mientras hay cambios.
 */
export const Tradicional: Story = {
  name: "Registro · tradicional",
  args: {
    style: "traditional",
    placement: "auto",
    align: "center",
    look: "chrome",
    visible: 2,
  },
  render: (args) => <DockedInvoice {...args} />,
  play: async ({ canvasElement }) => actionsWork(canvasElement),
};

/** **Explorar**: el estilo, dónde va la píldora, su color, cuántas visibles. */
export const Explorar: Story = {
  name: "Registro · explorar",
  args: { style: "modern", placement: "auto", align: "center", look: "chrome", visible: 2 },
  argTypes: {
    style: { control: "inline-radio", options: ["traditional", "modern"] },
    placement: { control: "inline-radio", options: ["auto", "rail", "bottom"] },
    align: { control: "inline-radio", options: ["center", "end"] },
    look: { control: "inline-radio", options: ["chrome", "canvas"] },
    visible: { control: { type: "range", min: 0, max: 4, step: 1 } },
  },
  render: (args) => <DockedInvoice {...args} />,
};

/* ------------------------------------------------------------------ *
 *  A LIST, in each style — the same tree, the style around it decides.
 * ------------------------------------------------------------------ */

function Pedidos({
  chosen: initial = [],
  few = false,
}: {
  chosen?: readonly string[];
  /** Six rows and one action: the list that used to float its lone button under its rows. */
  few?: boolean;
}) {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [chosen, setChosen] = useState<readonly string[]>(initial);
  const [present, setPresent] = useState<"table" | "rows">("table");
  const nada = () => {};
  return (
    <div className="min-h-dvh bg-ground">
      <List<Item>
        items={few ? ITEMS.slice(0, 6) : ITEMS}
        keyOf={(d) => d.id}
        sortable={ORDENABLES}
        sort={[]}
        onSortChange={nada}
        present={present}
        onPresentChange={(next) => setPresent(next as "table" | "rows")}
        selection={{
          has: (id) => chosen.includes(id),
          toggle: (id) =>
            setChosen((now) =>
              now.includes(id) ? now.filter((x) => x !== id) : [...now, id],
            ),
          count: chosen.length,
          clear: () => setChosen([]),
        }}
        onPeek={nada}
        onOpen={nada}
        openTargets={["side", "window"]}
        onOpenIn={nada}
      >
        <List.Bar>
          <List.Crumbs
            crumbs={[
              { label: "Ventas", onClick: nada },
              { label: "Distribuidora Andina S.R.L.", onClick: nada },
              { label: "Pedidos" },
            ]}
          />
          <List.Identity
            title="Pedidos"
            description="cotizaciones, pedidos confirmados y lo que ya se facturó"
            counters={ORDER_COUNTERS}
          />
          <List.Search>
            <SearchBar facets={FACETAS} criteria={criteria} onCriteriaChange={setCriteria} />
          </List.Search>
          <List.Pagination>
            <Pagination from={1} to={12} total={12} pageSize={80} onNext={nada} />
          </List.Pagination>
          <List.Dock
            label="Acciones de los pedidos"
            selectionLabel="Acciones de los elegidos"
            actions={[
              {
                id: "new",
                label: "Nueva cotización",
                icon: Plus,
                primary: true,
                onSelect: nada,
              },
              ...(few
                ? []
                : [
                    { id: "import", label: "Importar", icon: Upload, onSelect: nada },
                    { id: "export", label: "Exportar", icon: Download, onSelect: nada },
                  ]),
            ]}
            selection={[
              { id: "send", label: "Enviar", icon: Mail, primary: true, onSelect: nada },
              { id: "print", label: "Imprimir", icon: Printer, onSelect: nada },
              {
                id: "archive",
                label: "Archivar",
                icon: Archive,
                danger: true,
                onSelect: nada,
              },
            ]}
          />
        </List.Bar>
        <List.Table<Item> columns={COLUMNAS} />
        <List.Rows<Item> row={filaDe} />
      </List>
    </div>
  );
}

/**
 * **Una lista, moderna.** Las migas son el encabezado, con su «?» (de qué está hecha) y sus
 * contadores; el rango, la píldora del paginador. La segunda fila es cómo se mira el conjunto: el
 * buscador al centro, ordenar, columnas y las caras. Las acciones flotan abajo de la pantalla, al
 * centro, en la píldora que dice sobre qué actúan: «Pedidos │ Importar · Exportar · Nueva
 * cotización». Al pasar por una fila, sus entradas —👁, ↗, «Abrir en…»— en una píldora al final.
 */
export const ListaModerna: Story = {
  name: "Lista · moderno",
  render: () => (
    <ViewStyleProvider value="modern">
      <Pedidos />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = await canvas.findByRole("toolbar", { name: "Acciones de los pedidos" });
    await expect(within(pill).getByText("Pedidos")).toBeVisible();
    await expect(
      within(pill).getByRole("button", { name: /Nueva cotización/ }),
    ).toBeVisible();
  },
};

/**
 * **Una lista corta con una sola acción** — la que antes dejaba un botón dorado solo, dentro de un
 * anillo, pegado debajo de la sexta fila. La píldora está abajo de la PANTALLA, siempre en el
 * mismo lugar, y dice de qué lista es: «Pedidos │ + Nueva cotización».
 */
export const ListaModernaUnaAccion: Story = {
  name: "Lista · moderno, corta y con una acción",
  render: () => (
    <ViewStyleProvider value="modern">
      <Pedidos few />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = await canvas.findByRole("toolbar", { name: "Acciones de los pedidos" });
    await expect(within(pill).getByText("Pedidos")).toBeVisible();
    // At the bottom of the screen, not under the last row.
    await waitFor(() =>
      expect(window.innerHeight - pill.getBoundingClientRect().bottom).toBeLessThan(40),
    );
  },
};

/**
 * **La misma lista, con filas elegidas**: la píldora pasa a ser lo que se les hace —«2 elegidos ✕
 * │ Imprimir · ⋯ · Enviar»—, en el mismo lugar; al deshacer la selección vuelve a ser la de la
 * lista.
 */
export const ListaModernaElegidas: Story = {
  name: "Lista · moderno, con filas elegidas",
  render: () => (
    <ViewStyleProvider value="modern">
      <Pedidos chosen={[ITEMS[1]!.id, ITEMS[2]!.id]} />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chosen = await canvas.findByRole("toolbar", { name: "Acciones de los elegidos" });
    await expect(chosen.closest('[data-ui="dock"]')?.getAttribute("data-placement")).toBe(
      "bottom",
    );
    await expect(within(chosen).getByText("elegidos")).toBeVisible();
  },
};

/**
 * **La misma lista, tradicional**: las migas chicas arriba con el buscador y el rango; abajo las
 * acciones, el nombre con su descripción y cómo se mira. Al elegir filas, lo que se les hace
 * ocupa el lugar del buscador.
 */
export const ListaTradicional: Story = {
  name: "Lista · tradicional",
  render: () => <Pedidos />,
};

/** **Tradicional, con filas elegidas**: en la barra, en lugar del buscador. */
export const ListaTradicionalElegidas: Story = {
  name: "Lista · tradicional, con filas elegidas",
  render: () => <Pedidos chosen={[ITEMS[1]!.id, ITEMS[2]!.id]} />,
};
