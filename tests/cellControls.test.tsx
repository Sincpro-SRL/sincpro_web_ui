import assert from "node:assert/strict";

import {
  ComboBox,
  DateField,
  DatePicker,
  DateRangePicker,
  Picker,
  SheetTable,
  TagsField,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a cell of an editable table has no `Field` around its control, so the column's
 * header is not a label the control can point at. Every control that can go in a cell takes
 * an `aria-label` for that case — without it, `Tab` through an edited row reads «combobox»,
 * «group», and nothing that says which column it is.
 */

const named = (html: string, name: string) =>
  assert.match(html, new RegExp(`aria-label="${name}"`), `«${name}» is not named`);

test("a picker outside a field takes its name from aria-label", () => {
  named(
    renderToStaticMarkup(<Picker aria-label="Producto" items={[{ id: "a", name: "A" }]} />),
    "Producto",
  );
});

test("a combobox outside a field takes its name from aria-label", () => {
  named(
    renderToStaticMarkup(
      <ComboBox aria-label="Cliente" value={null} options={[{ value: "a", label: "A" }]} />,
    ),
    "Cliente",
  );
});

test("the date controls outside a field take their name from aria-label", () => {
  named(renderToStaticMarkup(<DateField aria-label="Entrega" value={null} />), "Entrega");
  named(renderToStaticMarkup(<DatePicker aria-label="Vence" value={null} />), "Vence");
  named(
    renderToStaticMarkup(<DateRangePicker aria-label="Vigencia" value={null} />),
    "Vigencia",
  );
});

test("a tags field outside a field names its input and its strip of chips", () => {
  const html = renderToStaticMarkup(
    <TagsField
      aria-label="Impuestos"
      value={["iva"]}
      options={[{ value: "iva", label: "IVA 13 %" }]}
    />,
  );
  assert.equal(html.match(/aria-label="Impuestos"/g)?.length, 2, html);
});

test("a sheet that adds rows says so under the grid; one that only edits does not", () => {
  const columns = [{ id: "a", header: "a" }];
  const sheet = (extra: object) =>
    renderToStaticMarkup(
      <SheetTable
        columns={columns}
        rows={2}
        value={() => "x"}
        onCommit={() => {}}
        {...extra}
      />,
    );
  assert.match(sheet({ onAddRow: () => {} }), /Add a row<\/button>/);
  assert.doesNotMatch(sheet({}), /Add a row/);
});
