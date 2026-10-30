import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Button,
  Preview,
  RelationValue,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { Link } from "react-aria-components";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the opening — hover, focus, long press, the safe area — is React Aria's to test,
 * and it does not run in a static render. What is ours: the trigger is the element the
 * consumer wrote, still named by its own text, and it says it opens a dialog; a React Aria
 * `Link` and a system button both get the wiring; nothing floats until it is asked for; and
 * `RelationValue` with `preview` keeps its link and drops the `i`, unless there is no link to
 * ride on.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const NAME = "Distribuidora Andina S.R.L.";

test("a link trigger keeps its name and address and says it opens a dialog", () => {
  const html = es(
    <Preview trigger={<Link href="/clientes/7">{NAME}</Link>} label={`Resumen de ${NAME}`}>
      <p>Deuda Bs 12.400</p>
    </Preview>,
  );
  assert.match(
    html,
    /<a[^>]*href="\/clientes\/7"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"[^>]*>Distribuidora Andina S.R.L.<\/a>/,
  );
  assert.doesNotMatch(html, /Deuda/, "the preview floats only when asked for");
});

test("a system button gets the same wiring through Focusable", () => {
  const html = es(
    <Preview trigger={<Button>Ver producto</Button>} label="Resumen del producto">
      <p>Stock 42</p>
    </Preview>,
  );
  assert.match(html, /<button[^>]*aria-haspopup="dialog"[^>]*>Ver producto<\/button>/);
});

test("RelationValue with a preview keeps its link and draws no info button", () => {
  const html = es(
    <RelationValue
      name={NAME}
      secondary="NIT 1028457021"
      href="/clientes/7"
      summary={{ facts: [{ label: "Deuda", value: "Bs 12.400" }] }}
      preview
    />,
  );
  assert.match(
    html,
    /<a[^>]*href="\/clientes\/7"[^>]*aria-haspopup="dialog"[^>]*>Distribuidora Andina S.R.L.<\/a>/,
  );
  assert.match(html, /NIT 1028457021/);
  assert.doesNotMatch(html, /<button/, "one way to the summary, not two");
});

test("without a preview the summary still opens from the info button", () => {
  const html = es(<RelationValue name={NAME} href="/clientes/7" summary={{ facts: [] }} />);
  assert.doesNotMatch(html, /<a[^>]*aria-haspopup/);
  assert.match(html, /<button[^>]*aria-label="Resumen de Distribuidora Andina S.R.L."/);
});

test("with no link to ride on, the preview's content opens from the info button", () => {
  const html = es(<RelationValue name={NAME} preview={<p>Tarjeta propia</p>} />);
  assert.match(html, /<button[^>]*aria-haspopup="dialog"[^>]*aria-label="Resumen de/);
});
