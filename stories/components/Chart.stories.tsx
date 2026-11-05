import { columnSeries, type FrameColumn, frameFromRows, SeriesChart } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Context: **la forma de UNA columna** —«cómo se reparten sus valores»—, la pregunta que en
 * un ERP se hace todo el tiempo (¿de qué ciudad vienen las ventas?, ¿son muchas chicas o
 * pocas grandes?).
 *
 * ── Lo que ya NO es ─────────────────────────────────────────────────
 *
 * Era su propio dibujo: barras de progreso de 6 px estiradas a lo ancho, el número a 1.200 px
 * de su barra, y un tramo vacío dibujado con un trocito como si tuviera filas. Ahora es el
 * mismo `Chart` que usa todo conjunto, y la pregunta más amplia —partir por un campo y medir,
 * con barras, líneas o torta— es de `ChartExplorer`, la vista gráfica de la lista y del marco
 * (ver «2 · Primitivas/Gráfico»).
 *
 * ── Y por eso los datos entran como SERIE y no como frame ───────────
 *
 * `SeriesBar` es `{ label, count, bin? }`. Quien sabe cómo se agrupa una columna es
 * `columnSeries`, que además decide los cortes: una columna numérica se reparte en tramos de
 * bordes redondos y una categórica se cuenta por valor, juntando la cola en «otros». Esas
 * decisiones son del dominio del dato, no del dibujo — por eso el gráfico no las toma.
 */
const meta: Meta<typeof SeriesChart> = {
  title: "3 · Componentes/Datos/Serie · la forma de una columna",
  component: SeriesChart,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La forma de UNA columna: no muestra cada fila, las CUENTA — tramos redondos si es numérica, los valores más frecuentes (y «otros») si es texto. Dibujada con el mismo `Chart` de todo conjunto.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const COLUMNAS: FrameColumn[] = [
  { id: "ciudad", header: "ciudad", type: "categórica" },
  { id: "importe", header: "importe", type: "decimal", numeric: true },
  { id: "canal", header: "canal", type: "categórica" },
];

const CIUDADES = ["Santa Cruz", "La Paz", "Cochabamba", "Sucre", "Tarija", "Oruro"];
const CANALES = ["mostrador", "vendedor en ruta", "tienda en línea"];

/* Determinista: una historia que cambia en cada render no sirve para comparar
   dos versiones del componente. */
function pseudo(row: number, col: number): number {
  return ((row * 2654435761 + col * 40503) >>> 0) / 4294967295;
}

const FILAS = Array.from({ length: 600 }, (_, i) => [
  CIUDADES[Math.floor(pseudo(i, 1) * CIUDADES.length)] ?? "—",
  Math.round(pseudo(i, 2) ** 2 * 9000 + 200),
  CANALES[Math.floor(pseudo(i, 3) * CANALES.length)] ?? "—",
]);

const MARCO = frameFromRows(COLUMNAS, FILAS);

function Caja({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="font-mono text-micro tracking-[0.1em] text-muted uppercase">
        {label}
      </figcaption>
      <div className="rounded-box border border-line bg-surface p-5">{children}</div>
    </figure>
  );
}

/**
 * **Una columna categórica se cuenta por valor.** Cada barra, acostada, es un valor
 * con su conteo en la punta. Los valores se ordenan por frecuencia y la cola se JUNTA en
 * «otros (n)»: una columna con cuatrocientos valores distintos dibujada entera son
 * cuatrocientas barras de un píxel, y tirar la cola haría que las barras no sumen las filas.
 */
export const Categorica: Story = {
  args: { series: [] },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="ciudad · 600 facturas">
        <SeriesChart series={columnSeries(MARCO, "ciudad")} />
      </Caja>
    </div>
  ),
};

/**
 * **Una columna numérica se reparte en TRAMOS** de bordes redondos (0–1.000,
 * 1.000–2.000…), tantos como pide la cantidad de valores y nunca más de doce. No tiene
 * sentido contar por valor cuando casi todos son distintos: lo que se quiere ver es la
 * forma —si se amontona abajo, si es pareja, si hay una cola larga—.
 *
 * Esta columna tiene la cola larga a propósito: pocas ventas muy grandes y
 * muchas chicas, que es lo que pasa con casi cualquier importe real. Es
 * justamente lo que un promedio esconde.
 */
export const Numerica: Story = {
  args: { series: [] },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="importe en Bs. · en tramos">
        <SeriesChart series={columnSeries(MARCO, "importe")} />
      </Caja>
    </div>
  ),
};

/**
 * **Pocas barras.** Tres valores no necesitan corte ni tramos, y el gráfico no
 * hace nada especial por eso: la misma pieza, con menos entradas.
 */
export const Pocas: Story = {
  args: { series: [] },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="canal de venta">
        <SeriesChart series={columnSeries(MARCO, "canal")} />
      </Caja>
    </div>
  ),
};

/**
 * **Sin nada que contar.** Una columna vacía —o un conjunto filtrado hasta cero—
 * lo dice con una frase y no con un rectángulo vacío: un gráfico en blanco se
 * lee como «esto se rompió», que es una conclusión distinta a «acá no hay
 * datos».
 */
export const Vacia: Story = {
  args: { series: [] },
  render: () => (
    <div className="flex flex-col gap-6 bg-ground p-8">
      <Caja label="descuento · ninguna factura lo tiene">
        <SeriesChart series={[]} />
      </Caja>
    </div>
  ),
};
