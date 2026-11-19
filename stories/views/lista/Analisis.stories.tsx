import {
  Button,
  COUNT_MEASURE,
  downloadPivot,
  GroupingLevels,
  type GroupLevel,
  List,
  Pagination,
  type PivotFold,
  pivotFrom,
  SearchBar,
  type SearchCriteria,
  useGroupingControl,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  BRANCHES,
  DATED_SALES,
  type DatedSale,
  type Sale,
  SALES,
} from "../../support/erp-lists";
import type { Item } from "./shared";
import {
  CAMPOS_FECHADA,
  CAMPOS_VENTA,
  DE_2025,
  DE_2026,
  deVenta,
  deVentaFechada,
  IMPORTE,
  Muestra,
  PIVOTE_DE,
  PROMEDIO_FECHADA,
  rotulo,
  ROTULO_EJE,
  SUMA_FECHADA,
  SUMA_VENTA,
} from "./shared";

const meta: Meta<typeof List<Item>> = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Lista/Análisis",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El pivote y el gráfico: las filas dejan de ser registros — una fila es un montón, y una barra también.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof List<Item>>;

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
 * **El pivote que se PIVOTEA.** Las filas siguen el agrupado del buscador —agregá «sucursal» o
 * «forma de pago» desde su panel—, las columnas y las medidas se eligen sobre la grilla («+»
 * agrega un campo, la × de un nivel lo saca, «Medidas» tilda cuáles), y el buscador recorta
 * las ventas que se pliegan: el pivote contesta la misma pregunta que la lista.
 */
