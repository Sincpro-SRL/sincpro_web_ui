"use client";

import {
  type AttachmentFile,
  attachmentKind,
  fileExtension,
  formatFileSize,
} from "@sincpro/web-ui/components/attachments/files";
import { FileThumb } from "@sincpro/web-ui/components/attachments/FileThumb";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton, IconLink } from "@sincpro/web-ui/primitives/button/Button";
import { Disclosure } from "@sincpro/web-ui/primitives/disclosure/Disclosure";
import { DateValue } from "@sincpro/web-ui/primitives/value/DateValue";
import { ProgressBar } from "@sincpro/web-ui/primitives/value/ProgressBar";
import { Download, TriangleAlert } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

/* ==================================================================== *
 *  FILE LIST — N files shown INSIDE something else: the receipt under a chatter message, the
 *  assets of a release, the file someone sent in a chat.
 *
 *  Context: `Attachments` is the record's list — it adds, removes and undoes; `FilePreview`
 *  draws ONE file whole. Between them there was nothing to show a few files compactly where
 *  they belong, and every screen drew its own row of icons. This is read-only on purpose:
 *  what a file inside a message needs is to be recognised, opened and downloaded.
 *
 *  ── Two layouts, one question each ─────────────────────────────────
 *
 *  `cards` (the default) is a file someone SENT: a card per file — its kind, its name, its
 *  type and size — that wraps under the message, like a mail client or a chat. `rows` is a
 *  file that BELONGS to something: a bordered list — icon, name, size, date — like a release's
 *  assets. A `title` adds the count («Assets 2»), and `collapsible` folds it.
 *
 *  ── Downloading: a link when it can be, code when it must ───────────
 *
 *  A file with a `url` downloads through a real `<a download>`: the browser streams it to disk,
 *  middle-click and «save as» work, and a 150 MB scan never passes through the tab's memory.
 *  When the download needs code — a token in a header, a URL signed on demand, Odoo's
 *  `/web/content` — `onDownload(file)` hands it to the application, which fetches it (and can
 *  save it with `downloadFile`). While its promise runs the button is busy and keeps the focus;
 *  if it rejects, the file says so in words, where it was pressed. `onDownloadAll` is «Download
 *  all» — a zip, or a loop: the application's choice.
 *
 *  ── Opening is the application's ────────────────────────────────────
 *
 *  `onOpen(file)` makes the name a button; WHERE it opens — a peek, a side panel, a
 *  `FilePreview` — is the workspace's (`stories/Estilo.mdx`), exactly as in `Attachments`.
 *  Without it, a file with a `url` has its name as the download link (a release's assets).
 * ==================================================================== */

export type FileListLayout = "cards" | "rows";

export type FileListProps = {
  files: readonly AttachmentFile[];
  /** `cards` (default): a file someone sent, under a message. `rows`: the files of
   *  something, in a bordered list. */
  layout?: FileListLayout;
  /** What these files are — «Assets», «Comprobantes» —, drawn with their count. Without it
   *  the list is named by `label`. */
  title?: string;
  /** The title folds the list (it needs a `title`). Open by default; `defaultOpen={false}`
   *  starts it folded. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Open the file. Present = its name is a button; WHERE it opens is the application's. */
  onOpen?: (file: AttachmentFile) => void;
  /** Download by code. Present = every ready file has a download button that calls it,
   *  busy while its promise runs. Without it, a file with a `url` downloads by link. */
  onDownload?: (file: AttachmentFile) => void | Promise<unknown>;
  /** «Download all», shown when there are two or more files. */
  onDownloadAll?: (files: readonly AttachmentFile[]) => void | Promise<unknown>;
  /** The accessible name when there is no `title`. «Archivos» by default. */
  label?: string;
  /** The «now» the dates are relative to — so a story or a test does not change its text
   *  every minute. */
  now?: Date;
};

/** Ids of the files whose download is running, or failed. */
type Marks = ReadonlySet<string>;

const add = (marks: Marks, id: string): Marks => new Set(marks).add(id);
const drop = (marks: Marks, id: string): Marks => {
  const next = new Set(marks);
  next.delete(id);
  return next;
};

/* The ring every name shares, as a button or as a link. */
const NAME =
  "max-w-full cursor-pointer truncate rounded-control text-left font-medium text-ink outline-primary outline-offset-2 hover:underline hover:underline-offset-4 focus-visible:outline-2 forced-colors:outline-[Highlight]";

