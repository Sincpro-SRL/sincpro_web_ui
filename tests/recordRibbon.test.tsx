import assert from "node:assert/strict";

import { Record, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: what a record IS now (archived, paid, cancelled) is seen before any field — a word
 * across the paper's corner, also heard — and who created it and touched it last closes the
 * paper.
 */

const draw = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const RAIL = (
  <Record.Rail>
    <Record.Crumbs crumbs={[{ label: "Pedidos", onClick: () => {} }, { label: "S00098" }]} />
  </Record.Rail>
);

test("the ribbon is a word with its tone, heard, inside the paper that clips it", () => {
  const html = draw(
    <Record identity={{ title: "S00098" }}>
      {RAIL}
      <Record.Paper>
        <Record.Ribbon label="Archivado" tone="bad" />
      </Record.Paper>
    </Record>,
  );
  assert.match(
    html,
    /<span role="status" class="[^"]*rotate-45[^"]*bg-bad[^"]*">Archivado<\/span>/,
  );
  assert.match(html, /class="relative flex min-w-0 flex-col overflow-clip/);
});

const audit = (node: ReactNode) =>
  draw(
    <Record identity={{ title: "S00098" }}>
      {RAIL}
      <Record.Paper>{node}</Record.Paper>
    </Record>,
  );

test("the audit line is the record's grammar: a label, the person's chip, the date", () => {
  const html = audit(
    <Record.Audit
      created={{ by: "Josefa Muñoz", at: new Date(2026, 8, 2, 11, 40) }}
      updated={{ by: "Andrés Gutiérrez", at: "2026-10-28T17:05:00" }}
    />,
  );
  /* A list of terms and values, not a sentence. */
  assert.match(html, /<dl[^>]*border-t[^>]*>/);
  assert.match(html, /<dt[^>]*>Creado<\/dt>/);
  assert.match(html, /<dt[^>]*>Última modificación<\/dt>/);
  assert.doesNotMatch(html, /Creado por/);
  /* The person is the chip every person-field uses: initials and name. */
  assert.ok(html.includes(">JM<"));
  assert.ok(html.includes("Josefa Muñoz</span>"));
  /* The date is written by the system, DD/MM/YYYY HH:mm, and keeps its machine form. */
  assert.match(html, /<time dateTime="[^"]+"[^>]*>02\/09\/2026 11:40<\/time>/);
  assert.match(html, />28\/10\/2026 17:05<\/time>/);
});

test("a day without time is a date; text the app wrote stays as it wrote it", () => {
  const html = audit(
    <Record.Audit
      created={{ by: "Josefa Muñoz", at: "2026-09-02" }}
      updated={{ at: "hace 3 días" }}
    />,
  );
  assert.match(html, />02\/09\/2026<\/time>/);
  assert.ok(html.includes(">hace 3 días</span>"));
});

test("a stamp without author says only when, never «por —»", () => {
  for (const by of [undefined, null, "", "  ", false, "—", "-"]) {
    const html = audit(<Record.Audit created={{ by, at: "2026-09-02" }} />);
    assert.doesNotMatch(html, /—|por/);
    assert.match(html, /<dt[^>]*>Creado<\/dt><dd[^>]*><time[^>]*>02\/09\/2026<\/time>/);
  }
});

test("the chip's props reach the chip; a node the app drew is kept", () => {
  const withCard = audit(
    <Record.Audit
      created={{ by: { name: "Carla Rojas", onOpen: () => {} }, at: "2026-09-02" }}
    />,
  );
  /* With somewhere to go the chip is a button that opens the person's card. */
  assert.match(withCard, /<button[^>]*aria-haspopup="dialog"[^>]*>.*Carla Rojas/);
  const drawn = audit(<Record.Audit created={{ by: <em>Sistema</em>, at: "2026-09-02" }} />);
  assert.ok(drawn.includes("<em>Sistema</em>"));
});

test("without ribbon or audit nothing of them is drawn", () => {
  const html = draw(
    <Record identity={{ title: "S00098" }}>
      {RAIL}
      <Record.Paper>cuerpo</Record.Paper>
    </Record>,
  );
  assert.doesNotMatch(html, /rotate-45/);
  assert.doesNotMatch(html, /Creado/);
});
