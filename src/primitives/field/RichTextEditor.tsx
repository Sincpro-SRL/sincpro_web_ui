"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { emailHref, telHref, urlHref } from "@sincpro/web-ui/primitives/field/contact";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import { Toolbar, ToolbarSeparator } from "@sincpro/web-ui/primitives/toolbar/Toolbar";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/* ==================================================================== *
 *  THE RICH-TEXT EDITOR — Tiptap underneath, the system on top.
 *
 *  Loaded only when a `RichTextInput` is EDITED (see `RichTextInput.tsx`):
 *  ProseMirror is the heaviest thing a form can carry, and a record read a
 *  hundred times and edited once should not pay for it a hundred times.
 *
 *  Tiptap is headless, which is why it was chosen: the toolbar is the system's
 *  `Toolbar` of `IconButton`s (one Tab stop, arrows inside, each with its name
 *  and its pressed state), the link form is a `PopoverTrigger`, and the content
 *  is styled by the same `rich-text` utility that reads it. HTML in, HTML out —
 *  what an Odoo `html` field stores.
 * ==================================================================== */

export type MentionItem = { id: string; label: string };

export type RichTextEditorProps = {
  id: string | undefined;
  labelledBy: string | undefined;
  describedBy: string | undefined;
  invalid: boolean;
  ariaLabel: string | undefined;
  value: string;
  onChange: ((html: string) => void) | undefined;
  placeholder: string | undefined;
  disabled: boolean;
  toolbar: "full" | "basic" | "none";
  mentions:
    ((query: string) => readonly MentionItem[] | Promise<readonly MentionItem[]>) | undefined;
};

/** What the suggestion plugin hands over while «@…» is being typed. */
type Asking = {
  items: readonly MentionItem[];
  rect: DOMRect | null;
  pick: (item: MentionItem) => void;
};

/** A link address as people write it: a website, an email, a phone — or nothing valid. */
function linkHref(text: string): string | null {
  const clean = text.trim();
  if (clean === "") return null;
  if (clean.includes("@") && !clean.includes("/"))
    return emailHref(clean.replace(/^mailto:/i, ""));
  if (/^(?:tel:)?\+?[\d\s().-]{6,}$/i.test(clean)) return telHref(clean);
  return urlHref(clean);
}

function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const copy = useUiCopy().richText;
  const current = (editor.getAttributes("link")["href"] as string | undefined) ?? "";
  const [text, setText] = useState(current);
  const [tried, setTried] = useState(false);
  const inputId = useId();
  const href = linkHref(text);

  const apply = () => {
    setTried(true);
    if (href === null) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    close();
  };

  return (
    <form
      className="flex w-72 max-w-full flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <label htmlFor={inputId} className="text-micro font-medium text-muted">
        {copy.linkUrl}
      </label>
      <input
        id={inputId}
        value={text}
        autoFocus
        inputMode="url"
        spellCheck={false}
        aria-invalid={tried && href === null}
        {...(tried && href === null ? { "aria-describedby": `${inputId}-error` } : {})}
        onChange={(event) => setText(event.target.value)}
        className="h-(--size-control-md) w-full min-w-0 rounded-control border border-line-strong bg-surface px-2.5 text-meta text-ink outline-0 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {tried && href === null ? (
        <p id={`${inputId}-error`} role="alert" className="text-micro text-danger">
          {copy.badLink}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {current === "" ? null : (
          <Button
            role="ghost"
            size="sm"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              close();
            }}
          >
            {copy.removeLink}
          </Button>
        )}
        <Button role="secondary" size="sm" type="submit">
          {copy.applyLink}
        </Button>
      </div>
    </form>
  );
}

