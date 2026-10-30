import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FormModeProvider,
  type LineItemColumn,
  LineItems,
  SPANISH_COPY,
  ToastProvider,
  UiCopyProvider,
} from "@sincpro/web-ui";
import {
  commitDraft,
  filterLines,
  planRemoval,
} from "@sincpro/web-ui/components/lines/lines";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the presses —the editor's focus trap, Escape, the toast's «Deshacer»— are React
 * Aria's and were driven in a browser (puppeteer). What is ours is the contract: the search
 * only above the threshold, the count, one «add», read mode with no actions, the empty state
 * with its way out, and the PLAIN values each callback receives — the line's id, the line
 * itself, the index it had.
 */

type L = { id: string; product: string; quantity: number };

const COLUMNS: LineItemColumn<L>[] = [
  { id: "product", header: "Producto", value: (l) => l.product },
  {
    id: "quantity",
    header: "Cantidad",
    numeric: true,
    value: (l) => l.quantity,
    edit: () => null,
  },
];

const lines = (n: number): L[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `L${i}`,
    product: i % 2 === 0 ? `Impresora ${i}` : `Licencia ${i}`,
    quantity: i + 1,
  }));

const noop = () => {};

function html(node: ReactElement): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <ToastProvider>{node}</ToastProvider>
    </UiCopyProvider>,
  );
}

function editable(n: number, extra: Partial<Parameters<typeof LineItems<L>>[0]> = {}) {
  return html(
    <LineItems<L>
      lines={lines(n)}
      columns={COLUMNS}
      getLineId={(l) => l.id}
      onChange={noop}
      onAdd={noop}
      newLine={() => ({ id: "new", product: "", quantity: 1 })}
      onRemove={noop}
      editor={() => null}
      {...extra}
    />,
  );
}

test("the search shows up only above the threshold (8 lines by default)", () => {
  assert.doesNotMatch(editable(8), /Buscar en las líneas/);
  assert.match(editable(9), /placeholder="Buscar en las líneas…"/);
  assert.doesNotMatch(editable(12, { searchFrom: 20 }), /Buscar en las líneas/);
});

test("the search box is named, though its label is not drawn", () => {
  const out = editable(9);
  const id = /<span id="([^"]+)" class="sr-only">Buscar en las líneas…<\/span>/.exec(
    out,
  )?.[1];
  assert.ok(id, "a hidden label exists");
  assert.match(out, new RegExp(`aria-labelledby="${id}"`));
});

test("the toolbar counts the lines and offers ONE add, which is not the primary action", () => {
  const out = editable(3);
  assert.match(out, />3 líneas</);
  assert.equal(out.match(/Agregar una línea/g)?.length, 1);
  assert.doesNotMatch(out, /data-emphasis="primary"/);
  assert.match(editable(1), />1 línea</);
});

test("each line has its edit and remove, named and tied to the line", () => {
  const out = editable(2);
  assert.equal(out.match(/aria-label="Editar la línea"/g)?.length, 2);
  assert.equal(out.match(/aria-label="Quitar la línea"/g)?.length, 2);
  assert.match(out, /aria-describedby="[^"]+-line-L0"/);
  assert.match(out, /aria-haspopup="dialog"/);
});

test("read mode hides add, edit and remove — the lines and the totals stay", () => {
  const out = html(
    <LineItems<L>
      mode="read"
      lines={lines(3)}
      columns={COLUMNS}
      getLineId={(l) => l.id}
      onChange={noop}
      onAdd={noop}
      newLine={() => ({ id: "n", product: "", quantity: 1 })}
      onRemove={noop}
      editor={() => null}
      totals={[{ label: "Total", value: "Bs. 100,00", total: true }]}
    />,
  );
  assert.doesNotMatch(out, /Agregar una línea|Editar la línea|Quitar la línea/);
  assert.match(out, /Impresora 0/);
  assert.match(out, /Bs\. 100,00/);
});

test("read mode is inherited from the form", () => {
  const out = html(
    <FormModeProvider value="read">
      <LineItems<L>
        lines={lines(2)}
        columns={COLUMNS}
        getLineId={(l) => l.id}
        onAdd={noop}
        newLine={() => ({ id: "n", product: "", quantity: 1 })}
        onRemove={noop}
      />
    </FormModeProvider>,
  );
  assert.doesNotMatch(out, /Agregar una línea|Quitar la línea/);
});

test("without lines: the sentence and the way to add the first one", () => {
  const out = editable(0);
  assert.match(out, /Todavía no hay líneas\./);
  assert.match(out, /Agregar una línea/);
  assert.doesNotMatch(out, /<table/);
  const read = html(
    <LineItems<L> mode="read" lines={[]} columns={COLUMNS} getLineId={(l) => l.id} />,
  );
  assert.match(read, /Todavía no hay líneas\./);
  assert.doesNotMatch(read, /Agregar una línea/);
});

test("the search filters by every column's text, ignoring case", () => {
  const all = lines(10);
  const text = (l: L) => `${l.product} ${l.quantity}`;
  assert.deepEqual(
    filterLines(all, "IMPRESORA", text, "es-BO").map((l) => l.id),
    ["L0", "L2", "L4", "L6", "L8"],
  );
  assert.equal(filterLines(all, "  ", text, "es-BO"), all);
});

test("removing hands the id, and undo gets the line and the index it had", () => {
  const all = lines(4);
  const plan = planRemoval(all, all, "L1", (l) => l.id);
  assert.deepEqual(plan, { index: 1, focus: "L2" });
  // The last line passes the focus to the previous one; the only one, to nobody (the add).
  assert.deepEqual(
    planRemoval(all, all, "L3", (l) => l.id),
    { index: 3, focus: "L2" },
  );
  assert.deepEqual(
    planRemoval([all[0]!], [all[0]!], "L0", (l) => l.id),
    {
      index: 0,
      focus: null,
    },
  );
  // While searching, the index is among ALL the lines, the focus among the visible ones.
  const shown = [all[0]!, all[2]!];
  assert.deepEqual(
    planRemoval(all, shown, "L2", (l) => l.id),
    { index: 2, focus: "L0" },
  );
});

test("«Listo» adds a new line, changes an existing one, and waits on an invalid draft", () => {
  const draft = { id: "N1", product: "Impresora", quantity: 2 };
  assert.deepEqual(commitDraft(null, draft), { kind: "add", line: draft });
  assert.deepEqual(commitDraft("L0", draft), { kind: "change", id: "L0", line: draft });
  assert.deepEqual(
    commitDraft(null, { ...draft, product: "" }, (d) => d.product !== ""),
    { kind: "invalid" },
  );
});

test("on a phone the lines are cards: no pencil/trash targets needed, the card is the way in", () => {
  const cols: LineItemColumn<L>[] = [
    COLUMNS[0]!,
    { ...COLUMNS[1]!, brief: (l) => `${l.quantity} × Bs. 10` },
    {
      id: "amount",
      header: "Importe",
      numeric: true,
      value: (l) => l.quantity * 10,
      stack: "amount",
    },
  ];
  const markup = editable(2, { columns: cols, layout: "stacked" });
  assert.ok(!markup.includes("<table"));
  assert.match(markup, /<li[^>]*data-row-id="L0"/);
  assert.match(markup, /1 × Bs\. 10/);
  assert.equal(
    markup.match(/aria-label="Editar la línea"/g)?.length ?? 0,
    0,
    "pencil hidden on cards",
  );
});

test("without an editor the card keeps its trash, so removing stays possible", () => {
  const markup = editable(2, { editor: undefined, layout: "stacked" });
  assert.match(markup, /aria-label="Quitar la línea"/);
});
