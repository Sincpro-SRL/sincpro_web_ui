/* The data and the pieces the stories of this folder share. Not a story file. */
import type { Record } from "@sincpro/web-ui";
import {
  Button,
  type CardWays,
  dateKey,
  GroupingLevels,
  type GroupLevel,
  List,
  type ListPresent,
  type ListSet,
  Metric,
  Metrics,
  Pagination,
  type Pile,
  pileFoot,
  PileFootLine,
  type PivotFold,
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
import { useState } from "react";

import { money } from "../../support/erp";
import {
  DATED_SALES,
  type DatedSale,
  type Delivery,
  ORDER_COUNTERS as COUNTERS,
  orderMeta,
  orderName,
  type Sale,
  SALES_ORDERS,
  type SalesOrder,
  STAGE_ICON as ICON,
  STAGE_LABEL as LABEL,
  STAGE_TONE as TONE,
  statementCell,
} from "../../support/erp-lists";

/** The set every story of this file looks at: twelve sales orders of a page of 187. */
export type Item = SalesOrder;
export const ITEMS = SALES_ORDERS;

export const FACETAS = [
  { id: "number", label: "en el número" },
  { id: "customer", label: "en el cliente" },
];

/** El mismo juego, con uno puesto: es lo que hace creíble el vacío por filtro. */
export const FILTROS_PUESTOS = [
  {
    label: "mostrar sólo",
    options: [
      { id: "quotation", label: "cotizaciones" },
      { id: "order", label: "pedidos" },
      { id: "invoiced", label: "facturados", checked: true },
    ],
  },
];

export const FILTROS = [
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
export const AGRUPABLES = [
  { field: "stage", label: "estado" },
  { field: "deliveries", label: "entregas" },
];

/** Por qué se puede ordenar. `value` dice cómo se lee el valor: con él ordena la
 *  vista; sin él, el orden viaja en la lectura y esto sólo lo refleja. */
export const ORDENABLES = [
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
export const ROTULO_EJE: Record<string, string> = {
  branch: "sucursal",
  year: "año",
  quarter: "trimestre",
};

export const PIVOTE_DE = (sale: Sale, level: GroupLevel): string =>
  level.field === "branch" ? sale.branch : level.field === "year" ? sale.year : sale.quarter;

export const IMPORTE: PivotFold<Sale> = {
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
export const pileOf = (item: Item, level: { field: string }): string =>
  level.field === "stage"
    ? LABEL[item.stage]
    : item.deliveries.length === 0
      ? "sin entregas"
      : "con entregas";

export const unidades = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

/** La fecha como se lee acá: día y mes, el año ya lo dice la barra. */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Una entrega colgando de su pedido. **No es otra `Row`**: no se abre, no se
 *  elige y no tiene acciones propias — tratarla como fila la haría prometer todo
 *  eso. La sangría y el filete los pone el sistema. */
export function Rama({ delivery }: { delivery: Delivery }) {
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

export function useLista() {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [todas, setTodas] = useState(false);
  const [present, setPresent] = useState<ListPresent>("rows");
  const grouping = useGroupingControl();
  const tree = useTreeControl();
  const [sort, setSort] = useState<SortState[]>([]);

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
      has: (id: string) => todas || elegidas.includes(id),
      toggle: (id: string) => {
        setTodas(false);
        setElegidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
      },
      /* The page shows 12 of 187: «Elegir los 187» makes the selection mean all of them. */
      count: todas ? 187 : elegidas.length,
      clear: () => {
        setTodas(false);
        setElegidas([]);
      },
      matching: { total: 187, onSelect: () => setTodas(true) },
    },
  };
}

/** La fila de un pedido, igual en todas las historias que la dibujan. */
export const filaDe = (d: Item) => ({
  icon: ICON[d.stage],
  name: orderName(d),
  tags: <Tag tone={TONE[d.stage]}>{LABEL[d.stage]}</Tag>,
  meta: orderMeta(d),
});

/** La tarjeta del tablero. */
/** The domain's own card. It answers a click the way the list decided — `ways.press` — instead
 *  of being a picture of a record that opens nothing. */
export function Tarjeta({ d, ways }: { d: Item; ways?: CardWays }) {
  const body = (
    <>
      <Tag tone={TONE[d.stage]}>{LABEL[d.stage]}</Tag>
      <span className="max-w-full truncate text-lead font-medium text-primary">
        {orderName(d)}
      </span>
      <span className="text-micro text-muted tabular-nums">{orderMeta(d)}</span>
    </>
  );
  const box =
    "flex min-w-0 flex-col items-start gap-2 rounded-box border border-line bg-surface p-4";
  return ways?.press === undefined ? (
    <div className={box}>{body}</div>
  ) : (
    <button
      type="button"
      onClick={ways.press}
      className={`${box} text-left transition-colors duration-(--duration-instant) hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
    >
      {body}
    </button>
  );
}

export const COLUMNAS = [
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
    decimals: 2,
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
export function Presentacion({
  present,
  groupBy,
}: {
  present: ListPresent;
  /** Opens grouped by these fields, until someone groups by others. */
  groupBy?: readonly string[];
}) {
  const l = useLista();
  const levels =
    l.grouping.levels.length > 0 || groupBy === undefined
      ? l.grouping.levels
      : groupBy.map((field) => ({ field }));
  return (
    <div className="bg-ground p-8">
      <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
        <List<Item>
          items={ITEMS}
          keyOf={(d) => d.id}
          group={{
            levels,
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
          <List.Board<Item> card={(d, ways) => <Tarjeta d={d} ways={ways} />} />
        </List>
      </div>
    </div>
  );
}

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
export type Celda = string | number | null;
export type Cruda = { i: number; celdas: readonly Celda[] };

export const COLUMNAS_CRUDAS: SheetColumn[] = [
  { id: "fecha", header: "fecha", type: "fecha" },
  { id: "glosa", header: "glosa", type: "texto" },
  { id: "referencia", header: "referencia", type: "identificador" },
  { id: "agencia", header: "agencia", type: "categoría" },
  { id: "canal", header: "canal", type: "categoría" },
  { id: "debe", header: "debe", type: "decimal", numeric: true, decimals: 2 },
  { id: "haber", header: "haber", type: "decimal", numeric: true, decimals: 2 },
];

export const CRUDAS: Cruda[] = Array.from({ length: 40_000 }, (_, i) => ({
  i,
  // Un faltante cada 37 (el banco no mandó el monto) y una celda VACÍA cada 53
  // (un movimiento sin referencia): son cosas distintas y la planilla las
  // distingue.
  celdas: COLUMNAS_CRUDAS.map((column) => statementCell(i, column.id)),
}));

/* ── La galería: cada forma de gráfico, sobre los datos de prueba ───────────────── */

export const ROTULO_VENTA: Record<string, string> = {
  branch: "sucursal",
  year: "año",
  quarter: "trimestre",
  payment: "forma de pago",
  date: "fecha",
  channel: "canal",
};

export const deVenta = (sale: Sale, level: GroupLevel): string =>
  level.field === "payment" ? sale.payment : PIVOTE_DE(sale, level);

export const deVentaFechada = (sale: DatedSale, level: GroupLevel): string =>
  level.field === "date"
    ? dateKey(sale.date, level.grain ?? "month")
    : level.field === "branch"
      ? sale.branch
      : level.field === "payment"
        ? sale.payment
        : sale.channel;

export const rotulo = (level: GroupLevel) => ROTULO_VENTA[level.field] ?? level.field;

/* What each tile can be re-split by, with the controls above its chart. */
export const CAMPOS_VENTA = [
  { field: "branch", label: "sucursal" },
  { field: "payment", label: "forma de pago" },
  { field: "year", label: "año" },
  { field: "quarter", label: "trimestre" },
];
export const CAMPOS_FECHADA = [
  { field: "date", label: "fecha", grains: ["month", "quarter", "year"] as const },
  { field: "branch", label: "sucursal" },
  { field: "payment", label: "forma de pago" },
  { field: "channel", label: "canal" },
];

export const bs = (n: number) =>
  `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;

export const SUMA_VENTA: PivotFold<Sale> = { ...IMPORTE, additive: true };
export const SUMA_FECHADA: PivotFold<DatedSale> = {
  id: "amount",
  header: "importe",
  additive: true,
  fold: (all) => (all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0)),
  format: bs,
};
export const PROMEDIO_FECHADA: PivotFold<DatedSale> = {
  id: "average",
  header: "ticket promedio",
  fold: (all) =>
    all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0) / all.length,
  format: bs,
};

export const DE_2026 = DATED_SALES.filter((sale) => sale.date.startsWith("2026"));
export const DE_2025 = DATED_SALES.filter((sale) => sale.date.startsWith("2025"));

/** One tile of the gallery: a list drawn as a chart, its title saying which form it is. */
export function Muestra<T extends object>({
  titulo,
  bajada,
  items,
  children,
}: {
  titulo: string;
  bajada: string;
  items: readonly T[];
  children: React.ReactNode;
}) {
  return (
    <div className="@container min-w-0 overflow-clip rounded-box border border-line-strong bg-surface">
      <List<T> items={items} keyOf={(one) => (one as { id: string }).id} present="chart">
        <List.Bar>
          <List.Identity title={titulo} description={bajada} />
        </List.Bar>
        {children}
      </List>
    </div>
  );
}

export type Tasa = {
  id: string;
  nombre: string;
  aplica: string;
  porcentaje: number | "";
  cuenta: string;
};

export const APLICA = [
  { value: "ventas", label: "ventas" },
  { value: "compras", label: "compras" },
];

export const CUENTAS = [
  { id: "2.1.03.01", name: "IVA débito fiscal", meta: "2.1.03.01" },
  { id: "1.1.05.01", name: "IVA crédito fiscal", meta: "1.1.05.01" },
  { id: "2.1.03.02", name: "IT por pagar", meta: "2.1.03.02" },
  { id: "2.1.03.05", name: "RC-IVA retenido", meta: "2.1.03.05" },
];

export const TASAS: Tasa[] = [
  { id: "t1", nombre: "IVA 13 %", aplica: "ventas", porcentaje: 13, cuenta: "2.1.03.01" },
  {
    id: "t2",
    nombre: "IVA 13 % compras",
    aplica: "compras",
    porcentaje: 13,
    cuenta: "1.1.05.01",
  },
  { id: "t3", nombre: "IT 3 %", aplica: "ventas", porcentaje: 3, cuenta: "2.1.03.02" },
];

/* ================================================================== *
 *  UNA LISTA DENTRO DE UN REGISTRO
 * ================================================================== */

/** Las columnas de los pedidos de un equipo. El total se ESCRIBE con su moneda en la
 *  celda (`cell`) y en el pie (`format`): son dos lugares, y el pie no tiene fila. */
export const COLUMNAS_DEL_EQUIPO = [
  { id: "number", header: "pedido", value: (d: Item) => d.number, mono: true },
  { id: "customer", header: "cliente", value: (d: Item) => d.customer },
  {
    id: "salesperson",
    header: "vendedor",
    value: (d: Item) => d.salesperson,
    optional: true,
  },
  { id: "date", header: "fecha", value: (d: Item) => d.date, optional: true },
  {
    id: "stage",
    header: "estado",
    value: (d: Item) => LABEL[d.stage],
    cell: (d: Item) => <Tag tone={TONE[d.stage]}>{LABEL[d.stage]}</Tag>,
    text: (d: Item) => LABEL[d.stage],
  },
  {
    id: "lines",
    header: "líneas",
    value: (d: Item) => d.lines,
    numeric: true as const,
    optional: true,
    defaultHidden: true,
  },
  {
    id: "total",
    header: "total",
    value: (d: Item) => d.total,
    cell: (d: Item) => money(d.total),
    text: (d: Item) => money(d.total),
    numeric: true as const,
    aggregate: "sum" as const,
    format: money,
  },
];

/** Quiénes venden en el equipo: lo que sale de los pedidos, sin repetir. */
export const MIEMBROS = [...new Set(ITEMS.map((d) => d.salesperson))].map((name) => ({
  id: name,
  name,
  orders: ITEMS.filter((d) => d.salesperson === name).length,
}));

/* ================================================================== *
 *  UNA PRESENTACIÓN PROPIA — `List.Present`.
 *
 *  El paquete dibuja nueve; la aplicación necesita la décima —un mapa, una
 *  galería, un plano—. Se escribe en el árbol como las otras, entra al
 *  conmutador en el orden en que se escribió, y dibuja el MISMO conjunto:
 *  ordenado por la barra, partido por el agrupado, con la selección y la regla
 *  de qué hace un toque. Lo que dibuja es suyo; la lista sólo le pasa el
 *  conjunto (`ListSet`).
 * ================================================================== */

/** The application's own presentation: one tile per order, under its pile when grouped.
 *  Everything it needs comes in `set`; it knows nothing of the bar, the sort or the
 *  grouping control. */
export function Galeria({ set }: { set: ListSet<Item> }) {
  const tile = (d: Item) => (
    <li
      key={set.keyOf(d)}
      className="flex items-start gap-2 rounded-box border border-line bg-surface p-3"
    >
      {set.selection === undefined ? null : (
        <input
          type="checkbox"
          aria-label={`Elegir ${orderName(d)}`}
          checked={set.selection.has(set.keyOf(d))}
          onChange={() => set.selection?.toggle(set.keyOf(d))}
        />
      )}
      <button
        type="button"
        onClick={() => set.press?.(d)}
        className="flex min-w-0 flex-col gap-1 text-left"
      >
        <span className="truncate text-meta font-medium text-primary">{orderName(d)}</span>
        <span className="text-micro text-muted tabular-nums">{money(d.total)}</span>
      </button>
    </li>
  );
  const tiles = (items: readonly Item[]) => (
    <ul aria-label="galería" className="grid gap-3 p-3 @2xl:grid-cols-3">
      {items.map(tile)}
    </ul>
  );
  if (set.piles === null) return tiles(set.items);
  return (
    <div className="flex flex-col">
      {set.piles.map((pile) => (
        <section key={pile.key} aria-label={pile.label}>
          <button
            type="button"
            aria-expanded={set.isOpen(pile)}
            onClick={() => set.toggle?.(pile)}
            className="px-3 pt-3 text-meta font-semibold text-ink"
          >
            {pile.label} · {pile.count}
          </button>
          {set.isOpen(pile) ? tiles(pile.items) : null}
          {/* A presentation of its own ends a short pile the way the list's do. */}
          {set.isOpen(pile) ? <GaleriaPie pile={pile} set={set} /> : null}
        </section>
      ))}
    </div>
  );
}

export function GaleriaPie({ pile, set }: { pile: Pile<Item>; set: ListSet<Item> }) {
  const foot = pileFoot(pile, set.more !== undefined);
  return foot === null ? null : (
    <div className="px-3 pb-3">
      <PileFootLine foot={foot} onMore={() => set.more?.(pile)} />
    </div>
  );
}

/** What the server counts per stage — the whole set, not the page. */
export const CONTADOS: Record<Item["stage"], number> = {
  quotation: 38,
  order: 96,
  invoiced: 53,
};
/** One press brings this many… */
export const PAGINA = 2;
/** …and a pile holds at most this many rows: past it the list asks to narrow the search. */
export const TOPE = 4;

export const POR_VARIOS = [
  { field: "date", label: "fecha", value: (one: Item) => one.date },
  { field: "customer", label: "cliente", value: (one: Item) => one.customer },
  { field: "salesperson", label: "vendedor", value: (one: Item) => one.salesperson },
  {
    field: "total",
    label: "total",
    value: (one: Item) => one.total,
    ascLabel: "de menor a mayor",
    descLabel: "de mayor a menor",
  },
];
