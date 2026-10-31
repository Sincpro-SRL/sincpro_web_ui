import assert from "node:assert/strict";

import { DropZone, Field, FormModeProvider, ToastProvider, useToast } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the toast region and the drop zone are React Aria's. The region is a landmark
 * that only exists in the browser — React Aria portals it to `document.body` once there is
 * a notice, never on the server — so its role, F6 and the pause on hover are driven in a
 * browser. What is checked here is the contract that does not need one.
 */

function Asks() {
  useToast();
  return null;
}

test("useToast outside a provider fails loudly, naming what is missing", () => {
  assert.throws(() => renderToStaticMarkup(<Asks />), /ToastProvider/);
});

test("a provider with no notices draws only its children — no empty region", () => {
  const html = renderToStaticMarkup(
    <ToastProvider>
      <p>factura</p>
    </ToastProvider>,
  );
  assert.equal(html, "<p>factura</p>");
});

test("the drop zone keeps a keyboard way in: a real button that opens the file dialog", () => {
  const html = renderToStaticMarkup(
    <Field label="Factura del proveedor" htmlFor="factura">
      <DropZone accept=".pdf, application/pdf" onFile={() => {}} />
    </Field>,
  );
  assert.match(html, /<button id="factura"[^>]*>Choose file<\/button>/);
  assert.match(html, /type="file"[^>]*accept="\.pdf,application\/pdf"/);
  assert.match(html, /aria-labelledby="[^"]*factura-label/);
});

test("while it uploads the zone draws the bar and no button", () => {
  const html = renderToStaticMarkup(
    <DropZone busy progress={40} fileName="factura-0418.pdf" onFile={() => {}} />,
  );
  assert.match(html, /role="progressbar"/);
  assert.match(html, /factura-0418\.pdf/);
  assert.doesNotMatch(html, /Choose file/);
});

test("an unreadable file is a sentence with the way to try another", () => {
  const html = renderToStaticMarkup(
    <DropZone error="No es un PDF." onFile={() => {}} onRetry={() => {}} />,
  );
  assert.match(html, /No es un PDF\./);
  assert.match(html, /Try another/i);
});

test("in read mode the drop zone is the file's name", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <DropZone fileName="factura-0418.pdf" onFile={() => {}} />
    </FormModeProvider>,
  );
  assert.doesNotMatch(html, /type="file"/);
  assert.match(html, />factura-0418\.pdf</);
});
