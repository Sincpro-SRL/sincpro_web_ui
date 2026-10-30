import { columnSeries, type FrameColumn, frameFromRows, SeriesChart } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * Context: **la sexta manera de mirar N cosas.** Las otras cinco muestran cada
 * fila; ésta las CUENTA y dibuja la forma de una columna.
 *
 * Vive en `Datos` y no aparte porque contesta la misma pregunta que las demás
 * —«qué hay en este conjunto»— sobre los mismos datos. Es una presentación más
 * del marco, igual que la tabla: se cambia con el mismo conmutador y el cromo de
 * arriba no se mueve.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────
 *
 * No es una librería de gráficos. No hay tortas, ni líneas, ni ejes
 * configurables, ni leyendas que se arrastran. Es UNA pregunta —«cómo se
 * reparten los valores de esta columna»— que en un ERP se hace todo el tiempo
 * (¿de qué ciudad vienen las ventas?, ¿son muchas chicas o pocas grandes?) y que
 * hasta acá obligaba a bajar el Excel a otra herramienta.
 *
 * El día que haga falta una serie temporal o una comparación de dos columnas,
 * eso es otra pieza con su propia pregunta, no una prop más de ésta.
 *
 * ── Y por eso los datos entran como SERIE y no como frame ───────────
 *
 * `SeriesBar` es `{ label, count }` y nada más. Quien sabe cómo se agrupa una
 * columna es `columnSeries`, que además decide los cortes: una columna numérica
 * se reparte en tramos y una categórica se cuenta por valor, tomando los más
 * frecuentes. Esas dos decisiones son del dominio del dato, no del dibujo — por
 * eso el gráfico no las toma.
 */
const meta: Meta<typeof SeriesChart> = {
  title: "3 · Componentes/Datos/Serie · la forma de una columna",
  component: SeriesChart,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La sexta manera de mirar N cosas: no muestra cada fila, las CUENTA. Es una presentación del marco y no una librería de gráficos — contesta una sola pregunta, «cómo se reparten los valores de esta columna».",
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
      <div className="overflow-hidden rounded-box border border-line bg-surface">
        {children}
      </div>
    </figure>
  );
}

/**
 * **Una columna categórica se cuenta por valor.** Cada barra es un valor y su
 * alto es cuántas filas lo tienen. Los valores se ordenan por frecuencia y se
 * cortan en los más comunes: una columna con cuatrocientos valores distintos
 * dibujada entera son cuatrocientas barras de un píxel, que no es un gráfico.
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
 * **Una columna numérica se reparte en TRAMOS.** No tiene sentido contar por
 * valor cuando casi todos son distintos: lo que se quiere ver es la forma —si se
 * amontona abajo, si es pareja, si hay una cola larga—.
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
