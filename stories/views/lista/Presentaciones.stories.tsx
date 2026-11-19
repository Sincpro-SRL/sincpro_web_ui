import {
  GroupingLevels,
  List,
  type ListPresent,
  Pagination,
  SearchBar,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { money } from "../../support/erp";
import {
  BALANCE_COLUMNS,
  BALANCE_ROWS,
  ORDER_COUNTERS as COUNTERS,
  orderName,
  STAGE_LABEL as LABEL,
} from "../../support/erp-lists";
import type { Cruda, Item } from "./shared";
import {
  AGRUPABLES,
  COLUMNAS,
  COLUMNAS_CRUDAS,
  CRUDAS,
  FACETAS,
  filaDe,
  FILTROS,
  ITEMS,
  ORDENABLES,
  pileOf,
  Presentacion,
  Tarjeta,
  useLista,
} from "./shared";

const meta: Meta<typeof List<Item>> = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Lista/Presentaciones",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El MISMO conjunto mirado de seis maneras —filas, tabla, tablero, planilla, informe y pivote—: la agrupación y el orden son del conjunto, la presentación es cómo se mira.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof List<Item>>;

/**
 * **Todas, con el conmutador puesto** —filas, tabla, tablero, planilla, informe, pivote y
 * gráfico—. Es el punto del arquetipo: lo de
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
            <List.Board<Item> card={(d, ways) => <Tarjeta d={d} ways={ways} />} />
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
            {/* And the same pivot, DRAWN: the orders by state, split by deliveries. */}
            <List.Chart<Item>
              spec={{
                rows: [{ field: "stage" }],
                columns: [{ field: "deliveries" }],
                of: pileOf,
                measures: [
                  {
                    id: "total",
                    header: "total",
                    additive: true,
                    fold: (items) =>
                      items.length === 0
                        ? null
                        : items.reduce((total, one) => total + one.total, 0),
                    format: money,
                  },
                ],
                labelOf: (level) => (level.field === "stage" ? "estado" : "entregas"),
              }}
              fields={AGRUPABLES}
            />
          </List>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The seventh face, on the same switcher: the set drawn. */
    await userEvent.click(await canvas.findByRole("button", { name: "Gráfico" }));
    await expect(await canvas.findByRole("radio", { name: "Barras" })).toBeVisible();
  },
};

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

/** **Filas en el ancho de un teléfono.** El nombre es lo que identifica el registro y se
 *  queda con su línea; el `meta` va debajo y el estado baja a una línea propia, en todas las
 *  filas por igual. Antes la columna de fichas guardaba su ancho y el nombre quedaba en «Pe…». */
export const FilasAngostas: Story = {
  name: "Filas · en 390 px",
  render: () => (
    <div style={{ width: 390 }}>
      <Presentacion present="rows" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const filas = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot="row"]')].slice(
      0,
      6,
    );
    await expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const nombre = fila.querySelector<HTMLElement>("[title]")?.parentElement;
      if (nombre === null || nombre === undefined) throw new Error("a row without its name");
      // The name keeps the line: more than half the row, not the leftovers of a tag column.
      await expect(nombre.getBoundingClientRect().width).toBeGreaterThan(
        fila.getBoundingClientRect().width / 2,
      );
    }
  },
};

/** Tabla: columnas alineadas, con footer de agregados. */
export const Tabla: Story = {
  render: () => <Presentacion present="table" />,
};

/**
 * **Tabla agrupada**: cada grupo dice lo que suma DEBAJO de su columna — «estado pedido 5 ·
 * 185.200,50 · máx 5» —, como la lista agrupada de Odoo, escrito igual que el pie. Si el grupo
 * lo cuenta el servidor, trae sus sumas (`Pile.totals`); si no, la tabla suma las filas cuando
 * las tiene todas. Los montos van con dos decimales, en las celdas, en los grupos y en el pie
 * (`decimals: 2`).
 */
export const TablaAgrupada: Story = {
  render: () => <Presentacion present="table" groupBy={["stage"]} />,
  play: async ({ canvasElement }) => {
    const piles = [...canvasElement.querySelectorAll('[data-ui="table.pile"]')];
    await expect(piles.length).toBe(3);
    const pedido = piles.find((row) => /pedido/.test(row.textContent ?? ""));
    // The pile's sum, under «total (Bs.)», and its max under «líneas».
    await expect(pedido?.textContent).toContain("185.200,50");
    await expect(pedido?.textContent).toContain("máx 5");
    // Every amount with its two decimals: a cell, not only the total.
    await expect(within(canvasElement).getByText("58.000,00")).toBeInTheDocument();
  },
};

/** Tablero: una tarjeta por registro. */
export const Tablero: Story = {
  render: () => <Presentacion present="board" />,
};

/**
 * **Tablero por etapas.** Una columna por etapa con cuántos tiene, y la tarjeta se ARRASTRA a
 * otra columna — el gesto es el cambio de etapa. Con el teclado: enfocar la tarjeta y
 * Alt + ← / →; el movimiento se anuncia. Sin `onMove` el tablero es de solo lectura.
 */
export const TableroPorEtapas: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lane = (name: string) => within(canvas.getByRole("region", { name }));
    lane("cotización").getAllByRole("listitem")[0]!.focus();
    await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
    await expect(lane("pedido").getAllByRole("listitem")).toHaveLength(6);
    await expect(canvasElement).toHaveTextContent("S00140 pasó a pedido");
  },
  render: function Render() {
    const [items, setItems] = useState<Item[]>(() => ITEMS.map((d) => ({ ...d })));
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Item> items={items} keyOf={(d) => d.id} present="board" onOpen={() => {}}>
            <List.Bar>
              <List.Identity title="Pedidos por etapa" />
            </List.Bar>
            <List.Rows<Item> row={filaDe} />
            <List.Board<Item>
              stages={{
                of: (d) => d.stage,
                columns: [
                  { id: "quotation", label: "cotización", tone: "neutral" },
                  { id: "order", label: "pedido", tone: "info" },
                  { id: "invoiced", label: "facturado", tone: "good" },
                ],
                nameOf: (d) => d.number,
                onMove: (d, to) =>
                  setItems((all) =>
                    all.map((one) =>
                      one.id === d.id ? { ...one, stage: to as Item["stage"] } : one,
                    ),
                  ),
              }}
            />
          </List>
        </div>
      </div>
    );
  },
};

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
