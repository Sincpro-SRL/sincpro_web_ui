import type { Record } from "@sincpro/web-ui";
import {
  Button,
  compareBy,
  List,
  type ListPresent,
  NumberInput,
  Picker,
  type Pile,
  Select,
  type SortState,
  TextInput,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { orderName, STAGE_LABEL as LABEL } from "../../support/erp-lists";
import type { Item, Tasa } from "./shared";
import {
  APLICA,
  COLUMNAS,
  CONTADOS,
  CUENTAS,
  filaDe,
  ITEMS,
  PAGINA,
  POR_VARIOS,
  TASAS,
  TOPE,
} from "./shared";

const meta: Meta<typeof List<Item>> = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Lista/Ordenar, agrupar y editar",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Lo que se le hace al conjunto: ordenar por varios campos, agrupar en el servidor, editar en la grilla.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof List<Item>>;

/**
 * **Ordenar por varios campos.** Por fecha, en la misma fecha por cliente, y después por
 * vendedor: el segundo criterio sólo decide entre las filas que el primero deja iguales.
 *
 * Dos puertas al MISMO orden. En la tabla, clic en un encabezado ordena sólo por esa columna
 * y **Mayús+clic la agrega como desempate** — cada encabezado ordenado lleva su lugar (1, 2,
 * 3) junto a la flecha. En la barra, «Ordenar» abre la lista entera: se agrega un criterio, se
 * invierte, se quita o se arrastra para cambiar cuál manda (con el teclado, desde el asa:
 * Enter, flechas, Enter). Cambiar a filas conserva el orden: es del conjunto.
 */
export const OrdenarPorVarios: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = (name: string) =>
      canvas.getByRole("columnheader", { name: new RegExp(name) });

    /* Clic: sólo esa columna. */
    await userEvent.click(within(header("fecha")).getByRole("button"));
    await expect(header("fecha")).toHaveAttribute("aria-sort", "ascending");

    /* Mayús+clic: un desempate, que dice su lugar. */
    /* One `user` keeps the key held between the calls; the bare helpers start fresh. */
    const user = userEvent.setup();
    await user.keyboard("{Shift>}");
    await user.click(within(header("cliente")).getByRole("button"));
    await user.keyboard("{/Shift}");
    await expect(within(header("cliente")).getByRole("button")).toHaveAccessibleName(
      /orden 2, ascendente/,
    );
    await expect(header("fecha")).toHaveAttribute("aria-sort", "ascending");

    /* La barra cuenta los dos, y agrega un tercero. */
    await userEvent.click(canvas.getByRole("button", { name: /fecha \+1/ }));
    const panel = within(await within(document.body).findByRole("dialog"));
    await expect(panel.getAllByRole("row")).toHaveLength(2);
    await userEvent.click(panel.getByRole("button", { name: /Agregar criterio/ }));
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "vendedor" }),
    );
    await expect(panel.getAllByRole("row")).toHaveLength(3);
    await expect(canvas.getByTestId("orden")).toHaveTextContent(
      "date asc · customer asc · salesperson asc",
    );

    /* Invertir el primero, en su lugar. */
    await userEvent.click(panel.getByRole("button", { name: /Invertir el orden por fecha/ }));
    await expect(canvas.getByTestId("orden")).toHaveTextContent(
      "date desc · customer asc · salesperson asc",
    );

    /* Las filas quedaron en ese orden: la primera es la que el mismo criterio pone primero. */
    const first = [...ITEMS].sort(
      compareBy<Item>(
        [
          { key: "date", direction: "desc" },
          { key: "customer", direction: "asc" },
          { key: "salesperson", direction: "asc" },
        ],
        (key) => POR_VARIOS.find((one) => one.field === key)?.value,
      ),
    )[0]!;
    await expect(canvas.getAllByRole("row")[1]).toHaveTextContent(orderName(first));

    /* Quitar uno. */
    await userEvent.click(panel.getByRole("button", { name: /Quitar el orden por cliente/ }));
    await expect(canvas.getByTestId("orden")).toHaveTextContent(
      "date desc · salesperson asc",
    );
  },
  render: function Render() {
    const [sort, setSort] = useState<SortState[]>([]);
    const [present, setPresent] = useState<ListPresent>("table");
    return (
      <div className="flex flex-col gap-3 bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={ITEMS.slice(0, 24)}
            keyOf={(d) => d.id}
            present={present}
            onPresentChange={setPresent}
            sort={sort}
            onSortChange={setSort}
            sortable={POR_VARIOS}
          >
            <List.Bar>
              <List.Identity title="Pedidos" />
            </List.Bar>
            <List.Table<Item>
              columns={[
                {
                  id: "name",
                  header: "pedido",
                  value: (d: Item) => orderName(d),
                  sortable: false,
                },
                { id: "date", header: "fecha", value: (d: Item) => d.date },
                { id: "customer", header: "cliente", value: (d: Item) => d.customer },
                { id: "salesperson", header: "vendedor", value: (d: Item) => d.salesperson },
                {
                  id: "total",
                  header: "total (Bs.)",
                  value: (d: Item) => d.total,
                  numeric: true,
                },
              ]}
            />
            <List.Rows<Item>
              header={{
                name: "pedido · cliente",
                meta: "líneas · fecha · total",
                tags: "estado",
              }}
              row={filaDe}
            />
          </List>
        </div>
        <p className="text-micro text-muted">
          el orden que recibe la aplicación:{" "}
          <code data-testid="orden" className="font-mono text-ink">
            {sort.length === 0
              ? "como llegaron"
              : sort.map((one) => `${one.key} ${one.direction}`).join(" · ")}
          </code>
        </p>
      </div>
    );
  },
};