function Bar({ editor, full }: { editor: Editor; full: boolean }) {
  const copy = useUiCopy().richText;
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const toggle = (label: string, icon: typeof Bold, pressed: boolean, run: () => void) => (
    <IconButton
      key={label}
      icon={icon}
      label={label}
      aria-pressed={pressed}
      disabled={!editor.isEditable}
      /* Keeps the selection: a press that blurred the editor would format nothing. */
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    />
  );

  return (
    <div className="border-b border-line px-1 py-1">
      <Toolbar label={copy.toolbar}>
        {toggle(copy.bold, Bold, on.bold, () => chain().toggleBold().run())}
        {toggle(copy.italic, Italic, on.italic, () => chain().toggleItalic().run())}
        {full
          ? toggle(copy.underline, Underline, on.underline, () =>
              chain().toggleUnderline().run(),
            )
          : null}
        {full
          ? toggle(copy.strike, Strikethrough, on.strike, () => chain().toggleStrike().run())
          : null}
        <ToolbarSeparator />
        {full
          ? toggle(copy.heading, Heading2, on.h2, () =>
              chain().toggleHeading({ level: 2 }).run(),
            )
          : null}
        {full
          ? toggle(copy.subheading, Heading3, on.h3, () =>
              chain().toggleHeading({ level: 3 }).run(),
            )
          : null}
        {toggle(copy.bulletList, List, on.bullet, () => chain().toggleBulletList().run())}
        {toggle(copy.orderedList, ListOrdered, on.ordered, () =>
          chain().toggleOrderedList().run(),
        )}
        {full
          ? toggle(copy.quote, TextQuote, on.quote, () => chain().toggleBlockquote().run())
          : null}
        <ToolbarSeparator />
        <PopoverTrigger
          title={copy.link}
          trigger={
            <IconButton
              icon={LinkIcon}
              label={copy.link}
              aria-pressed={on.link}
              disabled={!editor.isEditable}
            />
          }
        >
          {(close) => <LinkForm editor={editor} close={close} />}
        </PopoverTrigger>
        {full ? (
          <IconButton
            icon={Table}
            label={copy.table}
            disabled={!editor.isEditable}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          />
        ) : null}
        {full ? (
          <>
            <ToolbarSeparator />
            <IconButton
              icon={Undo2}
              label={copy.undo}
              disabled={!on.undo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chain().undo().run()}
            />
            <IconButton
              icon={Redo2}
              label={copy.redo}
              disabled={!on.redo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chain().redo().run()}
            />
            <IconButton
              icon={RemoveFormatting}
              label={copy.clear}
              disabled={!editor.isEditable}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chain().unsetAllMarks().clearNodes().run()}
            />
          </>
        ) : null}
      </Toolbar>
    </div>
  );
}

/** The list that opens on «@»: fixed under the caret, moved through from the editor. */
function MentionList({
  asking,
  active,
  listId,
}: {
  asking: Asking;
  active: number;
  listId: string;
}) {
  const copy = useUiCopy().richText;
  const rect = asking.rect;
  if (rect === null) return null;
  return (
    <ul
      id={listId}
      role="listbox"
      aria-label={copy.mentions}
      className="fixed z-50 flex w-64 flex-col rounded-panel border border-line-strong bg-surface p-1 shadow-float"
      style={{ left: rect.left, top: rect.bottom + 4 }}
    >
      {asking.items.length === 0 ? (
        <li
          role="option"
          aria-selected={false}
          aria-disabled
          className="px-2 py-1 text-meta text-muted"
        >
          {copy.noMatches}
        </li>
      ) : (
        asking.items.map((item, index) => (
          <li
            key={item.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => {
              event.preventDefault();
              asking.pick(item);
            }}
            className={`cursor-default rounded-control px-2 py-1 text-meta text-ink ${
              index === active ? "bg-primary/8" : ""
            }`}
          >
            {item.label}
          </li>
        ))
      )}
    </ul>
  );
}

