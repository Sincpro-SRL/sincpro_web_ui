import {
  AppFrame,
  BarList,
  Board,
  BoardStat,
  type BoardState,
  BoardStats,
  BoardTile,
  Button,
  Chart,
  chartCompare,
  type ChartData,
  chartFromPivot,
  COUNT_MEASURE,
  type DataColumn,
  dateKey,
  Field,
  type GroupLevel,
  List,
  type PivotFold,
  pivotFrom,
  SegmentedControl,
  Select,
  TopBar,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Banknote, ChartColumn, Receipt, ShoppingCart, Store, X } from "lucide-react";
import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { BRANCHES, DATED_SALES, type DatedSale } from "../../support/erp-lists";

/**
 * Context: **a BI board** — Odoo's «Tableros» — built only from the package: `Board` puts the
 * filters in one row above every tile and the headline numbers before them, as `BoardStat`
 * tiles with the month-by-month shape beside each figure; each tile is a `Chart` (or a
 * `BarList` for a ranking) reading a `Pivot`, the same one the list's chart and pivot read;
 * a press on a branch opens the records under it as a `List`, inside the board.
 *
 * What it proves:
 *
 *   - **one slice for every tile**: the year and the branch are chosen once, above;
 *   - **the previous period beside the current one** (`chartCompare`), month against month,
 *     and as the change on each headline number (`Metric.change`) — against the SAME months
 *     of the year before, or ten months would be compared with twelve;
 *   - **time with its holes**: August 2025, when invoicing was down, is on the axis, empty;
 *   - **drill-down**: from a bar to its sales, without leaving the page.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Tableros/Ventas",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un tablero de BI hecho sólo con el paquete: los filtros en una fila arriba de todo, los números que se leen primero, y cada recuadro un gráfico sobre el mismo `Pivot` que leen la lista y el pivote. Compara con el año anterior, muestra los meses vacíos y una barra abre sus ventas.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const LABEL: Record<string, string> = {
  date: "fecha",
  branch: "sucursal",
  channel: "canal",
  payment: "forma de pago",
};

const of = (sale: DatedSale, level: GroupLevel): string =>
  level.field === "date"
    ? dateKey(sale.date, level.grain ?? "month")
    : level.field === "branch"
      ? sale.branch
      : level.field === "payment"
        ? sale.payment
        : sale.channel;

const bs = (n: number) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;

const AMOUNT: PivotFold<DatedSale> = {
  id: "amount",
  header: "vendido",
  additive: true,
  fold: (all) => (all.length === 0 ? null : all.reduce((sum, one) => sum + one.amount, 0)),
  format: bs,
};

const fold = (
  records: readonly DatedSale[],
  rows: GroupLevel[],
  columns: GroupLevel[] = [],
) =>
  pivotFrom(records, {
    rows,
    columns,
    of,
    measures: [AMOUNT],
    labelOf: (level) => LABEL[level.field] ?? level.field,
  });

const total = (records: readonly DatedSale[]) =>
  records.reduce((sum, one) => sum + one.amount, 0);

/** The change from before to now, or nothing when there was no before. */
const changeOf = (now: number, before: number, against: string) =>
  before === 0 ? undefined : { by: (now - before) / Math.abs(before), against };

const SALE_COLUMNS: DataColumn<DatedSale>[] = [
  { id: "date", header: "Fecha", value: (s) => s.date },
  { id: "branch", header: "Sucursal", value: (s) => s.branch },
  { id: "channel", header: "Canal", value: (s) => s.channel },
  { id: "payment", header: "Forma de pago", value: (s) => s.payment },
  {
    id: "amount",
    header: "Importe (Bs.)",
    value: (s) => s.amount,
    numeric: true,
    aggregate: "sum",
  },
];

/** What each reading of the board is doing — the application's to decide, web-ui's to draw. */
type Readings = { board?: BoardState; channel?: BoardState; quarter?: BoardState };

