import assert from "node:assert/strict";
import { test } from "node:test";

import { Record, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import { orderNotices, splitNotices } from "@sincpro/web-ui/components/record/RecordNotices";
import { tagTone } from "@sincpro/web-ui/primitives/tag/Tag";
import type { ReactNode } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";

/**
 * Context: a record's notices are what has to be known about it before acting — and NONE of
 * them goes among the fields, where it pushed the form down and read as one more field. What
 * is wrong (`bad`, and the operation error) stays visible between the rail and the paper; the
 * rest gather in one indicator in the rail, toned by the most urgent, that opens their list
 * on press. Both in urgency order.
 */

/* The provider installs its table for the whole process, so every render says which one. */
const renderToStaticMarkup = (node: ReactNode) =>
  render(<UiCopyProvider>{node}</UiCopyProvider>);
const inSpanish = (node: ReactNode) =>
  render(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const at = (html: string, text: string) => {
  const i = html.indexOf(text);
  assert.notEqual(i, -1, `«${text}» is drawn`);
  return i;
};

const RAIL = (
  <Record.Rail>
    <Record.Crumbs
      crumbs={[{ label: "Facturas", onClick: () => {} }, { label: "FAC/0115" }]}
    />
  </Record.Rail>
);

test("the most urgent goes first, written order inside a tone", () => {
  assert.deepEqual(
    orderNotices([
      { tone: "info" as const, id: "credit" },
      { tone: "good" as const, id: "sent" },
      { tone: "bad" as const, id: "blocked" },
      { id: "plain" },
      { tone: "warn" as const, id: "duplicate" },
    ]).map((n) => n.id),
    ["blocked", "duplicate", "credit", "plain", "sent"],
  );
  const { blocking, rest } = splitNotices([
    { tone: "info", children: "credit" },
    { tone: "bad", children: "rejected" },
    { tone: "warn", children: "overdue" },
  ]);
  assert.deepEqual(
    blocking.map((n) => n.children),
    ["rejected"],
  );
  assert.deepEqual(
    rest.map((n) => n.children),
    ["overdue", "credit"],
  );
});

test("the quiet notices are not in the form: one indicator in the rail counts them", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Paper>
        <Record.Notice tone="info">Créditos pendientes.</Record.Notice>
        <Record.Notice tone="warn">Factura vencida hace 12 días.</Record.Notice>
        <Record.Facts fields={[{ label: "Cliente", value: "Sur" }]} />
      </Record.Paper>
    </Record>,
  );
  /* The list opens on press; closed, its sentences are not on the page. */
  assert.doesNotMatch(html, /Créditos pendientes/);
  assert.doesNotMatch(html, /vencida hace 12 días/);
  const chip = /<button[^>]*data-record-notices=""[^>]*>([\s\S]*?)<\/button>/.exec(html);
  assert.ok(chip, "the indicator is a button");
  assert.match(chip[1]!, /2 notices/);
  /* Toned by the most urgent (warn), with the tone's shape and a word — never colour alone. */
  assert.ok(chip[0].includes(tagTone("warn", "canvas")));
  assert.match(chip[1]!, /lucide-triangle-alert/);
  /* In the rail, before the record's name. */
  assert.ok(at(html, "data-record-notices") < at(html, "FAC/2026/0115</h1>"));
  assert.ok(at(html, 'aria-label="Location"') < at(html, "data-record-notices"));
});

test("in Spanish the indicator counts in Spanish, singular and plural", () => {
  const one = inSpanish(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Notice tone="good">Se envió.</Record.Notice>
    </Record>,
  );
  assert.match(one, />1 aviso<\/button>/);
  const two = inSpanish(
    <Record identity={{ title: "FAC/2026/0115" }}>
      {RAIL}
      <Record.Notice>uno</Record.Notice>
      <Record.Notice>dos</Record.Notice>
    </Record>,
  );
  assert.match(two, />2 avisos<\/button>/);
});

test("what is wrong stays visible, outside the sheet: between the rail and the paper", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "FAC/2026/0115" }} error="El servidor no respondió.">
      {RAIL}
      <Record.Paper>
        <Record.Notice tone="info">créditos</Record.Notice>
        <Record.Notice tone="bad">El SIN rechazó la factura.</Record.Notice>
        <Record.Facts fields={[{ label: "Cliente", value: "Sur" }]} />
      </Record.Paper>
    </Record>,
  );
  const band = at(html, 'aria-label="What is wrong with this record"');
  const error = at(html, "El servidor no respondió.");
  const rejected = at(html, "El SIN rechazó la factura.");
  assert.ok(at(html, 'aria-label="Location"') < band, "under the rail");
  assert.ok(band < error && error < rejected, "the operation error first");
  assert.ok(rejected < at(html, "FAC/2026/0115</h1>"), "above the paper");
  assert.ok(rejected < at(html, "Cliente"));
  /* A bad notice is not counted by the indicator: it is already in sight. */
  assert.match(html, />1 notice<\/button>/);
});

test("without a rail the indicator and the band still come first", () => {
  const html = renderToStaticMarkup(
    <Record identity={{ title: "Impresora térmica" }}>
      <Record.Notice tone="warn">Sin existencias.</Record.Notice>
      <Record.Notice tone="bad">Producto archivado.</Record.Notice>
    </Record>,
  );
  const title = at(html, "Impresora térmica</h1>");
  assert.ok(at(html, "Producto archivado.") < title);
  assert.ok(at(html, "data-record-notices") < title);
});

test("a blocking notice names its × from the copy table", () => {
  const html = inSpanish(
    <Record identity={{ title: "FAC/2026/0115" }}>
      <Record.Notice tone="bad" onDismiss={() => {}}>
        Rechazada.
      </Record.Notice>
    </Record>,
  );
  assert.match(html, /aria-label="Descartar el aviso"/);
});
