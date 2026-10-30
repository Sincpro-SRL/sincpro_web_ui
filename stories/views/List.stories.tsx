import {
  Button,
  downloadPivot,
  filterCriteria,
  GroupingLevels,
  type GroupLevel,
  List,
  type ListPresent,
  Metric,
  Metrics,
  Pagination,
  type PivotFold,
  pivotFrom,
  ProgressBar,
  SearchBar,
  type SearchCriteria,
  type SheetColumn,
  type SortState,
  StatusDot,
  Tag,
  useGroupingControl,
  useTreeControl,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";

import { money } from "../support/erp";
import {
  BALANCE_COLUMNS,
  BALANCE_ROWS,
  BRANCHES,
  type Delivery,
  ORDER_COUNTERS as COUNTERS,
  orderMeta,
  orderName,
  type Sale,
  SALES,
  SALES_ORDERS,
  type SalesOrder,
  STAGE_ICON as ICON,
  STAGE_LABEL as LABEL,
  STAGE_TONE as TONE,
  statementCell,
} from "../support/erp-lists";

/** The set every story of this file looks at: twelve sales orders of a page of 187. */
type Item = SalesOrder;
const ITEMS = SALES_ORDERS;

const meta_: Meta<typeof List<Item>> = {
  title: "4 · Vistas/Lista · N registros",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un conjunto de N registros. **La agrupación y el orden son del CONJUNTO; las SEIS presentaciones —filas, tabla, tablero, planilla, informe y pivote— son maneras de mirar ese mismo conjunto.** La forma es del arquetipo; el contenido son ranuras, y la escotilla es `children`. El pivote es la única en la que las filas de la pantalla dejan de ser los registros: ahí una fila es un montón y una columna también.",
      },
    },
  },
};

export default meta_;
type Story = StoryObj<typeof List<Item>>;

const FACETAS = [
  { id: "number", label: "en el número" },
  { id: "customer", label: "en el cliente" },
];

/** El mismo juego, con uno puesto: es lo que hace creíble el vacío por filtro. */
const FILTROS_PUESTOS = [
  {
    label: "mostrar sólo",
    options: [
      { id: "quotation", label: "cotizaciones" },
      { id: "order", label: "pedidos" },
      { id: "invoiced", label: "facturados", checked: true },
    ],
  },
];

const FILTROS = [
  {
    label: "mostrar sólo",
    options: [
      { id: "quotation", label: "cotizaciones", hint: "todavía sin confirmar" },
      { id: "order", label: "pedidos", hint: "confirmados, por entregar o facturar" },
      { id: "invoiced", label: "facturados", hint: "ya tienen su factura" },
    ],
  },
];

/** Por qué campos se puede partir esta lista. El control de niveles los ofrece
 *  y el consumidor no escribe ningún menú. */
const AGRUPABLES = [
  { field: "stage", label: "estado" },
  { field: "deliveries", label: "entregas" },
];

/** Por qué se puede ordenar. `value` dice cómo se lee el valor: con él ordena la
 *  vista; sin él, el orden viaja en la lectura y esto sólo lo refleja. */
const ORDENABLES = [
  { field: "number", label: "número", value: (one: Item) => one.number },
  {
    field: "total",
    label: "total",
    value: (one: Item) => one.total,
    ascLabel: "de menor a mayor",
    descLabel: "de mayor a menor",
  },
  { field: "date", label: "fecha", value: (one: Item) => one.date },
];

/* Los dos ejes de un pivote de ventas, y cómo se pliega su importe. Viven acá
   arriba porque los miran dos historias: la del pivote suelto y la de las seis
   con el conmutador. */
const ROTULO_EJE: Record<string, string> = {
  branch: "sucursal",
  year: "año",
  quarter: "trimestre",
};

const PIVOTE_DE = (sale: Sale, level: GroupLevel): string =>
  level.field === "branch" ? sale.branch : level.field === "year" ? sale.year : sale.quarter;

