import assert from "node:assert/strict";

import {
  Board,
  BoardColumns,
  BoardTile,
  Metric,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

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
  assert.doesNotMatch(still, /<li[^>]*tabindex/, "a read-only card is not a stop of its own");
});

/* ---------------------------------------------------------------- *
 *  THE BI BOARD — each tile reads on its own (issue #27)
 * ---------------------------------------------------------------- */

const tile = (state?: Parameters<typeof BoardTile>[0]["state"]) =>
  draw(
    <BoardTile
      title="Por canal"
      description="por canal"
      {...(state === undefined ? {} : { state })}
    >
      <figure>gráfico</figure>
    </BoardTile>,
  );

test("a tile reading keeps its title and the chart's room, and says it is busy", () => {
  const html = tile({ status: "loading" });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Por canal/);
  assert.match(html, /min-h-\(--size-tile-body\)/);
  assert.doesNotMatch(html, /gráfico/);
  assert.match(html, /Cargando…/);
});

test("a failed tile says which one and why, and offers to ask again", () => {
  const html = tile({
    status: "failed",
    sentence: "El servidor no respondió.",
    detail: "504",
    onRetry: () => {},
  });
  assert.match(html, /No se pudo leer «Por canal»/);
  assert.match(html, /El servidor no respondió\./);
  assert.match(html, />Reintentar</);
  assert.doesNotMatch(html, /gráfico/);
  /* Without a way to ask again, no button that does nothing. */
  assert.doesNotMatch(tile({ status: "failed", sentence: "No." }), /Reintentar/);
});

test("a tile with no state, or ready, draws what it holds", () => {
  assert.match(tile(), /gráfico/);
  assert.match(tile({ status: "ready" }), /gráfico/);
  assert.doesNotMatch(tile(), /aria-busy/);
});

test("the board's own state takes the headline numbers' place, never the tiles'", () => {
  const board = (state: Parameters<typeof Board>[0]["state"]) =>
    draw(
      <Board title="Ventas" metrics={<Metric value={3} label="ventas" />} state={state}>
        <BoardTile title="Por mes">
          <figure>gráfico</figure>
        </BoardTile>
      </Board>,
    );
  const reading = board({ status: "loading" });
  assert.match(reading, /aria-busy="true"/);
  assert.doesNotMatch(reading, /ventas</);
  assert.match(reading, /gráfico/);
  const failed = board({ status: "failed", sentence: "Sin permiso." });
  assert.match(failed, /No se pudieron leer los números del tablero/);
  assert.match(failed, /gráfico/);
  assert.match(board({ status: "ready" }), /ventas</);
});