function SalesBoard({ readings = {} }: { readings?: Readings }) {
  const [year, setYear] = useState("2026");
  const [branch, setBranch] = useState("");
  const [drill, setDrill] = useState<string | null>(null);
  const before = String(Number(year) - 1);

  const slice = useMemo(() => {
    const inBranch = (sale: DatedSale) => branch === "" || sale.branch === branch;
    const current = DATED_SALES.filter(
      (sale) => sale.date.startsWith(year) && inBranch(sale),
    );
    /* The same months of the year before: October-to-date against October-to-date. */
    const months = new Set(current.map((sale) => sale.date.slice(5, 7)));
    const previous = DATED_SALES.filter(
      (sale) =>
        sale.date.startsWith(before) && inBranch(sale) && months.has(sale.date.slice(5, 7)),
    );
    return { current, previous };
  }, [year, branch, before]);

  const { current, previous } = slice;
  const charts = useMemo(() => {
    const byMonth = chartFromPivot(fold(current, [{ field: "date", grain: "month" }]));
    const monthly: ChartData =
      previous.length === 0
        ? byMonth
        : chartCompare(
            byMonth,
            chartFromPivot(fold(previous, [{ field: "date", grain: "month" }])),
            { current: year, previous: before },
            "position",
          );
    return {
      monthly,
      /* The shape of the year under each headline figure: month by month. */
      trend: byMonth.values.map((row) => row[0] ?? null),
      count: chartFromPivot(fold(current, [{ field: "date", grain: "month" }]), {
        measure: COUNT_MEASURE,
      }).values.map((row) => row[0] ?? null),
      byBranch: chartFromPivot(fold(current, [{ field: "branch" }]), { order: "desc" }),
      byChannel: chartFromPivot(fold(current, [{ field: "channel" }]), {
        measure: COUNT_MEASURE,
      }),
      byQuarter: chartFromPivot(
        fold(current, [{ field: "date", grain: "quarter" }], [{ field: "payment" }]),
      ),
    };
  }, [current, previous, year, before]);

  const sold = total(current);
  const soldBefore = total(previous);
  const ticket = current.length === 0 ? 0 : sold / current.length;
  const ticketBefore = previous.length === 0 ? 0 : soldBefore / previous.length;
  const drilled = drill === null ? [] : current.filter((sale) => sale.branch === drill);

  return (
    <Board
      {...(readings.board === undefined ? {} : { state: readings.board })}
      title="Ventas"
      description={`${year}${branch === "" ? ", todas las sucursales" : ` · ${branch}`}`}
      filters={
        <>
          <Field label="Año">
            <SegmentedControl
              size="sm"
              value={year}
              onChange={(next) => {
                setYear(next);
                setDrill(null);
              }}
              options={[
                { value: "2025", label: "2025" },
                { value: "2026", label: "2026" },
              ]}
            />
          </Field>
          <Field label="Sucursal">
            <Select
              value={branch}
              onChange={(next) => {
                setBranch(next);
                setDrill(null);
              }}
              placeholder="Todas"
              options={[
                { value: "", label: "Todas" },
                ...BRANCHES.map((one) => ({ value: one, label: one })),
              ]}
            />
          </Field>
        </>
      }
      metrics={
        <BoardStats>
          <BoardStat
            label="Vendido"
            icon={Banknote}
            hint="La suma de las ventas del año, contado y crédito."
            value={bs(sold)}
            trend={charts.trend}
            {...withChange(changeOf(sold, soldBefore, before))}
          />
          <BoardStat
            label="Ventas"
            icon={ShoppingCart}
            value={current.length}
            trend={charts.count}
            {...withChange(changeOf(current.length, previous.length, before))}
          />
          <BoardStat
            label="Ticket promedio"
            icon={Receipt}
            hint="Lo vendido dividido por la cantidad de ventas."
            value={bs(ticket)}
            {...withChange(changeOf(ticket, ticketBefore, before))}
          />
          <BoardStat
            label="Sucursales"
            icon={Store}
            value={new Set(current.map((sale) => sale.branch)).size}
            detail="con ventas en el año"
          />
        </BoardStats>
      }
    >
      <BoardTile
        title="Ventas por mes"
        description={
          previous.length === 0
            ? "no hay un año anterior con qué comparar"
            : `${year} contra ${before}, mes contra mes`
        }
        span={2}
      >
        <Chart data={charts.monthly} kind="line" label="Ventas por mes" />
      </BoardTile>
      <BoardTile title="Por sucursal" description="tocá una sucursal para ver sus ventas">
        <BarList
          data={charts.byBranch}
          label="Ventas por sucursal"
          onPoint={(category) => setDrill(category[0] ?? null)}
        />
      </BoardTile>
      <BoardTile
        title="Por canal"
        description="cuántas ventas entraron por cada uno"
        {...(readings.channel === undefined ? {} : { state: readings.channel })}
      >
        <Chart data={charts.byChannel} kind="pie" label="Ventas por canal" />
      </BoardTile>
      <BoardTile
        title="Contado y crédito"
        description="por trimestre"
        span={2}
        {...(readings.quarter === undefined ? {} : { state: readings.quarter })}
      >
        <Chart data={charts.byQuarter} stacked label="Contado y crédito por trimestre" />
      </BoardTile>
      {drill === null ? null : (
        <BoardTile
          title={`Ventas de ${drill}`}
          description={`${drilled.length} ventas en ${year}`}
          span="full"
          actions={
            <Button role="ghost" size="sm" icon={X} onClick={() => setDrill(null)}>
              Cerrar
            </Button>
          }
        >
          <List<DatedSale> items={drilled} keyOf={(sale) => sale.id} present="table" embedded>
            <List.Table<DatedSale> columns={SALE_COLUMNS} totals />
          </List>
        </BoardTile>
      )}
    </Board>
  );
}

