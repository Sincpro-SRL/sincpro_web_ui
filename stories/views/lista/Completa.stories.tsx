import {
  Button,
  GroupingLevels,
  List,
  type ListPresent,
  Metric,
  Metrics,
  Pagination,
  Record,
  SearchBar,
  SearchField,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { Users } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { money } from "../../support/erp";
import {
  ORDER_COUNTERS as COUNTERS,
  orderName,
  STAGE_LABEL as LABEL,
} from "../../support/erp-lists";
import type { Item } from "./shared";
import {
  AGRUPABLES,
  COLUMNAS,
  COLUMNAS_DEL_EQUIPO,
  FACETAS,
  filaDe,
  FILTROS,
  ITEMS,
  MIEMBROS,
  ORDENABLES,
  pileOf,
  Rama,
  Tarjeta,
  useLista,
} from "./shared";

const meta: Meta<typeof List<Item>> = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Lista/Completa",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Una lista de N registros con TODO puesto —barra, buscador, contadores, selección, paginación— y dónde puede vivir: una página, una barra oscura, un cajón, adentro de un registro.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof List<Item>>;

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: /^Elegir S00142/ }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Elegir los 187 que coinciden" }),
    );
    await expect(canvas.getByText("elegidos")).toHaveTextContent("187");
    await expect(canvas.queryByRole("button", { name: /que coinciden/ })).toBeNull();
  },
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
              header={{
                name: "pedido · cliente",
                meta: "líneas · fecha · total",
                tags: "estado",
              }}
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
                  decimals: 2,
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
            <List.Board<Item> card={(d, ways) => <Tarjeta d={d} ways={ways} />} />
          </List>
        </div>
      </div>
    );
  },
};

/**
 * **Leer o abrir.** La misma lista, dos contratos.
 *
 * A la izquierda `readOnly`: nada se toca — ni la fila se ilumina, ni hay casillas, ni
 * acciones. A la derecha, con `onPeek` y `onOpen`: la fila se ilumina, el clic en el cuerpo
 * da un VISTAZO sin salir de la lista, y al final de la fila los dos caminos están escritos
 * con su ícono — 👁 vista previa, ↗ abrir el registro. El azul del nombre queda para lo que
 * lleva a OTRO registro.
 */
