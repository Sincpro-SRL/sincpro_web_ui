"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

/* ==================================================================== *
 *  THE PDF RENDERER — pdf.js through react-pdf, loaded on demand.
 *
 *  Context: pdf.js is about a megabyte of code, and most screens never open a
 *  PDF. So this module is NOT part of the package's main entry: `FilePreview`
 *  loads it with `lazy()`, the bundler splits it into its own chunk, and the
 *  chunk arrives only when a person opens a PDF. The tests in Node never import
 *  it (pdf.js expects a browser).
 *
 *  ── The worker runs off the page ────────────────────────────────────
 *
 *  Parsing a PDF is heavy, so pdf.js does it in a Web Worker. The default
 *  worker is resolved from this package's own dependency, which a modern
 *  bundler (Vite, webpack 5) copies with the chunk. An application that
 *  serves the worker from its own origin or a CDN passes `workerUrl`.
 *
 *  ── Text and links are not drawn as layers ─────────────────────────
 *
 *  react-pdf can paint a selectable text layer and clickable link layer; both
 *  need their own stylesheets. The preview is for reading and printing, not
 *  for editing, so both are off: one less stylesheet to ship, and no layers to
 *  misalign at a zoom the browser chose.
 * ==================================================================== */

const DEFAULT_WORKER = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type PdfPreviewProps = {
  /** Where the PDF downloads from. Same origin, or a CORS-enabled host. */
  url: string;
  /** The pdf.js worker. Absent = the one shipped with the dependency. */
  workerUrl?: string;
};

export default function PdfPreview({ url, workerUrl }: PdfPreviewProps) {
  const copy = useUiCopy();
  /* The worker is a global of pdf.js: setting it again to the same value is a no-op. */
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl ?? DEFAULT_WORKER;

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [failure, setFailure] = useState<string | null>(null);

  if (failure !== null) {
    return (
      <Failed
        heading={copy.preview.failed}
        sentence={copy.preview.unsupported}
        detail={failure}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col items-center gap-3">
      <nav aria-label={copy.preview.label} className="flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          label={copy.preview.previousPage}
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        />
        <span
          className="min-w-28 text-center text-meta text-muted tabular-nums"
          aria-live="polite"
        >
          {fillCopy(copy.preview.page, { page: String(page), total: String(total) })}
        </span>
        <IconButton
          icon={ChevronRight}
          label={copy.preview.nextPage}
          disabled={total === 0 || page >= total}
          onClick={() => setPage((p) => Math.min(total, p + 1))}
        />
      </nav>
      <Document
        file={url}
        loading={<p className="text-meta text-muted">{copy.preview.loading}</p>}
        onLoadSuccess={({ numPages }) => {
          setTotal(numPages);
          setPage(1);
        }}
        onLoadError={(error) => setFailure(error.message)}
        onSourceError={(error) => setFailure(error.message)}
      >
        <Page
          pageNumber={page}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="overflow-hidden rounded-control border border-line bg-surface shadow-sm"
        />
      </Document>
    </div>
  );
}
