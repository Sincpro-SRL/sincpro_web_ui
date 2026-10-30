import {
  type DataColumn,
  DataTable,
  GroupingLevels,
  levelKey,
  ProgressBar,
  SearchBar,
  type SearchCriteria,
  type SortState,
  StatusDot,
  Tag,
  useGroupingControl,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ban, Copy, FileDown, Pencil } from "lucide-react";
import { useState } from "react";

import {
  type Invoice,
  INVOICES,
  money,
  STATE_LABEL,
  STATE_TONE,
  subtotalOf,
} from "../support/erp";

type Item = Invoice;

/** The invoices of the sales module. Twelve are enough to group and to scroll. */
const ITEMS = INVOICES.slice(0, 12);

/* What each invoice has already collected, as a share of its total. Invented but
   stable: paid ones are paid, drafts collected nothing, the rest are in between. */
function cobrado(d: Item): number {
  if (d.state === "paid") return 100;
  if (d.state === "draft" || d.state === "cancelled") return 0;
  return (Number(d.id.slice(3)) * 37) % 90;
}

const COLUMNS: DataColumn<Item>[] = [
  {
    id: "number",
    header: "número",
    value: (d) => d.number,
    cell: (d) => <span className="text-primary">{d.number}</span>,
    width: 150,
  },
  { id: "customer", header: "cliente", value: (d) => d.customer },
  {
    id: "state",
    header: "estado",
    value: (d) => STATE_LABEL[d.state],
    cell: (d) => <Tag tone={STATE_TONE[d.state]}>{STATE_LABEL[d.state]}</Tag>,
    width: 130,
  },
  {
    id: "monto",
    header: "monto",
    value: (d) => (subtotalOf(d) >= 20000 ? "grande" : "chico"),
    width: 110,
  },
  {
    id: "lines",
    header: "líneas",
    value: (d) => d.lines.length,
    numeric: true,
    aggregate: "max",
    width: 110,
  },
  {
    id: "total",
    header: "total",
    value: (d) => subtotalOf(d),
    cell: (d) => money(subtotalOf(d)),
    numeric: true,
    aggregate: "sum",
    width: 160,
  },
];

const FACETAS = [
  { id: "number", label: "número" },
  { id: "customer", label: "cliente" },
];

const AGRUPABLES = [
  { field: "state", label: "estado" },
  { field: "monto", label: "monto" },
];

/* El `meta` no se tipa con `satisfies Meta<typeof DataTable>`: `DataTable` es
   genérico y Storybook fija su `T` en `object`, así que `DataColumn<Item>` deja
   de ser asignable. Las historias usan `render` y no `args`, así que no se
   pierde nada — y el componente sí está tipado donde importa, que es adentro. */
const meta: Meta = {
  title: "3 · Componentes/Datos/Tabla",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La lógica la pone `@tanstack/react-table`; la presentación, nuestras primitivas. `Table`/`Th`/`Td` siguen siendo usables sin la librería — las líneas de una factura no necesitan agrupar. Si mañana TanStack no alcanza, se cambia un archivo y el sistema visual no se entera.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Agrupar: Story = {
  render: () => {
    const [sort, setSort] = useState<SortState | null>({ key: "total", direction: "desc" });
    /* Los niveles, EN ORDEN: el primero parte, el segundo parte lo que quedó.
       Sacar «estado» dejando «monto» deja un nivel, no cero — por eso es una
       lista y no un eje que se prende y se apaga. */
    const grouping = useGroupingControl({ levels: [{ field: "state" }] });
    /* Un nivel trae su CLAVE y su rótulo. La clave es la del motor —la misma que
       arman las otras presentaciones, así que los montones son los mismos— y el
       rótulo es lo que se lee. Acá la tabla está sola, así que los pone la
       historia; en una lista los pone `List`. */
    const niveles = grouping.levels.map((level) => ({
      id: levelKey(level),
      label: AGRUPABLES.find((one) => one.field === level.field)?.label ?? level.field,
      /* La clave sale de la columna que contesta por ese campo: «monto» no es un
         dato de la fila, es «grande» o «chico» según el total. */
      keyOf: (item: Item) =>
        String(COLUMNS.find((one) => one.id === level.field)?.value(item) ?? ""),
      labelOf: (key: string) => key,
    }));
    const [elegidas, setElegidas] = useState<Set<string>>(new Set());
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);

    return (
      <div className="flex flex-col gap-4 bg-ground px-8 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-title font-semibold text-ink">Agrupar y ordenar</h1>
          <p className="max-w-prose text-body text-muted">
            Ordenar una columna reordena los <em>grupos</em>, no las facturas sueltas — y cada
            grupo muestra su agregado: el{" "}
            <strong className="font-medium text-ink">total</strong> suma, las{" "}
            <strong className="font-medium text-ink">líneas</strong> toman el máximo. Eso es
            lo que no vale la pena escribir a mano.
          </p>
          {/* La tabla SOLA. El catálogo armado —barra, buscador, paginación—
              vive en `4 · Vistas/Lista`, y en un solo lugar: tenerlo dos veces
              garantiza que uno se quede atrás. */}
          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              facets={FACETAS}
              criteria={criteria}
              onCriteriaChange={setCriteria}
              placeholder="buscar una factura…"
              grouping={<GroupingLevels fields={AGRUPABLES} control={grouping} />}
            />
          </div>
        </header>

        <div className="overflow-hidden rounded-box border border-line bg-surface">
          <DataTable
            data={ITEMS}
            columns={COLUMNS}
            getRowId={(d) => d.id}
            sort={sort}
            onSortChange={setSort}
            levels={niveles}
            totals
            selected={elegidas}
            onSelectedChange={setElegidas}
            height={420}
          />
        </div>
      </div>
    );
  },
};

