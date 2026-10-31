import assert from "node:assert/strict";

import { ProgressBar, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the aria is React Aria's; what is ours is the contract on top. A task that knows
 * how far it is writes its value for assistive technology and draws the figure in tabular
 * figures; one that does not know says so — no `aria-valuenow`, no invented number — and
 * sweeps only where motion is welcome. The label always names it, and is drawn when asked.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("a determinate bar writes its range and draws its figure", () => {
  const html = es(
    <ProgressBar label="Importación de clientes" value={1240} maxValue={4000} />,
  );
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="1240"/);
  assert.match(html, /aria-valuemax="4000"/);
  assert.match(html, /aria-label="Importación de clientes"/);
  assert.match(html, /tabular-nums[^"]*">31\s?%</);
});

test("an indeterminate bar has no value and no figure, and sweeps only with motion", () => {
  const html = es(<ProgressBar label="Cierre de octubre" />);
  assert.match(html, /role="progressbar"/);
  assert.doesNotMatch(html, /aria-valuenow|aria-valuetext/);
  assert.doesNotMatch(html, /%</);
  assert.match(html, /data-indeterminate[^>]*motion-safe:animate-progress-sweep/);
  assert.match(html, /motion-reduce:/);
});

test("the figure can be written by hand, and is what is announced", () => {
  const html = es(
    <ProgressBar
      label="Importación"
      value={1240}
      maxValue={4000}
      valueLabel="1.240 de 4.000 filas"
    />,
  );
  assert.match(html, /aria-valuetext="1.240 de 4.000 filas"/);
  assert.match(html, />1.240 de 4.000 filas</);
});

test("the label names it always and is drawn only with showLabel", () => {
  const hidden = es(<ProgressBar label="Cierre de octubre" value={62} />);
  assert.match(hidden, /aria-label="Cierre de octubre"/);
  assert.doesNotMatch(hidden, />Cierre de octubre</);

  const shown = es(<ProgressBar label="Cierre de octubre" value={62} showLabel />);
  assert.match(shown, />Cierre de octubre</);
});

test("the tone of the task colors the fill", () => {
  assert.match(es(<ProgressBar label="Envío" value={12} tone="bad" />), /bg-bad/);
  assert.match(es(<ProgressBar label="Importación" value={62} />), /bar-brand/);
});
