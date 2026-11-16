"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds } from "@sincpro/web-ui/foundations/form";
import { type FormMode, useFormMode } from "@sincpro/web-ui/foundations/form";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { Button, buttonClasses } from "@sincpro/web-ui/primitives/button/Button";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { ProgressBar } from "@sincpro/web-ui/primitives/value/ProgressBar";
import { useState } from "react";
import {
  Button as AriaButton,
  type DropItem,
  DropZone as AriaDropZone,
  FileTrigger,
} from "react-aria-components";

/**
 * Drop a file, or pick one. Progress is a real bar; failure is a sentence.
 *
 * This is the control. Where it lives —a `Dialog`, a wizard step— is the
 * consumer's. Putting a dashed box on top of a list was the product drawing
 * the control in the wrong place, not the absence of a control.
 *
 * Context: the zone is React Aria's `DropZone` and the button its `FileTrigger`.
 * Dragging is a mouse gesture, so the zone is never the only way in: the
 * «choose file» button opens the system's file dialog from the keyboard, and the
 * zone itself takes a paste (Ctrl/⌘+V of a copied file) and announces a drop to
 * a screen reader. While a file uploads the zone refuses another one — a second
 * drop in the middle of an upload replaces nothing and confuses everything.
 *
 * `accept` filters the file dialog. A drop is NOT filtered: the browser does not
 * say a dragged file's extension until it lands, and a drop that silently does
 * nothing reads as a broken zone. The file reaches `onFile`, and the consumer
 * answers with `error` when it cannot read it.
 *
 * ── One file, or several ─────────────────────────────────────────────
 *
 * `multiple` takes every file of a drop or of the dialog in ONE call to `onFiles` —
 * a gallery gets its thirty photos as one batch, not thirty events. Listing what
 * was chosen, with its thumbnails and per-file removal, is `Attachments`, which
 * draws this zone: the zone takes files, it does not keep them. `max` caps the
 * batch: the first `max` go through and the zone SAYS how many were left out — a
 * silent cut is a photo nobody knows is missing.
 */
type DropZoneCommon = {
  /** The browser's `accept` list: extensions and MIME types, comma-separated
   *  (`".pdf,application/pdf"`). */
  accept?: string;
  label?: string;
  busy?: boolean;
  /** 0 to 100, same scale as `ProgressBar`. */
  progress?: number;
  fileName?: string;
  fileDetail?: string;
  error?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the
   *  file's name. */
  mode?: FormMode;
};

export type DropZoneProps = DropZoneCommon &
  (
    | { multiple?: false; onFile: (file: File) => void }
    | {
        multiple: true;
        /** Every file of one drop, paste or choice, in their order. */
        onFiles: (files: File[]) => void;
        /** At most this many per batch; the rest are left out, and the zone says so. */
        max?: number;
      }
  );

export function DropZone(props: DropZoneProps) {
  const {
    accept,
    label,
    busy = false,
    progress,
    fileName,
    fileDetail,
    error,
    onCancel,
    onRetry,
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
    mode,
  } = props;
  const copy = useUiCopy();
  /* How many the last batch left out, said under the zone until the next batch. */
  const [leftOut, setLeftOut] = useState<{ taken: number; of: number } | null>(null);
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const readMode = useFormMode(mode) === "read";
  if (readMode) return <ReadValue value={fileName ?? null} />;

  const many = props.multiple === true;
  const sentence = label ?? (many ? copy.field.dropMany : copy.field.drop);
  const types = accept
    ?.split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");

  function take(files: readonly File[]) {
    if (files.length === 0) return;
    if (props.multiple !== true) {
      props.onFile(files[0] as File);
      return;
    }
    const max = props.max;
    const taken = max === undefined ? files : files.slice(0, max);
    setLeftOut(
      taken.length < files.length ? { taken: taken.length, of: files.length } : null,
    );
    props.onFiles([...taken]);
  }

  async function onDrop(items: readonly DropItem[]) {
    if (busy) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind !== "file") continue;
      files.push(await item.getFile());
      if (!many) break;
    }
    take(files);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <AriaDropZone
        {...(labelledBy === undefined
          ? { "aria-label": sentence }
          : { "aria-labelledby": labelledBy })}
        aria-describedby={describedBy}
        isDisabled={busy}
        getDropOperation={() => (busy ? "cancel" : "copy")}
        onDrop={(event) => void onDrop(event.items)}
        className={({ isDropTarget, isFocusVisible }) =>
          cn(
            "flex flex-col items-center gap-3 rounded-box border px-4 py-6 text-center transition-colors duration-(--duration-instant) outline-primary outline-offset-2",
            isDropTarget
              ? "border-primary bg-primary/8 forced-colors:border-[Highlight]"
              : invalid
                ? "border-danger bg-surface"
                : "border-line-strong bg-surface",
            isFocusVisible ? "outline-2" : "outline-0",
          )
        }
      >
        <p className="text-body text-muted">{sentence}</p>
        {busy ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-2">
            {fileName === undefined ? null : (
              <p className="max-w-full truncate text-body text-ink">{fileName}</p>
            )}
            {/* The bar is as wide as its box; on its own it shrinks to its figure. */}
            <div className="w-full">
              <ProgressBar
                value={progress ?? 0}
                label={copy.field.uploadProgress}
                width="w-full"
              />
            </div>
            {fileDetail === undefined ? null : (
              <p className="text-meta text-muted">{fileDetail}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <FileTrigger
              {...(types === undefined ? {} : { acceptedFileTypes: types })}
              allowsMultiple={many}
              onSelect={(files) => take(files === null ? [] : Array.from(files))}
            >
              {/* React Aria's button, because the trigger presses it through React Aria's
                  press events; dressed as the system's secondary — the main action of the
                  screen is whatever the file is FOR, not the act of choosing it. */}
              {/* The field's id lands on the button: the label of a `Field` then points at
                  the one thing in here that takes the focus. */}
              <AriaButton
                id={id}
                data-emphasis="secondary"
                className={buttonClasses("secondary", "md")}
              >
                {many ? copy.field.chooseFiles : copy.field.chooseFile}
              </AriaButton>
            </FileTrigger>
            {onCancel === undefined ? null : (
              <Button role="ghost" onClick={onCancel}>
                {copy.field.cancel}
              </Button>
            )}
          </div>
        )}
      </AriaDropZone>
      {/* A status, not an error: what was taken is on its way; this says what was not. */}
      <p role="status" className={leftOut === null ? "sr-only" : "text-meta text-warn"}>
        {leftOut === null
          ? null
          : fillCopy(copy.field.tooManyFiles, {
              max: leftOut.taken.toLocaleString(copy.locale),
              count: leftOut.of.toLocaleString(copy.locale),
            })}
      </p>
      {error === undefined || error === null ? null : (
        <Failed
          heading={copy.field.fileUnreadable}
          sentence={error}
          {...(onRetry === undefined
            ? {}
            : {
                action: (
                  <Button role="ghost" onClick={onRetry}>
                    {copy.field.tryAnother}
                  </Button>
                ),
              })}
        />
      )}
    </div>
  );
}
