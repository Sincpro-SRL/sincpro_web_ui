import assert from "node:assert/strict";

import {
  ComboBox,
  controlName,
  DataTable,
  DatePicker,
  EditableTable,
  Field,
  type LineItemColumn,
  LineItems,
  Picker,
  SPANISH_COPY,
  TextInput,
  ToastProvider,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: three ways the form contract leaked. A table inside a `Field` handed the field's id
 * and label to every cell's control; a control with its own `aria-label` inside a `Field` was
 * named twice; and a column's `text` — how it reads — lost to the raw value when there was no
 * `cell`.
 */

type L = { id: string; product: string; unit: string };
const ROWS: L[] = [
  { id: "a", product: "Cemento", unit: "u3" },
  { id: "b", product: "Arena", unit: "u7" },
];
const UNIT_NAME: Record<string, string> = { u3: "bolsa 50 kg", u7: "m³" };

const draw = (node: ReactElement) =>
  renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <ToastProvider>{node}</ToastProvider>
    </UiCopyProvider>,
  );

const qty = () => <TextInput aria-label="Cantidad" value="1" onChange={() => {}} />;

function assertCellsOwnTheirNames(html: string) {
  /* No cell control takes the field's id or its label. */
  assert.doesNotMatch(html, /<input[^>]*id="lineas"/);
  assert.doesNotMatch(html, /<input[^>]*aria-labelledby="lineas-label"/);
  /* Each one keeps the column's name. */
  assert.equal([...html.matchAll(/<input[^>]*aria-label="Cantidad"/g)].length, ROWS.length);
}

/* ── 1. A collection inside a Field ───────────────────────────────────── */

test("an EditableTable inside a Field: its cells are not the field", () => {
  assertCellsOwnTheirNames(
    draw(
      <Field label="Líneas" htmlFor="lineas">
        <EditableTable<L>
          rows={ROWS}
          getRowId={(l) => l.id}
          layout="table"
          columns={[
            { id: "product", header: "Producto", render: (l) => l.product },
            { id: "qty", header: "Cantidad", render: qty },
          ]}
        />
      </Field>,
    ),
  );
});

test("a DataTable inside a Field: the same", () => {
  assertCellsOwnTheirNames(
    draw(
      <Field label="Líneas" htmlFor="lineas">
        <DataTable<L>
          data={ROWS}
          getRowId={(l) => l.id}
          columns={[
            { id: "product", header: "Producto", value: (l) => l.product },
            { id: "qty", header: "Cantidad", value: () => 1, cell: qty },
          ]}
        />
      </Field>,
    ),
  );
});

test("LineItems inside a Field: the same", () => {
  assertCellsOwnTheirNames(
    draw(
      <Field label="Líneas" htmlFor="lineas">
        <LineItems<L>
          lines={ROWS}
          getLineId={(l) => l.id}
          columns={[
            { id: "product", header: "Producto", value: (l) => l.product },
            { id: "qty", header: "Cantidad", value: () => 1, cell: qty },
          ]}
        />
      </Field>,
    ),
  );
});

/* ── 2. `text` before the raw value ───────────────────────────────────── */

const UNIT_COLUMN = {
  id: "unit",
  header: "Unidad",
  value: (l: L) => l.unit,
  text: (l: L) => UNIT_NAME[l.unit] ?? l.unit,
};

test("LineItems: a column with `text` and no `cell` draws the text", () => {
  const columns: LineItemColumn<L>[] = [
    { id: "product", header: "Producto", value: (l) => l.product },
    UNIT_COLUMN,
  ];
  const html = draw(<LineItems<L> lines={ROWS} getLineId={(l) => l.id} columns={columns} />);
  assert.ok(html.includes("bolsa 50 kg"));
  assert.ok(html.includes("m³"));
  assert.doesNotMatch(html, />u3</);
});

test("DataTable: the same", () => {
  const html = draw(
    <DataTable<L>
      data={ROWS}
      getRowId={(l) => l.id}
      columns={[{ id: "product", header: "Producto", value: (l) => l.product }, UNIT_COLUMN]}
    />,
  );
  assert.ok(html.includes("bolsa 50 kg"));
  assert.doesNotMatch(html, />u3</);
});

/* ── 3. Inside a Field, the field names the control ───────────────────── */

test("controlName: the field wins; outside one, the own label, then the fallback", () => {
  assert.equal(controlName("x-label", "Propio", "placeholder"), undefined);
  assert.equal(controlName(undefined, "Propio", "placeholder"), "Propio");
  assert.equal(controlName(undefined, undefined, "placeholder"), "placeholder");
});

test("a control with an aria-label inside a Field is named once, by the field", () => {
  const cases: [string, ReactElement][] = [
    ["TextInput", <TextInput key="t" aria-label="Doble" value="" onChange={() => {}} />],
    ["Picker", <Picker key="p" aria-label="Doble" items={[{ id: "1", name: "Uno" }]} />],
    [
      "ComboBox",
      <ComboBox
        key="c"
        aria-label="Doble"
        options={[{ value: "1", label: "Uno" }]}
        value=""
      />,
    ],
    ["DatePicker", <DatePicker key="d" aria-label="Doble" value={null} />],
  ];
  for (const [name, control] of cases) {
    const html = draw(
      <Field label="Cliente" htmlFor="campo">
        {control}
      </Field>,
    );
    assert.match(html, /aria-labelledby="campo-label/, `${name} is labelled by the field`);
    assert.doesNotMatch(html, /aria-label="Doble"/, `${name} drops its own aria-label`);
  }
});

test("outside a Field the control keeps its own aria-label", () => {
  assert.match(
    draw(<TextInput aria-label="Cantidad" value="" onChange={() => {}} />),
    /aria-label="Cantidad"/,
  );
});
