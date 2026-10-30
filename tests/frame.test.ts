import assert from "node:assert/strict";
import { test } from "node:test";

import {
  columnSeries,
  frameFromRows,
  withColumns,
} from "@sincpro/web-ui/components/frame/model";

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
