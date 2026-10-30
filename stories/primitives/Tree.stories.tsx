import { DensityProvider, Tree, type TreeItem } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Boxes, Hammer, Package, PaintBucket, Plug, Warehouse } from "lucide-react";
import { useState } from "react";

/* ==================================================================== *
 *  THE DATA — a chart of accounts with its balances, product categories, and
 *  the locations of a warehouse. Records whose place is part of what they are.
 * ==================================================================== */

/* The groups are VIEW accounts: they total the ones below and take no entries, so they are
   `disabled` — they fold and show their balance, but a journal line cannot be posted to them. */
const PLAN: TreeItem[] = [
  {
    id: "1",
    label: "1 Activo",
    meta: "Bs. 1.524.380,40",
    disabled: true,
    children: [
      {
        id: "1.1",
        label: "1.1 Activo corriente",
        meta: "Bs. 981.204,90",
        disabled: true,
        children: [
          { id: "1.1.01", label: "1.1.01 Caja", meta: "Bs. 4.500,00" },
          { id: "1.1.02", label: "1.1.02 Bancos", meta: "Bs. 386.120,50" },
          { id: "1.1.03", label: "1.1.03 Cuentas por cobrar", meta: "Bs. 412.330,40" },
          { id: "1.1.04", label: "1.1.04 Inventarios", meta: "Bs. 178.254,00" },
        ],
      },
      {
        id: "1.2",
        label: "1.2 Activo no corriente",
        meta: "Bs. 543.175,50",
        disabled: true,
        children: [
          { id: "1.2.01", label: "1.2.01 Muebles y enseres", meta: "Bs. 48.900,00" },
          { id: "1.2.02", label: "1.2.02 Vehículos", meta: "Bs. 412.000,00" },
          { id: "1.2.03", label: "1.2.03 Equipos de computación", meta: "Bs. 82.275,50" },
        ],
      },
    ],
  },
  {
    id: "2",
    label: "2 Pasivo",
    meta: "Bs. 612.040,00",
    disabled: true,
    children: [
      {
        id: "2.1",
        label: "2.1 Pasivo corriente",
        meta: "Bs. 612.040,00",
        disabled: true,
        children: [
          { id: "2.1.01", label: "2.1.01 Cuentas por pagar", meta: "Bs. 301.440,00" },
          { id: "2.1.02", label: "2.1.02 Impuestos por pagar", meta: "Bs. 96.600,00" },
          { id: "2.1.03", label: "2.1.03 Sueldos por pagar", meta: "Bs. 214.000,00" },
        ],
      },
    ],
  },
  {
    id: "3",
    label: "3 Patrimonio",
    meta: "Bs. 912.340,40",
    disabled: true,
    children: [
      { id: "3.1.01", label: "3.1.01 Capital social", meta: "Bs. 700.000,00" },
      { id: "3.1.02", label: "3.1.02 Resultados acumulados", meta: "Bs. 212.340,40" },
    ],
  },
];

const CATEGORIAS: TreeItem[] = [
  {
    id: "construccion",
    label: "Construcción",
    icon: Hammer,
    meta: "412",
    children: [
      { id: "construccion.cementos", label: "Cementos", meta: "18" },
      {
        id: "construccion.fierros",
        label: "Fierros y aceros",
        meta: "64",
        children: [
          { id: "construccion.fierros.corrugado", label: "Fierro corrugado", meta: "22" },
          { id: "construccion.fierros.perfiles", label: "Perfiles", meta: "42" },
        ],
      },
      { id: "construccion.ladrillos", label: "Ladrillos y bloques", meta: "37" },
    ],
  },
  {
    id: "electricidad",
    label: "Electricidad",
    icon: Plug,
    meta: "286",
    children: [
      { id: "electricidad.cables", label: "Cables", meta: "120" },
      { id: "electricidad.tableros", label: "Tableros", meta: "31" },
    ],
  },
  {
    id: "pinturas",
    label: "Pinturas",
    icon: PaintBucket,
    meta: "97",
    children: [
      { id: "pinturas.latex", label: "Látex", meta: "40" },
      { id: "pinturas.esmaltes", label: "Esmaltes", meta: "57" },
    ],
  },
  { id: "varios", label: "Varios", icon: Package, meta: "15" },
];

const UBICACIONES: TreeItem[] = [
  {
    id: "CEN",
    label: "Almacén Central",
    icon: Warehouse,
    children: [
      {
        id: "CEN/A",
        label: "Pasillo A",
        children: [
          { id: "CEN/A/01", label: "Estante A-01", meta: "82 %" },
          { id: "CEN/A/02", label: "Estante A-02", meta: "40 %" },
        ],
      },
      {
        id: "CEN/B",
        label: "Pasillo B",
        children: [{ id: "CEN/B/01", label: "Estante B-01", meta: "100 %" }],
      },
      { id: "CEN/REC", label: "Recepción", icon: Boxes, meta: "12 %" },
    ],
  },
  {
    id: "ALT",
    label: "Almacén El Alto",
    icon: Warehouse,
    children: [{ id: "ALT/01", label: "Patio de fierros", meta: "65 %" }],
  },
];

