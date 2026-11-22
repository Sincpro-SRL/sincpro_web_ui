import assert from "node:assert/strict";

import { PlanCard, Plans, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: plans are compared line by line, so a feature a plan lacks stays in its list and is
 * SAID — an icon for the eye, a word for a screen reader. No price is «A convenir», not a hole.
 */

const es = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>).replace(
    /\u00a0/g,
    " ",
  );

test("a feature not included stays in the list and is said", () => {
  const html = es(
    <PlanCard
      name="Emprende"
      price={{ value: 150, currency: "BOB", per: "mes" }}
      features={[{ label: "1 usuario" }, { label: "Acceso por API", included: false }]}
    />,
  );
  assert.match(html, /<span class="sr-only">Incluye: <\/span>1 usuario/);
  assert.match(html, /<span class="sr-only">No incluye: <\/span>Acceso por API/);
  assert.match(html, /Bs 150,00/);
});

test("the highlighted plan says why, the current one says so, and no price is «A convenir»", () => {
  const html = es(
    <Plans label="Planes">
      <PlanCard name="Pyme" highlight="Recomendado" current />
    </Plans>,
  );
  assert.match(html, /<section aria-label="Planes" data-ui="plans"/);
  assert.match(html, /data-highlight=""/);
  assert.match(html, />Recomendado</);
  assert.match(html, />Tu plan</);
  assert.match(html, />A convenir</);
});
