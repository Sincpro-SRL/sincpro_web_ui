"use client";

import {
  type AttachmentFile,
  attachmentKind,
  fileExtension,
  formatFileSize,
} from "@sincpro/web-ui/components/attachments/files";
import { FileThumb } from "@sincpro/web-ui/components/attachments/FileThumb";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { type MouseEvent, useState } from "react";

/* ==================================================================== *
 *  FILE VALUE — ONE file as the value of something: the «Foto» column of a table, the
 *  «Comprobante» field of a record.
 *
 *  Context: `FileList` shows N files inside a message or a section, `Attachments` is a record's
 *  list that adds and removes, `FilePreview` draws one file whole. A column or a field that
 *  HOLDS one file had nothing, so an application drew its own thumbnail and link — or showed
 *  the storage's key («publico/contenido/01a1ece….jpg»). This is that value: what the file is
 *  (the picture itself for an image, the icon of its kind otherwise — `FileThumb`) and its name,
 *  the name downloading it.
 *
 *  ── Two sizes ───────────────────────────────────────────────────────
 *
 *  `sm` (the default) fits a table's line: a small square of the picture, or the kind's icon,
 *  and the name. `md` is a record's field: the thumbnail at a control's size, the name, and its
 *  type and size under it — what tells «the scan» from «the photo» before opening it.
 *
 *  ── Downloading, as everywhere ──────────────────────────────────────
 *
 *  With a `url` the name is a real `<a download>` — the browser streams it, «save as» works.
 *  When the download takes code (a token, a URL signed on demand) `onDownload(file)` makes the
 *  name a button, busy while its promise runs. Neither: the name, read only. Inside a table's
 *  row the name is a control of its own, so following it never opens the row.
 * ==================================================================== */

export type FileValueProps = {
  /** The file — nothing at all when there is none. */
  file: AttachmentFile | null | undefined;
  /** `sm` (default): a table's line. `md`: a record's field, with its type and size. */
  size?: "sm" | "md";
  /** Download by code. Present = the name is a button that calls it, busy while it runs. */
  onDownload?: (file: AttachmentFile) => void | Promise<unknown>;
};

/* A row opens its record on a click; downloading its file must not ALSO open it. */
const stay = (event: MouseEvent) => event.stopPropagation();

/* The ring every name shares, as a button or as a link — `FileList`'s. */
const NAME =
  "min-w-0 cursor-pointer truncate rounded-control text-left font-medium text-ink outline-primary outline-offset-2 hover:underline hover:underline-offset-4 focus-visible:outline-2 forced-colors:outline-[Highlight] aria-busy:cursor-progress aria-busy:opacity-70";

export function FileValue({ file, size = "sm", onDownload }: FileValueProps) {
  const copy = useUiCopy();
  const [busy, setBusy] = useState(false);

  if (file === null || file === undefined) return null;

  const kind = attachmentKind(file.name, file.type);
  const picture = kind === "image" ? (file.thumbnail ?? file.url) : undefined;

  const download = async () => {
    if (onDownload === undefined || busy) return;
    setBusy(true);
    try {
      await onDownload(file);
    } finally {
      setBusy(false);
    }
  };

  const name =
    onDownload !== undefined ? (
      <button
        type="button"
        title={file.name}
        aria-busy={busy || undefined}
        onClick={(event) => {
          stay(event);
          void download();
        }}
        className={NAME}
      >
        {file.name}
      </button>
    ) : file.url !== undefined ? (
      <a
        href={file.url}
        download={file.name}
        title={file.name}
        onClick={stay}
        className={NAME}
      >
        {file.name}
      </a>
    ) : (
      <span title={file.name} className="min-w-0 truncate font-medium text-ink">
        {file.name}
      </span>
    );

  if (size === "md") {
    const extension = fileExtension(file.name).toUpperCase();
    return (
      <span
        data-ui="file-value"
        data-size="md"
        className="flex max-w-full min-w-0 items-center gap-3"
      >
        <FileThumb file={file} kind={kind} size="md" />
        <span className="flex min-w-0 flex-col gap-0.5 text-meta">
          {name}
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-micro text-muted tabular-nums">
            {extension === "" ? null : <span>{extension}</span>}
            {extension !== "" && file.size !== undefined ? <span aria-hidden>·</span> : null}
            {file.size === undefined ? null : (
              <span className="whitespace-nowrap">
                {formatFileSize(file.size, copy.locale)}
              </span>
            )}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      data-ui="file-value"
      data-size="sm"
      className="inline-flex max-w-full min-w-0 items-center gap-2 align-middle"
    >
      {picture === undefined ? (
        <FileThumb file={file} kind={kind} size="sm" />
      ) : (
        /* Decorative: the name beside it says which file it is. */
        <img
          src={picture}
          alt=""
          loading="lazy"
          className="size-(--size-control-sm) shrink-0 rounded-control border border-line object-cover"
        />
      )}
      {name}
    </span>
  );
}
