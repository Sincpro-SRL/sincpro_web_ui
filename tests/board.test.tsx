import assert from "node:assert/strict";
import { test } from "node:test";

import { BoardColumns, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: a pipeline is read across — one column per stage with how many it holds — and a
 * card changes stage by being dragged, or with Alt + ← / → from the keyboard. Without
 * `onMove` the board only shows.
 */

type Pedido = { id: string; etapa: string };
const PEDIDOS: Pedido[] = [
  { id: "S1", etapa: "cotizacion" },
  { id: "S2", etapa: "pedido" },
  { id: "S3", etapa: "pedido" },
];
const COLUMNAS = [
  { id: "cotizacion", label: "cotización" },
  { id: "pedido", label: "pedido", tone: "info" as const },
  { id: "facturado", label: "facturado" },
];

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const board = (onMove?: (item: Pedido, to: string) => void) =>
  draw(
    <BoardColumns<Pedido>
      items={PEDIDOS}
      keyOf={(p) => p.id}
      stages={{
        of: (p) => p.etapa,
        columns: COLUMNAS,
        ...(onMove === undefined ? {} : { onMove }),
      }}
      card={(p) => <span>{p.id}</span>}
    />,
  );

test("one column per stage, in order, each with how many it holds", () => {
  const html = board();
  const order = COLUMNAS.map((c) => html.indexOf(`aria-label="${c.label}"`));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]!)));
  assert.match(html, /aria-label="pedido".*?>2<\/span>/s);
  assert.ok(html.includes("Nada en esta etapa."), "an empty stage says so");
});

test("with onMove the cards drag and take the keyboard; without it they only show", () => {
  const moving = board(() => {});
  const still = board();
  assert.equal(moving.split('draggable="true"').length - 1, 3);
  assert.equal(
    moving.split('aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"').length - 1,
    3,
  );
  assert.doesNotMatch(still, /draggable/);
  assert.doesNotMatch(still, /tabindex/);
});
