import assert from "node:assert/strict";

import { FormSection } from "@sincpro/web-ui/components/form/Form";
import { Sheet, SheetGroup, SheetGroups } from "@sincpro/web-ui/components/form/Sheet";
import { FormStyleProvider } from "@sincpro/web-ui/foundations/form";
import { EditableTable } from "@sincpro/web-ui/primitives/table/EditableTable";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * THE «SECTIONS» STYLE: the dense sheet in the settings' shape. A group on the paper is a
 * card; a group inside a card stays a group — a card in a card is a box in a box.
 */

const sections = (node: React.ReactNode) =>
  renderToStaticMarkup(<FormStyleProvider value="sections">{node}</FormStyleProvider>);

test("on the paper each group is a card, side by side with a gap and no hairline", () => {
  const html = sections(
    <Sheet
      head={
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente">a</SheetGroup>
          <SheetGroup title="Condiciones">b</SheetGroup>
        </SheetGroups>
      }
    />,
  );
  assert.equal(html.match(/data-ui="form.section"/g)?.length, 2);
  assert.match(html, /gap-4/);
  assert.doesNotMatch(html, /border-l border-line/);
});

test("inside a section card, a group stays a group: titled, with its hairline columns", () => {
  const html = sections(
    <FormSection title="Ventas">
      <SheetGroups columns={2}>
        <SheetGroup title="Crédito">a</SheetGroup>
        <SheetGroup title="Tablero">b</SheetGroup>
      </SheetGroups>
    </FormSection>,
  );
  assert.equal(html.match(/data-ui="form.section"/g)?.length, 1);
  assert.match(html, /border-l border-line/);
  assert.match(html, /<h2[^>]*first-letter:uppercase[^>]*>Ventas</);
});

test("without the style the sheet is the dense one it always was", () => {
  const html = renderToStaticMarkup(
    <SheetGroups columns={2}>
      <SheetGroup title="Cliente">a</SheetGroup>
      <SheetGroup title="Condiciones">b</SheetGroup>
    </SheetGroups>,
  );
  assert.doesNotMatch(html, /form\.section/);
});

test("a table's title column keeps its width beside figures", () => {
  type Line = { id: string; product: string; price: number };
  const html = renderToStaticMarkup(
    <EditableTable<Line>
      rows={[{ id: "1", product: "Impresora térmica", price: 1450 }]}
      getRowId={(l) => l.id}
      layout="table"
      columns={[
        { id: "product", header: "Producto", render: (l) => l.product },
        { id: "price", header: "Precio", numeric: true, width: 130, render: (l) => l.price },
      ]}
    />,
  );
  assert.match(html, /<th[^>]*min-w-\(--size-cell-title\)[^>]*>Producto</);
  assert.doesNotMatch(html, /<th[^>]*min-w-\(--size-cell-title\)[^>]*>Precio</);
});
