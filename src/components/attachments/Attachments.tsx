"use client";

import {
  type AttachmentKind,
  attachmentKind,
  fileExtension,
  formatFileSize,
} from "@sincpro/web-ui/components/attachments/files";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { type FormMode, useFormMode } from "@sincpro/web-ui/foundations/form";
import { Button, IconButton, IconLink } from "@sincpro/web-ui/primitives/button/Button";
import { DropZone } from "@sincpro/web-ui/primitives/field/DropZone";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { useToastIfAny } from "@sincpro/web-ui/primitives/notice/Toast";
import { DateValue } from "@sincpro/web-ui/primitives/value/DateValue";
import { UserChip } from "@sincpro/web-ui/primitives/value/Person";
import { ProgressBar } from "@sincpro/web-ui/primitives/value/ProgressBar";
import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  type LucideIcon,
  RotateCcw,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";

/* ==================================================================== *
 *  ATTACHMENTS — the files of a record (Odoo's paperclip).
 *
 *  It answers, per file, the four things a person looks for in this order: which file it
 *  is (the type and, for an image, the image itself), how big, who brought it and when,
 *  and what can be done with it — open it, download it, take it away.
 *
 *  ── web-ui lists; the application stores and opens ──────────────────
 *
 *  Nothing here uploads, downloads through code or opens a viewer. `onAdd` hands the
 *  application the `File`s; the application uploads them and answers by putting the file
 *  in `files` with its `status` — `uploading` with its `progress`, `failed` with its
 *  sentence — so the state a person sees is the state the server is in, not one this list
 *  guessed. Opening is `onOpen(file)`: the workspace decides where it opens (a peek, a
 *  side panel, a new tab), exactly as with a record — see `stories/Estilo.mdx`. A list that
 *  opened its own modal would be a modal over the record's modal the day it is used inside
 *  one. Downloading is a real `<a download>`: middle-click, «save as» and the browser's
 *  own download manager, which keeps a 150 MB scan out of the tab's memory.
 *
 *  ── Undo, not «are you sure?» ───────────────────────────────────────
 *
 *  The trash removes at once (`onRemove`) and the notice offers «Deshacer» (`onRestore`,
 *  with the index it had), the same way `LineItems` removes a line. The focus does not fall
 *  to the page: it goes to the next file's trash — so the keyboard can clear several in a
 *  row — or, when it was the last one, to «Elegir archivo». A file that is still uploading,
 *  or that failed, is not stored yet: taking it away cancels, and there is nothing to undo.
 *
 *  ── Read mode ───────────────────────────────────────────────────────
 *
 *  It follows the form (`useFormMode`): a posted document still shows and downloads its
 *  files, but cannot gain or lose one — no drop zone, no trash.
 * ==================================================================== */

export type AttachmentStatus = "ready" | "uploading" | "failed";

export type AttachmentFile = {
  /** The attachment's identity: the server's id, or a local key while it uploads. */
  id: string;
  /** The file name as it was saved: «Factura proveedor 0418.pdf». */
  name: string;
  /** In bytes. Written in the copy's locale: «1,2 MB». */
  size?: number;
  /** The MIME type, when the server knows it. With the name, it picks the icon. */
  type?: string;
  /** Where it downloads from. Absent = no download (still uploading, or not allowed). */
  url?: string;
  /** A small image for the thumbnail. Defaults to `url` for an image — pass a smaller one
   *  when the server has it, so a list of 4 MB photos does not load 4 MB photos. */
  thumbnail?: string;
  /** Who added it. */
  by?: string;
  /** Their face, for the chip. */
  byAvatar?: string;
  /** When it was added. */
  at?: Date | string | number;
  /** `ready` by default. The application owns it: it is what the upload is really doing. */
  status?: AttachmentStatus;
  /** 0 to 100 while `uploading`. Absent = under way without a figure yet. */
  progress?: number;
  /** Why it `failed`, in the server's words. */
  error?: string;
};

