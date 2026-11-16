import assert from "node:assert/strict";

import {
  Count,
  Menu,
  Metric,
  SPANISH_COPY,
  SystrayButton,
  Tabs,
  TopBar,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the counter was drawn by five components with four rules — the sidebar hid the
 * zero, the tabs drew it, the systray cut at «99+» without the locale, and a menu asked for
 * a counter nobody exported. These pin the ONE rule every host now inherits from `Count`.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("a count is written in the copy's locale, and the zero is not drawn", () => {
  assert.match(es(<Count value={1234} />), />1\.234</);
  assert.equal(es(<Count value={0} />), "");
});

test("the zero that is an answer is drawn, fainter", () => {
  const html = es(<Count value={0} showZero />);
  assert.match(html, />0</);
  assert.match(html, /bg-ink\/5/);
});

test("past max it reads «max+», and without a value it is a dot", () => {
  assert.match(es(<Count value={240} max={99} />), />99\+</);
  assert.match(es(<Count value={99} max={99} />), />99</);
  const dot = es(<Count tone="bad" />);
  assert.match(dot, /data-count="dot"/);
  assert.match(dot, /aria-hidden="true"/);
});

test("the gold is never text on the canvas, not even in a count", () => {
  assert.doesNotMatch(es(<Count value={3} tone="accent" />), /text-accent/);
});

test("the current row's count takes its host's colour", () => {
  assert.match(es(<Count value={3} current />), /text-current/);
});

test("the systray says in its name the same «99+» its badge shows", () => {
  const html = es(<SystrayButton icon={Bell} label="Avisos" count={1500} tone="bad" />);
  assert.match(html, /aria-label="Avisos: 99\+"/);
  assert.match(html, /aria-hidden="true"[^>]*>99\+</);
});

test("a tab draws its zero, and a notice count of zero draws nothing", () => {
  const html = es(
    <Tabs
      tabs={[
        { id: "pagos", label: "Pagos", count: 0 },
        { id: "notas", label: "Notas", notice: { label: "sin leer", count: 0 } },
      ]}
      current="pagos"
    />,
  );
  assert.match(html, /data-count="0"/);
  assert.equal(html.match(/data-count=/g)?.length, 1);
});

test("a menu says what waits inside on its trigger, and a number badge is a count", () => {
  const html = es(
    <Menu
      label="Pedidos"
      count={5}
      groups={[{ options: [{ id: "a", label: "Por confirmar", badge: 5 }] }]}
    />,
  );
  assert.match(html, /data-count="5"/);
  const quiet = es(<Menu label="Productos" count={0} groups={[{ options: [] }]} />);
  assert.doesNotMatch(quiet, /data-count/);
});

test("a top bar menu carries its count", () => {
  const html = es(
    <TopBar
      menus={[{ id: "pedidos", label: "Pedidos", count: 5, groups: [{ options: [] }] }]}
    />,
  );
  assert.match(html, /data-count="5"/);
});

test("a metric being read keeps its label and says it is busy; not counted is «—»", () => {
  const loading = es(<Metric label="inscripciones" loading />);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /inscripciones/);
  assert.match(es(<Metric label="pagos" />), /—/);
  assert.match(es(<Metric label="pagos" value={0} />), />0</);
});
