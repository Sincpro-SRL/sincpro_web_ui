import {
  ActionDock,
  DataField,
  Field,
  List,
  Pagination,
  Peek,
  Record,
  SearchBar,
  SearchField,
  TextInput,
  ViewStyleProvider,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Archive,
  Download,
  FileSpreadsheet,
  Mail,
  Plus,
  Printer,
  Upload,
  Users,
} from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { STAGES } from "../../support/erp";
import { ORDER_COUNTERS as COUNTERS } from "../../support/erp-lists";
import type { Item } from "../lista/shared";
import { FACETAS, filaDe, FILTROS, ITEMS, ORDENABLES, useLista } from "../lista/shared";
import { INVOICE, invoiceActions, REFERENCE } from "./shared";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Compartido/Acciones · la píldora",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las acciones como DATOS (`DockAction`): qué se ve, qué espera en «Más», qué se deshace aparte — en un registro y sobre las filas elegidas de una lista.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * **La regla de qué se ve**, con las mismas acciones y lugar para 0, 1, 2 y 3 secundarias. La
 * principal siempre, dorada y última; las que deshacen, nunca al lado de ella; lo que está
 * guardado a propósito (`tucked`), en «Más» aunque haya lugar; y un «Más» de una sola acción no
 * se dibuja — se dibuja esa acción.
 */
export const LaReglaDeQueSeVe: Story = {
  name: "La regla de qué se ve",
  /* Four docks side by side, four primaries: a gallery, not a screen. */
  tags: ["!screen"],
  render: () => (
    <div className="flex flex-col items-start gap-4 p-6">
      {[0, 1, 2, 3].map((visible) => (
        <div key={visible} className="flex items-center gap-4">
          <span className="w-24 text-meta text-muted">{`${visible} visibles`}</span>
          <ActionDock
            placement="inline"
            visible={visible}
            label={`Con ${visible} visibles`}
            actions={invoiceActions(() => {})}
          />
        </div>
      ))}
    </div>
  ),
};

const VENTAS = [{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }];

/* The same orders list with its actions as data — drawn by the view style it is put in. */
function PedidosConAcciones({ crumbs = VENTAS }: { crumbs?: typeof VENTAS }) {
  const l = useLista();
  const nada = () => {};
  return (
    <div className="min-h-dvh bg-ground">
      <List<Item>
        items={ITEMS}
        keyOf={(d) => d.id}
        sortable={ORDENABLES}
        sort={l.sort}
        onSortChange={l.setSort}
        present={l.present}
        onPresentChange={l.setPresent}
        // Past the page: «Elegir los 187 que coinciden», in the bar or on the floating pill.
        selection={{ ...l.selection, matching: { total: 187, onSelect: nada } }}
        onOpen={nada}
        empty={{ sentence: "Todavía no hay pedidos." }}
      >
        <List.Bar>
          <List.Crumbs crumbs={crumbs} />
          <List.Identity
            title="Pedidos"
            description="cotizaciones, pedidos confirmados y lo que ya se facturó"
            counters={COUNTERS}
          />
          <List.Search>
            <SearchBar
              facets={FACETAS}
              criteria={l.criteria}
              onCriteriaChange={l.setCriteria}
              placeholder="buscar un pedido o un cliente…"
              filters={FILTROS}
            />
          </List.Search>
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
              { id: "import", label: "Importar", icon: Upload, onSelect: nada },
              {
                id: "export",
                label: "Exportar",
                icon: Download,
                items: [
                  {
                    id: "export-xlsx",
                    label: "Excel (.xlsx)",
                    icon: FileSpreadsheet,
                    onSelect: nada,
                  },
                  { id: "export-csv", label: "CSV", onSelect: nada },
                ],
              },
            ]}
            selection={[
              { id: "send", label: "Enviar", icon: Mail, onSelect: nada },
              {
                id: "print",
                label: "Imprimir",
                icon: Printer,
                items: [
                  { id: "print-quote", label: "Cotización", onSelect: nada },
                  { id: "print-order", label: "Pedido", onSelect: nada },
                ],
              },
              { id: "invoice", label: "Facturar juntos", onSelect: nada },
              {
                id: "archive",
                label: "Archivar",
                icon: Archive,
                danger: true,
                onSelect: nada,
              },
            ]}
          />
          <List.Pagination>
            <Pagination from={1} to={12} total={187} pageSize={80} onNext={nada} />
          </List.Pagination>
        </List.Bar>
        <List.Rows<Item> row={(d) => filaDe(d)} />
      </List>
    </div>
  );
}

