"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { Button, buttonClasses } from "@sincpro/web-ui/primitives/button/Button";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { ProgressBar } from "@sincpro/web-ui/primitives/value/Value";
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
 */
export type DropZoneProps = {
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
  onFile: (file: File) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the
   *  file's name. */
  mode?: FormMode;
};

export function DropZone({
  accept,
  label,
  busy = false,
  progress,
  fileName,
  fileDetail,
  error,
  onFile,
  onCancel,
  onRetry,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  mode,
}: DropZoneProps) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const readMode = useFormMode(mode) === "read";
  if (readMode) return <ReadValue value={fileName ?? null} />;

  const sentence = label ?? copy.field.drop;
  const types = accept
    ?.split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");

  async function onDrop(items: readonly DropItem[]) {
    if (busy) return;
    for (const item of items) {
      if (item.kind === "file") {
        onFile(await item.getFile());
        return;
      }
    }
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
              onSelect={(files) => {
                const file = files?.[0];
                if (file !== undefined) onFile(file);
              }}
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
                {copy.field.chooseFile}
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
