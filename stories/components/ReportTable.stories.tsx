import { DensityProvider, ReportTable } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/* El balance vive en `support/erp-lists.ts`: lo miran esta pieza Y el arquetipo
   de lista con `present="report"`, y un fixture copiado es la primera manera de
   que las dos historias dejen de mostrar lo mismo. */
import { BALANCE_COLUMNS as COLUMNS, BALANCE_ROWS as FILAS } from "../support/erp-lists";

const meta: Meta<typeof ReportTable> = {
  title: "3 · Componentes/Datos/Informe · jerarquía que termina en totales",
  component: ReportTable,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La tabla que SUMA: un balance, un estado de resultados, la antigüedad de las cuentas por cobrar. No es `DataTable` con otro CSS — ahí cada fila es una cosa del mismo tipo y se ordena; acá el orden ES el reporte, y ordenarlo por importe lo destruye (`Total activos` quedaría en el medio).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ReportTable>;

/**
 * **Un balance general.** Cuatro clases de fila y se distinguen sin leer:
 * sección con banda, grupo en negrita, línea normal, total con filete arriba.
 *
 * Los ceros se apagan. Un balance tiene más ceros que números, y dibujarlos con
 * la misma tinta obliga a leer cuarenta renglones para encontrar los seis que
 * dicen algo. Los negativos van en rojo porque un signo menos delante de siete
 * dígitos es un píxel — y es el píxel que cambia lo que significa el renglón.
 *
 * Abrí *Efectivo y equivalentes* o *Cuentas por pagar*.
 */
export const Balance: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="mx-auto max-w-[56rem] overflow-hidden rounded-box border border-line bg-surface py-3">
        <ReportTable
          columns={COLUMNS}
          rows={FILAS}
          defaultOpen={["efectivo"]}
          caption="Balance general · SINCPRO S.R.L. · en Bs."
        />
      </div>
    </div>
  ),
};

/** En un panel angosto el reporte no se vuelve ilegible: se aprieta. La sangría
 *  y el filete de los totales son lo que sobrevive, porque son lo que dice qué
 *  es cada renglón. */
export const EnUnPanel: Story = {
  render: () => (
    <div className="bg-ground p-6">
      <div className="w-[26rem] overflow-hidden rounded-box border border-line bg-surface py-2">
        <DensityProvider value="compact">
          <ReportTable
            columns={[COLUMNS[0]!]}
            rows={FILAS.slice(0, 8)}
            defaultOpen={["efectivo"]}
          />
        </DensityProvider>
      </div>
    </div>
  ),
};

/* Un informe PLANO: secciones con sus líneas y nada que abrir. Es la otra mitad
   de la familia y no un caso degenerado — un tablero de indicadores no tiene
   jerarquía que desplegar, tiene grupos de medidas, y meterle chevrones que no
   abren nada es prometer una profundidad que no existe. */
const INDICADORES = [
  { id: "efectivo", label: "Efectivo", kind: "section" as const, level: 0, values: [null] },
  { id: "e1", label: "Efectivo recibido", level: 1, values: [766019.65] },
  { id: "e2", label: "Efectivo gastado", level: 1, values: [-853406.67] },
  { id: "e3", label: "Superávit de efectivo", level: 1, values: [-87387.02] },
  { id: "e4", label: "Balance bancario de cierre", level: 1, values: [263010.32] },

  { id: "rent", label: "Rentabilidad", kind: "section" as const, level: 0, values: [null] },
  { id: "r1", label: "Ingreso", level: 1, values: [408885.9] },
  { id: "r2", label: "Costo de ingresos", level: 1, values: [0] },
  { id: "r3", label: "Ganancia bruta", level: 1, values: [408885.9] },
  { id: "r4", label: "Gastos", level: 1, values: [425986.88] },
  { id: "r5", label: "Ganancias netas", level: 1, values: [-16895.66] },

  { id: "bal", label: "Balance general", kind: "section" as const, level: 0, values: [null] },
  { id: "b1", label: "Por cobrar", level: 1, values: [23422.26] },
  { id: "b2", label: "Por pagar", level: 1, values: [-10587.36] },
  { id: "b3", label: "Activos netos", level: 1, values: [411139.0] },

  { id: "pos", label: "Posición", kind: "section" as const, level: 0, values: [null] },
  { id: "p1", label: "Promedio de días de los deudores", level: 1, values: [20.9] },
  { id: "p2", label: "Promedio de días de los acreedores", level: 1, values: [9.0] },
  { id: "p3", label: "Pronóstico de efectivo a corto plazo", level: 1, values: [12834.9] },
];

const BALANCE_1 = [
  {
    id: "saldo",
    header: "Balance",
    format: (n: number) =>
      `Bs. ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
];

/**
 * **Plano.** Secciones con sus líneas, sin nada que desplegar. Mismo componente
 * y misma gramática de filas —`section` lleva banda, `line` va normal— sólo que
 * ninguna fila declara `children`, así que no aparece ningún chevron.
 *
 * Los ceros se apagan igual y los negativos siguen en rojo: eso es de la tabla,
 * no de la variante.
 */
export const Plano: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="mx-auto max-w-[44rem] overflow-hidden rounded-box border border-line bg-surface py-3">
        <ReportTable columns={BALANCE_1} rows={INDICADORES} />
      </div>
    </div>
  ),
};
