import assert from "node:assert/strict";

import { Callout, Failed, Field, Missing, TextInput } from "@sincpro/web-ui";
import { errorReport } from "@sincpro/web-ui/primitives/notice/Notice";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: when something breaks, the person pastes what they saw into a ticket or a
 * chat. The report is plain text in a fixed order — what it said, the technical detail,
 * when, where — so the same error reads the same wherever it lands. The button that
 * copies it is `CopyButton`, which needs a browser clipboard and is covered there; what
 * is checked here is the text itself and that the button is drawn.
 */

const AT = new Date("2026-11-04T19:30:00.000Z");

test("the report keeps the order: what it said, the detail, when, where", () => {
  const text = errorReport({
    heading: "No se pudo guardar la factura",
    sentence: "El servidor no respondió. Intentá de nuevo en un minuto.",
    detail: "HTTP 503 · invoice/42",
    at: AT,
    page: "https://erp.example/factura/42",
  });
  assert.equal(
    text,
    [
      "No se pudo guardar la factura",
      "El servidor no respondió. Intentá de nuevo en un minuto.",
      "HTTP 503 · invoice/42",
      "2026-11-04T19:30:00.000Z",
      "https://erp.example/factura/42",
    ].join("\n"),
  );
});

test("a report without detail or page leaves those lines out, not blank ones", () => {
  const text = errorReport({ heading: "Falló", at: AT });
  assert.equal(text, "Falló\n2026-11-04T19:30:00.000Z");
});

test("Failed draws the copy button next to its action, with the copy-table name", () => {
  const html = renderToStaticMarkup(
    <Failed heading="Falló" sentence="Probá de nuevo." detail="HTTP 500" />,
  );
  assert.match(html, /HTTP 500/);
  assert.match(html, /Copiar el error|Copy the error/);
});

test("Missing draws the copy button too: a wiring error is the one people report most", () => {
  const html = renderToStaticMarkup(
    <Missing heading="Sin vista para este campo" detail="x.y" />,
  );
  assert.match(html, /Copiar el error|Copy the error/);
});

test("a bad callout copies its sentence; an informative one does not offer to copy", () => {
  const bad = renderToStaticMarkup(<Callout tone="bad">No se pudo guardar el pago.</Callout>);
  assert.match(bad, /Copy the error/);
  const info = renderToStaticMarkup(<Callout tone="info">Período cerrado.</Callout>);
  assert.doesNotMatch(info, /Copy the error/);
});

test("a field error draws the copy button next to its message", () => {
  const html = renderToStaticMarkup(
    <Field label="Descuento" error="Tiene que estar entre 0 y 100.">
      <TextInput value="120" onChange={() => undefined} />
    </Field>,
  );
  assert.match(html, /Tiene que estar entre 0 y 100\./);
  assert.match(html, /Copy the error|Copiar el error/);
});