const IMPORTE: PivotFold<Sale> = {
  id: "amount",
  header: "importe",
  fold: (sales) => (sales.length === 0 ? null : sales.reduce((a, b) => a + b.amount, 0)),
  format: (n) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`,
  /* Cómo se lee el mismo número en una planilla. Va aparte porque `format` es
     una función, y un archivo no se lleva una función adentro. */
  numberFormat: '"Bs." #,##0.00',
};

/** A qué montón va cada pedido, en cada nivel. Recortar el valor a algo legible es
 *  de quien conoce el dato: el sistema no sabe que «cero entregas» se dice «sin
 *  entregas». */
const pileOf = (item: Item, level: { field: string }): string =>
  level.field === "stage"
    ? LABEL[item.stage]
    : item.deliveries.length === 0
      ? "sin entregas"
      : "con entregas";

const unidades = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

/** La fecha como se lee acá: día y mes, el año ya lo dice la barra. */
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Una entrega colgando de su pedido. **No es otra `Row`**: no se abre, no se
 *  elige y no tiene acciones propias — tratarla como fila la haría prometer todo
 *  eso. La sangría y el filete los pone el sistema. */
function Rama({ delivery }: { delivery: Delivery }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-0.5">
      <StatusDot
        tone={
          delivery.state === "delivered" ? "good" : delivery.state === "late" ? "bad" : "info"
        }
        label={delivery.id}
        pulse={delivery.state === "on_the_way"}
      />
      {delivery.state === "on_the_way" ? (
        <ProgressBar
          value={delivery.progress}
          label={`Carga de ${delivery.id}`}
          width="w-20"
        />
      ) : null}
      <span className="min-w-0 truncate text-micro text-muted tabular-nums">
        {delivery.state === "delivered"
          ? `entregada el ${diaMes(delivery.date)} · ${unidades(delivery.units)}`
          : delivery.state === "late"
            ? `prometida para el ${diaMes(delivery.date)} · ${unidades(delivery.units)} sin salir`
            : `en camino · ${unidades(delivery.units)}`}
      </span>
    </div>
  );
}

function useLista() {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [present, setPresent] = useState<ListPresent>("rows");
  const grouping = useGroupingControl();
  const tree = useTreeControl();
  const [sort, setSort] = useState<SortState | null>(null);

  return {
    criteria,
    setCriteria,
    present,
    setPresent,
    grouping,
    tree,
    sort,
    setSort,
    selection: {
      has: (id: string) => elegidas.includes(id),
      toggle: (id: string) =>
        setElegidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id])),
      count: elegidas.length,
      clear: () => setElegidas([]),
    },
  };
}

/** La fila de un pedido, igual en todas las historias que la dibujan. */
const filaDe = (d: Item) => ({
  icon: ICON[d.stage],
  name: orderName(d),
  tags: <Tag tone={TONE[d.stage]}>{LABEL[d.stage]}</Tag>,
  meta: orderMeta(d),
});

/** La tarjeta del tablero. */
function Tarjeta({ d }: { d: Item }) {
  return (
    <div className="flex flex-col gap-2 rounded-box border border-line bg-surface p-4">
      <Tag tone={TONE[d.stage]}>{LABEL[d.stage]}</Tag>
      <p className="truncate text-lead font-medium text-primary">{orderName(d)}</p>
      <p className="text-micro text-muted tabular-nums">{orderMeta(d)}</p>
    </div>
  );
}

/**
 * Los pedidos de venta, con todo puesto: contadores, buscador con facetas y
 * filtros, paginación, tres presentaciones, selección múltiple, y **las entregas
 * colgando de su pedido**.
 *
 * Tocá una fila para la vista previa; su nombre para abrirla. Tildá dos y mirá
 * cómo la identidad de la barra se convierte en la selección **en el mismo
 * lugar** — una barra que aparece corre las filas justo cuando estás tildando.
 */
export const Catalogo: Story = {
  name: "Pedidos de venta",
  render: () => {
    const l = useLista();
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS}
            keyOf={(d) => d.id}
            sortable={ORDENABLES}
            sort={l.sort}
            onSortChange={l.setSort}
            present={l.present}
            onPresentChange={l.setPresent}
            group={{
              levels: l.grouping.levels,
              of: pileOf,
              collapsed: l.tree.collapsed,
              onToggle: l.tree.toggle,
            }}
            selection={{
              ...l.selection,
              actions: (
                <Button role="secondary" size="sm" disabled={l.selection.count < 2}>
                  Facturar juntos
                </Button>
              ),
            }}
            onOpen={() => {}}
            onPeek={() => {}}
            empty={{ sentence: "Todavía no hay pedidos." }}
          >
            <List.Bar>
              <List.Crumbs
                crumbs={[{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }]}
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
                  grouping={<GroupingLevels fields={AGRUPABLES} control={l.grouping} />}
                />
              </List.Search>
              <List.Actions>
                <Button role="primary" size="sm">
                  + Nueva cotización
                </Button>
                <Button role="secondary" size="sm">
                  Importar
                </Button>
              </List.Actions>
              <List.Pagination>
                <Pagination
                  from={1}
                  to={12}
                  total={187}
                  pageSize={80}
                  onPageSizeChange={() => {}}
                  onNext={() => {}}
                />
              </List.Pagination>
            </List.Bar>

            <List.Metrics>
              <Metrics>
                <Metric
                  value={4}
                  label="cotizaciones de hace +7 días"
                  tone="warn"
                  onClick={() => {}}
                />
                <Metric
                  value={3}
                  label="con entregas pendientes"
                  tone="info"
                  onClick={() => {}}
                  active
                />
                <Metric
                  value={8}
                  label="facturados este mes"
                  tone="good"
                  onClick={() => {}}
                />
                <Metric value="Bs. 1,2 M" label="en pedidos abiertos" />
              </Metrics>
            </List.Metrics>

            {/* Las tres caras que esta lista ofrece son estas tres, y el
                conmutador las muestra en este orden. No hay una lista aparte que
                las declare: el nodo que las ofrece es el que las dibuja. */}
            <List.Rows<Item>
              row={(d) => ({
                ...filaDe(d),
                children:
                  d.deliveries.length === 0
                    ? undefined
                    : d.deliveries.map((one) => <Rama key={one.id} delivery={one} />),
              })}
            />
            <List.Table<Item>
              totals
              columns={[
                { id: "name", header: "pedido", value: (d: Item) => orderName(d) },
                {
                  id: "stage",
                  header: "estado",
                  value: (d: Item) => LABEL[d.stage],
                  optional: true,
                },
                {
                  id: "deliveries",
                  header: "entregas",
                  value: (d: Item) =>
                    d.deliveries.length === 0 ? "sin entregas" : "con entregas",
                  optional: true,
                },
                {
                  id: "total",
                  header: "total (Bs.)",
                  value: (d: Item) => d.total,
                  numeric: true,
                  aggregate: "sum",
                  optional: true,
                },
                {
                  id: "lines",
                  header: "líneas",
                  value: (d: Item) => d.lines,
                  numeric: true,
                  aggregate: "max",
                  optional: true,
                  defaultHidden: true,
                },
              ]}
            />
            <List.Board<Item> card={(d) => <Tarjeta d={d} />} />
          </List>
        </div>
      </div>
    );
  },
};

/** **La barra oscura, a propósito.** El default es la barra clara —la barra de la
 *  aplicación es la única banda oscura de la pantalla—, y `surface="chrome"` queda
 *  para una lista que no tiene barra de aplicación encima (un panel, una pantalla
 *  suelta). Todo lo de adentro —buscador, paginador, conmutador, botones— toma la
 *  superficie del contexto: no hay que repetirla en cada pieza. */
export const BarraOscura: Story = {
  render: () => {
    const l = useLista();
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS}
            keyOf={(d) => d.id}
            surface="chrome"
            sortable={ORDENABLES}
            sort={l.sort}
            onSortChange={l.setSort}
            present={l.present}
            onPresentChange={l.setPresent}
            selection={l.selection}
            onOpen={() => {}}
            empty={{ sentence: "Todavía no hay pedidos." }}
          >
            <List.Bar>
              <List.Crumbs
                crumbs={[{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }]}
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
              <List.Actions>
                <Button role="primary" size="sm">
                  + Nueva cotización
                </Button>
                <Button role="secondary" size="sm">
                  Importar
                </Button>
              </List.Actions>
              <List.Pagination>
                <Pagination
                  from={1}
                  to={12}
                  total={187}
                  pageSize={80}
                  onPageSizeChange={() => {}}
                  onNext={() => {}}
                />
              </List.Pagination>
            </List.Bar>
            <List.Rows<Item> row={(d) => filaDe(d)} />
          </List>
        </div>
      </div>
    );
  },
};

/** Los tres estados salen del MISMO lugar, y son tres situaciones distintas:
 *  cargando, vacío de verdad, y vacío porque hay un filtro puesto. Decirle «creá
 *  tu primera cotización» a quien tiene 180 pedidos y escribió mal el nombre de
 *  un cliente es contestarle otra pregunta. */
export const LosTresEstados: Story = {
  render: () => {
    const vacio = {
      sentence: "Todavía no cargaste ningún pedido. Una cotización alcanza para empezar.",
      action: (
        <Button role="primary" size="md">
          Nueva cotización
        </Button>
      ),
      whenFiltered: {
        sentence:
          "Ningún pedido coincide con lo que buscaste. Sacá una ficha o limpiá los filtros.",
        action: (
          <Button role="secondary" size="md">
            Limpiar los filtros
          </Button>
        ),
      },
    };

    return (
      <div className="flex flex-col gap-8 bg-ground p-8">
        {(
          [
            ["cargando", { loading: true }, false],
            ["vacío de verdad", {}, false],
            ["vacío por un filtro", {}, true],
            ["falló", { error: "No pudimos hablar con el servidor." }, false],
          ] as const
        ).map(([label, state, filtered]) => (
          <figure key={label} className="flex flex-col gap-2">
            <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
              {label}
            </figcaption>
            <List<Item>
              items={[]}
              keyOf={(d) => d.id}
              state={state}
              filtered={filtered}
              empty={vacio}
            >
              <List.Bar>
                <List.Identity title="Pedidos" counters={COUNTERS} />
                {/* El caso del filtro LLEVA su buscador: sin él se lee «no pasó
                    el filtro» sin poder ver ningún filtro puesto, que es pedirle
                    a alguien que confíe en una frase. Los otros tres no lo
                    necesitan —lo que muestran no depende de ningún recorte— y
                    ponérselo sería ruido repetido cuatro veces.

                    Y ahora la condición se escribe donde se ve: una ranura bajo
                    un `?` es la ausencia de esa pieza, sin un objeto de props
                    esparcido. */}
                {filtered ? (
                  <List.Search>
                    <SearchBar
                      facets={FACETAS}
                      criteria={[
                        filterCriteria(
                          { field: "customer", operator: "like", value: "ferreteria" },
                          "cliente contiene ferreteria",
                        ),
                      ]}
                      onCriteriaChange={() => {}}
                      filters={FILTROS_PUESTOS}
                    />
                  </List.Search>
                ) : null}
              </List.Bar>
              <List.Rows<Item> row={(d) => ({ name: orderName(d) })} />
            </List>
          </figure>
        ))}
      </div>
    );
  },
};

/** En una vista previa de 480 px la MISMA lista se dibuja compacta: sin título,
 *  sin selector de tamaño de página, filas más juntas. Ningún componente cambia
 *  — cambia quién lo envuelve. */
export const EnUnCajon: Story = {
  render: () => {
    const l = useLista();
    return (
      <div className="bg-ground p-8">
        <div className="max-w-[30rem] rounded-box border border-line bg-surface p-3">
          <List<Item>
            items={ITEMS.slice(0, 5)}
            keyOf={(d) => d.id}
            sortable={ORDENABLES}
            onPeek={() => {}}
            empty={{ sentence: "Nada acá." }}
          >
            <List.Bar>
              <List.Identity title="Pedidos" counters={COUNTERS} />
              <List.Search>
                <SearchBar
                  facets={FACETAS}
                  criteria={l.criteria}
                  onCriteriaChange={l.setCriteria}
                  placeholder="buscar…"
                />
              </List.Search>
              <List.Pagination>
                <Pagination from={1} to={5} total={187} />
              </List.Pagination>
            </List.Bar>
            <List.Rows<Item> row={filaDe} />
          </List>
        </div>
      </div>
    );
  },
};

const COLUMNAS = [
  { id: "name", header: "pedido", value: (d: Item) => orderName(d) },
  {
    id: "stage",
    header: "estado",
    value: (d: Item) => LABEL[d.stage],
  },
  {
    id: "total",
    header: "total (Bs.)",
    value: (d: Item) => d.total,
    numeric: true as const,
    aggregate: "sum" as const,
  },
  {
    id: "lines",
    header: "líneas",
    value: (d: Item) => d.lines,
    numeric: true as const,
    aggregate: "max" as const,
  },
];

/**
 * El template COMPLETO, con una presentación fija.
 *
 * Lleva la barra entera —migas, métricas, buscador con facetas, filtros,
 * agrupador, orden, paginación, acciones y selección— y no una versión pelada:
 * lo que estas historias tienen que mostrar es que **la barra es la misma en las
 * seis**.
 */
function Presentacion({ present }: { present: ListPresent }) {
  const l = useLista();
  return (
    <div className="bg-ground p-8">
      <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
        <List<Item>
          items={ITEMS}
          keyOf={(d) => d.id}
          group={{
            levels: l.grouping.levels,
            of: pileOf,
            collapsed: l.tree.collapsed,
            onToggle: l.tree.toggle,
          }}
          selection={l.selection}
          sortable={ORDENABLES}
          sort={l.sort}
          onSortChange={l.setSort}
          present={present}
          empty={{ sentence: "Todavía no hay pedidos." }}
        >
          <List.Bar>
            <List.Crumbs
              crumbs={[{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }]}
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
                grouping={<GroupingLevels fields={AGRUPABLES} control={l.grouping} />}
              />
            </List.Search>
            <List.Actions>
              <Button role="primary" size="sm">
                + Nueva cotización
              </Button>
            </List.Actions>
            <List.Pagination>
              <Pagination
                from={1}
                to={12}
                total={187}
                pageSize={80}
                onPageSizeChange={() => {}}
                onNext={() => {}}
              />
            </List.Pagination>
          </List.Bar>

          <List.Metrics>
            <Metrics>
              <Metric
                value={4}
                label="cotizaciones de hace +7 días"
                tone="warn"
                onClick={() => {}}
              />
              <Metric
                value={3}
                label="con entregas pendientes"
                tone="info"
                onClick={() => {}}
              />
              <Metric value="Bs. 1,2 M" label="en pedidos abiertos" />
            </Metrics>
          </List.Metrics>

          <List.Rows<Item>
            header={{
              name: "pedido · cliente",
              meta: "líneas · fecha · total",
              tags: "estado",
            }}
            row={filaDe}
          />
          <List.Table<Item> columns={COLUMNAS} totals />
          <List.Board<Item> card={(d) => <Tarjeta d={d} />} />
        </List>
      </div>
    </div>
  );
}

/** Filas: dos líneas por registro. Es la presentación estrecha.
 *
 *  **Con `rowHeader` la fila dice qué es cada cosa.** Sin él —y así estaba—
 *  había ochenta renglones con «4 líneas · 28/10/2026 · Bs. 58.000,00» a la
 *  derecha y una ficha al final, y para saber qué era cada número había que
 *  cambiar a la tabla: cambiar de presentación para leer la misma pantalla.
 *
 *  No son columnas y por eso no salen de `columns`: una fila tiene un nombre
 *  que se estira, UNA cadena de `meta` ya formateada y una columna de fichas de
 *  ancho fijo. El rótulo nombra las tres cosas del `meta` en su orden. */
export const Filas: Story = {
  render: () => <Presentacion present="rows" />,
};

/** Tabla: columnas alineadas, con footer de agregados. */
export const Tabla: Story = {
  render: () => <Presentacion present="table" />,
};

/** Tablero: una tarjeta por registro. */
export const Tablero: Story = {
  render: () => <Presentacion present="board" />,
};

/* ================================================================== *
 *  LAS OTRAS TRES PRESENTACIONES
 *
 *  Una planilla, un balance y un pivote también son N cosas miradas juntas, con
 *  la misma barra arriba. Lo que cambia es qué sabe el código de las columnas
 *  —y, en el pivote, qué es una fila— y eso cambia TODO lo demás.
 * ================================================================== */

/** Un extracto bancario de verdad: 40.000 movimientos y siete columnas que salen
 *  del archivo que exportó el banco. Se genera y no se escribe porque lo que hay
 *  que poder mirar es si la cuadrícula sigue respondiendo con el scroll a fondo. */
type Celda = string | number | null;
type Cruda = { i: number; celdas: readonly Celda[] };

const COLUMNAS_CRUDAS: SheetColumn[] = [
  { id: "fecha", header: "fecha", type: "fecha" },
  { id: "glosa", header: "glosa", type: "texto" },
  { id: "referencia", header: "referencia", type: "identificador" },
  { id: "agencia", header: "agencia", type: "categoría" },
  { id: "canal", header: "canal", type: "categoría" },
  { id: "debe", header: "debe", type: "decimal", numeric: true },
  { id: "haber", header: "haber", type: "decimal", numeric: true },
];

const CRUDAS: Cruda[] = Array.from({ length: 40_000 }, (_, i) => ({
  i,
  // Un faltante cada 37 (el banco no mandó el monto) y una celda VACÍA cada 53
  // (un movimiento sin referencia): son cosas distintas y la planilla las
  // distingue.
  celdas: COLUMNAS_CRUDAS.map((column) => statementCell(i, column.id)),
}));

/**
 * **La PLANILLA: el vistazo a los datos crudos.** Es la cuarta presentación y
 * hasta ahora vivía afuera del arquetipo — `SheetTable` suelta, con la vista
 * re-armando la barra, los contadores y los tres estados a mano.
 *
 * Es la presentación de las columnas que NO declara el código: salen del
 * archivo que exportó el banco, pueden ser cuarenta, y las filas un millón. Por
 * eso va virtualizada —acá hay 40.000 movimientos y se dibujan los ~30 que se
 * ven—, por eso la primera columna queda fija, y por eso la celda tiene
 * semántica: `null` es un faltante (fila 1, 38, 75…: el banco no mandó el monto)
 * y `""` es una celda vacía de verdad (fila 1, 54, 107…: un movimiento sin
 * referencia).
 *
 * **Agrupa como las otras tres** —la agrupación es del CONJUNTO y no de la
 * presentación—, y los montones entran como filas de otra clase, así que no se
 * pierde la virtualización. Acá no se ve porque el extracto crudo todavía no
 * tiene ningún eje del dominio por el que agrupar: mirá `LasSeis` con «estado»
 * puesto.
 *
 * Lo que sigue sin tener es SELECCIÓN: una casilla por fila compite con la
 * columna fija del número, que es la que deja volver a saber en qué fila estás
 * cuando te fuiste treinta columnas a la derecha.
 */
export const Planilla: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
        <List<Cruda>
          items={CRUDAS}
          keyOf={(d) => String(d.i)}
          /* La planilla SÍ se ordena. Las columnas salen del archivo, así que
             los campos ordenables salen de ahí también — el código no las
             conoce, pero quien compone sí. */
          sortable={[
            { field: "n", label: "número de fila", value: (d: Cruda) => d.i },
            {
              field: "c0",
              label: COLUMNAS_CRUDAS[0]?.header ?? "",
              value: (d: Cruda) => d.celdas[0],
            },
            {
              field: "c6",
              label: COLUMNAS_CRUDAS[6]?.header ?? "",
              value: (d: Cruda) => d.celdas[6],
            },
          ]}
          present="sheet"
          empty={{ sentence: "El extracto no tiene movimientos." }}
        >
          <List.Bar>
            <List.Crumbs
              crumbs={[
                { label: "Contabilidad", onClick: () => {} },
                { label: "Conciliación bancaria", onClick: () => {} },
                { label: "extracto_bnb_octubre_2026.csv" },
              ]}
            />
            <List.Identity
              title="extracto_bnb_octubre_2026.csv"
              description="el extracto tal como lo exportó el banco, antes de conciliar"
              counters={[
                { label: "movimientos", value: 40_000 },
                { label: "columnas", value: COLUMNAS_CRUDAS.length },
                { label: "faltantes", value: 1_082 },
              ]}
            />
            <List.Search>
              <SearchBar
                facets={[
                  { id: "glosa", label: "en la glosa" },
                  { id: "referencia", label: "en la referencia" },
                ]}
                criteria={[]}
                onCriteriaChange={() => {}}
                placeholder="buscar un movimiento…"
                filters={[
                  {
                    label: "mostrar sólo",
                    options: [
                      { id: "faltantes", label: "con un monto faltante" },
                      { id: "sinref", label: "sin referencia" },
                    ],
                  },
                ]}
              />
            </List.Search>
            <List.Pagination>
              <Pagination from={1} to={200} total={40_000} onNext={() => {}} />
            </List.Pagination>
          </List.Bar>

          <List.Sheet<Cruda>
            columns={COLUMNAS_CRUDAS}
            cell={(d, _column, ci) => d.celdas[ci] ?? null}
            // Lo pintado es lo que hay que mirar: un faltante no es un cero.
            tone={(d, _column, ci) => (d.celdas[ci] === null ? "warn" : undefined)}
            note={(d, _column, ci) =>
              d.celdas[ci] === null ? "el banco no informó el monto" : undefined
            }
            height={460}
          />
          <List.Rows<Cruda> row={(d) => ({ name: `movimiento ${d.i + 1}` })} />
        </List>
      </div>
    </div>
  ),
};

/**
 * **El INFORME: la lista que SUMA.** Quinta presentación, y la más distinta de
 * las cinco: las filas no son del mismo tipo —una sección, un grupo, una línea
 * y un total se leen distinto porque significan cosas distintas— y **no se
 * ordena**, porque el orden ES el informe. Ordenar un balance por importe deja
 * «Total Activos» en el medio.
 *
 * Por eso la jerarquía entra aparte de `items` y no derivada de una agrupación:
 * «Total activos corrientes» no es un montón de cuentas, es una suma de sumas,
 * y el arquetipo no puede inventar eso a partir de un conjunto plano. La arma
 * quien conoce el dominio, igual que ya arma `columns`.
 *
 * Lo que sí comparte con las otras cuatro es todo lo de arriba: identidad,
 * contadores, migas, buscador y paginación. Ésa es la razón de que sea una
 * presentación y no una cuarta pieza suelta.
 *
 * **Lo único que no tiene es el orden**, y mirá que no es por ser un informe:
 * es por ser un informe cuyas filas DECLARÓ el dominio. «Total activos» tiene
 * que quedar después de los activos, y ordenar por importe lo dejaría en el
 * medio. Un informe armado a partir de los montones —el de acá abajo— sí se
 * ordena, porque no es una jerarquía que alguien escribió: es el conjunto,
 * contado.
 */
export const Informe: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
        <List<Item>
          items={ITEMS}
          keyOf={(d) => d.id}
          present="report"
          empty={{ sentence: "El período no tiene movimientos." }}
        >
          <List.Bar>
            <List.Crumbs
              crumbs={[
                { label: "Contabilidad", onClick: () => {} },
                { label: "Balance general" },
              ]}
            />
            <List.Identity
              title="Balance general"
              description="al 30/09/2026, comparado contra el mismo día del año pasado"
              counters={[
                { label: "cuentas", value: 42 },
                { label: "secciones", value: 2 },
              ]}
            />
            <List.Search>
              <SearchBar
                facets={[
                  { id: "code", label: "en el código" },
                  { id: "name", label: "en el nombre" },
                ]}
                criteria={[]}
                onCriteriaChange={() => {}}
                placeholder="buscar una cuenta…"
              />
            </List.Search>
            <List.Pagination>
              <Pagination from={1} to={42} total={42} onNext={() => {}} />
            </List.Pagination>
          </List.Bar>

          <List.Report
            columns={BALANCE_COLUMNS}
            rows={BALANCE_ROWS}
            defaultOpen={["efectivo"]}
          />
          <List.Rows<Item> row={(d) => ({ name: orderName(d) })} />
        </List>
      </div>
    </div>
  ),
};

/**
 * **El PIVOTE: la lista partida por DOS ejes.** Sexta presentación, y la única
 * en la que las filas de la pantalla dejan de ser los registros: una fila es un
 * montón y una columna también, así que lo que se lee está en el cruce.
 *
 * De eso sale todo lo que le falta comparada con las otras cinco, y no falta
 * nada por olvido:
 *
 * - **No hay selección.** Una casilla por fila elegiría montones, no registros.
 * - **No hay orden en la barra.** Cada eje viene en el orden de sus claves, y
 *   ordenar los registros de abajo no ordena los montones de arriba.
 * - **No hay menú de columnas.** Las columnas son un EJE, no una lista de
 *   campos que se puedan esconder de a uno.
 *
 * Lo que sí comparte es todo lo de arriba: identidad, contadores, migas,
 * buscador, filtros y paginación. Ésa es la razón de que sea una presentación y
 * no una pieza suelta.
 *
 * Va aparte de `group` aunque los dos partan el conjunto: un pivote parte por
 * dos ejes y una lista agrupada por uno, y los niveles de `group` no dicen cuál
 * de ellos sería el eje horizontal.
 *
 * **Y se baja como planilla**, con el botón de arriba a la derecha. El pivote es
 * la presentación donde exportar desde el navegador no miente: la grilla entera
 * ya está en la mano —son rótulos y números plegados, no los registros— así que
 * el archivo dice exactamente lo mismo que la pantalla, con el encabezado
 * combinado, los números como números y los agujeros vacíos.
 */
export const Pivote: StoryObj<typeof List<Sale>> = {
  render: function Render() {
    /* Se pliega ACÁ y se pasa por `folded`, en vez de dejar que lo haga el
       arquetipo con `spec`: así la grilla que se dibuja y la que baja el botón
       son el mismo objeto, y no dos que podrían no coincidir. */
    const pivote = useMemo(
      () =>
        pivotFrom(SALES, {
          rows: [{ field: "branch" }],
          columns: [{ field: "year" }, { field: "quarter" }],
          of: PIVOTE_DE,
          measures: [IMPORTE],
          labelOf: (level) => ROTULO_EJE[level.field] ?? level.field,
        }),
      [],
    );
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Sale>
            items={SALES}
            keyOf={(m) => m.id}
            present="pivot"
            empty={{ sentence: "El período no tiene ventas." }}
          >
            <List.Bar>
              <List.Crumbs
                crumbs={[
                  { label: "Ventas", onClick: () => {} },
                  { label: "Análisis de ventas" },
                ]}
              />
              <List.Identity
                title="Ventas por sucursal"
                description="por sucursal y trimestre, en Bs."
                counters={[
                  { label: "sucursales", value: BRANCHES.length },
                  { label: "trimestres", value: 8 },
                  { label: "ventas", value: SALES.length },
                ]}
              />
              <List.Search>
                <SearchBar
                  facets={[{ id: "branch", label: "en la sucursal" }]}
                  criteria={[]}
                  onCriteriaChange={() => {}}
                  placeholder="buscar una sucursal…"
                />
              </List.Search>
              <List.Actions>
                <Button
                  role="secondary"
                  size="sm"
                  onClick={() =>
                    downloadPivot(pivote, {
                      name: "Ventas",
                      caption: "Ventas por sucursal y trimestre · en Bs.",
                    })
                  }
                >
                  Descargar Excel
                </Button>
              </List.Actions>
              <List.Pagination>
                <Pagination from={1} to={SALES.length} total={SALES.length} />
              </List.Pagination>
            </List.Bar>

            <List.Pivot<Sale>
              folded={pivote}
              /* Un cruce se abre: son las ventas que cayeron ahí. Sin esto los
                 números no son botones. */
              onCell={() => {}}
            />
            <List.Rows<Sale>
              row={(m) => ({ name: `${m.branch} · ${m.year} ${m.quarter}` })}
            />
          </List>
        </div>
      </div>
    );
  },
};

/**
 * **Las seis, con el conmutador puesto.** Es el punto del arquetipo: lo de
 * arriba no se mueve al cambiar de presentación, y lo que se pierde al cambiar
 * se pierde porque la presentación nueva no puede contestar esa pregunta, no
 * porque se haya olvidado.
 *
 * Tocá los seis íconos de la derecha. Fijate que el menú de columnas aparece
 * **sólo en tabla**: en la planilla las columnas son del archivo, en el informe
 * son los períodos y en el pivote son un eje — en ninguna de las tres hay
 * columnas opcionales que el código pueda ofrecer esconder. Y al pasar a pivote
 * también desaparece el orden, porque sus filas ya no son estos registros.
 */
export const LasSeis: Story = {
  render: () => {
    const [present, setPresent] = useState<ListPresent>("rows");
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS}
            keyOf={(d) => d.id}
            sortable={ORDENABLES}
            present={present}
            onPresentChange={setPresent}
            empty={{ sentence: "Todavía no hay pedidos." }}
          >
            <List.Bar>
              <List.Crumbs
                crumbs={[{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }]}
              />
              <List.Identity title="Pedidos" counters={COUNTERS} />
              <List.Search>
                <SearchBar
                  facets={FACETAS}
                  criteria={[]}
                  onCriteriaChange={() => {}}
                  placeholder="buscar un pedido o un cliente…"
                  filters={FILTROS}
                />
              </List.Search>
              <List.Pagination>
                <Pagination from={1} to={12} total={187} onNext={() => {}} />
              </List.Pagination>
            </List.Bar>

            {/* Las seis caras, escritas. El conmutador las ofrece en este orden
                porque es el orden en que están — no hay una lista aparte que
                pueda quedar diciendo otra cosa. */}
            <List.Rows<Item> row={filaDe} />
            <List.Table<Item> columns={COLUMNAS} totals />
            <List.Board<Item> card={(d) => <Tarjeta d={d} />} />
            <List.Sheet<Item>
              columns={[
                { id: "number", header: "número", type: "identificador" },
                { id: "customer", header: "cliente" },
                { id: "stage", header: "estado", type: "categoría" },
                { id: "total", header: "total", type: "decimal", numeric: true },
                { id: "lines", header: "líneas", type: "entero", numeric: true },
              ]}
              cell={(d, _column, ci) =>
                [d.number, d.customer, LABEL[d.stage], d.total, d.lines][ci] ?? null
              }
              height={360}
            />
            <List.Report
              columns={BALANCE_COLUMNS}
              rows={BALANCE_ROWS}
              defaultOpen={["efectivo"]}
            />
            {/* El MISMO conjunto, partido por dos ejes: el estado hacia abajo y
                «con entregas / sin entregas» hacia la derecha. El pivote no sale
                de `group` porque `group` tiene UN eje y esto necesita dos, y
                cuál de los niveles sería el horizontal no lo dice nadie. */}
            <List.Pivot<Item>
              spec={{
                rows: [{ field: "stage" }],
                columns: [{ field: "deliveries" }],
                of: pileOf,
                measures: [
                  {
                    id: "total",
                    header: "total",
                    fold: (items) =>
                      items.length === 0
                        ? null
                        : items.reduce((total, one) => total + one.total, 0),
                    format: money,
                  },
                ],
                labelOf: (level) => (level.field === "stage" ? "estado" : "entregas"),
              }}
            />
          </List>
        </div>
      </div>
    );
  },
};

/**
 * **El informe ARMADO con los montones.** No hay `report.rows`: los niveles
 * puestos son la jerarquía, cada uno es una línea con sus agregados, y el nivel
 * más profundo cuelga sus filas.
 *
 * Es el mismo conjunto que ven las otras cinco presentaciones, contado — que es
 * lo que alguien espera al pasar de «tabla» a «informe» con dos niveles puestos,
 * y lo que antes no pasaba porque el informe vivía afuera del agrupado.
 *
 * **Y éste sí se ordena**, a diferencia del balance de arriba: acá nadie
 * escribió una jerarquía que el orden pueda romper.
 */
export const InformeAgrupado: Story = {
  render: function Render() {
    const l = useLista();
    const [niveles] = useState(() => [{ field: "stage" }]);
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS}
            keyOf={(d) => d.id}
            sortable={ORDENABLES}
            sort={l.sort}
            onSortChange={l.setSort}
            present="report"
            group={{
              levels: l.grouping.levels.length > 0 ? l.grouping.levels : niveles,
              of: pileOf,
              collapsed: l.tree.collapsed,
              onToggle: l.tree.toggle,
            }}
            empty={{ sentence: "Nada que contar." }}
          >
            <List.Bar>
              <List.Crumbs
                crumbs={[{ label: "Ventas", onClick: () => {} }, { label: "Pedidos" }]}
              />
              <List.Identity title="Pedidos" description="contados por estado" />
              <List.Search>
                <SearchBar
                  facets={FACETAS}
                  criteria={l.criteria}
                  onCriteriaChange={l.setCriteria}
                  placeholder="buscar un pedido o un cliente…"
                  filters={FILTROS}
                  grouping={<GroupingLevels fields={AGRUPABLES} control={l.grouping} />}
                />
              </List.Search>
              <List.Pagination>
                <Pagination from={1} to={12} total={187} onNext={() => {}} />
              </List.Pagination>
            </List.Bar>

            {/* SIN `rows`: las líneas salen de los montones, con los agregados
                de las columnas de la tabla — el total suma y las líneas toman el
                máximo, igual que su pie. */}
            <List.Report
              columns={[
                { id: "total", header: "total", format: money },
                { id: "lines", header: "líneas (máx.)" },
              ]}
            />
            <List.Table<Item> columns={COLUMNAS} />
            <List.Rows<Item> row={(d) => ({ name: orderName(d) })} />
          </List>
        </div>
      </div>
    );
  },
};
