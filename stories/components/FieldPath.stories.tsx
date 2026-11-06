import {
  type BuiltFilter,
  ColumnsMenu,
  createModelCache,
  describeFilter,
  FieldPath,
  FilterBuilder,
  type GroupableField,
  GroupingLevels,
  isToMany,
  pathLabel,
  useColumnControl,
  useGroupingControl,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { INVOICE_MODEL, INVOICES, loadInvoiceModel } from "../support/erp-paths";
import { keepMatching } from "../support/local-criteria";

/**
 * Context: **un campo alcanzado por relaciones** — el popover de Odoo. Una pila de niveles: los
 * campos de la factura; una relación lleva un chevron y al tocarla muestra SUS campos, con
 * «Volver» (o Backspace en la búsqueda vacía) para subir. Lo elegido se lee «Cliente > País >
 * Nombre».
 *
 * web-ui dibuja y nunca pide: los modelos del camino salen de `loadModel(path)`, que pasa quien
 * orquesta la pantalla (el framework). Acá lo contesta un grafo en memoria con una demora, y
 * «Contratos» apunta a un modelo que no carga, para ver la falla.
 */
const meta = {
  title: "3 · Componentes/Búsqueda · campo por relaciones",
  component: FieldPath,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Elegir un campo recorriendo relaciones: buscador por nivel, volver, rótulo «A > B > C». `filter` decide qué se puede elegir y `followRelations` qué relaciones se abren. Se reutiliza en el filtro a medida (con «alguno / ninguno / todos» por cada relación a muchos), en el menú de columnas y en el agrupado.",
      },
    },
  },
} satisfies Meta<typeof FieldPath>;

export default meta;
type Story = StoryObj<typeof meta>;

function Elegir() {
  const [path, setPath] = useState<string[]>([]);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <FieldPath
        model={INVOICE_MODEL}
        loadModel={loadInvoiceModel}
        value={path}
        onChange={(next) => setPath(next)}
        label="Campo"
      />
      <p className="text-meta text-muted">
        Camino: <code>{path.length === 0 ? "—" : path.join(".")}</code>
      </p>
    </div>
  );
}

export const ElegirUnCampo: Story = {
  args: { model: INVOICE_MODEL, value: [], onChange: () => undefined, label: "Campo" },
  render: () => <Elegir />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Campo" }));
    await userEvent.click(await page.findByRole("option", { name: /Cliente/ }));
    await userEvent.click(await page.findByRole("option", { name: /País/ }));
    /* Inside a relation, the relation itself can be chosen as a whole. */
    await expect(
      await page.findByRole("option", { name: "«País» (el registro)" }),
    ).toBeVisible();
    await userEvent.click(await page.findByRole("option", { name: "Nombre" }));
    await expect(
      await canvas.findByRole("button", { name: "Campo: Cliente > País > Nombre" }),
    ).toBeVisible();
    await expect(canvas.getByText("partner_id.country.name")).toBeVisible();
  },
};

export const BuscarYVolver: Story = {
  args: ElegirUnCampo.args,
  render: () => <Elegir />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Campo" }));
    await userEvent.click(await page.findByRole("option", { name: /Líneas/ }));
    await userEvent.type(
      await page.findByRole("searchbox", { name: "Buscar un campo" }),
      "prec",
    );
    await expect(await page.findByRole("option", { name: "Precio unitario" })).toBeVisible();
    await expect(page.queryByRole("option", { name: "Cantidad" })).toBeNull();
    /* Backspace empties the search; one more, in the empty search, goes up a level. */
    await userEvent.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}");
    await expect(await page.findByRole("option", { name: /Cliente/ })).toBeVisible();
  },
};

/** A relation whose model cannot be loaded: the level says so and the error can be copied. */
export const FallaAlCargar: Story = {
  args: ElegirUnCampo.args,
  render: () => <Elegir />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Campo" }));
    await userEvent.click(await page.findByRole("option", { name: /Contratos/ }));
    await expect(await page.findByText("No se pudieron cargar los campos.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar el error" })).toBeVisible();
  },
};

/** The filter builder with paths: the operator and the value come from the LAST field, and each
 *  to-many relation of the path has its «alguno / ninguno / todos». */
function EnElFiltro() {
  const models = useMemo(() => createModelCache(INVOICE_MODEL, loadInvoiceModel), []);
  const [selection, setSelection] = useState<BuiltFilter | undefined>();
  const initial: BuiltFilter = {
    through: "lines",
    selection: {
      through: "taxes",
      selection: { field: "amount", operator: ">", value: "10" },
    },
  };
  const rows =
    selection === undefined
      ? INVOICES
      : keepMatching(
          INVOICES,
          [{ id: "f", kind: "filter", label: "", selection }],
          (row, field) => (row as Record<string, unknown>)[field],
        );
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <FilterBuilder
        model={INVOICE_MODEL}
        models={models}
        initial={initial}
        onApply={setSelection}
      />
      <section
        aria-label="Resultado"
        className="flex flex-col gap-1 rounded-control border border-line bg-surface px-4 py-3"
      >
        <p className="text-meta text-ink">
          {selection === undefined
            ? "Sin aplicar"
            : describeFilter(selection, INVOICE_MODEL, models.peek)}
        </p>
        <p className="text-meta text-muted">
          {rows.map((row) => row.name).join(", ") || "Ninguna factura"}
        </p>
      </section>
    </div>
  );
}