/** `Metric.change` only when there is a before — a «vs 2024» with nothing behind it lies. */
function withChange(change: ReturnType<typeof changeOf>) {
  return change === undefined ? {} : { change };
}

function Page({ readings }: { readings?: Readings }) {
  return (
    <AppFrame
      menu={
        <TopBar
          app={{ label: "Ventas", icon: ChartColumn }}
          user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
        />
      }
    >
      <SalesBoard {...(readings === undefined ? {} : { readings })} />
    </AppFrame>
  );
}

/**
 * **El tablero.** Cambiá el año o la sucursal y todos los recuadros releen el mismo recorte.
 * Los números de arriba dicen cuánto cambió contra los MISMOS meses del año anterior; el de
 * meses dibuja 2025 en gris detrás de 2026. Tocá una sucursal y aparecen sus ventas abajo.
 */
export const Ventas: Story = {
  render: () => <Page />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Ventas", level: 1 }),
    ).toBeVisible();
    /* The comparison: against the same months of 2025. */
    await expect((await canvas.findAllByText("vs 2025")).length).toBeGreaterThan(0);
    /* Drill-down: a branch of «Por sucursal» opens its sales inside the board. */
    const region = await canvas.findByRole("region", { name: "Por sucursal" });
    await userEvent.click(within(region).getAllByRole("button")[0]!);
    await expect(await canvas.findByRole("heading", { name: /^Ventas de / })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Cerrar" }));
    await expect(canvas.queryByRole("heading", { name: /^Ventas de / })).toBeNull();
    /* 2025 has no year before it: no change, and the chart says so. */
    await userEvent.click(canvas.getByRole("radio", { name: "2025" }));
    await expect(
      await canvas.findByText("no hay un año anterior con qué comparar"),
    ).toBeVisible();
    await expect(canvas.queryByText("vs 2024")).toBeNull();
  },
};

/** A board where one reading failed and another is still on its way — the rest is drawn. */
function PartlyRead() {
  const [channel, setChannel] = useState<BoardState>({
    status: "failed",
    sentence: "El servidor de canales no respondió a tiempo. Probá de nuevo en un momento.",
    detail: "504 · canales/ventas?año=2026",
    onRetry: () => setChannel({ status: "ready" }),
  });
  return <Page readings={{ channel, quarter: { status: "loading" } }} />;
}

/**
 * **Un recuadro falla, otro todavía lee, y el resto se dibuja.** Cada recuadro es una
 * lectura y llega cuando llega: «Por canal» dice por qué no se pudo leer y ofrece
 * «Reintentar» (tocalo), «Contado y crédito» guarda el lugar del gráfico mientras lee, y los
 * otros dos ya muestran sus ventas. La grilla no salta: el estado ocupa el alto del gráfico.
 */
export const UnoFallaOtroLee: Story = {
  name: "Uno falla, otro lee",
  render: () => <PartlyRead />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const channel = await canvas.findByRole("region", { name: "Por canal" });
    await expect(within(channel).getByText("No se pudo leer «Por canal»")).toBeVisible();
    const quarter = canvas.getByRole("region", { name: "Contado y crédito" });
    await expect(quarter.getAttribute("aria-busy")).toBe("true");
    /* The others are drawn: their charts are there. */
    const monthly = canvas.getByRole("region", { name: "Ventas por mes" });
    await waitFor(() => expect(monthly.querySelector("svg")).not.toBeNull());
    /* Asking again draws the chart in the same place. */
    await userEvent.click(within(channel).getByRole("button", { name: "Reintentar" }));
    await expect(within(channel).queryByText("No se pudo leer «Por canal»")).toBeNull();
  },
};

/** **Los números del tablero no se pudieron leer.** La negativa ocupa el lugar de los números
 *  de arriba; los recuadros siguen con sus propias lecturas. */
export const SinSusNumeros: Story = {
  name: "Sin sus números",
  render: () => (
    <Page
      readings={{
        board: {
          status: "failed",
          sentence: "No tenés permiso para ver los totales de todas las sucursales.",
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("No se pudieron leer los números del tablero"),
    ).toBeVisible();
    await expect(canvas.queryByText("Vendido")).toBeNull();
    await expect(canvas.getByRole("region", { name: "Por sucursal" })).toBeVisible();
  },
};
