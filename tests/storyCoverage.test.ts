import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import * as pkg from "@sincpro/web-ui";

/**
 * Context: Storybook is the catalogue — if a component is public and nobody can see it there,
 * nobody knows it exists, and the next person writes a second one. So every exported
 * component is drawn in some story, or it is a building block that is seen INSIDE a composite
 * and listed below with where. A piece that nobody draws and nothing composes is either
 * missing a story or should not be public.
 *
 * The list is a contract too: an entry that gets its own story, or stops being exported,
 * must leave the list — a stale excuse is how the list grows forever.
 */
const SHOWN_THROUGH: Readonly<Record<string, string>> = {
  ColumnsMenu: "the list bar — 4 · Vistas/Lista",
  SortMenu: "the list bar — 4 · Vistas/Lista",
  CriteriaChips: "SearchBar — 3 · Componentes/Búsqueda",
  JsonEditor: "CriteriaBuilder and FilterBuilder",
  RowActions: "DataTable rows — 3 · Componentes/Datos/Tabla",
  SectionHeader: "Block — 2 · Primitivas/Block",
  RecordLink: "the rows of Listing — 4 · Vistas/Lista",
  FieldLayoutProvider: "Sheet — the two layouts of a form",
  ReadValue: "the read mode of every control — Fechas · Lectura, Elecciones · Lectura",
  Popover: "DatePicker, ComboBox and PopoverTrigger",
  RangeCalendar: "DateRangePicker — 2 · Primitivas/Fechas",
  RecordSkeleton: "Record.Skeleton — 4 · Vistas/Registro · Cargando",
  DirtyActions: "Record's `dirty` — 5 · Plantillas · Factura (edit a field)",
  ToastLayer: "ToastProvider — 5 · Plantillas · Factura (register a payment)",
  AssistLabel: "AssistSuggestion, AssistPending and ChangeReview — 3 · Componentes/Asistente",
  AssistSourceLink:
    "AssistSuggestion, ChangeReview and AssistMark — 3 · Componentes/Asistente",
  Totals: "LineItems' `totals` — 3 · Componentes/Datos/Líneas, 5 · Plantillas · Factura",
};

const ROOT = join(import.meta.dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(tsx|mdx)$/.test(entry.name) ? [path] : [];
  });
}

const stories = files(join(ROOT, "stories"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const drawn = (name: string) => new RegExp(`<${name}(?:[\\s>/.]|$)`, "m").test(stories);

const components = Object.entries(pkg)
  .filter(
    ([name, value]) =>
      /^[A-Z][a-z]/.test(name) &&
      (typeof value === "function" ||
        (typeof value === "object" && value !== null && "$$typeof" in value)),
  )
  .map(([name]) => name);

test("every public component is drawn in a story, or listed with where it is seen", () => {
  const unseen = components.filter((name) => !drawn(name) && !(name in SHOWN_THROUGH));
  assert.deepEqual(unseen, [], "write a story for these, or stop exporting them");
});

test("the list of building blocks has no stale entries", () => {
  const stale = Object.keys(SHOWN_THROUGH).filter(
    (name) => !components.includes(name) || drawn(name),
  );
  assert.deepEqual(stale, [], "these have their own story now, or are no longer public");
});
