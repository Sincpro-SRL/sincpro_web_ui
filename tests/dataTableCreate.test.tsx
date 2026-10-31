import assert from "node:assert/strict";

import { type DataColumn, DataTable, type DataTableCreate } from "@sincpro/web-ui";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a new record written as one more row of the list — Odoo's editable list. The keys
 * (focus on the first control, `Enter` / `Escape`, `Tab` past the last control starting the
 * next record) are `EditableTable`'s `EditRow` and were driven in a browser; there is no DOM
 * here. What the markup can say: the draft row draws the columns' `input` controls and only
 * those, it stays out of the data, «add» hides while a record is being written, and an empty
 * list still shows the table when its first record is being written.
 */

type Tasa = { id: string; nombre: string; porcentaje: number | "" };

const COLUMNS: DataColumn<Tasa>[] = [
  {
    id: "nombre",
    header: "Nombre",
    value: (t) => t.nombre,
    input: (t, set) => (
      <input
        aria-label="Nombre"
        value={t.nombre}
        onChange={(e) => set({ ...t, nombre: e.target.value })}
      />
    ),
  },
  { id: "porcentaje", header: "%", numeric: true, value: (t) => t.porcentaje || null },
];

const TASAS: Tasa[] = [{ id: "iva", nombre: "IVA", porcentaje: 13 }];
const noop = () => {};
const create = (draft: Tasa | null): DataTableCreate<Tasa> => ({
  draft,
  onStart: noop,
  onChange: noop,
  onCommit: noop,
  onCancel: noop,
  label: "Agregar una tasa",
});
const draw = (draft: Tasa | null, data: readonly Tasa[] = TASAS) =>
  renderToStaticMarkup(
    <DataTable data={data} columns={COLUMNS} getRowId={(t) => t.id} create={create(draft)} />,
  );

test("without a draft, «add» sits under the table and there is no row being written", () => {
  const html = draw(null);
  assert.match(html, /Agregar una tasa<\/button>/);
  assert.doesNotMatch(html, /data-edit/);
});

test("the draft row draws the columns' inputs, and only those, below the data", () => {
  const html = draw({ id: "", nombre: "IT", porcentaje: "" });
  assert.equal(html.match(/data-edit/g)?.length, 1, "one column declared an input");
  assert.match(html, /aria-label="Nombre"[^>]*value="IT"/);
  assert.ok(html.indexOf(">IVA<") < html.indexOf('aria-label="Nombre"'), "below the data");
  /* One record at a time: `Tab` past the last control starts the next one. */
  assert.doesNotMatch(html, /Agregar una tasa/);
});

test("a table without create draws no «add» and no wrapper", () => {
  const html = renderToStaticMarkup(
    <DataTable data={TASAS} columns={COLUMNS} getRowId={(t) => t.id} />,
  );
  assert.doesNotMatch(html, /<button[^>]*>.*Add/);
  assert.doesNotMatch(html, /data-edit/);
});

test("an empty list writing its first record shows the table, not the empty sentence", () => {
  const list = (draft: Tasa | null) =>
    renderToStaticMarkup(
      <ListView<Tasa>
        items={[]}
        keyOf={(t) => t.id}
        row={(t) => ({ name: t.nombre })}
        columns={COLUMNS}
        present="table"
        create={create(draft)}
        empty={{ sentence: "Todavía no hay tasas." }}
      />,
    );
  assert.match(list(null), /Todavía no hay tasas\./);
  const writing = list({ id: "", nombre: "", porcentaje: "" });
  assert.doesNotMatch(writing, /Todavía no hay tasas\./);
  assert.match(writing, /aria-label="Nombre"/);
});
