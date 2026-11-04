"use client";

import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import type { ControlProps } from "@sincpro/web-ui/primitives/field/Field";
import type { MentionItem } from "@sincpro/web-ui/primitives/field/RichTextEditor";
import { RichTextValue } from "@sincpro/web-ui/primitives/value/RichText";
import { lazy, Suspense } from "react";

/* The editor (Tiptap + ProseMirror) is its own chunk: fetched the first time a rich-text
   field is EDITED, never by a record that is only read. */
const RichTextEditor = lazy(() =>
  import("@sincpro/web-ui/primitives/field/RichTextEditor").then((module) => ({
    default: module.RichTextEditor,
  })),
);

/**
 * Formatted text — a description, the notes of an order, the body of an email: an Odoo `html`
 * field. The value is HTML in and HTML out.
 *
 * Context: Tiptap (ProseMirror) underneath because it is headless — the toolbar is the
 * system's own `Toolbar` of `IconButton`s, so the editor looks like every other control —
 * and because it reads and writes HTML, which is what the engine stores. The editor is a
 * separate chunk loaded only on editing; until it arrives, a box of the editor's size holds
 * the place so the form does not jump.
 *
 * Read mode never mounts an editor: it draws `RichTextValue`, the same HTML CLEANED of
 * anything that runs (DOMPurify), in the same `rich-text` style the editor uses — so what is
 * written is what is read, line for line.
 *
 * `toolbar` picks how much to offer: `full` (headings, quote, table, undo), `basic` (bold,
 * italic, lists, link — a comment), `none` (only the keyboard shortcuts). `mentions` turns on
 * «@»: the application answers who matches what was typed.
 */
export function RichTextInput({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  toolbar = "full",
  mentions,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** HTML. `""` is empty. */
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  toolbar?: "full" | "basic" | "none";
  /** Who can be mentioned with «@», for what was typed after it. */
  mentions?: (query: string) => readonly MentionItem[] | Promise<readonly MentionItem[]>;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });

  if (useFormMode(mode) === "read") return <RichTextValue value={value} />;

  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="h-32 w-full min-w-0 animate-reveal-late rounded-control border border-line-strong bg-ground"
        />
      }
    >
      <RichTextEditor
        id={id}
        labelledBy={labelledBy}
        describedBy={describedBy}
        invalid={invalid}
        ariaLabel={ariaLabel}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        toolbar={toolbar}
        mentions={mentions}
      />
    </Suspense>
  );
}

export type { MentionItem };
