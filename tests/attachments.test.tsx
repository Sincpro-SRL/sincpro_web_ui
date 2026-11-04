import assert from "node:assert/strict";

import {
  type AttachmentFile,
  attachmentKind,
  Attachments,
  fileExtension,
  formatFileSize,
  FormModeProvider,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the files of a record. What a file IS (its kind, its size) is pure and checked
 * here; what is DRAWN for each state — ready, uploading, failed, read mode, empty — is
 * checked as static markup. Dropping, removing with undo and opening are driven in a browser
 * by `3 · Componentes/Adjuntos`.
 */

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>,
  );
}

const read = (children: ReactNode) =>
  spanish(<FormModeProvider value="read">{children}</FormModeProvider>);

const NOW = new Date("2026-11-04T12:00:00Z");

/** The size with its no-break space, written so a formatter cannot turn it into a plain one. */
const size = (number: string, unit: string) => `${number}${String.fromCharCode(0xa0)}${unit}`;

const FACTURA: AttachmentFile = {
  id: "a1",
  name: "Factura proveedor 0418.pdf",
  size: 1_258_291,
  type: "application/pdf",
  url: "/files/a1",
  by: "Carla Rojas",
  at: "2026-11-04T10:00:00Z",
};

const FOTO: AttachmentFile = {
  id: "a2",
  name: "Remito firmado.jpg",
  size: 348_160,
  url: "/files/a2",
  thumbnail: "/files/a2/thumb",
};

/* ── What a file is ───────────────────────────────────────────────────── */

test("the size is written for a person, in the copy's locale", () => {
  assert.equal(formatFileSize(512, "es-BO"), size("512", "B"));
  assert.equal(formatFileSize(1_258_291, "es-BO"), size("1,2", "MB"));
  assert.equal(formatFileSize(1_258_291, "en-US"), size("1.2", "MB"));
  assert.equal(formatFileSize(34 * 1024, "es-BO"), size("34", "KB"));
  assert.equal(formatFileSize(0, "es-BO"), size("0", "B"));
});

test("a size that rounds up to the next unit is written in the next unit", () => {
  assert.equal(formatFileSize(1024 * 1024 - 1, "es-BO"), size("1", "MB"));
  assert.equal(formatFileSize(1024, "es-BO"), size("1", "KB"));
});

test("a size that is not a size writes nothing", () => {
  assert.equal(formatFileSize(-1, "es-BO"), "");
  assert.equal(formatFileSize(Number.NaN, "es-BO"), "");
});

test("the kind comes from the MIME type, and from the name when the type says nothing", () => {
  assert.equal(attachmentKind("foto", "image/png"), "image");
  assert.equal(attachmentKind("x", "application/pdf"), "pdf");
  assert.equal(
    attachmentKind("x", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "sheet",
  );
  assert.equal(attachmentKind("Contrato.DOCX", "application/octet-stream"), "doc");
  assert.equal(attachmentKind("Libro de ventas.csv"), "sheet");
  assert.equal(attachmentKind("respaldo.zip"), "other");
  assert.equal(attachmentKind("sin extensión"), "other");
});

test("a leading dot is a hidden file, not an extension", () => {
  assert.equal(fileExtension(".env"), "");
  assert.equal(fileExtension("a.tar.GZ"), "gz");
  assert.equal(fileExtension("punto."), "");
});

/* ── What is drawn ────────────────────────────────────────────────────── */

test("a ready file shows its name, its size, who and when, and a real download link", () => {
  const html = spanish(<Attachments files={[FACTURA]} now={NOW} onRemove={() => {}} />);
  assert.ok(html.includes('aria-label="Adjuntos"'));
  assert.ok(html.includes("Factura proveedor 0418.pdf"));
  assert.ok(html.includes(size("1,2", "MB")));
  assert.ok(html.includes("Carla Rojas"));
  assert.ok(html.includes("<time"));
  assert.ok(/<a[^>]*href="\/files\/a1"[^>]*download="Factura proveedor 0418.pdf"/.test(html));
  assert.ok(html.includes('aria-label="Descargar"'));
  assert.ok(html.includes('aria-label="Quitar el archivo"'));
  assert.ok(html.includes(">pdf<"), "the extension is written next to the icon");
});

test("an image is shown as its thumbnail, decorative next to its name", () => {
  const html = spanish(<Attachments files={[FOTO]} />);
  assert.ok(/<img[^>]*src="\/files\/a2\/thumb"[^>]*alt=""/.test(html));
});

test("the name is a button only when the application opens files", () => {
  const closed = spanish(<Attachments files={[FACTURA]} now={NOW} />);
  const open = spanish(<Attachments files={[FACTURA]} now={NOW} onOpen={() => {}} />);
  assert.ok(!closed.includes("data-attachment-name"));
  assert.ok(/<button[^>]*data-attachment-name[^>]*>Factura proveedor 0418.pdf</.test(open));
});

test("an upload in progress is a real bar, with no download and a cancel", () => {
  const html = spanish(
    <Attachments
      files={[{ id: "u", name: "Extracto.xlsx", status: "uploading", progress: 40 }]}
      onRemove={() => {}}
    />,
  );
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('aria-label="Subiendo Extracto.xlsx"'));
  assert.ok(html.includes('aria-valuenow="40"'));
  assert.ok(!html.includes("Descargar"));
  assert.ok(html.includes('aria-label="Cancelar la subida"'));
});

test("a failed upload says why, with an icon, and offers to retry", () => {
  const html = spanish(
    <Attachments
      files={[
        {
          id: "f",
          name: "Escaneo.pdf",
          status: "failed",
          error: "El archivo pesa más de 20 MB.",
        },
      ]}
      onRetry={() => {}}
    />,
  );
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes("El archivo pesa más de 20 MB."));
  assert.ok(html.includes("<svg"), "never colour alone");
  assert.ok(html.includes("Reintentar"));

  const silent = spanish(
    <Attachments files={[{ id: "f", name: "Escaneo.pdf", status: "failed" }]} />,
  );
  assert.ok(silent.includes("No se pudo subir el archivo."));
  assert.ok(!silent.includes("Reintentar"), "no retry without onRetry");
});

test("with somewhere to add, the drop zone is drawn; empty, it says so", () => {
  const empty = spanish(<Attachments files={[]} onAdd={() => {}} />);
  assert.ok(empty.includes("Todavía no hay archivos adjuntos. Soltá uno acá o elegilo."));
  assert.ok(empty.includes("Elegir archivo"), "the file button");
  const some = spanish(<Attachments files={[FACTURA]} now={NOW} onAdd={() => {}} />);
  assert.ok(some.includes("Soltá otro archivo acá o elegilo."));
});

test("read mode keeps open and download, and draws no drop zone and no trash", () => {
  const html = read(
    <Attachments
      files={[FACTURA]}
      now={NOW}
      onAdd={() => {}}
      onRemove={() => {}}
      onOpen={() => {}}
    />,
  );
  assert.ok(html.includes('aria-label="Descargar"'));
  assert.ok(html.includes("data-attachment-name"));
  assert.ok(!html.includes("Quitar el archivo"));
  assert.ok(!html.includes("Soltá"));
});

test("an empty list in read mode is a sentence, the screen's own when it has one", () => {
  assert.ok(
    read(<Attachments files={[]} onAdd={() => {}} />).includes(
      "Todavía no hay archivos adjuntos.",
    ),
  );
  assert.ok(
    read(<Attachments files={[]} empty="La compra todavía no tiene la factura." />).includes(
      "La compra todavía no tiene la factura.",
    ),
  );
});