export const PivoteExplorado: StoryObj<typeof List<Sale>> = {
  render: function Render() {
    const CAMPOS = [
      { field: "branch", label: "sucursal" },
      { field: "payment", label: "forma de pago" },
      { field: "year", label: "año" },
      { field: "quarter", label: "trimestre" },
    ];
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
    const grouping = useGroupingControl({ levels: [{ field: "branch" }] });
    const wanted = criteria
      .flatMap((one) =>
        one.kind === "filter" && one.selection !== undefined && "value" in one.selection
          ? [String(one.selection.value)]
          : [],
      )
      .map((v) => v.toLocaleLowerCase("es"));
    const ventas = SALES.filter((v) =>
      wanted.every((w) => v.branch.toLocaleLowerCase("es").includes(w)),
    );
    const de = (sale: Sale, level: GroupLevel): string =>
      level.field === "payment" ? sale.payment : PIVOTE_DE(sale, level);
    const CANTIDAD: PivotFold<Sale> = {
      id: "count",
      header: "ventas",
      fold: (all) => all.length,
    };
    const PROMEDIO: PivotFold<Sale> = {
      id: "average",
      header: "ticket promedio",
      fold: (all) =>
        all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0) / all.length,
      format: (n) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`,
    };
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-hidden rounded-box border border-line-strong bg-surface">
          <List<Sale>
            items={ventas}
            keyOf={(m) => m.id}
            present="pivot"
            group={{ levels: grouping.levels, of: de }}
            empty={{ sentence: "El período no tiene ventas." }}
          >
            <List.Bar>
              <List.Identity
                title="Análisis de ventas"
                description="pivoteá por sucursal, forma de pago, año y trimestre"
              />
              <List.Search>
                <SearchBar
                  facets={[{ id: "branch", label: "en la sucursal" }]}
                  criteria={criteria}
                  onCriteriaChange={setCriteria}
                  placeholder="buscar una sucursal…"
                  grouping={<GroupingLevels fields={CAMPOS} control={grouping} />}
                />
              </List.Search>
            </List.Bar>
            <List.Pivot<Sale>
              spec={{
                rows: [],
                columns: [{ field: "year" }],
                of: de,
                measures: [IMPORTE, CANTIDAD, PROMEDIO],
              }}
              fields={CAMPOS}
              defaultMeasures={["amount"]}
            />
          </List>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* Rows follow the search bar's grouping: «sucursal», and the pivot says so. */
    await expect(canvas.getByText("del agrupado del buscador")).toBeVisible();
    await expect(canvas.getAllByText("La Paz").length).toBeGreaterThan(0);
    /* A second measure, ticked on the grid. */
    await userEvent.click(canvas.getByRole("button", { name: "Medidas" }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: /^ventas/ }),
    );
    await expect(canvas.getAllByText("ventas").length).toBeGreaterThan(0);
  },
};

/**
 * **El GRÁFICO: la vista gráfica de Odoo.** Lee lo mismo que el pivote —las ventas, plegadas
 * con el mismo `spec`—, así que el número de una barra y el de un cruce nunca pueden decir
 * cosas distintas. Sus niveles siguen al agrupado del buscador: el primero es el eje y el
 * segundo las series (agregá «año» desde el panel del buscador y aparecen). Barras, líneas o
 * torta; la medida; apilado, acumulado y orden; y tocar una barra abre lo que cayó ahí.
 */
export const Grafico: StoryObj<typeof List<Sale>> = {
  render: function Render() {
    const CAMPOS = [
      { field: "branch", label: "sucursal" },
      { field: "payment", label: "forma de pago" },
      { field: "year", label: "año" },
      { field: "quarter", label: "trimestre" },
    ];
    const grouping = useGroupingControl({ levels: [{ field: "branch" }] });
    const [abierto, setAbierto] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<SearchCriteria[]>([]);
    const wanted = criteria
      .flatMap((one) =>
        one.kind === "filter" && one.selection !== undefined && "value" in one.selection
          ? [String(one.selection.value)]
          : [],
      )
      .map((v) => v.toLocaleLowerCase("es"));
    const ventas = SALES.filter((v) =>
      wanted.every((w) => v.branch.toLocaleLowerCase("es").includes(w)),
    );
    const de = (sale: Sale, level: GroupLevel): string =>
      level.field === "payment" ? sale.payment : PIVOTE_DE(sale, level);
    const IMPORTE_SUMA: PivotFold<Sale> = { ...IMPORTE, additive: true };
    const PROMEDIO: PivotFold<Sale> = {
      id: "average",
      header: "ticket promedio",
      fold: (all) =>
        all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0) / all.length,
      format: (n) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`,
    };
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Sale>
            items={ventas}
            keyOf={(m) => m.id}
            present="chart"
            group={{ levels: grouping.levels, of: de }}
            empty={{ sentence: "El período no tiene ventas." }}
          >
            <List.Bar>
              <List.Identity
                title="Ventas por sucursal"
                description={
                  abierto === null
                    ? "tocá una barra para abrir sus ventas"
                    : `abierto: ${abierto}`
                }
              />
              <List.Search>
                <SearchBar
                  facets={[{ id: "branch", label: "en la sucursal" }]}
                  criteria={criteria}
                  onCriteriaChange={setCriteria}
                  placeholder="buscar una sucursal…"
                  grouping={<GroupingLevels fields={CAMPOS} control={grouping} />}
                />
              </List.Search>
            </List.Bar>
            <List.Pivot<Sale>
              spec={{
                rows: [],
                columns: [{ field: "year" }],
                of: de,
                measures: [IMPORTE_SUMA, PROMEDIO],
              }}
              fields={CAMPOS}
            />
            <List.Chart<Sale>
              spec={{ rows: [], columns: [], of: de, measures: [IMPORTE_SUMA, PROMEDIO] }}
              fields={CAMPOS}
              onPoint={(category, series) =>
                setAbierto([...category, ...(series ?? [])].join(" · "))
              }
            />
          </List>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The levels follow the search bar's grouping, and the chart says so. */
    await expect(await canvas.findByText("del agrupado del buscador")).toBeVisible();
    /* No second level, no series control: one «del agrupado del buscador», not two. */
    await expect(canvas.queryByText("Series")).toBeNull();
    await expect(await canvas.findByText("La Paz")).toBeVisible();
    /* A bar opens what fell there. */
    const bar = canvasElement.querySelector(".recharts-bar-rectangle path");
    await expect(bar).not.toBeNull();
    await userEvent.click(bar!);
    await expect(await canvas.findByText("abierto: La Paz")).toBeVisible();
    /* Lines, then the pie: the same numbers, another form. */
    await userEvent.click(canvas.getByRole("radio", { name: "Torta" }));
    await expect(await canvas.findByText("La Paz")).toBeVisible();
  },
};

/**
 * **Todos los gráficos, sobre los datos de prueba.** Cada recuadro es una LISTA dibujada
 * como gráfico (`present="chart"`), con los mismos registros que miran el pivote y la
 * tabla. Lo que cambia entre uno y otro es cómo abre —`kind`, `stacked`, `cumulative`,
 * `order`, `compare`, `defaultMeasures`—, y todo eso lo puede cambiar después quien mira,
 * con los controles de arriba de cada gráfico.
 *
 * - **Barras**: una serie, un solo color, el número en la punta.
 * - **Agrupadas / apiladas**: el segundo agrupado son las series, al lado o una sobre otra.
 * - **Acostadas**: con muchas categorías o nombres largos se acuestan solas.
 * - **Líneas**: el tiempo en el eje, con el mes vacío (agosto 2025) DIBUJADO como hueco.
 * - **Comparado**: 2026 contra 2025, mes contra mes, el anterior en gris.
 * - **Área apilada y acumulado**: cuánto aporta cada sucursal, y cuánto llevamos.
 * - **Torta**: una sola totalidad, partida.
 * - **Varias medidas**: cada medida su propio gráfico, nunca dos escalas en un eje.
 */