export function FileList({
  files,
  layout = "cards",
  title,
  collapsible = false,
  defaultOpen = true,
  onOpen,
  onDownload,
  onDownloadAll,
  label,
  now,
}: FileListProps) {
  const copy = useUiCopy();
  const base = useId();
  const titleId = `${base}-title`;
  const [pending, setPending] = useState<Marks>(() => new Set());
  const [failed, setFailed] = useState<Marks>(() => new Set());
  const [allPending, setAllPending] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  if (files.length === 0) return null;

  const download = async (file: AttachmentFile) => {
    if (onDownload === undefined) return;
    setFailed((marks) => drop(marks, file.id));
    setPending((marks) => add(marks, file.id));
    try {
      await onDownload(file);
    } catch {
      setFailed((marks) => add(marks, file.id));
    } finally {
      setPending((marks) => drop(marks, file.id));
    }
  };

  const downloadAll = async () => {
    if (onDownloadAll === undefined) return;
    setAllFailed(false);
    setAllPending(true);
    try {
      await onDownloadAll(files);
    } catch {
      setAllFailed(true);
    } finally {
      setAllPending(false);
    }
  };

  const cards = layout === "cards";

  const list = (
    <ul
      {...(title === undefined
        ? { "aria-label": label ?? copy.attachments.files }
        : { "aria-labelledby": titleId })}
      className={
        cards
          ? "flex min-w-0 flex-wrap gap-2"
          : "flex min-w-0 flex-col divide-y divide-line rounded-box border border-line bg-surface"
      }
    >
      {files.map((file, index) => {
        const status = file.status ?? "ready";
        const ready = status === "ready";
        const nameId = `${base}-${index}-name`;
        const kind = attachmentKind(file.name, file.type);
        const busy = pending.has(file.id);
        const extension = fileExtension(file.name).toUpperCase();

        const name =
          ready && onOpen !== undefined ? (
            <button
              type="button"
              id={nameId}
              title={file.name}
              onClick={() => onOpen(file)}
              className={NAME}
            >
              {file.name}
            </button>
          ) : ready && file.url !== undefined && onDownload === undefined ? (
            <a
              id={nameId}
              href={file.url}
              download={file.name}
              title={file.name}
              className={NAME}
            >
              {file.name}
            </a>
          ) : (
            <span
              id={nameId}
              title={file.name}
              className="max-w-full truncate font-medium text-ink"
            >
              {file.name}
            </span>
          );

        /* What the file is, or what is happening to it — in words: red alone is a colour some
           people do not see. */
        const detail: ReactNode =
          status === "uploading" ? (
            <ProgressBar
              label={fillCopy(copy.attachments.uploading, { name: file.name })}
              width="w-full"
              {...(file.progress === undefined ? {} : { value: file.progress })}
            />
          ) : status === "failed" || failed.has(file.id) ? (
            <span
              role="alert"
              className="flex min-w-0 items-start gap-1.5 text-micro text-bad"
            >
              <TriangleAlert aria-hidden className="mt-px size-(--size-icon-sm) shrink-0" />
              <span className="min-w-0">
                {status === "failed"
                  ? (file.error ?? copy.attachments.failed)
                  : fillCopy(copy.attachments.downloadFailed, { name: file.name })}
              </span>
            </span>
          ) : (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-micro text-muted tabular-nums">
              {cards && extension !== "" ? <span>{extension}</span> : null}
              {cards && extension !== "" && file.size !== undefined ? (
                <span aria-hidden>·</span>
              ) : null}
              {file.size === undefined ? null : (
                <span className="whitespace-nowrap">
                  {formatFileSize(file.size, copy.locale)}
                </span>
              )}
              {!cards && file.at !== undefined ? (
                <DateValue when={file.at} {...(now === undefined ? {} : { now })} />
              ) : null}
            </span>
          );

        const action = !ready ? null : onDownload !== undefined ? (
          <IconButton
            icon={Download}
            label={copy.attachments.download}
            busy={busy}
            aria-describedby={nameId}
            onClick={() => void download(file)}
          />
        ) : file.url !== undefined ? (
          <IconLink
            icon={Download}
            label={copy.attachments.download}
            href={file.url}
            download={file.name}
            tone="normal"
            aria-describedby={nameId}
          />
        ) : null;

        return (
          <li
            key={file.id}
            data-ui="file-list.file"
            data-status={status}
            className={
              cards
                ? "flex w-full max-w-sm min-w-0 items-center gap-3 rounded-box border border-line bg-surface p-2"
                : "flex min-w-0 items-center gap-3 px-3 py-2"
            }
          >
            <FileThumb file={file} kind={kind} size={cards ? "md" : "sm"} />
            {cards ? (
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-meta">
                {name}
                {detail}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-body">
                {name}
                {detail}
              </div>
            )}
            {action}
          </li>
        );
      })}
    </ul>
  );

  const all =
    onDownloadAll !== undefined && files.length > 1 ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          role="ghost"
          size="sm"
          icon={Download}
          busy={allPending}
          onClick={() => void downloadAll()}
        >
          {copy.attachments.downloadAll}
        </Button>
        {allFailed ? (
          <span role="alert" className="text-micro text-bad">
            {fillCopy(copy.attachments.downloadFailed, {
              name: title ?? copy.attachments.files,
            })}
          </span>
        ) : null}
      </div>
    ) : null;

  const count = (
    <span className="rounded-pill bg-ink/6 px-1.5 text-micro font-medium text-muted tabular-nums">
      {files.length}
    </span>
  );

  if (title !== undefined && collapsible) {
    return (
      <div data-ui="file-list" data-layout={layout} className="min-w-0">
        <Disclosure
          title={
            <span id={titleId} className="inline-flex items-center gap-2">
              {title}
              {count}
            </span>
          }
          defaultExpanded={defaultOpen}
        >
          <div className="flex min-w-0 flex-col gap-2">
            {list}
            {all}
          </div>
        </Disclosure>
      </div>
    );
  }

  return (
    <div data-ui="file-list" data-layout={layout} className="flex min-w-0 flex-col gap-2">
      {title === undefined ? null : (
        <p id={titleId} className="flex items-center gap-2 text-meta font-medium text-ink">
          {title}
          {count}
        </p>
      )}
      {list}
      {all}
    </div>
  );
}
