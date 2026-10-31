import assert from "node:assert/strict";

import { type DataColumn, DataTable } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a `DataTable` column that declares `edit` turns its cell into a button that opens
 * the editor in a popover (React Aria's dialog trigger; Enter, Escape, the click outside and
 * the focus coming back are driven in a browser). What is ours: the cell says it can be
 * edited — a button named «verb + column + value», with the pencil drawn for hover and focus
 * — only on the rows `when` allows, and a table without `edit` is drawn EXACTLY as before.
 */

type Factura = { id: string; numero: string; vence: string; estado: "posted" | "paid" };

const FILAS: Factura[] = [
  { id: "a", numero: "FAC/2026/0119", vence: "2026-11-24", estado: "posted" },
  { id: "b", numero: "FAC/2026/0120", vence: "2026-11-27", estado: "paid" },
];

const BASE: DataColumn<Factura>[] = [
  { id: "numero", header: "número", value: (f) => f.numero },
  { id: "vence", header: "vence", value: (f) => f.vence },
];

const draw = (columns: DataColumn<Factura>[]) =>
  renderToStaticMarkup(<DataTable data={FILAS} columns={columns} getRowId={(f) => f.id} />);

/** The rows only: the header has its own sort buttons. */
const body = (html: string) => /<tbody>.*<\/tbody>/s.exec(html)?.[0] ?? "";

const withEdit = (when?: (f: Factura) => boolean): DataColumn<Factura>[] => [
  BASE[0]!,
  {
    ...BASE[1]!,
    edit: { render: () => <span>editor</span>, ...(when === undefined ? {} : { when }) },
  },
];

test("an editable cell is a button named by the verb, the column and the value", () => {
  const html = draw(withEdit());
  const buttons = html.match(/<button[^>]*aria-labelledby="[^"]+"[^>]*>/g) ?? [];
  assert.equal(buttons.length, 2, "one per row of the editable column");
  assert.match(html, /<span id="[^"]+" hidden="">Edit vence<\/span>/);
  assert.match(html, /2026-11-24/);
  /* The editor itself is not drawn until the cell is opened. */
  assert.doesNotMatch(html, /editor/);
});

test("the pencil is drawn only for hover and focus, never always on", () => {
  const html = draw(withEdit());
  const pencils = html.match(/<svg[^>]*lucide-pencil[^>]*>/g) ?? [];
  assert.equal(pencils.length, 2);
  for (const pencil of pencils) {
    assert.match(pencil, /opacity-0/);
    assert.match(pencil, /group-hover\/edit:opacity-100/);
    assert.match(pencil, /group-focus-visible\/edit:opacity-100/);
    assert.match(pencil, /aria-hidden="true"/);
  }
});

/** A button that is not a cell's copy button. */
const EDITOR = /<button(?![^>]*aria-label="Cop)/g;

test("`when` leaves the rows that cannot change as plain cells", () => {
  const html = draw(withEdit((f) => f.estado !== "paid"));
  /* The cells' copy buttons are not editors: only the editing buttons are counted. */
  assert.equal((body(html).match(EDITOR) ?? []).length, 1, "only the posted invoice");
});

test("without `edit` the table is drawn exactly as before", () => {
  const plain = draw(BASE);
  assert.doesNotMatch(body(plain), EDITOR);
  assert.doesNotMatch(plain, /lucide-pencil/);
  /* A column that declares `edit` but allows no row is the same table, byte for byte. */
  assert.equal(draw(withEdit(() => false)), plain);
});