export const TodosLosGraficos: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 bg-ground p-8 xl:grid-cols-2">
      <Muestra titulo="Barras" bajada="importe por sucursal, de mayor a menor" items={SALES}>
        <List.Chart<Sale>
          fields={CAMPOS_VENTA}
          spec={{
            rows: [{ field: "branch" }],
            columns: [],
            of: deVenta,
            labelOf: rotulo,
            measures: [SUMA_VENTA],
          }}
          order="desc"
        />
      </Muestra>
      <Muestra titulo="Barras agrupadas" bajada="sucursal × año, lado a lado" items={SALES}>
        <List.Chart<Sale>
          fields={CAMPOS_VENTA}
          spec={{
            rows: [{ field: "branch" }],
            columns: [{ field: "year" }],
            of: deVenta,
            labelOf: rotulo,
            measures: [SUMA_VENTA],
          }}
          stacked={false}
        />
      </Muestra>
      <Muestra
        titulo="Barras apiladas"
        bajada="contado y crédito, una sobre otra"
        items={SALES}
      >
        <List.Chart<Sale>
          fields={CAMPOS_VENTA}
          spec={{
            rows: [{ field: "branch" }],
            columns: [{ field: "payment" }],
            of: deVenta,
            labelOf: rotulo,
            measures: [SUMA_VENTA],
          }}
        />
      </Muestra>
      <Muestra
        titulo="Barras acostadas"
        bajada="veinte categorías: se acuestan solas"
        items={SALES}
      >
        <List.Chart<Sale>
          fields={CAMPOS_VENTA}
          spec={{
            rows: [{ field: "branch" }, { field: "quarter" }],
            columns: [],
            of: deVenta,
            labelOf: rotulo,
            measures: [SUMA_VENTA],
          }}
          order="desc"
        />
      </Muestra>
      <Muestra
        titulo="Líneas"
        bajada="por mes: agosto 2025 no tuvo ventas y igual está en el eje"
        items={DATED_SALES}
      >
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "date", grain: "month" }],
            columns: [],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA],
          }}
          kind="line"
        />
      </Muestra>
      <Muestra
        titulo="Comparado con el año anterior"
        bajada="2026 contra 2025, mes contra mes"
        items={DE_2026}
      >
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "date", grain: "month" }],
            columns: [],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA],
          }}
          kind="line"
          compare={{ current: "2026", previous: "2025", items: DE_2025, defaultOn: true }}
        />
      </Muestra>
      <Muestra
        titulo="Área apilada"
        bajada="lo que aporta cada sucursal, mes a mes"
        items={DATED_SALES}
      >
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "date", grain: "quarter" }],
            columns: [{ field: "branch" }],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA],
          }}
          kind="line"
        />
      </Muestra>
      <Muestra titulo="Acumulado" bajada="cuánto llevamos vendido en 2026" items={DE_2026}>
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "date", grain: "month" }],
            columns: [],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA],
          }}
          kind="line"
          cumulative
        />
      </Muestra>
      <Muestra
        titulo="Torta"
        bajada="ventas por canal: una totalidad, partida"
        items={DATED_SALES}
      >
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "channel" }],
            columns: [],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA],
          }}
          kind="pie"
          defaultMeasure={COUNT_MEASURE}
        />
      </Muestra>
      <Muestra
        titulo="Varias medidas"
        bajada="importe y ticket promedio: un gráfico por medida"
        items={DATED_SALES}
      >
        <List.Chart<DatedSale>
          fields={CAMPOS_FECHADA}
          spec={{
            rows: [{ field: "branch" }],
            columns: [],
            of: deVentaFechada,
            labelOf: rotulo,
            measures: [SUMA_FECHADA, PROMEDIO_FECHADA],
          }}
          defaultMeasures={["amount", "average"]}
        />
      </Muestra>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Barras agrupadas" }),
    ).toBeVisible();
    /* Every tile drew its chart (the lazy chunk arrives once for all of them). */
    await waitFor(
      () =>
        expect(
          canvasElement.querySelectorAll("svg.recharts-surface").length,
        ).toBeGreaterThanOrEqual(10),
      { timeout: 5000 },
    );
    /* The comparison names both periods on its legend. */
    await expect(
      (await canvas.findAllByRole("button", { name: "Esconder 2025" })).length,
    ).toBeGreaterThanOrEqual(2);
    /* Two measures, two charts, each one named. */
    await expect(canvas.getByRole("heading", { name: "ticket promedio" })).toBeVisible();
  },
};
