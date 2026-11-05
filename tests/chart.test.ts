import assert from "node:assert/strict";

import { dateKey, dateKeysBetween } from "@sincpro/web-ui/foundations/calendar";
import {
  chartCompare,
  chartFromPivot,
  chartFromRecord,
  COUNT_MEASURE,
  orderChart,
} from "@sincpro/web-ui/foundations/chart";
import type { GroupLevel } from "@sincpro/web-ui/foundations/grouping";
import { type PivotFold, pivotFrom } from "@sincpro/web-ui/foundations/pivot";
import { test } from "vitest";

type Sale = { branch: string; year: string; amount: number };

const SALES: Sale[] = [
  { branch: "La Paz", year: "2025", amount: 100 },
  { branch: "La Paz", year: "2026", amount: 300 },
  { branch: "Oruro", year: "2026", amount: 50 },
  { branch: "Tarija", year: "2025", amount: 200 },
  { branch: "Tarija", year: "2026", amount: 10 },
];

const of = (sale: Sale, level: GroupLevel) =>
  level.field === "branch" ? sale.branch : sale.year;

const SUM: PivotFold<Sale> = {
  id: "amount",
  header: "importe",
  additive: true,
  fold: (all) => (all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0)),
};

const AVERAGE: PivotFold<Sale> = {
  id: "average",
  header: "promedio",
  fold: (all) =>
    all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0) / all.length,
};

const byBranchAndYear = pivotFrom(SALES, {
  rows: [{ field: "branch" }],
  columns: [{ field: "year" }],
  of,
  measures: [SUM, AVERAGE],
});

test("las filas del pivote son el eje y sus columnas las series", () => {
  const data = chartFromPivot(byBranchAndYear);
  assert.deepEqual(
    data.categories.map((one) => one.label),
    ["La Paz", "Oruro", "Tarija"],
  );
  assert.deepEqual(
    data.series.map((one) => one.label),
    ["2025", "2026"],
  );
  assert.equal(data.measure.id, "amount");
});

test("un agujero es null y no un cero: Oruro no vendió en 2025", () => {
  const data = chartFromPivot(byBranchAndYear);
  assert.deepEqual(data.values[1], [null, 50]);
});

test("el conteo se puede graficar aunque nadie lo haya declarado", () => {
  const data = chartFromPivot(byBranchAndYear, { measure: COUNT_MEASURE });
  assert.deepEqual(data.values[0], [1, 1]);
  assert.equal(data.measure.additive, true);
});

test("ordenar ordena el EJE por el total de cada categoría, de la base", () => {
  const data = chartFromPivot(byBranchAndYear, { order: "desc" });
  assert.deepEqual(
    data.categories.map((one) => one.label),
    ["La Paz", "Tarija", "Oruro"],
  );
  assert.deepEqual(data.totals, [400, 210, 50]);
});

test("el acumulado arrastra lo que se llevaba a través de un agujero", () => {
  const data = chartFromPivot(byBranchAndYear, { cumulative: true });
  /* 2025: La Paz 100, Oruro (hole) still 100, Tarija 300. */
  assert.deepEqual(
    data.values.map((row) => row[0]),
    [100, 100, 300],
  );
});

test("un promedio no se acumula: sumar promedios no es nada", () => {
  const data = chartFromPivot(byBranchAndYear, { measure: "average", cumulative: true });
  assert.deepEqual(data.values[2], [200, 10]);
});

test("con una medida que se suma, la cola se junta en «otros» y suma lo que falta", () => {
  const data = chartFromPivot(byBranchAndYear, { maxCategories: 2 });
  assert.equal(data.categories.length, 2);
  assert.equal(data.categories[1]?.rest, true);
  /* La Paz stays (the biggest); Oruro + Tarija are gathered. */
  assert.equal(data.totals[1], 260);
  assert.equal(data.hiddenCategories, 0);
});

test("con una que no se suma, la cola se deja afuera y se dice cuántas", () => {
  const data = chartFromPivot(byBranchAndYear, { measure: "average", maxSeries: 1 });
  assert.equal(data.series.length, 1);
  assert.equal(data.hiddenSeries, 1);
  assert.ok(data.series.every((one) => one.rest !== true));
});

