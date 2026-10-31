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

test("the audit line says who created it and who changed it last", () => {
  const html = draw(
    <Record identity={{ title: "S00098" }}>
      {RAIL}
      <Record.Paper>
        <Record.Audit
          created={{ by: "Josefa Muñoz", at: "02/09/2026" }}
          updated={{ by: "Andrés Gutiérrez", at: "hace 3 días" }}
        />
      </Record.Paper>
    </Record>,
  );
  assert.ok(html.includes("Creado por <span"));
  assert.ok(html.includes("Josefa Muñoz</span>"));
  assert.ok(html.includes("Modificado por última vez por <span"));
  assert.ok(html.includes("hace 3 días</span>"));
});

test("without ribbon or audit nothing of them is drawn", () => {
  const html = draw(
    <Record identity={{ title: "S00098" }}>
      {RAIL}
      <Record.Paper>cuerpo</Record.Paper>
    </Record>,
  );
  assert.doesNotMatch(html, /rotate-45/);
  assert.doesNotMatch(html, /Creado por/);
});