export function RichTextEditor({
  id,
  labelledBy,
  describedBy,
  invalid,
  ariaLabel,
  value,
  onChange,
  placeholder,
  disabled,
  toolbar,
  mentions,
}: RichTextEditorProps) {
  const changed = useRef(onChange);
  changed.current = onChange;
  const searching = useRef(mentions);
  searching.current = mentions;

  const [asking, setAsking] = useState<Asking | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const askingRef = useRef<Asking | null>(null);
  askingRef.current = asking;
  const listId = useId();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TableKit.configure({ table: { resizable: false } }),
      ...(placeholder === undefined ? [] : [Placeholder.configure({ placeholder })]),
      ...(mentions === undefined
        ? []
        : [
            Mention.configure({
              HTMLAttributes: { "data-type": "mention" },
              renderText: ({ node }) => `@${String(node.attrs["label"] ?? node.attrs["id"])}`,
              suggestion: {
                char: "@",
                items: async ({ query }) => [...((await searching.current?.(query)) ?? [])],
                render: () => {
                  const show = (
                    props: SuggestionProps<MentionItem, { id: string; label: string }>,
                  ) => {
                    setActive(0);
                    setAsking({
                      items: props.items,
                      rect: props.clientRect?.() ?? null,
                      pick: (item) => props.command({ id: item.id, label: item.label }),
                    });
                  };
                  return {
                    onStart: show,
                    onUpdate: show,
                    onExit: () => setAsking(null),
                    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                      const now = askingRef.current;
                      if (now === null) return false;
                      const count = now.items.length;
                      if (event.key === "Escape") {
                        setAsking(null);
                        return true;
                      }
                      if (count === 0) return false;
                      if (event.key === "ArrowDown") {
                        setActive((activeRef.current + 1) % count);
                        return true;
                      }
                      if (event.key === "ArrowUp") {
                        setActive((activeRef.current - 1 + count) % count);
                        return true;
                      }
                      if (event.key === "Enter" || event.key === "Tab") {
                        const item = now.items[activeRef.current];
                        if (item !== undefined) now.pick(item);
                        return true;
                      }
                      return false;
                    },
                  };
                },
              },
            }),
          ]),
    ],
    editorProps: {
      attributes: {
        class: "rich-text min-h-24 max-h-96 overflow-y-auto px-2.5 py-2 outline-0",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => changed.current?.(e.isEmpty ? "" : e.getHTML()),
  });

  /* The field's wiring on the editable element itself — React Aria-style ids from `Field`,
     kept in step when they change (an error appears, the label is renamed). */
  useEffect(() => {
    const dom = editor?.view.dom;
    if (dom === undefined) return;
    const set = (name: string, next: string | undefined) =>
      next === undefined ? dom.removeAttribute(name) : dom.setAttribute(name, next);
    set("id", id);
    set("aria-labelledby", labelledBy);
    set("aria-label", labelledBy === undefined ? (ariaLabel ?? placeholder) : undefined);
    set("aria-describedby", describedBy);
    set("aria-invalid", invalid ? "true" : undefined);
    set("aria-controls", asking === null ? undefined : listId);
    set(
      "aria-activedescendant",
      asking === null || asking.items.length === 0 ? undefined : `${listId}-${active}`,
    );
  }, [
    editor,
    id,
    labelledBy,
    describedBy,
    invalid,
    ariaLabel,
    placeholder,
    asking,
    active,
    listId,
  ]);

  useEffect(() => editor?.setEditable(!disabled), [editor, disabled]);

  /* A value written from outside (a reset, a suggestion applied) replaces the content — but
     never while the person is typing, which would move their caret. */
  useEffect(() => {
    if (editor === null || editor.isFocused) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value)
      editor.commands.setContent(value === "" ? "" : value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className={`w-full min-w-0 overflow-clip rounded-control border bg-surface transition-colors duration-(--duration-instant) focus-within:outline-2 focus-within:outline-offset-2 ${
        invalid
          ? "border-danger focus-within:outline-danger"
          : "border-line-strong focus-within:border-primary focus-within:outline-primary"
      } ${disabled ? "bg-ground text-muted" : ""}`}
    >
      {editor === null || toolbar === "none" ? null : (
        <Bar editor={editor} full={toolbar === "full"} />
      )}
      <EditorContent editor={editor} />
      {asking === null ? null : (
        <MentionList asking={asking} active={active} listId={listId} />
      )}
    </div>
  );
}
