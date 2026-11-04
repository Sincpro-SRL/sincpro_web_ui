"use client";

import {
  attachmentKind,
  fileExtension,
  formatFileSize,
} from "@sincpro/web-ui/components/attachments/files";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, ButtonLink } from "@sincpro/web-ui/primitives/button/Button";
import { Empty, Failed, Skeleton } from "@sincpro/web-ui/primitives/notice/Notice";
import { Download } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

/* ==================================================================== *
 *  FILE PREVIEW — the file itself, drawn by what it is.
 *
 *  Context: `Attachments` lists a record's files and says WHERE to open one
 *  (`onOpen`); this is what the application puts there — a peek, a side panel,
 *  a modal of the composer — so the person sees the file without leaving the
 *  record. The renderer is chosen by the file's kind, and the kinds with no
 *  honest preview (a spreadsheet, a Word file) say so and keep the download.
 *
 *  ── Each renderer costs only when it is used ────────────────────────
 *
 *      image     an <img>, fit to the pane or at its real size
 *      pdf       pdf.js, loaded on demand (PdfPreview)
 *      markdown  streamdown, sanitized (Markdown)
 *      text      the text in mono, up to a limit (a log can be gigabytes)
 *      other     the icon's name and the download — no preview pretended
 *
 *  ── The download is always there ────────────────────────────────────
 *
 *  Whatever can or cannot be drawn, the file can be taken: a real `<a
 *  download>`, the same one the list uses, so the browser's own download
 *  manager keeps a large file out of the tab's memory.
 * ==================================================================== */

/** The PDF renderer is its own chunk: pdf.js is not in the main bundle. */
const PdfPreview = lazy(() => import("@sincpro/web-ui/components/preview/PdfPreview"));

/** streamdown is ~160 KB gzipped: a preview of an image or a PDF does not pay for it. */
const MarkdownView = lazy(() =>
  import("@sincpro/web-ui/primitives/value/Markdown").then((m) => ({ default: m.Markdown })),
);

/** A text preview larger than this is not read into the tab: download instead. */
const MAX_TEXT_BYTES = 1_000_000;

const TEXT_EXTENSIONS = new Set(["txt", "csv", "json", "log", "xml", "yaml", "yml"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);

export type PreviewKind = "image" | "pdf" | "markdown" | "text" | "other";

export type PreviewFile = {
  /** The file name as saved: it picks the kind together with `type`. */
  name: string;
  /** Where the file downloads from. */
  url: string;
  /** The MIME type, when the server knows it. */
  type?: string;
  /** In bytes. Written for the locale in the header. */
  size?: number;
};

/** The renderer for a file. Pure, so the choice is tested without a browser. */
export function previewKind(name: string, type?: string): PreviewKind {
  const kind = attachmentKind(name, type);
  if (kind === "image" || kind === "pdf") return kind;
  const extension = fileExtension(name).toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
  if (TEXT_EXTENSIONS.has(extension) || type?.startsWith("text/") === true) return "text";
  return "other";
}

export type FilePreviewProps = {
  file: PreviewFile;
  /** The pdf.js worker, when the application serves it itself. */
  pdfWorkerUrl?: string;
};

export function FilePreview({ file, pdfWorkerUrl }: FilePreviewProps) {
  const copy = useUiCopy();
  const kind = previewKind(file.name, file.type);
  const size = file.size === undefined ? "" : ` · ${formatFileSize(file.size, copy.locale)}`;

  return (
    <section aria-label={file.name} className="flex min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">{file.name}</p>
          <p className="text-meta text-muted">
            {copy.preview.kind[kind]}
            {size}
          </p>
        </div>
        <ButtonLink
          href={file.url}
          download={file.name}
          role="secondary"
          size="sm"
          icon={Download}
        >
          {copy.preview.download}
        </ButtonLink>
      </header>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto rounded-control bg-ground p-5">
        <Body kind={kind} file={file} pdfWorkerUrl={pdfWorkerUrl} />
      </div>
    </section>
  );
}

function Body({
  kind,
  file,
  pdfWorkerUrl,
}: {
  kind: PreviewKind;
  file: PreviewFile;
  pdfWorkerUrl?: string;
}) {
  const copy = useUiCopy();
  if (kind === "image") return <ImagePreview file={file} />;
  if (kind === "pdf") {
    return (
      <Suspense fallback={<Skeleton rows={3} label={copy.preview.loading} />}>
        <PdfPreview url={file.url} workerUrl={pdfWorkerUrl} />
      </Suspense>
    );
  }
  if (kind === "markdown" || kind === "text") return <TextPreview kind={kind} file={file} />;
  return <Unsupported />;
}

function ImagePreview({ file }: { file: PreviewFile }) {
  const copy = useUiCopy();
  const [actual, setActual] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button role="ghost" size="sm" onClick={() => setActual((a) => !a)}>
        {actual ? copy.preview.fit : copy.preview.actualSize}
      </Button>
      <img
        src={file.url}
        alt={file.name}
        className={actual ? "max-w-none" : "max-h-full max-w-full object-contain"}
      />
    </div>
  );
}

function TextPreview({ kind, file }: { kind: "markdown" | "text"; file: PreviewFile }) {
  const copy = useUiCopy();
  const [text, setText] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const tooLarge = file.size !== undefined && file.size > MAX_TEXT_BYTES;

  useEffect(() => {
    if (tooLarge) return;
    const controller = new AbortController();
    fetch(file.url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((body) => setText(body))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => controller.abort();
  }, [file.url, tooLarge]);

  if (tooLarge) return <Unsupported />;
  if (failure !== null) {
    return (
      <Failed
        heading={copy.preview.failed}
        sentence={copy.preview.unsupported}
        detail={failure}
      />
    );
  }
  if (text === null) return <Skeleton rows={4} label={copy.preview.loading} />;
  if (kind === "markdown") {
    return (
      <div className="w-full">
        <Suspense fallback={<Skeleton rows={4} label={copy.preview.loading} />}>
          <MarkdownView label={file.name}>{text}</MarkdownView>
        </Suspense>
      </div>
    );
  }
  return (
    <pre className="w-full font-mono text-meta leading-relaxed whitespace-pre-wrap text-ink select-text">
      {text}
    </pre>
  );
}

function Unsupported() {
  const copy = useUiCopy();
  return <Empty sentence={copy.preview.unsupported} />;
}
