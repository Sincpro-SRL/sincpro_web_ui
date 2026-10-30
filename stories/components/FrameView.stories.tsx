import { type FrameColumn, frameFromRows, FrameView, Pagination } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PRICE_LIST } from "../support/erp-lists";

/* The columns of the supplier's file: the app read them, the design system only draws
   them. `código` is an identifier, `stock` and `costo` are numbers. */
const COLUMNS: FrameColumn[] = [
  { id: "codigo", header: "código", type: "identificador" },
  { id: "producto", header: "producto", type: "texto" },
  { id: "almacen", header: "almacén", type: "categoría" },
  { id: "stock", header: "stock", type: "entero", numeric: true },
  { id: "costo", header: "costo (Bs.)", type: "decimal", numeric: true },
];

const FRAME = frameFromRows(COLUMNS, PRICE_LIST);

const meta: Meta<typeof FrameView> = {
  title: "3 · Componentes/Datos/Marco · las celdas",
  component: FrameView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Las celdas de un payload, no N registros ni UN registro. **Tabla y gráfico son dos presentaciones del mismo rectángulo** — esconder una columna o graficar otra no cambia de arquetipo. El sistema de diseño no sabe qué es una lista de precios: la app mapea lo que importó a un `Frame`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FrameView>;

/**
 * El vistazo de la lista de precios que mandó un proveedor, recién importada:
 * filas × columnas, con el recuento abajo. Un costo que no vino es un faltante y
 * un almacén en blanco es una celda vacía — no son lo mismo.
 * Cambiá a gráfico y elegí `almacén` o `costo` en «serie».
 */
export const Tabla: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <FrameView
        frame={FRAME}
        identity={{ title: "lista de precios · Ferretería El Progreso" }}
        pagination={
          <Pagination
            from={1}
            to={PRICE_LIST.length}
            total={412}
            pageSize={PRICE_LIST.length}
          />
        }
        caption={
          <span className="text-meta text-muted tabular-nums">
            {PRICE_LIST.length} de 412 productos
          </span>
        }
      />
    </div>
  ),
};

/** La misma matriz, leída como barras: histograma si la columna es numérica. */
export const Grafico: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <FrameView
        frame={FRAME}
        identity={{ title: "lista de precios · Ferretería El Progreso" }}
        present="chart"
        chartColumn="costo"
      />
    </div>
  ),
};