/**
 * **Las acciones de una lista, en el estilo moderno** (`List.Dock`): UNA píldora
 * flotando abajo, centrada, como en el registro — «Importar · Exportar ▾ · Nueva cotización»,
 * la dorada última. Al elegir filas, la MISMA píldora pasa a ser lo que se les hace: «2 elegidos
 * ✕ · Enviar · Imprimir ▾ · ⋯». La barra se queda con las migas, el título y el buscador, y la
 * píldora queda al alcance del pulgar en un teléfono.
 */
export const EnUnaLista: Story = {
  name: "En una lista · moderno",
  render: () => (
    <ViewStyleProvider value="modern">
      <PedidosConAcciones />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = await canvas.findByRole("toolbar", { name: "Acciones de los pedidos" });
    await expect(
      within(pill).getByRole("button", { name: "Nueva cotización" }),
    ).toBeVisible();
    // It floats at the bottom, not in the bar.
    await expect(pill.closest('[data-ui="dock"]')?.getAttribute("data-placement")).toBe(
      "bottom",
    );
    await expect(
      canvas.queryByRole("toolbar", { name: "Acciones de los elegidos" }),
    ).toBeNull();

    const boxes = canvas.getAllByRole("checkbox", { name: /^Elegir S/ });
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    const chosen = await canvas.findByRole("toolbar", { name: "Acciones de los elegidos" });
    await expect(within(chosen).getByText("elegidos")).toBeVisible();
    // ONE pill at the bottom: the chosen rows' takes the list's place.
    await expect(
      canvas.queryByRole("toolbar", { name: "Acciones de los pedidos" }),
    ).toBeNull();
    await expect(within(chosen).getByRole("button", { name: "Enviar" })).toBeVisible();
    await expect(
      within(chosen).getByRole("button", { name: /Elegir los 187 que coinciden/ }),
    ).toBeVisible();
    // The search stays in the bar while rows are chosen.
    await expect(canvas.getByRole("combobox", { name: "Buscar" })).toBeVisible();

    await userEvent.click(
      within(chosen).getByRole("button", { name: "Deshacer la selección" }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole("toolbar", { name: "Acciones de los elegidos" })).toBeNull(),
    );
    await expect(
      canvas.getByRole("toolbar", { name: "Acciones de los pedidos" }),
    ).toBeVisible();
  },
};

/**
 * **Las mismas acciones, en el estilo tradicional**: los botones de la barra, como en Odoo — la
 * dorada primero, «⋯» con el resto —, y al elegir filas lo que se les hace ocupa el lugar del
 * buscador. El mismo código: sólo cambia el estilo que lo envuelve.
 */