/**
 * **Widgets en la celda y acciones en la fila.**
 *
 * La celda no es texto: es el lugar donde un dato elige cómo mostrarse. `cell`
 * devuelve cualquier pieza del sistema —`Tag`, `StatusDot`, `ProgressBar`— y la
 * tabla no se entera, porque no sabe qué es una factura.
 *
 * Las acciones de fila se declaran una vez con `rowActions` y **se dibujan
 * escondidas**: aparecen sólo en la fila donde está el puntero. Es la diferencia
 * entre una tabla con datos y una tabla con ciento veinte botones prendidos
 * compitiendo con los datos. Pasá el puntero por una fila.
 */
export const Widgets: Story = {
  render: () => {
    const [sort, setSort] = useState<SortState | null>(null);
    const [ultima, setUltima] = useState<string | null>(null);

    const CON_WIDGETS: DataColumn<Item>[] = [
      {
        id: "number",
        header: "número",
        value: (d) => d.number,
        cell: (d) => <span className="text-primary">{d.number}</span>,
        width: 150,
      },
      { id: "customer", header: "cliente", value: (d) => d.customer },
      {
        id: "state",
        header: "estado",
        value: (d) => STATE_LABEL[d.state],
        cell: (d) => <StatusDot tone={STATE_TONE[d.state]} label={STATE_LABEL[d.state]} />,
        width: 150,
      },
      {
        id: "cobrado",
        header: "cobrado",
        value: (d) => cobrado(d),
        cell: (d) => (
          <ProgressBar
            value={cobrado(d)}
            label={`${cobrado(d)} % cobrado de ${d.number}`}
            width="w-20"
          />
        ),
        width: 160,
      },
      {
        id: "salesperson",
        header: "vendedor",
        value: (d) => d.salesperson,
        cell: (d) => <Tag tone="neutral">{d.salesperson}</Tag>,
        width: 180,
      },
      {
        id: "total",
        header: "total",
        value: (d) => subtotalOf(d),
        cell: (d) => money(subtotalOf(d)),
        numeric: true,
        width: 150,
      },
    ];

    return (
      <div className="flex flex-col gap-4 bg-ground px-8 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-title font-semibold text-ink">Widgets y acciones</h1>
          <p className="max-w-prose text-body text-muted">
            Pasá el puntero por una fila: las acciones aparecen a la derecha y se van cuando
            salís. Con el tabulador también se llega a ellas.
          </p>
          <p className="h-5 font-mono text-micro text-muted">
            {ultima === null ? "—" : ultima}
          </p>
        </header>

        <div className="overflow-hidden rounded-box bg-surface">
          <DataTable
            data={ITEMS.slice(0, 6)}
            columns={CON_WIDGETS}
            getRowId={(d) => d.id}
            sort={sort}
            onSortChange={setSort}
            totals
            rowActions={(d) => [
              {
                id: "editar",
                label: "Editar",
                icon: Pencil,
                onSelect: () => setUltima(`editar → ${d.number}`),
              },
              {
                id: "duplicar",
                label: "Duplicar",
                icon: Copy,
                onSelect: () => setUltima(`duplicar → ${d.number}`),
              },
              {
                id: "descargar",
                label: "Descargar el PDF",
                icon: FileDown,
                onSelect: () => setUltima(`descargar el PDF → ${d.number}`),
              },
              {
                id: "anular",
                label: "Anular",
                icon: Ban,
                tone: "danger",
                onSelect: () => setUltima(`anular → ${d.number}`),
              },
            ]}
          />
        </div>
      </div>
    );
  },
};
