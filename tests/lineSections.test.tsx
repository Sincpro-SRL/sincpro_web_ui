import assert from "node:assert/strict";

import {
  EditableTable,
  type EditColumn,
  type LineItemColumn,
  LineItems,
  sectionLines,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a long document is read in parts. Odoo's `display_type` rows — a SECTION that heads
 * the lines under it and says what they add up to, a NOTE between lines — are rows of the same
 * sequence, drawn as bands across the row. And a real line has ten fields: the ones marked
 * `optional` leave the screen from the lists' columns menu. Editing the bands in place and the
 * keys over them are `EditableTable`'s, driven in a browser; this is what the markup can say.
 */

type Fila = { id: string; tipo: "line" | "section" | "note"; texto: string; importe: number };

const FILAS: Fila[] = [
  { id: "s1", tipo: "section", texto: "Equipos", importe: 0 },
  { id: "1", tipo: "line", texto: "Impresora térmica", importe: 4350 },
  { id: "n1", tipo: "note", texto: "Incluye el traslado a La Paz", importe: 0 },
  { id: "2", tipo: "line", texto: "Lector de códigos", importe: 2340 },
  { id: "s2", tipo: "section", texto: "Servicios", importe: 0 },
  { id: "3", tipo: "line", texto: "Instalación", importe: 1200 },
];

const kind = (f: Fila) => (f.tipo === "line" ? null : f.tipo);
const html = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("sectionLines: each section heads the lines up to the next one; notes are not lines", () => {
  const map = sectionLines(FILAS, (f) => f.id, kind);
  assert.deepEqual(
    map.get("s1")?.map((f) => f.id),
    ["1", "2"],
  );
  assert.deepEqual(
    map.get("s2")?.map((f) => f.id),
    ["3"],
  );
});

const COLUMNS: EditColumn<Fila>[] = [
  { id: "texto", header: "Producto", render: (f) => f.texto },
  { id: "importe", header: "Importe", numeric: true, render: (f) => `Bs. ${f.importe}` },
];

test("a section spans up to its total and shows what its lines add up to; a note spans all", () => {
  const out = html(
    <EditableTable<Fila>
      rows={FILAS}
      columns={COLUMNS}
      getRowId={(f) => f.id}
      layout="table"
      bands={{
        kind,
        render: (f) => f.texto,
        total: (c, lines) =>
          c.id === "importe" ? `Bs. ${lines.reduce((a, f) => a + f.importe, 0)}` : null,
      }}
    />,
  );
  assert.match(out, /<td colSpan="1"[^>]*font-semibold[^>]*>Equipos<\/td>/);
  assert.match(out, /Bs\. 6690/, "Equipos: 4350 + 2340");
  assert.match(out, /Bs\. 1200<\/td>/);
  assert.match(out, /<td colSpan="2"[^>]*italic[^>]*>Incluye el traslado a La Paz<\/td>/);
});

test("more ways to add sit beside «add» under the grid", () => {
  const out = html(
    <EditableTable<Fila>
      rows={FILAS}
      columns={COLUMNS}
      getRowId={(f) => f.id}
      layout="table"
      onAdd={() => {}}
      adds={[{ label: "Agregar una sección", onAdd: () => {} }]}
    />,
  );
  assert.match(out, /Agregar una sección<\/button>/);
});

const LINE_COLUMNS: LineItemColumn<Fila>[] = [
  { id: "texto", header: "Producto", value: (f) => f.texto },
  {
    id: "cuenta",
    header: "Cuenta",
    value: () => "4.1.01",
    optional: true,
    defaultHidden: true,
  },
  {
    id: "importe",
    header: "Importe",
    numeric: true,
    value: (f) => f.importe,
    subtotal: (lines) => `Σ ${lines.reduce((a, f) => a + f.importe, 0)}`,
  },
];

const lineItems = (extra: object = {}) =>
  html(
    <LineItems<Fila>
      lines={FILAS}
      columns={LINE_COLUMNS}
      getLineId={(f) => f.id}
      layout="table"
      onChange={() => {}}
      onAdd={() => {}}
      onRemove={() => {}}
      newLine={() => ({ id: "x", tipo: "line", texto: "", importe: 0 })}
      structure={{
        kind: (f) => f.tipo,
        text: (f) => f.texto,
        withText: (f, texto) => ({ ...f, texto }),
        newSection: () => ({ id: "y", tipo: "section", texto: "", importe: 0 }),
        newNote: () => ({ id: "z", tipo: "note", texto: "", importe: 0 }),
      }}
      {...extra}
    />,
  );

test("LineItems: sections and notes are bands, not counted as lines, added in place", () => {
  const out = lineItems();
  assert.match(out, /3 líneas/, "three lines, not six rows");
  assert.match(out, /Σ 6690/, "the section's subtotal");
  assert.match(out, /Agregar una sección<\/button>/);
  assert.match(out, /Agregar una nota<\/button>/);
});

test("LineItems: an optional column hidden by default is not drawn, and the menu offers it", () => {
  const out = lineItems();
  assert.doesNotMatch(out, />Cuenta</);
  assert.match(
    out,
    new RegExp(`aria-haspopup="true"[^>]*>.*${SPANISH_COPY.frame?.columns ?? "columnas"}<`),
  );
  const shown = lineItems({ visibleColumnIds: ["texto", "cuenta", "importe"] });
  assert.match(shown, />Cuenta</);
});

test("LineItems: onOpenLine offers «edit the line» without an editor of its own", () => {
  const edit = new RegExp(`aria-label="${SPANISH_COPY.lines?.edit ?? "Editar la línea"}"`);
  assert.doesNotMatch(lineItems(), edit);
  assert.match(lineItems({ onOpenLine: () => {} }), edit);
});

test("a row's flag is drawn at its start, named by its sentence, never by colour alone", () => {
  const out = html(
    <EditableTable<Fila>
      rows={FILAS.filter((f) => f.tipo === "line")}
      columns={COLUMNS}
      getRowId={(f) => f.id}
      layout="table"
      flag={(f) =>
        f.id === "1"
          ? { tone: "bad", label: "Sin existencias", detail: "llegan 10 el 4/11" }
          : null
      }
    />,
  );
  assert.equal(out.match(/aria-label="Sin existencias"/g)?.length, 1, "only the flagged row");
  assert.match(out, /aria-label="Sin existencias"[^>]*>[\s\S]*?lucide-circle-alert/);
  assert.ok(
    out.indexOf('aria-label="Sin existencias"') < out.indexOf("Impresora térmica"),
    "before the row's first value",
  );
});
