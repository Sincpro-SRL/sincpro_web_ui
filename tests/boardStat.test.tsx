import assert from "node:assert/strict";

import {
  BarList,
  BoardStat,
  BoardStats,
  BoardTile,
  chartFromRecord,
  SPANISH_COPY,
  Sparkline,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a board leads with its figures — each a tile as wide as the columns under it, the
 * figure in its own type step and the shape of the last periods beside it — and ranks with a
 * bar list instead of a chart with two axes. These hold what each one promises in markup.
 */

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("la cifra va en su escalón, con su ícono, su ⓘ y su variación", () => {
  const html = draw(
    <BoardStat
      label="Mensajes recibidos"
      value={1240}
      icon={Inbox}
      hint="Los que entraron por SMTP en el período."
      change={{ by: 0.18, against: "ayer" }}
    />,
  );
  assert.match(html, /data-ui="board\.stat"/);
  /* Its step is a ceiling: it fits its tile (`figure-fit`), told its length (#68). */
  assert.match(
    html,
    /style="--figure-length:5"[^>]*class="[^"]*figure-fit[^"]*"[^>]*>1\.240</,
  );
  /* Proportional digits: tabular ones space a lone figure like a column. */
  assert.doesNotMatch(html, /figure-fit[^"]*tabular-nums/);
  assert.match(html, /vs ayer/);
  assert.match(html, /aria-label="Mensajes recibidos"/);
});

test("sin valor dice «Sin datos», no un cero ni una raya", () => {
  const html = draw(<BoardStat label="Correo limpio" hero />);
  /* The lead figure's ceiling is the hero step. */
  assert.match(html, /--figure-step:var\(--text-hero\)[^>]*>Sin datos</);
});

test("leyendo, la cifra guarda su lugar y no se escribe", () => {
  const html = draw(
    <BoardStat label="Memoria" value="50 MB" state={{ status: "loading" }} />,
  );
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /50 MB/);
});

test("el tono es el estado de la lectura: tiñe el recuadro y se nombra en data-tone", () => {
  const html = draw(<BoardStat label="Correo limpio" value="62 %" tone="bad" />);
  assert.match(html, /data-tone="bad"/);
  assert.match(html, /bg-bad\/6/);
  /* The figure stays ink: text never wears the state colour alone. */
  assert.match(html, /figure-fit[^"]*text-ink|text-ink[^"]*figure-fit/);
});

test("la tendencia es una sparkline con nombre, y su último punto marcado", () => {
  const html = draw(<Sparkline values={[3, 5, null, 4, 8]} label="Recibidos, 24 h" />);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Recibidos, 24 h"/);
  /* Two runs around the hole: two strokes. */
  assert.equal((html.match(/stroke="var\(--color-data-soft\)"/g) ?? []).length, 2);
  assert.match(html, /bg-data/);
});

test("una serie en cero se dibuja en el piso; sin valores no se dibuja nada", () => {
  const flat = draw(<Sparkline values={[0, 0, 0]} label="Pendientes" />);
  assert.match(flat, /d="M0\.00,36\.00 L50\.00,36\.00 L100\.00,36\.00"/);
  assert.equal(draw(<Sparkline values={[null, null]} label="Nada" />), "");
});

test("una lista de barras: el nombre, la barra contra el mayor, el número", () => {
  const data = chartFromRecord(
    { "Logins fallidos": 12, Spam: 0, "IP bloqueadas": 3, "Sin contar": null },
    { header: "rechazos" },
  );
  const html = draw(<BarList data={data} label="Rechazos" />);
  assert.match(html, /aria-label="Rechazos"/);
  assert.match(html, /width:100%/);
  assert.match(html, /width:25%/);
  /* A zero is a row with an empty track; a hole reads «—». */
  assert.match(html, /Spam<\/span>.*width:0%/);
  assert.match(html, /—/);
});

test("un recuadro puede tener ícono, ⓘ y ocupar dos filas", () => {
  const html = draw(
    <BoardTile title="Mensajes" icon={Inbox} hint="Recibidos y enviados por hora." rows={2}>
      x
    </BoardTile>,
  );
  assert.match(html, /@3xl:row-span-2/);
  assert.match(html, /rounded-ui-tile/);
  assert.match(html, /<svg[^>]*lucide-inbox/);
});

test("la fila de cifras es una grilla: el mismo ancho que las columnas de abajo", () => {
  const html = draw(
    <BoardStats>
      <BoardStat label="Usuarios" value={27} />
    </BoardStats>,
  );
  assert.match(html, /^<div class="grid /);
});
