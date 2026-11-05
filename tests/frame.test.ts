import assert from "node:assert/strict";

import {
  columnSeries,
  frameFromRows,
  withColumns,
} from "@sincpro/web-ui/components/frame/model";
import { test } from "vitest";

const COLUMNS = [
  { id: "ciudad", header: "ciudad" },
  { id: "importe", header: "importe", numeric: true },
] as const;

const ROWS = [
  ["Tarija", 338],
  ["Tarija", 492],
  ["Oruro", 248],
  ["La Paz", 860],
  ["La Paz", 816],
] as const;

test("el histograma de una columna numérica no usa nombres de categoría", () => {
  const frame = frameFromRows(COLUMNS, ROWS);
  const series = columnSeries(frame, "importe");
  assert.ok(series.length > 0);
  assert.equal(
    series.reduce((sum, bar) => sum + bar.count, 0),
    ROWS.length,
  );
  assert.ok(series.every((bar) => !bar.label.includes("Tarija")));
});

test("una columna de texto cuenta etiquetas", () => {
  const frame = frameFromRows(COLUMNS, ROWS);
  const series = columnSeries(frame, "ciudad");
  const tarija = series.find((bar) => bar.label === "Tarija");
  assert.equal(tarija?.count, 2);
});

test("esconder una columna no pierde las celdas de las otras", () => {
  const frame = frameFromRows(COLUMNS, ROWS);
  const only = withColumns(frame, ["importe"]);
  assert.equal(only.columns.length, 1);
  assert.equal(only.value(0, only.columns[0]!, 0), 338);
});

test("el histograma corta en bordes redondos y cuenta cada valor una vez", () => {
  const values = [1.4, 12, 35, 60, 88, 104, 150, 210, 340, 413];
  const frame = frameFromRows(
    [{ id: "costo", header: "costo", numeric: true }],
    values.map((v) => [v]),
  );
  const series = columnSeries(frame, "costo");
  /* Ten values → five stretches of 100, from 0: not twelve of 34,3 from 1,4. */
  assert.deepEqual(
    series.map((bar) => bar.bin),
    [
      { from: 0, to: 100 },
      { from: 100, to: 200 },
      { from: 200, to: 300 },
      { from: 300, to: 400 },
      { from: 400, to: 500 },
    ],
  );
  assert.equal(
    series.reduce((sum, bar) => sum + bar.count, 0),
    values.length,
  );
});

test("una columna de texto con muchos valores junta la cola en «otros»", () => {
  const frame = frameFromRows(
    [{ id: "cliente", header: "cliente" }],
    Array.from({ length: 30 }, (_, i) => [`cliente ${String(i)}`]),
  );
  const series = columnSeries(frame, "cliente");
  assert.equal(series.length, 12);
  /* The bars still add up to every row counted. */
  assert.equal(
    series.reduce((sum, bar) => sum + bar.count, 0),
    30,
  );
});
