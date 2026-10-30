import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EditableTable,
  type EditColumn,
  type LineItemColumn,
  LineItems,
  SPANISH_COPY,
  stackPlaces,
  tabTarget,
  ToastProvider,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: two contracts of `EditableTable` that broke inside a record.
 *
 * 1. The sticky header. The table used to wrap itself in a hard-coded `overflow-auto`
 *    box: it was its own scroller, but its header still read the page's `--sticky-top`
 *    (application bar + rail) and was pushed down over the first lines. Now the box is
 *    decided by `useScrollBox`, as in `Table`: `overflow-clip` and no reset while the
 *    table grows (the header sticks to the page), `overflow-auto` + a reset to zero when
 *    it has a height of its own. `LineItems` no longer needs its `stickyReset()` wrapper.
 *
 * 2. The keyboard route. The presses —Enter/F2 open the row on its first control, Tab
 *    walks the row, Enter commits and Escape puts the row back, both with the focus back
 *    on the row; a `Select`'s list opening in a portal does not close the row— were driven
 *    in a browser (puppeteer), there is no DOM here. What the markup can say: the rows are
 *    ONE tab stop (roving tab index) and announce their keys; a read-only table has no
 *    stops; only the stop row offers its trash to Tab.
 */

type Linea = { id: string; producto: string; cantidad: number };

const LINEAS: Linea[] = [
  { id: "1", producto: "Implementación Odoo — módulo de ventas", cantidad: 1 },
  { id: "2", producto: "Licencia de usuario adicional", cantidad: 12 },
  { id: "3", producto: "Capacitación presencial (por hora)", cantidad: 16 },
];

const COLUMNS: EditColumn<Linea>[] = [
  { id: "producto", header: "producto", render: (l) => l.producto },
  {
    id: "cantidad",
    header: "cantidad",
    numeric: true,
    render: (l) => String(l.cantidad),
    edit: () => <input aria-label="Cantidad" />,
  },
];

const noop = () => {};

/** The trash button of a row, by the copy's name for it. */
const TRASH = new RegExp(
  `<button[^>]*aria-label="${SPANISH_COPY.editable?.remove ?? "quitar"}"[^>]*>`,
  "g",
);

function html(node: ReactElement): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <ToastProvider>{node}</ToastProvider>
    </UiCopyProvider>,
  );
}

const table = (extra: Partial<Parameters<typeof EditableTable<Linea>>[0]> = {}) =>
  html(
    <EditableTable<Linea>
      rows={LINEAS}
      columns={COLUMNS}
      getRowId={(l) => l.id}
      {...extra}
    />,
  );

/** The box right around the `<table>`. */
const boxOf = (markup: string) => /<div([^>]*)><table/.exec(markup)?.[1] ?? "";
/** The opening tags of the body rows. */
const rowsOf = (markup: string) =>
  /<tbody>.*<\/tbody>/s.exec(markup)?.[0].match(/<tr[^>]*>/g) ?? [];

test("growing with its lines, the box is not a scroller: the header sticks to the page", () => {
  const box = boxOf(table({ onChange: noop }));
  assert.match(box, /class="min-w-0 overflow-clip"/);
  assert.doesNotMatch(box, /overflow-auto/);
  /* No reset: the header reads the page's stack (application bar + rail). */
  assert.doesNotMatch(box, /--sticky-top/);
  assert.match(
    table(),
    /<thead class="sticky z-10 bg-ground" style="top:var\(--sticky-top, 0px\)">/,
  );
});

test("with a height of its own, the box scrolls and the sticky stack starts from zero in it", () => {
  const box = boxOf(table({ height: "20rem" }));
  assert.match(box, /overflow-auto/);
  assert.match(box, /style="height:20rem;--sticky-top:0px"/);
});

test("the «add» stays outside the scroll box, in view under a table with a height", () => {
  const markup = table({ height: 320, onAdd: noop, addLabel: "Agregar un producto" });
  const box = /<div[^>]*overflow-auto[^>]*>(.*?)<\/table><\/div>/s.exec(markup)?.[1] ?? "";
  assert.doesNotMatch(box, /Agregar un producto/);
  assert.match(markup, /Agregar un producto/);
});

