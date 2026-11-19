import { ActionDock, List, Pagination, SearchBar } from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import {
  Archive,
  Download,
  FileSpreadsheet,
  Mail,
  Plus,
  Printer,
  Upload,
} from "lucide-react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ORDER_COUNTERS as COUNTERS } from "../../support/erp-lists";
import type { Item } from "../lista/shared";
import { FACETAS, filaDe, FILTROS, ITEMS, ORDENABLES, useLista } from "../lista/shared";
import { invoiceActions } from "./shared";

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

/**
 * **Las acciones flotando, en una lista** (experimental, `List.Dock`). Lo que la lista inicia es
 * una píldora en la barra —«Nueva cotización» dorada y última, «Importar», «Exportar ▾»—, y al
 * elegir filas, lo que se les hace FLOTA abajo: «2 elegidos ✕ · Enviar · Imprimir ▾ · ⋯». El
 * buscador se queda en la barra — elegir ya no lo tapa —, y la píldora queda al alcance del
 * pulgar en un teléfono.
 */
export const AccionesFlotantes: Story = {
  name: "Acciones flotantes (experimental)",
  render: () => {
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
          selection={l.selection}
          onOpen={nada}
          empty={{ sentence: "Todavía no hay pedidos." }}
        >
          <List.Bar>
            <List.Crumbs
              crumbs={[{ label: "Ventas", onClick: nada }, { label: "Pedidos" }]}
            />
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
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByRole("toolbar", { name: "Acciones de los pedidos" });
    await expect(within(bar).getByRole("button", { name: "Nueva cotización" })).toBeVisible();
    await expect(
      canvas.queryByRole("toolbar", { name: "Acciones de los elegidos" }),
    ).toBeNull();

    const boxes = canvas.getAllByRole("checkbox", { name: /^Elegir S/ });
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    const chosen = await canvas.findByRole("toolbar", { name: "Acciones de los elegidos" });
    await expect(within(chosen).getByText("elegidos")).toBeVisible();
    await expect(within(chosen).getByRole("button", { name: "Enviar" })).toBeVisible();
    // The search stays in the bar while rows are chosen.
    await expect(canvas.getByRole("combobox", { name: "Buscar" })).toBeVisible();

    await userEvent.click(
      within(chosen).getByRole("button", { name: "Deshacer la selección" }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole("toolbar", { name: "Acciones de los elegidos" })).toBeNull(),
    );
  },
};