export const EnElFiltroAMedida: Story = {
  args: ElegirUnCampo.args,
  render: () => <EnElFiltro />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Campo: Líneas > Impuestos > Monto" }),
    ).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Cuántos de «Líneas»" })).toHaveValue(
      "any",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Agregar" }));
    const result = canvas.getByRole("region", { name: "Resultado" });
    await waitFor(() =>
      expect(result).toHaveTextContent(
        "alguno de Líneas con alguno de Impuestos con Monto mayor que 10",
      ),
    );
    await expect(result).toHaveTextContent("FAC-0418, FAC-0420");

    /* «ninguna línea con algún impuesto > 10»: the same path, another question — written as
       criteria writes it, a `negate` around the `through`, and said back with its word. */
    await userEvent.selectOptions(
      canvas.getByRole("combobox", { name: "Cuántos de «Líneas»" }),
      "none",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(result).toHaveTextContent(
        "ninguno de Líneas con alguno de Impuestos con Monto mayor que 10",
      ),
    );
    await expect(result).toHaveTextContent("FAC-0419");
  },
};

const BASE_COLUMNS = [
  { id: "name", label: "Número" },
  { id: "state", label: "Estado", optional: true },
  { id: "amount_total", label: "Total" },
];

function Columnas() {
  const [extra, setExtra] = useState<{ id: string; label: string }[]>([]);
  const control = useColumnControl(BASE_COLUMNS);
  return (
    <div className="flex flex-col gap-3">
      <ColumnsMenu
        control={control}
        addPath={{
          model: INVOICE_MODEL,
          loadModel: loadInvoiceModel,
          /* A column shows one value per row: a to-many relation would be a list per cell. */
          followRelations: (field) => !isToMany(field),
          filter: (field) => !isToMany(field) && field.kind !== "relation",
          onPick: (path, steps) =>
            setExtra((now) => [
              ...now,
              { id: path.join("."), label: pathLabel(steps.map((s) => s.label)) },
            ]),
        }}
      />
      <ul aria-label="Columnas" className="flex flex-wrap gap-2">
        {[...BASE_COLUMNS.filter((c) => control.isVisible(c.id)), ...extra].map((column) => (
          <li
            key={column.id}
            className="rounded-control border border-line bg-surface px-3 py-1 text-meta"
          >
            {column.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const AgregarColumna: Story = {
  args: ElegirUnCampo.args,
  render: () => <Columnas />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Agregar columna" }));
    /* To-many relations are not offered: a column has one value per row. */
    /* The popover fades in: wait for it, not for the first frame. */
    await waitFor(() => expect(page.getByRole("option", { name: /Cliente/ })).toBeVisible());
    await expect(page.queryByRole("option", { name: /Líneas/ })).toBeNull();
    await userEvent.click(page.getByRole("option", { name: /Cliente/ }));
    await userEvent.click(await page.findByRole("option", { name: /País/ }));
    await userEvent.click(await page.findByRole("option", { name: "Código" }));
    await expect(
      await within(canvas.getByRole("list", { name: "Columnas" })).findByText(
        "Cliente > País > Código",
      ),
    ).toBeVisible();
  },
};

const BASE_GROUPS: GroupableField[] = [
  { field: "state", label: "Estado" },
  { field: "date", label: "Fecha", grains: ["year", "month"] },
];

function Agrupado() {
  const [fields, setFields] = useState<GroupableField[]>(BASE_GROUPS);
  const control = useGroupingControl();
  return (
    <div className="w-72 rounded-control border border-line bg-surface p-2">
      <GroupingLevels
        fields={fields}
        control={control}
        addPath={{
          model: INVOICE_MODEL,
          loadModel: loadInvoiceModel,
          followRelations: (field) => !isToMany(field),
          /* A to-one relation splits by its record («por cliente»); a to-many one does not. */
          filter: (field) => !isToMany(field),
          onPick: (path, steps) => {
            const field = path.join(".");
            setFields((now) =>
              now.some((one) => one.field === field)
                ? now
                : [...now, { field, label: pathLabel(steps.map((s) => s.label)) }],
            );
            control.add(field);
          },
        }}
      />
    </div>
  );
}

export const AgruparPorUnCampoRelacionado: Story = {
  args: ElegirUnCampo.args,
  render: () => <Agrupado />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Agrupar por otro campo" }));
    await userEvent.click(await page.findByRole("option", { name: /Cliente/ }));
    await userEvent.click(await page.findByRole("option", { name: /País/ }));
    await userEvent.click(await page.findByRole("option", { name: "«País» (el registro)" }));
    await expect((await canvas.findAllByText("Cliente > País")).length).toBeGreaterThan(0);
  },
};
