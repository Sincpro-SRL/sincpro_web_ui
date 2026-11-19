import assert from "node:assert/strict";

import {
  type AttachmentFile,
  FileValue,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: one file as a value — a table's cell, a record's field. What is DRAWN is checked as
 * static markup here: the name and not the key, the picture only for an image, the download as
 * a real link. Downloading by code inside a row is driven in a browser by
 * `3 · Componentes/Archivos/Un archivo como valor`.
 */

const spanish = (children: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>);

const FOTO: AttachmentFile = {
  id: "publico/contenido/01a1ece4998f.jpg",
  name: "Directorio 2026.jpg",
  type: "image/jpeg",
  size: 412_000,
  url: "/files/cHVibGljbw.1763600400.Zk3",
};

const ESTATUTO: AttachmentFile = {
  id: "privado/estatutos/01a1ed.pdf",
  name: "Estatuto orgánico.pdf",
  type: "application/pdf",
  size: 184_320,
  url: "/files/cHJpdmFkbw.1763600400.Ab1",
};

test("a picture in a table's line is the picture itself, small, and its name downloads it", () => {
  const html = spanish(<FileValue file={FOTO} />);

  assert.match(html, /data-ui="file-value"/);
  assert.match(html, /<img src="\/files\/cHVibGljbw\.1763600400\.Zk3" alt="" loading="lazy"/);
  assert.match(
    html,
    /<a href="\/files\/cHVibGljbw\.1763600400\.Zk3" download="Directorio 2026\.jpg"[^>]*>Directorio 2026\.jpg<\/a>/,
  );
  assert.doesNotMatch(html, /01a1ece4998f/);
});

test("a document fetches no picture: the icon of its kind beside its name", () => {
  const html = spanish(<FileValue file={ESTATUTO} />);

  assert.doesNotMatch(html, /<img/);
  assert.match(html, />Estatuto orgánico\.pdf<\/a>/);
});

test("in a record's field it says its type and size under its name", () => {
  const html = spanish(<FileValue file={ESTATUTO} size="md" />);

  assert.match(html, /data-size="md"/);
  assert.match(html, /<span>PDF<\/span>/);
  assert.match(html, /180(,0)?\sKB/);
});

test("downloaded by code its name is a button; with neither a url nor that, it is read", () => {
  assert.match(
    spanish(<FileValue file={ESTATUTO} onDownload={() => {}} />),
    /<button type="button" title="Estatuto orgánico\.pdf"/,
  );
  const { url: _, ...unreachable } = ESTATUTO;
  const read = spanish(<FileValue file={unreachable} />);
  assert.doesNotMatch(read, /<a |<button/);
  assert.match(read, />Estatuto orgánico\.pdf<\/span>/);
});

test("no file, nothing at all", () => {
  assert.equal(spanish(<FileValue file={null} />), "");
});