/**
 * **Agrupado en el servidor: el botón dice lo que trae.** Cada montón llega contado entero
 * —«96»— con su primera página. El botón no promete los 94 que faltan: dice cuántos trae
 * una vez («Ver 2 más de 94»), porque eso es lo que pasa al tocarlo. Y cuando el montón
 * llega al tope de filas que la aplicación guarda (`more: false`), el botón se va y el
 * montón dice cuántas muestra de cuántas cuenta — un botón que no hace nada era el bug.
 */
export const AgrupadoEnElServidor: Story = {
  render: function Render() {
    const [shown, setShown] = useState<Record<string, number>>({});
    const piles: Pile<Item>[] = (["quotation", "order", "invoiced"] as const).map((stage) => {
      const held = ITEMS.filter((d) => d.stage === stage);
      const limit = Math.min(TOPE, held.length);
      const count = shown[stage] ?? PAGINA;
      const next = Math.min(PAGINA, limit - count);
      return {
        path: [stage],
        depth: 0,
        field: "stage",
        key: stage,
        label: LABEL[stage],
        count: CONTADOS[stage],
        items: held.slice(0, count),
        piles: [],
        more: next > 0 ? next : false,
      };
    });
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Item>
            items={piles.flatMap((p) => p.items)}
            keyOf={(d) => d.id}
            group={{
              levels: [{ field: "stage" }],
              of: (d) => d.stage,
              piles,
              onMore: (pile) =>
                setShown((now) => ({
                  ...now,
                  [pile.key]: (now[pile.key] ?? PAGINA) + (pile.more || 0),
                })),
            }}
          >
            <List.Bar>
              <List.Identity title="Pedidos por estado" />
            </List.Bar>
            <List.Rows<Item> row={filaDe} />
            <List.Table<Item> columns={COLUMNAS} />
          </List>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* «order» counts 96 and holds 2: one press brings 2 of the 94 left. */
    await userEvent.click(canvas.getByRole("button", { name: "Ver 2 más de 94" }));
    /* Four held — the cap: no button that does nothing, the pile says what it shows. */
    await expect(canvas.getByText("Se muestran 4 de 96")).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /de 92/ })).toBeNull();
  },
};

