import assert from "node:assert/strict";

import {
  type DataColumn,
  DataTable,
  Row,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: in a list and in a table a value is copied without opening its row — the number
 * of an invoice, a customer, an amount. Every cell carries a copy button where the pointer
 * or the focus is, and a list row one for its name. On by default, never imposed: a column
 * says `copy: false` (or what to copy), the table `copyable={false}`, a row `copy={false}`.
 */

type Factura = { id: string; numero: string; importe: number };
const FILAS: Factura[] = [{ id: "1", numero: "FAC/2026/0115", importe: 4132.5 }];
const html = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const COLUMNS: DataColumn<Factura>[] = [
  { id: "numero", header: "Número", value: (f) => f.numero },
  { id: "importe", header: "Importe", numeric: true, value: (f) => f.importe },
];

test("every cell of a table carries a copy button named by its column", () => {
  const out = html(<DataTable data={FILAS} columns={COLUMNS} getRowId={(f) => f.id} />);
  assert.match(out, /aria-label="Copiar «Número»"/);
  assert.match(out, /aria-label="Copiar «Importe»"/);
  /* In a numeric cell the button goes first, so the figures keep the right edge. */
  const importe = out.slice(out.indexOf('aria-label="Copiar «Importe»"'));
  assert.ok(importe.indexOf("4.132,5") > 0, "the figure after its button");
});

test("off for a column, or for the whole table", () => {
  const sinNumero = html(
    <DataTable
      data={FILAS}
      columns={[{ ...COLUMNS[0]!, copy: false }, COLUMNS[1]!]}
      getRowId={(f) => f.id}
    />,
  );
  assert.doesNotMatch(sinNumero, /Copiar «Número»/);
  assert.match(sinNumero, /Copiar «Importe»/);
  assert.doesNotMatch(
    html(
      <DataTable data={FILAS} columns={COLUMNS} getRowId={(f) => f.id} copyable={false} />,
    ),
    /Copiar/,
  );
});

test("a list row copies its name, or what it is told, or nothing", () => {
  assert.match(html(<Row name="FAC/2026/0115" />), /aria-label="Copiar «FAC\/2026\/0115»"/);
  assert.doesNotMatch(html(<Row name="FAC/2026/0115" copy={false} />), /Copiar/);
});