test("editable rows are ONE tab stop, and say which keys open them", () => {
  const rows = rowsOf(table({ onChange: noop }));
  assert.equal(rows.length, 3);
  assert.equal(rows.filter((tr) => /tabindex="0"/.test(tr)).length, 1, "a single stop");
  assert.match(rows[0]!, /tabindex="0"/, "the first row holds it until another is focused");
  for (const tr of rows.slice(1)) assert.match(tr, /tabindex="-1"/);
  for (const tr of rows) assert.match(tr, /aria-keyshortcuts="Enter F2"/);
  /* The ring is the row's, drawn only for the keyboard. */
  assert.match(rows[0]!, /focus-visible:outline-2/);
});

test("a read-only table (no onChange) has no stops and no shortcuts", () => {
  const markup = table();
  for (const tr of rowsOf(markup)) {
    assert.doesNotMatch(tr, /tabindex|aria-keyshortcuts|cursor-text/);
  }
  /* And no control is drawn: the rows are read until one is opened. */
  assert.doesNotMatch(markup, /<input/);
});

test("only the stop row offers its trash to Tab; the others are reached with the arrows", () => {
  const trashes = table({ onChange: noop, onRemove: noop }).match(TRASH) ?? [];
  assert.equal(trashes.length, 3);
  /* The tooltip's trigger makes a button an explicit `tabindex="0"`; what matters is -1. */
  assert.doesNotMatch(trashes[0]!, /tabindex="-1"/);
  for (const button of trashes.slice(1)) assert.match(button, /tabindex="-1"/);
  /* Without onChange there is no roving: every trash is a stop, as before. */
  const plain = table({ onRemove: noop }).match(TRASH) ?? [];
  assert.equal(plain.length, 3);
  for (const button of plain) assert.doesNotMatch(button, /tabindex="-1"/);
});

test("LineItems draws the table without the old `stickyReset()` wrapper", () => {
  const columns: LineItemColumn<Linea>[] = [
    { id: "producto", header: "Producto", value: (l) => l.producto },
    {
      id: "cantidad",
      header: "Cantidad",
      numeric: true,
      value: (l) => l.cantidad,
      edit: () => null,
    },
  ];
  const markup = html(
    <LineItems<Linea>
      lines={LINEAS}
      columns={columns}
      getLineId={(l) => l.id}
      onChange={noop}
    />,
  );
  assert.doesNotMatch(markup, /--sticky-top:0px/);
  assert.match(boxOf(markup), /overflow-clip/);
  /* Editable in place, so its rows carry the keyboard route too. */
  assert.equal(rowsOf(markup).filter((tr) => /tabindex="0"/.test(tr)).length, 1);
});

/**
 * Context: below `--container-handheld` each row is a stacked card (a phone shows the
 * amount instead of clipping it). The width is measured in the browser (`ResizeObserver`),
 * driven with puppeteer; what the markup says is the contract of the forced layouts, where
 * each column goes, and that only ONE rendering is ever in the page.
 */
type Fila = {
  id: string;
  producto: string;
  cantidad: number;
  precio: number;
  importe: number;
};
const FILAS: Fila[] = [
  { id: "1", producto: "Licencia", cantidad: 12, precio: 350, importe: 4200 },
  { id: "2", producto: "Soporte", cantidad: 1, precio: 900, importe: 900 },
];
const COLS: EditColumn<Fila>[] = [
  { id: "producto", header: "Producto", render: (f) => f.producto },
  {
    id: "cantidad",
    header: "Cantidad",
    numeric: true,
    render: (f) => String(f.cantidad),
    brief: (f) => `${f.cantidad} × Bs. ${f.precio}`,
    edit: () => <input aria-label="Cantidad" />,
  },
  {
    id: "precio",
    header: "Precio",
    numeric: true,
    stack: "hidden",
    render: (f) => String(f.precio),
  },
  { id: "importe", header: "Importe", numeric: true, render: (f) => `Bs. ${f.importe}` },
];
const stacked = (extra: Partial<Parameters<typeof EditableTable<Fila>>[0]> = {}) =>
  html(
    <EditableTable<Fila>
      rows={FILAS}
      columns={COLS}
      getRowId={(f) => f.id}
      layout="stacked"
      {...extra}
    />,
  );