/**
 * **Una lista que se escribe.** La lista editable de Odoo para una tabla de configuración:
 * «Agregar» —abajo, o «Nueva tasa» en la barra— pone una fila con un control en cada columna
 * que declaró `input`, con el cursor en el nombre. `Tab` recorre la fila y, pasado el último
 * campo, guarda la tasa y empieza otra; `Enter` guarda; `Escape` la descarta, y una fila que
 * se deja sin escribir se va sola. Una tasa sin nombre no se guarda: la fila se queda.
 *
 * Las tasas que ya existen no se tocan acá: la lista no pierde el orden, la selección ni las
 * columnas que se esconden, que una tabla editada fila por fila no tiene.
 */
export const ListaEditable: Story = {
  render: function Render() {
    const [tasas, setTasas] = useState<Tasa[]>(TASAS);
    const [draft, setDraft] = useState<Tasa | null>(null);
    const [siguiente, setSiguiente] = useState(4);
    const create = {
      draft,
      label: "Agregar una tasa",
      onStart: () => {
        setDraft({
          id: `t${siguiente}`,
          nombre: "",
          aplica: "ventas",
          porcentaje: "",
          cuenta: "",
        });
        setSiguiente((n) => n + 1);
      },
      onChange: setDraft,
      onCommit: (t: Tasa) => {
        if (t.nombre.trim() === "") return;
        setTasas((all) => [...all, t]);
        setDraft(null);
      },
      onCancel: () => setDraft(null),
    };
    return (
      <div className="bg-ground p-8">
        <div className="@container overflow-clip rounded-box border border-line-strong bg-surface">
          <List<Tasa>
            items={tasas}
            keyOf={(t) => t.id}
            present="table"
            empty={{ sentence: "Todavía no hay tasas de impuesto." }}
          >
            <List.Bar>
              <List.Identity
                title="Impuestos"
                description="las tasas que se aplican a ventas y compras"
              />
              <List.Actions>
                <Button
                  role="primary"
                  size="sm"
                  onClick={create.onStart}
                  disabled={draft !== null}
                >
                  Nueva tasa
                </Button>
              </List.Actions>
            </List.Bar>
            <List.Rows<Tasa> row={(t) => ({ name: t.nombre })} />
            <List.Table<Tasa>
              create={create}
              columns={[
                {
                  id: "nombre",
                  header: "nombre",
                  value: (t: Tasa) => t.nombre,
                  input: (t: Tasa, set: (next: Tasa) => void) => (
                    <TextInput
                      aria-label="Nombre"
                      value={t.nombre}
                      onChange={(v) => set({ ...t, nombre: v })}
                    />
                  ),
                },
                {
                  id: "aplica",
                  header: "aplica a",
                  value: (t: Tasa) => t.aplica,
                  input: (t: Tasa, set: (next: Tasa) => void) => (
                    <Select
                      aria-label="Aplica a"
                      value={t.aplica}
                      options={APLICA}
                      onChange={(v) => set({ ...t, aplica: v })}
                    />
                  ),
                },
                {
                  id: "porcentaje",
                  header: "%",
                  numeric: true,
                  width: 120,
                  value: (t: Tasa) => (t.porcentaje === "" ? null : t.porcentaje),
                  input: (t: Tasa, set: (next: Tasa) => void) => (
                    <NumberInput
                      aria-label="Porcentaje"
                      value={t.porcentaje}
                      min={0}
                      max={100}
                      onChange={(v) => set({ ...t, porcentaje: v })}
                    />
                  ),
                },
                {
                  id: "cuenta",
                  header: "cuenta contable",
                  value: (t: Tasa) => CUENTAS.find((c) => c.id === t.cuenta)?.name ?? "",
                  input: (t: Tasa, set: (next: Tasa) => void) => (
                    <Picker
                      aria-label="Cuenta contable"
                      items={CUENTAS}
                      value={t.cuenta}
                      onChange={(id) => set({ ...t, cuenta: id })}
                      placeholder="Buscá la cuenta o su código…"
                    />
                  ),
                },
              ]}
            />
          </List>
        </div>
      </div>
    );
  },
};
