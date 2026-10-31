import assert from "node:assert/strict";
import { test } from "node:test";

import { type DataColumn, List, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: a row has two ways in — a look without leaving the list (👁) and the record itself
 * (↗). A click nobody announces is a click nobody makes, so both are written on the row, in
 * every presentation; and a list that is only for reading says so with ONE switch.
 */

type Pedido = { id: string; nombre: string; total: number };

const PEDIDOS: Pedido[] = [
  { id: "p1", nombre: "S00142", total: 58000 },
  { id: "p2", nombre: "S00141", total: 14300 },
];

const COLUMNAS: DataColumn<Pedido>[] = [
  { id: "nombre", header: "pedido", value: (p) => p.nombre },
  { id: "total", header: "total", value: (p) => p.total, numeric: true },
];

const SELECTION = { has: () => false, toggle: () => {}, count: 0, clear: () => {} };

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

function Pedidos({ present, readOnly }: { present: "rows" | "table"; readOnly?: boolean }) {
  return (
    <List<Pedido>
      embedded
      items={PEDIDOS}
      keyOf={(p) => p.id}
      present={present}
      selection={SELECTION}
      onPeek={() => {}}
      onOpen={() => {}}
      {...(readOnly === undefined ? {} : { readOnly })}
    >
      <List.Rows<Pedido> row={(p) => ({ name: p.nombre })} />
      <List.Table<Pedido> columns={COLUMNAS} rowActions={() => []} />
    </List>
  );
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

for (const present of ["rows", "table"] as const) {
  test(`${present}: each row says its two ways in, look and open`, () => {
    const html = draw(<Pedidos present={present} />);
    assert.equal(count(html, 'aria-label="Vistazo'), 2);
    assert.equal(count(html, 'aria-label="Abrir'), 2);
  });

  test(`${present}: readOnly drops opening, peeking and selecting at once`, () => {
    const html = draw(<Pedidos present={present} readOnly />);
    assert.equal(count(html, 'aria-label="Vistazo'), 0);
    assert.equal(count(html, 'aria-label="Abrir'), 0);
    assert.equal(count(html, 'type="checkbox"'), 0);
    assert.doesNotMatch(html, /cursor-pointer/);
  });
}

test("a read-only row does not light up on hover", () => {
  const html = draw(<Pedidos present="rows" readOnly />);
  assert.doesNotMatch(html, /data-slot="row"[^>]*hover:bg-ink/);
});

test("the rows' header reserves exactly what the rows have at their end", () => {
  const html = draw(
    <List<Pedido>
      embedded
      items={PEDIDOS}
      keyOf={(p) => p.id}
      onPeek={() => {}}
      onOpen={() => {}}
    >
      <List.Rows<Pedido> header={{ name: "pedido" }} row={(p) => ({ name: p.nombre })} />
    </List>,
  );
  /* Invisible and inert: it takes the width and nobody can reach it. */
  const ghost = /<span inert=""[^>]*class="invisible[^"]*">(.*?)<\/span><\/div>/s.exec(
    html,
  )?.[1];
  assert.ok(ghost !== undefined, "the header draws the rows' trail, invisible");
  assert.equal(count(ghost, "<button"), 3, "copy, look and open — the same three as a row");
});

test("table: a read-only row has no hover wash; an openable one does, actions included", () => {
  const read = draw(<Pedidos present="table" readOnly />);
  const open = draw(<Pedidos present="table" />);
  assert.doesNotMatch(read, /group-hover\/row:bg-ink/);
  /* Every cell of the two rows: checkbox, 2 data columns and the actions' one, ×2 rows. */
  assert.equal(count(open, "group-hover/row:bg-ink/4"), 8);
});

test("with more matching than chosen, the bar offers to choose them all — and not after", () => {
  const offer = (count: number) =>
    draw(
      <List<Pedido>
        items={PEDIDOS}
        keyOf={(p) => p.id}
        selection={{ ...SELECTION, count, matching: { total: 187, onSelect: () => {} } }}
      >
        <List.Rows<Pedido> row={(p) => ({ name: p.nombre })} />
      </List>,
    );
  assert.ok(offer(1).includes("Elegir los 187 que coinciden"));
  assert.ok(!offer(187).includes("que coinciden"));
});