export const EnUnaListaTradicional: Story = {
  name: "En una lista · tradicional",
  render: () => <PedidosConAcciones />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByRole("toolbar", { name: "Acciones de los pedidos" });
    await expect(bar.getAttribute("data-ui")).toBe("dock.bare");
    await expect(canvasElement.querySelector('[data-ui="dock"]')).toBeNull();
    const boxes = canvas.getAllByRole("checkbox", { name: /^Elegir S/ });
    await userEvent.click(boxes[0]!);
    const chosen = await canvas.findByRole("toolbar", { name: "Acciones de los elegidos" });
    await expect(within(chosen).getByRole("button", { name: "Enviar" })).toBeVisible();
    await expect(canvasElement.querySelector('[data-ui="dock"]')).toBeNull();
    // The bar keeps saying how many, the way out and the rest that match (#65).
    await expect(
      canvas.getByRole("button", { name: /Elegir los 187 que coinciden/ }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Deshacer la selección" }));
    await waitFor(() =>
      expect(canvas.queryByRole("toolbar", { name: "Acciones de los elegidos" })).toBeNull(),
    );
  },
};

/**
 * **Una lista que cuelga de otra cosa, en el estilo moderno** (#68): las migas SON el encabezado,
 * como en un registro — «Ventas › Clientes › Distribuidora Andina S.R.L. › Pedidos» en una sola
 * línea, la última al tamaño del título y sin repetirlo debajo —, y la segunda fila es cómo se
 * mira el conjunto: de qué está hecho, el buscador al centro, ordenar y las caras. Las acciones,
 * en la píldora.
 */
export const MigasAnidadas: Story = {
  name: "Migas anidadas · moderno",
  render: () => (
    <ViewStyleProvider value="modern">
      <PedidosConAcciones
        crumbs={[
          { label: "Ventas", onClick: () => {} },
          { label: "Clientes", onClick: () => {} },
          { label: "Distribuidora Andina S.R.L.", onClick: () => {} },
          { label: "Pedidos" },
        ]}
      />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trail = await canvas.findByRole("navigation", { name: /Pedidos/ });
    const here = within(trail).getByRole("link", { current: "page" });
    // Where I am, at the title's size — and the title is not said a second time.
    await expect(here.className).toMatch(/text-title/);
    await expect(canvas.getByRole("heading", { name: "Pedidos", level: 2 }).className).toBe(
      "sr-only",
    );
    // The whole trail on one line: the root and «here» share it.
    const root = within(trail).getByRole("link", { name: "Ventas" });
    const top = (el: Element) => el.getBoundingClientRect();
    await expect(Math.abs(top(root).bottom - top(here).bottom)).toBeLessThan(6);
    // One row for how the set is looked at: what it is made of, the search, sort.
    const search = canvas.getByRole("combobox", { name: "Buscar" });
    const sort = canvas.getByRole("button", { name: /Ordenar/ });
    const about = canvas.getByText(
      "cotizaciones, pedidos confirmados y lo que ya se facturó",
    );
    const middle = (el: Element) => (top(el).top + top(el).bottom) / 2;
    await expect(Math.abs(middle(search) - middle(sort))).toBeLessThan(12);
    await expect(Math.abs(middle(search) - middle(about))).toBeLessThan(24);
    await expect(top(search).top).toBeGreaterThan(top(here).bottom);
  },
};

/* A sales team: the record's actions floating, and its orders as a collection whose rows are
   chosen and acted on. */
function EquipoConPedidos() {
  const l = useLista();
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState("250.000");
  const [kept, setKept] = useState("250.000");
  const [last, setLast] = useState("—");
  return (
    <div className="min-h-dvh bg-ground">
      <Record
        identity={{ icon: Users, title: "Corporativo · La Paz", subtitle: last }}
        {...(goal === kept
          ? {}
          : {
              dirty: {
                changes: 1,
                saving: false,
                onDiscard: () => setGoal(kept),
                onSave: () => setKept(goal),
              },
            })}
      >
        <Record.Rail>
          <Record.Crumbs
            crumbs={[
              { label: "Equipos", onClick: () => {} },
              { label: "Corporativo · La Paz" },
            ]}
          />
          <Record.Dock actions={invoiceActions(setLast)} label="Acciones del equipo" />
        </Record.Rail>
        <Record.Paper>
          <Field label="Meta del mes">
            <TextInput value={goal} onChange={setGoal} />
          </Field>
          <List<Item>
            embedded
            items={ITEMS}
            keyOf={(d) => d.id}
            selection={l.selection}
            onOpen={() => {}}
          >
            <List.Bar>
              <List.Search>
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Buscar un pedido…"
                />
              </List.Search>
              <List.Dock
                selectionLabel="Acciones de los pedidos elegidos"
                selection={[
                  {
                    id: "send",
                    label: "Enviar pedidos",
                    icon: Mail,
                    primary: true,
                    onSelect: () => {},
                  },
                  { id: "print", label: "Imprimir", icon: Printer, onSelect: () => {} },
                ]}
              />
            </List.Bar>
            <List.Rows<Item> row={filaDe} />
          </List>
        </Record.Paper>
      </Record>
    </div>
  );
}

/**
 * **Una colección dentro de un registro, en el estilo moderno** (#68): la pantalla tiene UNA
 * píldora. Al elegir pedidos, la suya toma el lugar de la del registro — «2 elegidos ✕ · Imprimir
 * · Enviar pedidos» donde estaba «Enviar · Imprimir · ⋯ · Registrar pago» — y al deshacer la
 * selección lo devuelve. Con cambios sin guardar el lugar es de Guardar / Descartar: lo que se
 * hace con los elegidos pasa a la línea de la colección.
 */
export const EnUnaColeccion: Story = {
  name: "En una colección · moderno",
  render: () => (
    <ViewStyleProvider value="modern">
      <EquipoConPedidos />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const record = () => canvas.queryByRole("toolbar", { name: "Acciones del equipo" });
    const chosen = () =>
      canvas.queryByRole("toolbar", { name: "Acciones de los pedidos elegidos" });
    await waitFor(() => expect(record()).toBeVisible());

    const boxes = canvas.getAllByRole("checkbox", { name: /^Elegir S/ });
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    // ONE pill: the chosen rows' took the record's place, in the record's band.
    await waitFor(() => expect(chosen()).toBeVisible());
    await expect(record()).toBeNull();
    await expect(canvasElement.querySelectorAll('[data-ui="dock"]').length).toBe(1);
    await expect(within(chosen()!).getByText("elegidos")).toBeVisible();

    // A change: Save / Discard keep the place; the chosen rows' actions go to the line.
    await userEvent.type(canvas.getByRole("textbox", { name: "Meta del mes" }), "0");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /Guardar/ })).toBeVisible(),
    );
    await expect(canvasElement.querySelectorAll('[data-ui="dock"]').length).toBe(1);
    await expect(chosen()!.getAttribute("data-ui")).toBe("dock.bare");
    await userEvent.click(canvas.getByRole("button", { name: /Descartar/ }));

    // Cleared, the place is the record's again.
    await waitFor(() => expect(chosen()?.getAttribute("data-ui")).not.toBe("dock.bare"));
    await userEvent.click(canvas.getByRole("button", { name: "Deshacer la selección" }));
    await waitFor(() => expect(record()).toBeVisible());
    await expect(chosen()).toBeNull();
  },
};

