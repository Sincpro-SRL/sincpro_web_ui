import assert from "node:assert/strict";

import { previewKind } from "@sincpro/web-ui";
import { test } from "vitest";

/**
 * Context: the kind of a file picks its renderer, and the choice must never pretend. A
 * spreadsheet has no honest preview here; it says so and keeps the download. These cases are
 * the ones that have gone wrong before: an extension in capitals, a MIME type with no
 * extension, a Markdown file the browser calls plain text.
 */
test("the renderer follows the file, whatever the case of its extension", () => {
  assert.equal(previewKind("Recibo.PDF"), "pdf");
  assert.equal(previewKind("foto.JPG"), "image");
  assert.equal(previewKind("nota.md"), "markdown");
  assert.equal(previewKind("nota.MARKDOWN"), "markdown");
  assert.equal(previewKind("sincronizacion.log"), "text");
  assert.equal(previewKind("datos.csv"), "text");
});

test("a MIME type decides a text file whose name says nothing", () => {
  assert.equal(previewKind("salida", "text/plain"), "text");
});

test("a spreadsheet or a Word file has no preview here: it says so", () => {
  assert.equal(previewKind("planilla.xlsx"), "other");
  assert.equal(previewKind("contrato.docx"), "other");
});
