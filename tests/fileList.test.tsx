import assert from "node:assert/strict";

import {
  Activity,
  type AttachmentFile,
  ChatThread,
  FileList,
  IconButton,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: files shown INSIDE something else — a message, a release, a card. What is drawn for
 * each way of downloading (a link, code, none), each layout and each state is checked here as
 * static markup; the busy button, the failure and folding are driven in a browser by
 * `3 · Componentes/Archivos`.
 */

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>,
  );
}

const PDF: AttachmentFile = {
  id: "1",
  name: "Comprobante 0418.pdf",
  type: "application/pdf",
  size: 184_320,
  url: "/files/1",
};
const NO_URL: AttachmentFile = { id: "2", name: "Contrato.pdf", type: "application/pdf" };

test("un archivo con url se baja por un enlace de verdad, con su nombre", () => {
  const html = spanish(<FileList files={[PDF]} />);
  assert.match(html, /<a[^>]*href="\/files\/1"[^>]*download="Comprobante 0418.pdf"/);
  assert.match(html, /aria-label="Descargar"/);
  /* The kind and the size, in words. */
  assert.match(html, />PDF</);
  assert.match(html, /180\sKB/);
  assert.match(html, /aria-label="Archivos"/);
});

test("con onDownload la descarga es un botón, también para un archivo sin url", () => {
  const html = spanish(<FileList files={[NO_URL]} onDownload={() => {}} />);
  assert.match(html, /<button[^>]*aria-label="Descargar"/);
  assert.doesNotMatch(html, /download="/);
});

test("sin url ni onDownload no hay nada que bajar, y con onOpen el nombre abre", () => {
  const html = spanish(<FileList files={[NO_URL]} onOpen={() => {}} />);
  assert.doesNotMatch(html, /Descargar/);
  assert.match(html, /<button[^>]*>Contrato.pdf<\/button>/);
});

test("rows con título: la lista se llama como el título, con la cantidad y la fecha", () => {
  const html = spanish(
    <FileList
      files={[
        { ...PDF, at: "2026-11-18T12:53:00-04:00" },
        { ...PDF, id: "3", name: "Otro.pdf" },
      ]}
      layout="rows"
      title="Assets"
      onDownloadAll={() => {}}
      now={new Date("2026-11-18T13:00:00-04:00")}
    />,
  );
  const [, titleId] = html.match(/<p id="([^"]+)"[^>]*>Assets/) ?? [];
  assert.ok(titleId);
  assert.match(html, new RegExp(`<ul aria-labelledby="${titleId}"`));
  assert.match(html, />2<\/span>/);
  assert.match(html, /hace 7 minutos/);
  assert.match(html, /Descargar todo/);
});

test("un archivo que sube muestra su avance y no se baja; sin archivos no se dibuja nada", () => {
  const html = spanish(
    <FileList
      files={[{ ...PDF, status: "uploading", progress: 40 }]}
      onDownload={() => {}}
    />,
  );
  assert.match(html, /role="progressbar"/);
  assert.doesNotMatch(html, /aria-label="Descargar"/);
  assert.equal(spanish(<FileList files={[]} />), "");
});

test("IconButton ocupado lo dice y no se deshabilita", () => {
  const html = renderToStaticMarkup(<IconButton icon={Download} label="Bajar" busy />);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-disabled="true"/);
  assert.doesNotMatch(html, / disabled=""/);
  assert.match(html, /animate-spin/);
});

test("un mensaje del chatter y uno del chat llevan sus archivos; sin texto, no hay burbuja vacía", () => {
  const chatter = spanish(
    <Activity
      open
      onToggle={() => {}}
      messages={[
        {
          id: "m1",
          author: "Ana",
          at: "2026-11-17T06:35:00Z",
          body: "adjunto",
          files: [PDF],
        },
        { id: "m2", author: "Ana", at: "2026-11-17T06:36:00Z", body: "", files: [NO_URL] },
      ]}
    />,
  );
  assert.match(chatter, /data-ui="file-list"/);
  assert.match(chatter, /Comprobante 0418.pdf/);
  assert.match(chatter, /Contrato.pdf/);
  assert.equal(chatter.match(/max-w-\(--container-prose\) rounded-box/g)?.length, 1);

  const chat = spanish(
    <ChatThread
      messages={[
        {
          id: "c1",
          author: "Luis",
          body: "",
          at: new Date(2026, 10, 4, 9, 34),
          files: [PDF],
        },
      ]}
      now={new Date(2026, 10, 4, 15, 40)}
    />,
  );
  assert.match(chat, /download="Comprobante 0418.pdf"/);
  assert.doesNotMatch(chat, /whitespace-pre-wrap text-ink"><\/p>/);
});