test("stackPlaces: first column is the title, last numeric the amount, a declared stack wins", () => {
  assert.deepEqual(stackPlaces(COLS), ["title", "detail", "hidden", "amount"]);
  assert.deepEqual(
    stackPlaces([{ numeric: false }, { numeric: true, stack: "title" }, { numeric: true }]),
    ["detail", "title", "amount"],
  );
});

test("stacked: a list of cards with no table in the page, the brief in the detail line", () => {
  const markup = stacked();
  assert.ok(!markup.includes("<table"), "never a table and a list together");
  assert.equal(markup.match(/<li[^>]*data-row-id/g)?.length, 2);
  assert.match(markup, /12 × Bs\. 350/);
  assert.match(markup, /Bs\. 4200/);
  assert.ok(!markup.includes(">Precio"), "a hidden column is not drawn");
});

test("stacked: the amount is named for a screen reader", () => {
  assert.match(stacked(), /<span class="sr-only">Importe <\/span>Bs\. 4200/);
});

test("layout=table keeps the table, whatever the box", () => {
  const markup = html(
    <EditableTable<Fila> rows={FILAS} columns={COLS} getRowId={(f) => f.id} layout="table" />,
  );
  assert.ok(markup.includes("<table") && !markup.includes("data-stacked"));
});

test("stacked cards are ONE tab stop and open with Enter; onOpen makes a read-only list operable", () => {
  const cards = (m: string) => m.match(/<li[^>]*data-row-id[^>]*>/g) ?? [];
  const edit = cards(stacked({ onChange: noop }));
  assert.equal(edit.filter((c) => /tabindex="0"/.test(c)).length, 1);
  assert.ok(edit.every((c) => /aria-keyshortcuts="Enter F2"/.test(c)));
  assert.equal(
    cards(stacked()).filter((c) => /tabindex/.test(c)).length,
    0,
    "read-only: no stops",
  );
  assert.equal(
    cards(stacked({ onOpen: noop })).filter((c) => /tabindex="0"/.test(c)).length,
    1,
  );
});

/* ── adding in place, and Tab across rows ──────────────────────────────────────── */

test("tabTarget: past the last control opens the next row; before the first, the previous", () => {
  const order = ["1", "2", "3"];
  const can = { canAdd: true, blank: false };
  assert.deepEqual(tabTarget(order, "1", "next", can), { kind: "row", id: "2" });
  assert.deepEqual(tabTarget(order, "2", "prev", can), { kind: "row", id: "1" });
  assert.deepEqual(tabTarget(order, "1", "prev", can), { kind: "leave" });
});

test("tabTarget: past the last row it adds one — not from a row just added and still blank", () => {
  const order = ["1", "2"];
  assert.deepEqual(tabTarget(order, "2", "next", { canAdd: true, blank: false }), {
    kind: "add",
  });
  assert.deepEqual(tabTarget(order, "2", "next", { canAdd: true, blank: true }), {
    kind: "leave",
  });
  assert.deepEqual(tabTarget(order, "2", "next", { canAdd: false, blank: false }), {
    kind: "leave",
  });
});

test("LineItems adding inline: «add» is the table's row under the grid, not a header button", () => {
  const columns: LineItemColumn<Linea>[] = [
    { id: "producto", header: "Producto", value: (l) => l.producto, edit: () => null },
  ];
  const props = {
    columns,
    getLineId: (l: Linea) => l.id,
    onChange: noop,
    onAdd: noop,
    newLine: () => ({ id: "n", producto: "", cantidad: 1 }),
  };
  const inline = html(<LineItems<Linea> {...props} lines={LINEAS} adding="inline" />);
  assert.doesNotMatch(inline, /data-line-add/);
  assert.match(
    inline,
    new RegExp(`<button[^>]*>.*${SPANISH_COPY.lines?.add ?? "Agregar una línea"}</button>`),
  );
  /* Empty, it is still a table to write in — its header and the add under it — not the
     «nothing here yet» sentence with a button that would open nothing. */
  const empty = html(<LineItems<Linea> {...props} lines={[]} adding="inline" />);
  assert.match(empty, /<table/);
  assert.match(empty, new RegExp(SPANISH_COPY.lines?.empty ?? ""));
  /* With an editor and no `adding`, the dialog keeps adding, as before. */
  const dialog = html(<LineItems<Linea> {...props} lines={LINEAS} editor={() => null} />);
  assert.match(dialog, /data-line-add/);
});
