import {
  type BuiltFilter,
  FilterBuilder,
  type ModelDefinition,
  SearchProvider,
  type ValueEditor,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { INVOICE_SEARCH_MODEL, searchInvoiceRecords } from "../support/erp-search";

/**
 * Context: **el filtro a medida.** Los recortes con nombre —«vencidas», «por cobrar»— son
 * las preguntas que alguien ya pensó; esto es para las demás. Los campos y los operadores
 * salen de la definición del modelo que manda el servidor: un monto ofrece «>», un estado
 * ofrece sus valores, una fecha ofrece «antes de». Nada está escrito a mano.
 */
const meta: Meta = {
  title: "3 · Componentes/Búsqueda · filtro a medida",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const FACTURA: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    number: { type: "string", nullable: false, sortable: true, ops: ["=", "like"] },
    customer: { type: "string", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    amount_total: {
      type: "decimal",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", ">", ">=", "<", "<="],
    },
    invoice_date_due: {
      type: "date",
      nullable: true,
      sortable: true,
      ops: ["=", ">", ">=", "<", "<="],
    },
    state: {
      type: "string",
      nullable: false,
      sortable: true,
      ops: ["=", "!="],
      choices: ["borrador", "publicada", "pagada", "anulada"],
    },
  },
  translations: {
    name: { default: "Factura" },
    labels: {
      number: { default: "número" },
      customer: { default: "cliente" },
      amount_total: { default: "total" },
      invoice_date_due: { default: "vence" },
      state: { default: "estado" },
    },
  },
};

/** **Armar una pregunta.** Elegí un campo, un operador y un valor; agrupá con Y u O, anidá un
 *  grupo, o escribí la criteria entera en JSON. Lo aplicado aparece abajo. */
export const ArmarUnFiltro: Story = {
  render: function Render() {
    const [selection, setSelection] = useState<BuiltFilter | undefined>(undefined);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <div className="rounded-box border border-line bg-surface p-4">
          <FilterBuilder
            model={FACTURA}
            onApply={setSelection}
            onCancel={() => setSelection(undefined)}
          />
        </div>
        <pre className="overflow-auto rounded-box border border-line bg-ground p-3 font-mono text-micro text-muted">
          {selection === undefined
            ? "sin filtro aplicado"
            : JSON.stringify(selection, null, 2)}
        </pre>
      </div>
    );
  },
};

/**
 * **Elegir registros, no escribir claves.** Con `searchRecords` (acá, el de un `SearchProvider`)
 * una regla puede ser sobre la relación MISMA: «Cliente es [Ferretería El Progreso]», elegido
 * por nombre. El control sigue a la comparación:
 *
 * - **es / no es** — un registro, con un selector (un many2one es UNO);
 * - **es alguno de / no es ninguno de** — varios, como etiquetas;
 * - **está vacío / no está vacío** — sin valor (lo que Odoo llama «no está establecido»);
 * - un many2many («Etiquetas») se pregunta por alguna o ninguna de sus etiquetas.
 *
 * El filtro que abre trae CLAVES —como uno leído de un enlace o del JSON—: el constructor
 * reconoce las reglas sobre registros y le pide sus nombres a la aplicación, por clave. Lo
 * aplicado se lee con nombres («Cliente es alguno de …») y viaja con claves.
 */
export const ElegirRegistros: Story = {
  name: "Elegir registros",
  render: function Render() {
    const [applied, setApplied] = useState<{ selection?: BuiltFilter; said?: string }>({});
    return (
      <SearchProvider searchRecords={searchInvoiceRecords}>
        <div className="flex max-w-3xl flex-col gap-3">
          <div className="rounded-box border border-line bg-surface p-4">
            <FilterBuilder
              model={INVOICE_SEARCH_MODEL}
              initial={{
                all: [
                  {
                    field: "customer_id",
                    operator: "in",
                    value: ["4587123018", "1020304050"],
                  },
                  {
                    through: "labels",
                    selection: { field: "id", operator: "in", value: ["lbl-reclamo"] },
                  },
                  { field: "state", operator: "in", value: ["posted", "overdue"] },
                ],
              }}
              onApply={(selection, said) =>
                setApplied({
                  ...(selection === undefined ? {} : { selection }),
                  ...(said === undefined ? {} : { said }),
                })
              }
            />
          </div>
          <p className="text-meta text-ink" aria-label="cómo se lee">
            {applied.said ?? "sin filtro aplicado"}
          </p>
        </div>
      </SearchProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The keys it opened with are named by the application's search.
    await expect(await canvas.findByText("Ferretería El Progreso")).toBeVisible();
    await expect(await canvas.findByText("Clínica San Gabriel S.A.")).toBeVisible();
    await expect(await canvas.findByText("con reclamo")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(canvas.getByLabelText("cómo se lee")).toHaveTextContent(
        /Cliente es alguno de Ferretería El Progreso, Clínica San Gabriel S\.A\./,
      ),
    );
  },
};

/** A value control of the application's own: the total asked with a slider. Every other field
 *  answers `undefined` and keeps the builder's control. */
const totalComoDeslizador: ValueEditor = (props) =>
  props.name !== "total" ? undefined : (
    <span className="flex min-w-0 flex-1 basis-40 items-center gap-2">
      <input
        type="range"
        min={0}
        max={100000}
        step={1000}
        aria-label={props.label}
        value={typeof props.raw === "number" ? props.raw : 0}
        onChange={(event) => props.onRaw(Number(event.target.value))}
        className="min-w-0 flex-1"
      />
      <span className="w-20 shrink-0 text-right text-meta tabular-nums">
        {typeof props.raw === "number" ? props.raw.toLocaleString("es-BO") : "—"}
      </span>
    </span>
  );

/**
 * **Un control de valor propio.** `valueEditor` le deja a la aplicación dibujar el valor de los
 * campos que quiera a su manera —un rango de fechas, un many2one con fotos, un color—; los demás
 * siguen con el del constructor. Recibe el campo, la comparación y el valor (escrito, elegido o
 * tal como viaja) y lo devuelve por el mismo camino. Acá, el total con un deslizador.
 */
export const UnControlPropio: Story = {
  name: "Un control de valor propio",
  render: function Render() {
    const [selection, setSelection] = useState<BuiltFilter | undefined>(undefined);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <div className="rounded-box border border-line bg-surface p-4">
          <FilterBuilder
            model={INVOICE_SEARCH_MODEL}
            initial={{ field: "total", operator: ">=", value: 20000 }}
            valueEditor={totalComoDeslizador}
            searchRecords={searchInvoiceRecords}
            onApply={setSelection}
          />
        </div>
        <pre className="overflow-auto rounded-box border border-line bg-ground p-3 font-mono text-micro text-muted">
          {selection === undefined ? "sin filtro aplicado" : JSON.stringify(selection)}
        </pre>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("slider", { name: "Valor" })).toHaveValue("20000");
    await userEvent.click(canvas.getByRole("button", { name: "Agregar" }));
    await expect(await canvas.findByText(/"value":20000/)).toBeVisible();
  },
};