/**
 * **La misma colección, en el estilo tradicional**: las acciones del registro en su riel, y lo
 * que se hace con los pedidos elegidos en la línea de la colección, en lugar del buscador.
 */
export const EnUnaColeccionTradicional: Story = {
  name: "En una colección · tradicional",
  render: () => <EquipoConPedidos />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("toolbar", { name: "Acciones del equipo" });
    const boxes = canvas.getAllByRole("checkbox", { name: /^Elegir S/ });
    await userEvent.click(boxes[0]!);
    const chosen = await canvas.findByRole("toolbar", {
      name: "Acciones de los pedidos elegidos",
    });
    await expect(chosen.getAttribute("data-ui")).toBe("dock.bare");
    await expect(canvas.getByRole("toolbar", { name: "Acciones del equipo" })).toBeVisible();
    await expect(canvasElement.querySelector('[data-ui="dock"]')).toBeNull();
  },
};

/* An invoice previewed beside the list it came from: compact, no rail. */
function FacturaEnVistaPrevia() {
  const [reference, setReference] = useState(REFERENCE);
  const [kept, setKept] = useState(REFERENCE);
  const [last, setLast] = useState("—");
  return (
    <div className="relative h-dvh bg-ground">
      <Peek open title={INVOICE.number} subtitle={INVOICE.customer} onClose={() => {}}>
        <Record
          identity={{ title: INVOICE.number, tag: { label: "Publicada", tone: "info" } }}
          {...(reference === kept
            ? {}
            : {
                dirty: {
                  changes: 1,
                  saving: false,
                  onDiscard: () => setReference(kept),
                  onSave: () => setKept(reference),
                },
              })}
        >
          <Record.Rail>
            <Record.Dock actions={invoiceActions(setLast)} label="Acciones de la factura" />
            <Record.Status stages={STAGES} current="posted" />
          </Record.Rail>
          <Record.Paper>
            <Field label="Referencia del cliente">
              <TextInput value={reference} onChange={setReference} />
            </Field>
            <DataField label="Última acción" value={last} />
          </Record.Paper>
        </Record>
      </Peek>
    </div>
  );
}

/** In a preview the record's actions float at the bottom of the drawer, and a change there is
 *  saved there — in either style. */
async function previewKeepsItsActions(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const drawer = within(await canvas.findByRole("complementary"));
  const dock = await drawer.findByRole("toolbar", { name: "Acciones de la factura" });
  /* The drawer comes in with a fade: seen once it has. */
  await waitFor(() =>
    expect(within(dock).getByRole("button", { name: "Registrar pago" })).toBeVisible(),
  );
  await expect(dock.closest('[data-ui="dock"]')?.getAttribute("data-placement")).toBe(
    "bottom",
  );

  await userEvent.type(drawer.getByRole("textbox", { name: "Referencia del cliente" }), "-B");
  const save = await drawer.findByRole("button", { name: /Guardar/ });
  await expect(save).toBeVisible();
  await userEvent.click(save);
  await waitFor(() =>
    expect(drawer.getByRole("button", { name: "Registrar pago" })).toBeVisible(),
  );
}

/**
 * **Un registro en la vista previa** (#68): el cajón no tiene riel —las migas y el paginador son
 * de la lista que quedó detrás—, pero las acciones del registro no se van con él: flotan abajo,
 * en el cajón, y un cambio se guarda ahí mismo. Antes, en el estilo tradicional, la vista previa
 * se quedaba sin acciones y un campo editado no tenía cómo guardarse.
 */
export const EnUnaVistaPrevia: Story = {
  name: "En una vista previa · moderno",
  render: () => (
    <ViewStyleProvider value="modern">
      <FacturaEnVistaPrevia />
    </ViewStyleProvider>
  ),
  play: async ({ canvasElement }) => previewKeepsItsActions(canvasElement),
};

export const EnUnaVistaPreviaTradicional: Story = {
  name: "En una vista previa · tradicional",
  render: () => <FacturaEnVistaPrevia />,
  play: async ({ canvasElement }) => previewKeepsItsActions(canvasElement),
};
