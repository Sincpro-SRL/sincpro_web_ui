import assert from "node:assert/strict";

import { EditableTable, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the lines of a document have an order of their own (Odoo's `sequence`), changed by
 * a grip at the start of each row — dragged, or Alt + ↑ / ↓. And every row keeps its hairline:
 * a shadowed variable once drew the cells with the class «null».
 */

type Linea = { id: string; producto: string; grupo: string };
const LINEAS: Linea[] = [
  { id: "a", producto: "Impresora", grupo: "equipos" },
  { id: "b", producto: "Soporte", grupo: "servicios" },
];

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const tabla = (extra: Partial<Parameters<typeof EditableTable<Linea>>[0]> = {}) =>
  draw(
    <EditableTable<Linea>
      rows={LINEAS}
      getRowId={(l) => l.id}
      onChange={() => {}}
      layout="table"
      columns={[{ id: "producto", header: "Producto", render: (l) => l.producto }]}
      {...extra}
    />,
  );

test("with onReorder each row has a grip, named and with its keys; without it, none", () => {
  const con = tabla({ onReorder: () => {} });
  assert.equal(con.split('aria-label="Mover la fila"').length - 1, 2);
  assert.match(con, /aria-keyshortcuts="Alt\+ArrowUp Alt\+ArrowDown"/);
  assert.match(con, /draggable="true"/);
  assert.doesNotMatch(tabla(), /Mover la fila/);
});

test("grouped, the piles decide the order and there is no grip", () => {
  const html = tabla({
    onReorder: () => {},
    grouping: { levels: [{ field: "grupo" }], of: (l: Linea) => l.grupo },
  } as Partial<Parameters<typeof EditableTable<Linea>>[0]>);
  assert.doesNotMatch(html, /Mover la fila/);
});

test("every cell keeps the row's hairline and hover wash", () => {
  const html = tabla();
  const cell = /<td class="([^"]*)"[^>]*>Impresora/.exec(html)?.[1] ?? "";
  assert.match(cell, /border-b border-line/);
  assert.doesNotMatch(cell, /\bnull\b/);
});