export type AttachmentsProps = {
  files: readonly AttachmentFile[];
  /** Files to add: dropped, pasted or chosen. Present = the drop zone is drawn (in edit
   *  mode). The application uploads them and puts them in `files` as `uploading`. */
  onAdd?: (files: File[]) => void;
  /** A file was removed. It is gone at once; the notice offers to undo it. */
  onRemove?: (file: AttachmentFile) => void;
  /** Put a removed file back where it was. Without it the notice has no «Deshacer». */
  onRestore?: (file: AttachmentFile, index: number) => void;
  /** Open the file. Present = its name is a button; WHERE it opens is the application's. */
  onOpen?: (file: AttachmentFile) => void;
  /** Try a failed upload again. Present = a failed file offers «Reintentar». */
  onRetry?: (file: AttachmentFile) => void;
  /** The browser's `accept` list for the file dialog (`".pdf,image/*"`). */
  accept?: string;
  /** `read` for a record that can no longer change. By default, the form's mode. */
  mode?: FormMode;
  /** The accessible name of the list. «Adjuntos» by default. */
  label?: string;
  /** What an empty list says, when the screen can say something closer to its domain:
   *  «Esta compra todavía no tiene la factura del proveedor». */
  empty?: string;
  /** The «now» the dates are relative to — so a story or a test does not change its
   *  text every minute. */
  now?: Date;
};

const KIND_ICON: Record<AttachmentKind, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  sheet: FileSpreadsheet,
  doc: FileType,
  other: File,
};

/** The type, at the size of a row: the image itself when there is one, otherwise the icon
 *  of its kind over its extension. The extension is written because three of the five
 *  icons are a page with lines on it — «PDF» and «DOCX» are what tell them apart, and a
 *  word is never a colour that only some people see. */