test("un diccionario es un gráfico de una serie", () => {
  const data = chartFromRecord({ "La Paz": 3, Oruro: null }, { header: "pedidos" });
  assert.deepEqual(
    data.categories.map((one) => one.label),
    ["La Paz", "Oruro"],
  );
  assert.deepEqual(data.values, [[3], [null]]);
  assert.equal(data.series[0]?.label, "pedidos");
});

/* ── Time ─────────────────────────────────────────────────────────────── */

type Dated = { date: string; amount: number };

const DATED: Dated[] = [
  { date: "2025-06-10", amount: 10 },
  { date: "2025-07-02", amount: 20 },
  /* August: nothing. */
  { date: "2025-09-15", amount: 40 },
];

const byMonth = (records: readonly Dated[]) =>
  pivotFrom(records, {
    rows: [{ field: "date", grain: "month" }],
    columns: [],
    of: (one, level) => dateKey(one.date, level.grain ?? "month"),
    measures: [
      {
        id: "amount",
        header: "importe",
        additive: true,
        fold: (all) => (all.length === 0 ? null : all.reduce((a, b) => a + b.amount, 0)),
      },
    ],
  });

test("una fecha sin hora es un día del calendario, no un instante en UTC", () => {
  /* Read as midnight UTC, the 1st of January is the 31st of December west of Greenwich. */
  assert.equal(dateKey("2025-01-01", "month"), "2025-01");
  assert.equal(dateKey("2025-01-01", "year"), "2025");
});

test("el eje de tiempo cuenta cada período, también el que siguen al fin de año", () => {
  assert.deepEqual(dateKeysBetween("2025-11", "2026-02", "month"), [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
  assert.deepEqual(dateKeysBetween("2025-Q4", "2026-Q1", "quarter"), ["2025-Q4", "2026-Q1"]);
  /* 2026 has 53 ISO weeks: its first Thursday is the 1st of January. */
  assert.deepEqual(dateKeysBetween("2026-W52", "2027-W01", "week"), [
    "2026-W52",
    "2026-W53",
    "2027-W01",
  ]);
  assert.deepEqual(dateKeysBetween("2026-02-27", "2026-03-01", "day"), [
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
  ]);
  /* A key this layer did not write cannot be continued. */
  assert.equal(dateKeysBetween("sin fecha", "2026-03", "month"), null);
});

test("el mes vacío entra en el eje: un agujero para el importe, un cero para el conteo", () => {
  const amount = chartFromPivot(byMonth(DATED));
  assert.deepEqual(
    amount.categories.map((one) => one.key[0]),
    ["2025-06", "2025-07", "2025-08", "2025-09"],
  );
  assert.deepEqual(
    amount.values.map((row) => row[0]),
    [10, 20, null, 40],
  );
  const count = chartFromPivot(byMonth(DATED), { measure: COUNT_MEASURE });
  assert.equal(count.values[2]?.[0], 0);
  /* And it can be turned off. */
  assert.equal(chartFromPivot(byMonth(DATED), { fillDates: false }).categories.length, 3);
});

test("comparar el tiempo es por POSICIÓN: el primer mes con el primer mes", () => {
  const now = chartFromPivot(
    byMonth([
      { date: "2026-06-01", amount: 15 },
      { date: "2026-07-01", amount: 25 },
    ]),
  );
  const before = chartFromPivot(byMonth(DATED));
  const both = chartCompare(now, before, { current: "2026", previous: "2025" }, "position");
  assert.equal(both.compare, true);
  assert.deepEqual(
    both.series.map((one) => [one.label, one.previous === true]),
    [
      ["2026", false],
      ["2025", true],
    ],
  );
  assert.deepEqual(both.values, [
    [15, 10],
    [25, 20],
  ]);
});

test("comparar una cosa es por CLAVE: La Paz con La Paz, aunque cambie el orden", () => {
  const now = chartFromRecord({ Oruro: 5, "La Paz": 30 }, { header: "importe" });
  const before = chartFromRecord({ "La Paz": 20, Tarija: 9 }, { header: "importe" });
  const both = chartCompare(now, before, { current: "2026", previous: "2025" });
  assert.deepEqual(both.values, [
    [5, null],
    [30, 20],
  ]);
});

test("ordenar un gráfico ya armado deja la cola al final", () => {
  const data = chartFromPivot(byBranchAndYear, { maxCategories: 2 });
  const ordered = orderChart(data, "asc");
  assert.equal(ordered.categories[ordered.categories.length - 1]?.rest, true);
});
