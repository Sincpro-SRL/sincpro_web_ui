import assert from "node:assert/strict";

import {
  EditableTable,
  type EditCellState,
  type EditColumn,
  type LineItemColumn,
  LineItems,
  SPANISH_COPY,
  TextInput,
  ToastProvider,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { ControlStateContext } from "@sincpro/web-ui/foundations/form";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: an ERP line is decided per row by the backend — readonly, required, hidden, an
 * error, a warning on one value — and the table does not know why, it is told cell by cell
 * (`cellState`, `rowState`). These pin what the markup can say: the error reaches ANY control
 * through the form contract, a hidden cell is empty, a warning sits in its cell, a read-only
 * line offers no pencil, and past 200 rows only a window is drawn. Opening, Tab past a locked
 * row and `End` past the window are driven in the browser (`Tabla editable · Estado por
 * celda`, `· Dos mil líneas`).
 */

type L = { id: string; product: string; qty: number; discount: number };

const ROWS: L[] = [
  { id: "a 1", product: "Impresora", qty: 4, discount: 0 },
  { id: "b2", product: "Instalación", qty: 3, discount: 0 },
];

const COLUMNS: EditColumn<L>[] = [
  { id: "product", header: "Producto", render: (l) => l.product },
  { id: "qty", header: "Cantidad", numeric: true, render: (l) => `qty:${l.qty}` },
  { id: "discount", header: "Descuento", numeric: true, render: (l) => `dsc:${l.discount}` },
];

const draw = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const STATES = (row: L, column: string): EditCellState | null =>
  row.id === "a 1" && column === "qty"
    ? { error: "Hay 2 en stock.", flag: { tone: "warn", label: "Precio bajo el costo" } }
    : row.id === "b2" && column === "discount"
      ? { hidden: true, error: "nunca se ve" }
      : null;

test("a control outside a Field hears the state of its place: invalid and described", () => {
  const html = draw(
    <ControlStateContext value={{ describedBy: "cell-error", invalid: true }}>
      <TextInput aria-label="Cantidad" value="" onChange={() => {}} />
    </ControlStateContext>,
  );
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="cell-error"/);
});

test("a cell's error is drawn under its value, with an id a control can point at", () => {
  const html = draw(
    <EditableTable<L>
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      layout="table"
      cellState={STATES}
    />,
  );
  /* The id is safe for `aria-describedby`: the row id «a 1» carries a space. */
  const id = html.match(
    /<span id="([^"]+)"[^>]*>(?:<svg[^]*?<\/svg>)<span class="min-w-0">Hay 2 en stock\./,
  )?.[1];
  assert.ok(id !== undefined, "the error has an id");
  assert.doesNotMatch(id, /\s/);
  /* In the quantity cell of that row, and nowhere else. */
  const qtyCell =
    html.match(/<td[^>]*>(?:(?!<\/td>)[^])*qty:4(?:(?!<\/td>)[^])*<\/td>/)?.[0] ?? "";
  assert.match(qtyCell, /Hay 2 en stock/);
  /* The warning is the cell's, not the row's: in the same cell, by its value. */
  assert.match(qtyCell, /Precio bajo el costo/);
});

test("a hidden cell is empty: no value, no error", () => {
  const html = draw(
    <EditableTable<L>
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      layout="table"
      cellState={STATES}
    />,
  );
  assert.match(html, /dsc:0/); // the first row's discount is there
  assert.equal([...html.matchAll(/dsc:/g)].length, 1); // the second row's is not
  assert.doesNotMatch(html, /nunca se ve/);
});

test("on a card, an error says its column", () => {
  const html = draw(
    <EditableTable<L>
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      layout="stacked"
      cellState={STATES}
    />,
  );
  assert.match(html, /Cantidad: Hay 2 en stock\./);
});

test("past 200 rows only a window is drawn, and the table says how many it has", () => {
  const many: L[] = Array.from({ length: 2000 }, (_, i) => ({
    id: `r${i}`,
    product: `P${i}`,
    qty: 1,
    discount: 0,
  }));
  const html = draw(
    <EditableTable<L>
      rows={many}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      layout="table"
      onChange={() => {}}
    />,
  );
  assert.match(html, /aria-rowcount="2001"/);
  const drawn = [...html.matchAll(/data-row-id=/g)].length;
  assert.ok(drawn > 0 && drawn < 100, `drew ${drawn} rows`);
  /* Under the threshold, every row and no count: the browser's find still sees them all. */
  const few = draw(
    <EditableTable<L>
      rows={many.slice(0, 150)}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      layout="table"
    />,
  );
  assert.doesNotMatch(few, /aria-rowcount/);
  assert.equal([...few.matchAll(/data-row-id=/g)].length, 150);
});

test("a read-only line offers no pencil", () => {
  const columns: LineItemColumn<L>[] = [
    { id: "product", header: "Producto", value: (l) => l.product },
    { id: "qty", header: "Cantidad", numeric: true, value: (l) => l.qty },
  ];
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <ToastProvider>
        <LineItems<L>
          lines={ROWS}
          columns={columns}
          getLineId={(l) => l.id}
          onChange={() => {}}
          editor={() => null}
          rowState={(l) => (l.id === "b2" ? { readonly: true } : null)}
        />
      </ToastProvider>
    </UiCopyProvider>,
  );
  const pencils = [
    ...html.matchAll(new RegExp(`aria-label="${SPANISH_COPY.lines?.edit ?? ""}"`, "g")),
  ];
  assert.equal(pencils.length, 1);
});