function Thumb({ file, kind }: { file: AttachmentFile; kind: AttachmentKind }) {
  const picture =
    kind === "image" && file.status !== "failed" ? (file.thumbnail ?? file.url) : undefined;
  const Icon = KIND_ICON[kind];
  const extension = fileExtension(file.name).slice(0, 4);
  return (
    /* Decorative: the name next to it says which file it is, and the image's `alt` would
       say it twice. */
    <span
      aria-hidden
      className="flex size-(--size-control-lg) shrink-0 flex-col items-center justify-center gap-0.5 overflow-clip rounded-control border border-line bg-ink/4 text-muted"
    >
      {picture === undefined ? (
        <>
          <Icon className="size-(--size-icon-md)" strokeWidth={1.75} />
          {extension === "" ? null : (
            <span className="text-micro leading-none font-medium uppercase">{extension}</span>
          )}
        </>
      ) : (
        <img src={picture} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </span>
  );
}

export function Attachments({
  files,
  onAdd,
  onRemove,
  onRestore,
  onOpen,
  onRetry,
  accept,
  mode,
  label,
  empty,
  now,
}: AttachmentsProps) {
  const copy = useUiCopy();
  const toast = useToastIfAny();
  const editable = useFormMode(mode) !== "read";
  const base = useId();
  const dropId = `${base}-drop`;
  const listRef = useRef<HTMLUListElement>(null);

  /* Where the focus goes once the removed file has left `files`: a file's id, or `null`
     for the drop zone. Set on remove, spent when the list the application answers with
     is drawn — not before, or it would land on the row that is about to disappear. */
  const focusNext = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const target = focusNext.current;
    if (target === undefined) return;
    focusNext.current = undefined;
    if (target === null) {
      document.getElementById(dropId)?.focus();
      return;
    }
    const row = [
      ...(listRef.current?.querySelectorAll<HTMLElement>("[data-attachment-id]") ?? []),
    ].find((one) => one.dataset["attachmentId"] === target);
    (
      row?.querySelector<HTMLElement>("[data-attachment-remove]") ??
      row?.querySelector<HTMLElement>("[data-attachment-name]")
    )?.focus();
  }, [files, dropId]);

  const remove = (file: AttachmentFile, index: number) => {
    const neighbour = files[index + 1] ?? files[index - 1];
    focusNext.current =
      neighbour === undefined ? (onAdd === undefined ? undefined : null) : neighbour.id;
    onRemove?.(file);
    /* Only what was stored can be undone: a cancelled upload was never there. */
    if ((file.status ?? "ready") !== "ready") return;
    toast?.show({
      message: fillCopy(copy.attachments.removed, { name: file.name }),
      ...(onRestore === undefined
        ? {}
        : {
            action: {
              label: copy.attachments.undo,
              onSelect: () => onRestore(file, index),
            },
          }),
    });
  };

  const adding = editable && onAdd !== undefined;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {files.length === 0 ? (
        adding ? null : (
          <Empty sentence={empty ?? copy.attachments.empty} align="start" />
        )
      ) : (
        <ul
          ref={listRef}
          aria-label={label ?? copy.attachments.label}
          className="flex min-w-0 flex-col divide-y divide-line"
        >
          {files.map((file, index) => {
            const status = file.status ?? "ready";
            const nameId = `${base}-${index}-name`;
            const detailId = `${base}-${index}-detail`;
            const kind = attachmentKind(file.name, file.type);
            return (
              <li
                key={file.id}
                data-attachment-id={file.id}
                data-status={status}
                className="flex min-w-0 items-center gap-3 py-2"
              >
                <Thumb file={file} kind={kind} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {onOpen === undefined || status !== "ready" ? (
                    <span
                      id={nameId}
                      title={file.name}
                      className="max-w-full truncate text-body font-medium text-ink"
                    >
                      {file.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      id={nameId}
                      title={file.name}
                      data-attachment-name
                      aria-describedby={detailId}
                      onClick={() => onOpen(file)}
                      className="max-w-full cursor-pointer truncate rounded-control text-left text-body font-medium text-ink outline-primary outline-offset-2 hover:underline hover:underline-offset-4 focus-visible:outline-2 forced-colors:outline-[Highlight]"
                    >
                      {file.name}
                    </button>
                  )}
                  {status === "uploading" ? (
                    <div className="w-full">
                      <ProgressBar
                        label={fillCopy(copy.attachments.uploading, { name: file.name })}
                        width="w-full"
                        {...(file.progress === undefined ? {} : { value: file.progress })}
                      />
                    </div>
                  ) : status === "failed" ? (
                    /* The icon AND the words: red alone is a colour some people do not see. */
                    <p
                      id={detailId}
                      role="alert"
                      className="flex min-w-0 items-start gap-1.5 text-meta text-bad"
                    >
                      <TriangleAlert
                        aria-hidden
                        className="mt-px size-(--size-icon-sm) shrink-0"
                        strokeWidth={2}
                      />
                      <span className="min-w-0">{file.error ?? copy.attachments.failed}</span>
                    </p>
                  ) : (
                    <p
                      id={detailId}
                      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted"
                    >
                      {file.size === undefined ? null : (
                        <span className="tabular-nums whitespace-nowrap">
                          {formatFileSize(file.size, copy.locale)}
                        </span>
                      )}
                      {file.by === undefined ? null : (
                        <UserChip
                          name={file.by}
                          size="sm"
                          {...(file.byAvatar === undefined ? {} : { src: file.byAvatar })}
                        />
                      )}
                      {file.at === undefined ? null : (
                        <DateValue when={file.at} {...(now === undefined ? {} : { now })} />
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {status === "failed" && onRetry !== undefined ? (
                    <Button
                      role="ghost"
                      size="sm"
                      icon={RotateCcw}
                      aria-describedby={nameId}
                      onClick={() => onRetry(file)}
                    >
                      {copy.attachments.retry}
                    </Button>
                  ) : null}
                  {status === "ready" && file.url !== undefined ? (
                    <IconLink
                      icon={Download}
                      label={copy.attachments.download}
                      href={file.url}
                      download={file.name}
                      tone="normal"
                      aria-describedby={nameId}
                    />
                  ) : null}
                  {editable && onRemove !== undefined ? (
                    <IconButton
                      icon={status === "ready" ? Trash2 : X}
                      label={
                        status === "uploading"
                          ? copy.attachments.cancelUpload
                          : copy.attachments.remove
                      }
                      tone={status === "ready" ? "danger" : "normal"}
                      data-attachment-remove
                      aria-describedby={nameId}
                      onClick={() => remove(file, index)}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {adding ? (
        <DropZone
          id={dropId}
          mode="edit"
          label={
            files.length === 0 ? (empty ?? copy.attachments.emptyAdd) : copy.attachments.add
          }
          {...(accept === undefined ? {} : { accept })}
          onFile={(file) => onAdd([file])}
        />
      ) : null}
    </div>
  );
}
