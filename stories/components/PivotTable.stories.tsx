import {
  Button,
  DensityProvider,
  downloadPivot,
  type GroupLevel,
  type PivotFold,
  pivotFrom,
  pivotOf,
  PivotTable,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

/* Las ventas viven en `support/erp-lists.ts`: las miran esta pieza Y el
   arquetipo de lista con `present="pivot"`. */
import { type Sale, SALES } from "../support/erp-lists";

const meta: Meta<typeof PivotTable> = {
  title: "3 · Componentes/Datos/Pivote · dos ejes a la vez",
  component: PivotTable,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La grilla de dos ejes. No es una `DataTable` con dos agrupaciones: ahí cada fila es un registro y se ordena, se elige y se abre; acá **una fila es un montón y una columna también**, y lo que se lee está en el cruce. De ahí salen las tres reglas que la gobiernan — la grilla se dibuja desde los ejes, los márgenes vienen plegados de la base, y un agujero no es un cero.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PivotTable>;

/** A qué montón va cada venta, en cada nivel de cada eje. Es el mismo contrato
 *  que agrupa una lista: recortar el valor a algo legible es de quien conoce el
 *  dato. */
const of = (sale: Sale, level: GroupLevel): string =>
  level.field === "branch"
    ? sale.branch
    : level.field === "payment"
      ? sale.payment
      : level.field === "year"
        ? sale.year
        : sale.quarter;

const BOLIVIANOS = (n: number) =>
  `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;

/* `format` dice cómo se lee en la pantalla y `numberFormat` cómo se lee en una
   planilla. Son dos porque la primera es una función de JavaScript, y un archivo
   no se lleva una función adentro. */
const EN_BOLIVIANOS = '"Bs." #,##0.00';

const IMPORTE: PivotFold<Sale> = {
  id: "amount",
  header: "importe",
  fold: (sales) => (sales.length === 0 ? null : sales.reduce((a, b) => a + b.amount, 0)),
  format: BOLIVIANOS,
  numberFormat: EN_BOLIVIANOS,
};

const PROMEDIO: PivotFold<Sale> = {
  id: "mean",
  header: "promedio",
  fold: (sales) =>
    sales.length === 0 ? null : sales.reduce((a, b) => a + b.amount, 0) / sales.length,
  format: BOLIVIANOS,
  numberFormat: EN_BOLIVIANOS,
};

const ROTULO: Record<string, string> = {
  branch: "sucursal",
  payment: "modalidad de pago",
  year: "año",
  quarter: "trimestre",
};

/**
 * **El pivote de todos los días**: sucursal hacia abajo, año y trimestre hacia
 * la derecha, el importe en el cruce.
 *
 * Tres cosas para mirar, y las tres son del contrato y no del CSS:
 *
 * 1. **Los agujeros están en blanco.** Oruro no abrió hasta 2026 y Tarija se
 *    saltea trimestres: esos cruces no dibujan nada, ni un punto. Al lado, el Q1
 *    2026 de Cochabamba dibuja un **0** — se abrió y no vendió, que es otra
 *    cosa. La columna de un trimestre sin ninguna venta seguiría estando: la
 *    grilla se dibuja desde los ejes y no desde los cruces, así que el mes en
 *    que no pasó nada no desaparece.
 *
 * 2. **El encabezado es la jerarquía acostada.** «2025» cubre sus cuatro
 *    trimestres, y dos «Q1» bajo años distintos son dos tramos: fundirlos
 *    dibujaría una celda que abarca columnas que no son hermanas.
 *
 * 3. **El borde cierra.** La última columna y el último renglón son los
 *    márgenes, y la esquina de abajo es todo plegado una vez.
 */
export const Movimientos: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="overflow-hidden rounded-box border border-line bg-surface py-3">
        <PivotTable
          caption="Ventas por sucursal y trimestre · en Bs."
          pivot={pivotFrom(SALES, {
            rows: [{ field: "branch" }],
            columns: [{ field: "year" }, { field: "quarter" }],
            of,
            measures: [IMPORTE],
            labelOf: (level) => ROTULO[level.field] ?? level.field,
          })}
        />
      </div>
    </div>
  ),
};

/**
 * **Dos medidas, y el margen que las delata.**
 *
 * El promedio del borde NO es el promedio de los promedios de la fila: se pliega
 * sobre las ventas de la base, de una. Es la regla que hace que un pivote
 * diga la verdad en cuanto la medida deja de ser una suma — con `sum` las dos
 * cuentas coinciden y nadie nota nada; con `mean`, `median` o `distinct` la
 * diferencia es el número entero.
 *
 * Por eso los márgenes se RECIBEN y esta grilla no los calcula: sumar la fila
 * que acaba de dibujar es exactamente el error que no se puede cometer.
 */
export const DosMedidas: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="overflow-hidden rounded-box border border-line bg-surface py-3">
        <PivotTable
          caption="Ventas por sucursal y modalidad de pago · importe y promedio"
          pivot={pivotFrom(SALES, {
            rows: [{ field: "branch" }, { field: "payment" }],
            columns: [{ field: "year" }],
            of,
            measures: [IMPORTE, PROMEDIO],
            labelOf: (level) => ROTULO[level.field] ?? level.field,
          })}
        />
      </div>
    </div>
  ),
};

/**
 * **El conteo, que es lo que un pivote mide antes de que le pidan un número.**
 *
 * Sin medidas declaradas la grilla cuenta ventas. Y el cruce se puede abrir:
 * `onCell` convierte los números en botones, porque una celda que no lleva a
 * ningún lado no tiene por qué prometer que sí.
 */
export const Conteo: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="overflow-hidden rounded-box border border-line bg-surface py-3">
        <PivotTable
          caption="Ventas por sucursal y trimestre · cuántas"
          onCell={() => {}}
          pivot={pivotFrom(SALES, {
            rows: [{ field: "branch" }],
            columns: [{ field: "quarter" }],
            of,
            measures: [],
            labelOf: (level) => ROTULO[level.field] ?? level.field,
          })}
        />
      </div>
    </div>
  ),
};

/**
 * **El pivote que llegó plegado**, con los ejes completos y sólo cuatro cruces.
 *
 * Es el caso normal en cuanto el conjunto no entra en el navegador: las filas no
 * bajaron y no van a bajar, así que acá no hay nada que contar — hay una grilla
 * que dibujar. La forma es la misma y por eso el componente es el mismo.
 *
 * **Y no trae márgenes**, así que no hay banda de totales. Es la respuesta
 * honesta: nadie los calculó, y sumar las celdas dibujadas daría un borde que
 * parece un total.
 */
export const PlegadoAfuera: Story = {
  render: () => (
    <div className="bg-ground p-8">
      <div className="overflow-hidden rounded-box border border-line bg-surface py-3">
        <PivotTable
          caption="Facturas por estado y mes · lo que contestó el servidor, sin márgenes"
          pivot={pivotOf({
            rows: {
              levels: [{ field: "state", label: "estado" }],
              keys: [["publicada"], ["pagada"], ["vencida"]],
            },
            /* El eje trae el nivel ENTERO, con su grano: por eso las columnas se
               leen «Julio», «Agosto», «Septiembre» y no `2026-07`. */
            columns: {
              levels: [{ field: "invoice_date", grain: "month", label: "mes" }],
              keys: [["2026-07"], ["2026-08"], ["2026-09"]],
            },
            measures: [{ id: "total", header: "total", format: BOLIVIANOS }],
            crossings: [
              {
                row: ["publicada"],
                column: ["2026-08"],
                count: 12,
                values: { total: 84_310 },
              },
              {
                row: ["pagada"],
                column: ["2026-09"],
                count: 168,
                values: { total: 1_412_933.5 },
              },
              { row: ["vencida"], column: ["2026-07"], count: 7, values: { total: 21_480 } },
              {
                row: ["vencida"],
                column: ["2026-09"],
                count: 3,
                values: { total: 9_300 },
              },
            ],
          })}
        />
      </div>
    </div>
  ),
};

/**
 * **La misma grilla, en un archivo.** Tocá el botón: baja un `.xlsx` de verdad
 * —escrito acá, sin librería, porque un xlsx es un zip de XML y las entradas van
 * sin comprimir—, y adentro sobrevive lo que hace que una grilla sea una grilla:
 *
 * - el encabezado va con celdas **combinadas**, así «2026» sigue cubriendo sus
 *   cuatro trimestres;
 * - los números entran **como números**, con su formato, no como texto que
 *   parece un número y no se deja sumar;
 * - los agujeros **no se escriben**, así que siguen siendo agujeros;
 * - el encabezado y la columna de rótulos quedan **congelados**, igual que se
 *   quedan pegados en la pantalla.
 *
 * El pivote es la presentación donde exportar desde el navegador no miente: la
 * grilla entera ya está en la mano —son rótulos y números plegados, no los
 * registros—, así que el archivo dice exactamente lo mismo que se está mirando.
 */
export const Descargar: Story = {
  render: function Render() {
    const pivote = pivotFrom(SALES, {
      rows: [{ field: "branch" }, { field: "payment" }],
      columns: [{ field: "year" }, { field: "quarter" }],
      of,
      measures: [IMPORTE, PROMEDIO],
      labelOf: (level) => ROTULO[level.field] ?? level.field,
    });
    return (
      <div className="flex flex-col items-start gap-3 bg-ground p-8">
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
        <div className="w-full overflow-hidden rounded-box border border-line bg-surface py-3">
          <PivotTable pivot={pivote} />
        </div>
      </div>
    );
  },
};

/** En un panel angosto la grilla no se vuelve ilegible: se aprieta, y la primera
 *  columna se queda pegada mientras los trimestres se van hacia la derecha. Un
 *  número sin su sucursal es un número suelto. */
export const EnUnPanel: Story = {
  render: () => (
    <div className="bg-ground p-6">
      <div className="max-w-[26rem] overflow-hidden rounded-box border border-line bg-surface py-2">
        <DensityProvider value="compact">
          <PivotTable
            height={280}
            pivot={pivotFrom(SALES, {
              rows: [{ field: "branch" }],
              columns: [{ field: "year" }, { field: "quarter" }],
              of,
              measures: [IMPORTE],
              labelOf: (level) => ROTULO[level.field] ?? level.field,
            })}
          />
        </DensityProvider>
      </div>
    </div>
  ),
};