const NOMBRES = new Map(
  [...PLAN, ...CATEGORIAS, ...UBICACIONES].flatMap(function all(item): [string, string][] {
    return [[item.id, item.label], ...(item.children ?? []).flatMap(all)];
  }),
);

const meta = {
  title: "2 · Primitivas/Árbol",
  component: Tree,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Una jerarquía de REGISTROS que se lee y de la que se elige: el plan de cuentas, las categorías de productos, las ubicaciones de un almacén. Cada fila es un registro con su cifra a la derecha (un saldo, una cantidad); los grupos se pliegan. No es el menú de la aplicación — para eso está `NavigationTree`. El teclado es el de React Aria: flechas para recorrer, → abre un grupo y ← lo pliega, y escribir el nombre salta a la fila.",
      },
    },
  },
} satisfies Meta<typeof Tree>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El plan de cuentas con sus saldos. Las cuentas de grupo suman las de abajo y no reciben
 *  asientos, así que no se eligen — pero se pliegan y dicen su saldo igual. Hacé doble clic o
 *  Enter en una cuenta para abrirla; probá escribir «ban» para saltar a Bancos. */
export const PlanDeCuentas: Story = {
  args: { items: PLAN, label: "Plan de cuentas" },
  render: function Render() {
    const [abierta, setAbierta] = useState<string | null>(null);
    const [cuenta, setCuenta] = useState<string[]>(["1.1.02"]);
    return (
      <div className="flex max-w-xl flex-col gap-2">
        <div className="rounded-box border border-line bg-surface p-2">
          <Tree
            items={PLAN}
            label="Plan de cuentas"
            defaultExpanded={["1", "1.1", "2"]}
            selectionMode="single"
            selected={cuenta}
            onSelectedChange={setCuenta}
            onAction={setAbierta}
          />
        </div>
        <p className="text-micro text-muted">
          {abierta === null
            ? "Ninguna cuenta abierta todavía."
            : `Abriste «${NOMBRES.get(abierta) ?? abierta}».`}
        </p>
      </div>
    );
  },
};

/** Elegir UNA categoría para un producto: un clic elige, y la fila elegida lo dice con el tinte
 *  y con la marca — no con el color solo. */
export const CategoriasDeProductos: Story = {
  args: { items: CATEGORIAS, label: "Categorías de productos" },
  render: function Render() {
    const [categoria, setCategoria] = useState<string[]>(["construccion.fierros.corrugado"]);
    return (
      <div className="flex max-w-md flex-col gap-2">
        <div className="rounded-box border border-line bg-surface p-2">
          <Tree
            items={CATEGORIAS}
            label="Categorías de productos"
            defaultExpanded={["construccion", "construccion.fierros"]}
            selectionMode="single"
            selected={categoria}
            onSelectedChange={setCategoria}
          />
        </div>
        <p className="text-micro text-muted">
          Categoría: {categoria.map((id) => NOMBRES.get(id) ?? id).join(", ") || "ninguna"}
        </p>
      </div>
    );
  },
};

/** Varias ubicaciones a la vez — para un conteo de inventario, por ejemplo. Con muchas, cada
 *  fila lleva su casilla: el clic en la fila abre o pliega, la casilla es la que elige. En un
 *  panel angosto la densidad compacta aprieta las filas sin tocar el árbol. */
export const UbicacionesCompacto: Story = {
  args: { items: UBICACIONES, label: "Ubicaciones" },
  render: function Render() {
    const [ubicaciones, setUbicaciones] = useState<string[]>(["CEN/A/01", "CEN/A/02"]);
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <div className="rounded-box border border-line bg-surface p-2">
          <DensityProvider value="compact">
            <Tree
              items={UBICACIONES}
              label="Ubicaciones a contar"
              defaultExpanded={["CEN", "CEN/A"]}
              selectionMode="multiple"
              selected={ubicaciones}
              onSelectedChange={setUbicaciones}
            />
          </DensityProvider>
        </div>
        <p className="text-micro text-muted">
          {ubicaciones.length} ubicaciones elegidas para el conteo.
        </p>
      </div>
    );
  },
};

/** Sin registros, el árbol lo dice con la tabla de textos — o con lo que la pantalla le pase,
 *  si tiene algo más cercano a su dominio que decir. */
export const Vacio: Story = {
  args: { items: [], label: "Categorías de productos" },
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <div className="rounded-box border border-line bg-surface p-2">
        <Tree items={[]} label="Categorías de productos" />
      </div>
      <div className="rounded-box border border-line bg-surface p-2">
        <Tree
          items={[]}
          label="Ubicaciones"
          empty="Este almacén todavía no tiene ubicaciones."
        />
      </div>
    </div>
  ),
};
