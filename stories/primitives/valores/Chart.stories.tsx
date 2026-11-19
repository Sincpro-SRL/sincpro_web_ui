import {
  BarList,
  Chart,
  chartFromPivot,
  chartFromRecord,
  COUNT_MEASURE,
  type GroupLevel,
  type PivotFold,
  pivotFrom,
  Sparkline,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { type Sale, SALES } from "../../support/erp-lists";
import {
  MAIL_HOURS,
  megabytes,
  megabytesExact,
  MEMORY_BYTES,
  REJECTIONS,
} from "../../support/mail-server";

/**
 * Context: **el pivote, dibujado.** Un gráfico de un ERP contesta lo mismo que un pivote —el
 * conjunto partido por un campo (el eje), a veces por otro (las series), y en cada cruce un
 * número plegado—, así que `Chart` dibuja lo que `chartFromPivot` lee de un `Pivot`. Por eso
 * sirve igual para registros (`pivotFrom`), para un dataset y para lo que plegó el servidor
 * (`pivotOf`); un diccionario entra por `chartFromRecord`.
 *
 * Las reglas del dibujo no son gusto: marcas finas (≤ 24 px) con la punta redondeada y la
 * base recta, grilla de un pelo, el texto con los colores del texto y nunca con el de la
 * serie, UN color (`data`) para una serie y la paleta categórica (`series-1…8`, validada para
 * daltonismo) desde dos, leyenda sólo desde dos, y sin animación.
 */
const meta: Meta<typeof Chart> = {
  title: "2 · Primitivas/Valores/Gráfico · el pivote dibujado",
  component: Chart,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Chart>;

const ROTULO: Record<string, string> = {
  branch: "sucursal",
  year: "año",
  quarter: "trimestre",
  payment: "forma de pago",
};

const de = (sale: Sale, level: GroupLevel): string =>
  level.field === "branch"
    ? sale.branch
    : level.field === "year"
      ? sale.year
      : level.field === "payment"
        ? sale.payment
        : sale.quarter;

const IMPORTE: PivotFold<Sale> = {
  id: "amount",
  header: "importe",
  additive: true,
  fold: (sales) => (sales.length === 0 ? null : sales.reduce((a, b) => a + b.amount, 0)),
  format: (n) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`,
};

const PROMEDIO: PivotFold<Sale> = {
  id: "average",
  header: "ticket promedio",
  fold: (sales) =>
    sales.length === 0 ? null : sales.reduce((a, b) => a + b.amount, 0) / sales.length,
  format: (n) => `Bs. ${n.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`,
};

const pivote = (rows: GroupLevel[], columns: GroupLevel[] = []) =>
  pivotFrom(SALES, {
    rows,
    columns,
    of: de,
    measures: [IMPORTE, PROMEDIO],
    labelOf: (level) => ROTULO[level.field] ?? level.field,
  });

function Caja({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-ground p-8">
      <div className="rounded-box border border-line-strong bg-surface p-5">{children}</div>
    </div>
  );
}

/** **Una serie**: un solo color, sin leyenda —el título ya dice qué es— y el número en la
 *  punta de cada barra. */
export const Barras: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(pivote([{ field: "branch" }]))}
        label="Importe por sucursal"
      />
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("La Paz")).toBeVisible();
    /* One series: no legend to toggle. */
    await expect(canvas.queryByRole("button", { name: /^Esconder/ })).toBeNull();
  },
};

/** **Dos agrupados**: el primero va en el eje, el segundo son las series, lado a lado. La
 *  leyenda es un interruptor: tocá «2025» y se esconde. */
export const Series: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(pivote([{ field: "branch" }], [{ field: "year" }]))}
        label="Importe por sucursal y año"
      />
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: "Esconder 2025" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle);
    await expect(canvas.getByRole("button", { name: "Mostrar 2025" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    /* The last one on cannot be turned off: an empty chart reads as broken. */
    await expect(canvas.getByRole("button", { name: "Esconder 2026" })).toBeDisabled();
  },
};

/** **Apiladas**: lo mismo, una sobre otra — el alto es el total de la sucursal. Con un
 *  negativo (una devolución de Tarija), la pila crece hacia abajo desde el cero. */
export const Apiladas: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(pivote([{ field: "branch" }], [{ field: "payment" }]))}
        stacked
        label="Importe por sucursal, contado y crédito"
      />
    </Caja>
  ),
};

/** **Líneas**: el tiempo en el eje (año y trimestre) y una línea por sucursal. Un agujero
 *  —Oruro no abrió hasta 2026— CORTA la línea: no es un cero. */
export const Lineas: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(
          pivote([{ field: "year" }, { field: "quarter" }], [{ field: "branch" }]),
        )}
        kind="line"
        label="Importe por trimestre y sucursal"
      />
    </Caja>
  ),
};

/** **Acumulado**: cada punto suma los anteriores — «cuánto llevamos». Sólo con una medida
 *  que se suma; un promedio acumulado no es nada. */
export const Acumulado: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(pivote([{ field: "year" }, { field: "quarter" }]), {
          cumulative: true,
        })}
        kind="line"
        stacked
        label="Importe acumulado por trimestre"
      />
    </Caja>
  ),
};

/** **Torta**: una sola totalidad, partida. Más de siete partes se juntan en «otros», y el
 *  total va en el hueco. */
export const Torta: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromPivot(pivote([{ field: "branch" }]), {
          measure: COUNT_MEASURE,
          maxCategories: 7,
        })}
        kind="pie"
        label="Ventas por sucursal"
      />
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("cantidad")).toBeVisible();
  },
};

const CLIENTES: Record<string, number> = {
  "Ferretería El Progreso S.R.L.": 184_300,
  "Distribuidora Andina de Materiales": 152_900,
  "Constructora Illimani": 131_400,
  "Comercial Santa Fe": 98_200,
  "Importadora Chuquisaca": 87_650,
  "Maderas del Oriente": 64_100,
  "Agroinsumos Tarija": 51_800,
  "Hormigones Cochabamba": 47_300,
  "Pinturas Altiplano": 32_900,
  "Electro Sur": 21_400,
  "Vidriería Central": 12_700,
  "Ferrecentro Oruro": 8_950,
};

/** **Un diccionario** —lo que devuelve un endpoint de resumen— sin armar un pivote. Con
 *  nombres largos o muchas categorías las barras se ACUESTAN: treinta clientes parados son
 *  treinta rótulos ilegibles. */
export const Diccionario: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromRecord(CLIENTES, {
          header: "facturado",
          format: (n) => `Bs. ${n.toLocaleString("es-BO")}`,
        })}
        label="Facturado por cliente"
      />
    </Caja>
  ),
};

/** **Abrir lo que cayó ahí**: una barra se toca y abre los registros de ese cruce, como en
 *  Odoo. Acá dice cuál se tocó. */
export const Abrir: Story = {
  render: function Render() {
    const [abierto, setAbierto] = useState("—");
    return (
      <Caja>
        <Chart
          data={chartFromPivot(pivote([{ field: "branch" }]))}
          label="Importe por sucursal"
          onPoint={(category) => setAbierto(category.join(" · "))}
        />
        <p className="mt-3 text-meta text-muted">abierto: {abierto}</p>
      </Caja>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("La Paz");
    const bar = canvasElement.querySelector(".recharts-bar-rectangle path");
    await expect(bar).not.toBeNull();
    await userEvent.click(bar!);
    await expect(await canvas.findByText("abierto: La Paz")).toBeVisible();
  },
};

/** **Nada que graficar**: una frase, no un rectángulo vacío — un gráfico en blanco se lee
 *  como «se rompió». */
export const Vacio: Story = {
  render: () => (
    <Caja>
      <Chart data={chartFromRecord({}, { header: "importe" })} label="Importe" />
    </Caja>
  ),
};

/** **Área**: una cantidad en el tiempo que se lee como «tanto» —la memoria que ocupa un
 *  servidor— y no sólo como «hacia dónde». El lavado de debajo es el color de la serie a un
 *  décimo, y el eje dice la unidad de la medida (`formatShort`: «76 MB»), no un número pelado.
 *  Veinticuatro horas no entran rotuladas una por una: el eje escribe una cada tantas, siempre
 *  la misma cantidad. */
export const Area: Story = {
  name: "Área",
  render: () => (
    <Caja>
      <Chart
        data={chartFromRecord(MEMORY_BYTES, {
          header: "memoria",
          format: megabytesExact,
          formatShort: megabytes,
          additive: false,
        })}
        kind="area"
        label="Memoria del servidor, últimas 24 horas"
      />
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The unit rides the axis. */
    await expect((await canvas.findAllByText(/MB$/)).length).toBeGreaterThan(0);
  },
};

/** **Un hueco con su marca**: el mes sin datos no se dibuja como cero ni se deja como un
 *  corte pelado — un puente punteado y tenue dice «acá no se registró nada». Un punto sólo
 *  donde la línea no alcanza: el valor solo entre dos huecos, y el último (dónde está ahora). */
export const Hueco: Story = {
  render: () => (
    <Caja>
      <Chart
        data={chartFromRecord(
          [
            ["Enero", 120],
            ["Febrero", 135],
            ["Marzo", null],
            ["Abril", 150],
            ["Mayo", null],
            ["Junio", 160],
            ["Julio", null],
            ["Agosto", 158],
            ["Septiembre", 171],
          ],
          { header: "pedidos" },
        )}
        kind="line"
        label="Pedidos por mes"
      />
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText("Enero");
    /* The bridge across the holes is dashed and is not the series' colour. */
    await expect(canvasElement.querySelector('path[stroke-dasharray="3 4"]')).not.toBeNull();
  },
};

/** **Sparkline**: la forma de las últimas horas al lado de una cifra — sin eje, sin grilla,
 *  sin tooltip. No se lee un valor ahí (la cifra lo dice); se lee hacia dónde va. El último
 *  punto, el de ahora, va marcado. Una serie en cero va al piso: no pasó nada. */
export const Sparklines: Story = {
  name: "Sparkline",
  render: () => (
    <Caja>
      <div className="flex max-w-xs flex-col gap-6">
        <Sparkline values={MAIL_HOURS.map((one) => one.received)} label="Recibidos, 24 h" />
        <Sparkline
          values={MEMORY_BYTES.map(([, bytes]) => bytes)}
          label="Memoria, 24 h"
          area={false}
        />
        <Sparkline values={MAIL_HOURS.map(() => 0)} label="Pendientes, 24 h" />
      </div>
    </Caja>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Recibidos, 24 h" })).toBeVisible();
  },
};

/** **Lista de barras**: un ranking leído como lista — el nombre, una barra contra el mayor, el
 *  número escrito. Seis motivos de rechazo no piden dos ejes y una grilla. Un cero es una
 *  fila con la pista vacía: «0 spam» es una respuesta. Tocá una fila para abrirla. */
export const ListaDeBarras: Story = {
  name: "Lista de barras",
  render: function Render() {
    const [abierto, setAbierto] = useState("—");
    return (
      <Caja>
        <div className="max-w-md">
          <BarList
            data={chartFromRecord(REJECTIONS, { header: "rechazos" })}
            label="Rechazos por motivo"
            onPoint={(category) => setAbierto(category.join(" · "))}
          />
        </div>
        <p className="mt-3 text-meta text-muted">abierto: {abierto}</p>
      </Caja>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /^Logins fallidos\s*12$/ }),
    );
    await expect(await canvas.findByText("abierto: Logins fallidos")).toBeVisible();
  },
};