export const LeerOAbrir: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const gesture = () => canvas.getByText(/^último gesto:/).parentElement!;
    const [readOnly, open] = canvas.getAllByText("S00140 · Ferretería El Progreso");
    await userEvent.click(readOnly!);
    await expect(gesture()).toHaveTextContent("ninguno");
    await userEvent.click(open!);
    await expect(gesture()).toHaveTextContent("vista previa · S00140");
    /* The ↗ of a row opens the record itself. */
    await userEvent.click(canvas.getAllByRole("button", { name: "Abrir" })[2]!);
    await expect(gesture()).toHaveTextContent("abrir · S00140");
  },
  render: function Render() {
    const [visto, setVisto] = useState<string | null>(null);
    const seis = ITEMS.slice(0, 6);
    const lista = (readOnly: boolean) => (
      <div className="@container min-w-0 flex-1 overflow-clip rounded-box border border-line-strong bg-surface p-4">
        <List<Item>
          embedded
          items={seis}
          keyOf={(d) => d.id}
          readOnly={readOnly}
          onPeek={(d) => setVisto(`vista previa · ${orderName(d)}`)}
          onOpen={(d) => setVisto(`abrir · ${orderName(d)}`)}
          present="table"
        >
          <List.Bar>
            <List.Identity title={readOnly ? "Solo lectura" : "Se abre"} />
          </List.Bar>
          <List.Table<Item> columns={COLUMNAS} />
        </List>
      </div>
    );
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="flex flex-wrap gap-4">
          {lista(true)}
          {lista(false)}
        </div>
        <p className="text-meta text-muted">
          último gesto: <span className="text-ink">{visto ?? "ninguno"}</span>
        </p>
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

/**
 * **Un one2many es la MISMA lista que la del módulo**, puesta adentro de una pestaña de
 * un registro: busca, ordena, elige columnas, selecciona y cambia de presentación —
 * tabla, filas, tablero y planilla— igual. Lo único que cambia es `embedded`.
 *
 * Con `embedded` la barra es **un solo renglón**: el buscador a la izquierda ocupando lo
 * que haya, cuántos son, y a la derecha el orden, las columnas y el conmutador. No dibuja
 * título ni migas —la pestaña y el riel del registro ya los dicen—, no se pega arriba al
 * scrollear —el registro tiene sus propias partes pegadas— y no se muda a la cabecera de
 * la aplicación cuando hay barra lateral.
 *
 * Probá: escribí «andina» en el buscador y mirá cómo cambia la cuenta; tildá dos filas y
 * mirá cómo la selección toma el lugar del buscador **en el mismo renglón**; prendé
 * «líneas» desde el menú de columnas; pasá a la planilla y fijate que el pie sigue
 * escribiendo «Bs.». La pestaña «miembros» es una lista embebida con UNA sola cara y sin
 * buscador: ahí no hay nada que ofrecer, y no se dibuja ninguna barra.
 *
 * Achicá la ventana: en un teléfono el buscador se queda con el primer renglón, los
 * controles bajan al segundo, y la tabla y la planilla dejan su lugar a filas y tablero.
 */
export const DentroDeUnRegistro: Story = {
  name: "Dentro de un registro",
  render: function Render() {
    const l = useLista();
    const [page, setPage] = useState("pedidos");
    const [query, setQuery] = useState("");
    const [present, setPresent] = useState<ListPresent>("table");
    const q = query.trim().toLocaleLowerCase("es-BO");
    const items = ITEMS.filter(
      (d) => q === "" || `${d.number} ${d.customer}`.toLocaleLowerCase("es-BO").includes(q),
    );
    return (
      <div className="bg-ground p-8">
        <Record
          identity={{
            icon: Users,
            title: "Corporativo · La Paz",
            tag: { label: "equipo de ventas", tone: "neutral" },
          }}
        >
          <Record.Rail>
            <Record.Crumbs
              crumbs={[
                { label: "Ventas", onClick: () => {} },
                { label: "Equipos", onClick: () => {} },
                { label: "Corporativo · La Paz" },
              ]}
            />
          </Record.Rail>
          <Record.Paper>
            <Record.Facts
              fields={[
                { label: "Líder del equipo", value: "Josefa Muñoz" },
                { label: "Meta del mes", value: money(250000) },
              ]}
            />
            <Record.Pages current={page} onChange={setPage}>
              <Record.Page id="pedidos" label="pedidos" count={ITEMS.length}>
                <List<Item>
                  embedded
                  items={items}
                  keyOf={(d) => d.id}
                  selection={l.selection}
                  sortable={ORDENABLES}
                  sort={l.sort}
                  onSortChange={l.setSort}
                  present={present}
                  onPresentChange={setPresent}
                  filtered={q !== ""}
                  onPeek={() => {}}
                  onOpen={() => {}}
                  empty={{ sentence: "Este equipo todavía no vendió nada." }}
                >
                  <List.Bar>
                    <List.Search>
                      <SearchField
                        value={query}
                        onChange={setQuery}
                        placeholder="Buscar un pedido o un cliente…"
                      />
                    </List.Search>
                  </List.Bar>
                  <List.Table<Item> columns={COLUMNAS_DEL_EQUIPO} totals />
                  <List.Rows<Item> row={filaDe} />
                  <List.Board<Item> card={(d, ways) => <Tarjeta d={d} ways={ways} />} />
                  <List.Sheet<Item> />
                </List>
              </Record.Page>
              <Record.Page id="miembros" label="miembros" count={MIEMBROS.length}>
                <List<(typeof MIEMBROS)[number]>
                  embedded
                  items={MIEMBROS}
                  keyOf={(m) => m.id}
                >
                  <List.Rows<(typeof MIEMBROS)[number]>
                    row={(m) => ({
                      name: m.name,
                      meta: `${m.orders} ${m.orders === 1 ? "pedido" : "pedidos"}`,
                    })}
                  />
                </List>
              </Record.Page>
            </Record.Pages>
          </Record.Paper>
        </Record>
      </div>
    );
  },
};
