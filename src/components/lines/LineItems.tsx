"use client";

import {
  commitDraft,
  filterLines,
  planRemoval,
} from "@sincpro/web-ui/components/lines/lines";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { SearchField } from "@sincpro/web-ui/primitives/choice/SearchField";
import { Dialog, type DialogContext } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { FieldIdsContext } from "@sincpro/web-ui/primitives/field/context";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { useToast } from "@sincpro/web-ui/primitives/notice/Toast";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";
import {
  EditableTable,
  type EditColumn,
  type EditLayout,
} from "@sincpro/web-ui/primitives/table/EditableTable";
import { Totals, type TotalsRow } from "@sincpro/web-ui/primitives/value/Totals";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

/* ==================================================================== *
 *  LINE ITEMS — the sub-list inside a record (Odoo's one2many).
 *
 *  The lines of an invoice, of a sales order, of an accounting entry. It is the
 *  block a person spends most of a document in, so it answers four questions in
 *  the order they are asked: how many lines are there (the count), where is the
 *  one I want (the search, only when there are enough to need one), what does
 *  each one say (the table), and how much does it all add up to (the totals,
 *  apart and on the right).
 *
 *  ── Two ways to edit, for two sizes of change ───────────────────────
 *
 *  A quantity is fixed where it is read: the table is the system's
 *  `EditableTable`, so touching a row puts the row into editing and the cells
 *  that declared `edit` become controls. Changing the whole line —another
 *  product, its price and discount together— is a small form, so it opens the
 *  line in a `Dialog` with real fields and «Listo» / «Cancelar». The dialog is
 *  also the keyboard's way in: «Editar la línea» is a button on every row, and
 *  closing the dialog gives focus back to it (React Aria restores it).
 *
 *  ── On a phone the line is a card, and a press opens the editor ─────
 *
 *  Below `--container-handheld` the table draws each line as a stacked card
 *  (`EditableTable`): the product on top, «12 × Bs. 120,00 · desc. 10 %» under
 *  it and the amount at the right, in ink — the figure that was clipped off the
 *  side of a five-column grid. Where each column goes is the column's
 *  (`stack`, `brief`), not a special case here. There is no hover on a phone, so
 *  the pencil and the trash waiting on the row would be invisible: the card
 *  itself is the way in —a press, or `Enter`, opens the line in the editor, a
 *  bottom sheet there— and the editor carries «Quitar la línea» (on every width:
 *  Odoo's line dialog does too, and the trash on the row stays on a desk).
 *
 *  ── Removing is undone, not confirmed ───────────────────────────────
 *
 *  «¿Seguro que querés quitar la línea?» on every line trains people to press
 *  «sí» without reading. The line goes at once and a notice offers the way back
 *  (PRINCIPLES §7); the component hands the removed line and its position back to
 *  whoever owns the lines, so the undo puts it exactly where it was.
 *
 *  ── One action ──────────────────────────────────────────────────────
 *
 *  «Agregar una línea» is the only button of the block, and it is secondary: the
 *  primary action belongs to the record (Publicar, Guardar), and a screen has one.
 * ==================================================================== */

/**
 * A column of the lines. The same contract as `DataTable`'s columns —`value` is
 * the raw value (what the search reads), `cell` how it is drawn, `text` how it
 * reads as plain text— plus `edit`, the control that replaces the cell when the
 * row is being edited in place.
 */
export type LineItemColumn<T> = Pick<
  DataColumn<T>,
  "id" | "header" | "value" | "cell" | "text" | "numeric" | "width"
> &
  /* Where the column goes on a phone, and how it reads in the card's detail line —
     `EditableTable`'s contract, passed through. */
  Pick<EditColumn<T>, "stack" | "brief"> & {
    /** The control while the row is edited in place. Without it the cell stays read
     *  only — a computed amount, a code. Only simple values belong here; the whole
     *  line is edited in the `editor`. */
    edit?: (line: T, set: (next: T) => void) => ReactNode;
  };

/** What the popup editor receives besides the draft. */
export type LineEditorState = {
  /** «Listo» was pressed and the draft was not valid: show the errors now, not before. */
  tried: boolean;
  /** A line that does not exist yet. */
  isNew: boolean;
};

export type LineItemsProps<T> = {
  lines: readonly T[];
  columns: readonly LineItemColumn<T>[];
  getLineId: (line: T) => string;
  /** How a line is named — in the removal notice, the editor's header and for the
   *  screen reader next to each row's buttons. Defaults to the first column's text. */
  lineLabel?: (line: T) => string;
  /** `read` for a document that can no longer change (a posted invoice): no add, no
   *  edit, no remove — just the lines. By default it inherits the form's mode. */
  mode?: FormMode;
  /** A line changed, in place or in the editor. Without it nothing is editable. */
  onChange?: (id: string, next: T) => void;
  /** A new line, already filled in the editor (or blank, without an editor). */
  onAdd?: (line: T) => void;
  /** The blank line «Agregar una línea» starts from. Required for adding. */
  newLine?: () => T;
  /** A line was removed. It is gone at once; the notice offers to undo it. */
  onRemove?: (id: string) => void;
  /** Put a removed line back where it was. Without it the notice has no «Deshacer». */
  onRestore?: (line: T, index: number) => void;
  /** The whole line as a form: the product, the quantity, the price, the discount.
   *  Written with the system's `Field` controls; `set` replaces the draft. */
  editor?: (draft: T, set: (next: T) => void, state: LineEditorState) => ReactNode;
  /** Whether the draft can be saved. When it cannot, «Listo» keeps the editor open
   *  and `state.tried` turns on so the editor can say what is missing. */
  isValid?: (draft: T) => boolean;
  /** What the editor is about, in its header: «factura · FAC/2026/0118». */
  context?: DialogContext;
  /** What the search reads. Defaults to every column's `text` or `value`. */
  searchText?: (line: T) => string;
  /** The search shows up only with MORE lines than this. Four lines are read, not
   *  searched; a search box over them is a control that answers nothing. */
  searchFrom?: number;
  /** The money summary under the lines, on the right: the system's `Totals`. */
  totals?: readonly TotalsRow[];
  /** `auto` (the default) draws the lines as stacked cards below
   *  `--container-handheld`; `table` and `stacked` force one. */
  layout?: EditLayout;
};

/** The notice is optional: without a `ToastProvider` the line is still removed, just
 *  without the way back — a missing provider must not break a form. */
function useOptionalToast(): ReturnType<typeof useToast> | null {
  try {
    return useToast();
  } catch {
    return null;
  }
}

function plain(v: string | number | boolean | null): string {
  return v === null ? "" : String(v);
}

type Session<T> = { id: string | null; draft: T; tried: boolean };

/**
 * The lines of a document inside its record: a count and a search above, the lines
 * (edited in place or in a popup editor), and the totals under them on the right.
 *
 * Context: the record used to compose this by hand — a `Table`, its rows, a
 * `Totals` — and every module did it a little differently: where «add» went, whether
 * removing asked first, what an empty document said. One component, built on
 * `EditableTable` and `Dialog`, makes the one2many the same block everywhere.
 */
export function LineItems<T>({
  lines,
  columns,
  getLineId,
  lineLabel,
  mode,
  onChange,
  onAdd,
  newLine,
  onRemove,
  onRestore,
  editor,
  isValid,
  context,
  searchText,
  searchFrom = 8,
  totals,
  layout = "auto",
}: LineItemsProps<T>) {
  const copy = useUiCopy();
  const toast = useOptionalToast();
  const read = useFormMode(mode) === "read";
  const root = useRef<HTMLDivElement>(null);
  const searchLabelId = useId();
  const formId = useId();
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<Session<T> | null>(null);
  const [open, setOpen] = useState(false);
  /* The draft the form submits, read from a ref: Enter in a number field commits
     the typed text and submits in the same keystroke, before a re-render. */
  const draftRef = useRef<T | null>(null);
  /* Where focus goes after a removal: the button that was pressed is gone with its
     row, and focus falling to the page is losing the place. */
  const focusNext = useRef<{ id: string | null } | null>(null);

  const canChange = !read && onChange !== undefined;
  const canAdd = !read && onAdd !== undefined && newLine !== undefined;
  const canRemove = !read && onRemove !== undefined;
  const canEdit = canChange && editor !== undefined;

  const labelOf = (line: T): string => {
    if (lineLabel !== undefined) return lineLabel(line);
    const first = columns[0];
    if (first === undefined) return getLineId(line);
    return first.text?.(line) ?? plain(first.value(line));
  };

  const searchable = lines.length > searchFrom;
  const q = searchable ? query.trim() : "";
  const shown = useMemo(
    () =>
      filterLines(
        lines,
        q,
        (line) =>
          searchText !== undefined
            ? searchText(line)
            : columns.map((c) => c.text?.(line) ?? plain(c.value(line))).join(" "),
        copy.locale,
      ),
    [lines, columns, searchText, q, copy.locale],
  );

  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    const scope = root.current;
    if (scope === null) return;
    /* The next line's first button on a desk; on a phone its card, which has none. */
    const next =
      target.id === null
        ? null
        : (scope.querySelector<HTMLElement>(
            `[data-line="${CSS.escape(target.id)}"] button`,
          ) ?? scope.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(target.id)}"]`));
    (next ?? scope.querySelector<HTMLElement>("[data-line-add]"))?.focus();
  }, [lines]);

  /* ── the editor ─────────────────────────────────────────────────── */

  const openEditor = (id: string | null, draft: T) => {
    draftRef.current = draft;
    setSession({ id, draft, tried: false });
    setOpen(true);
  };
  const setDraft = (next: T) => {
    draftRef.current = next;
    setSession((s) => (s === null ? s : { ...s, draft: next }));
  };
  const save = () => {
    const draft = draftRef.current;
    if (session === null || draft === null) return;
    const commit = commitDraft(session.id, draft, isValid);
    if (commit.kind === "invalid") {
      setSession({ ...session, draft, tried: true });
      return;
    }
    if (commit.kind === "add") {
      /* A new line is shown even if it does not match the search: adding one and
         not seeing it is the worst answer. */
      setQuery("");
      onAdd?.(commit.line);
    } else onChange?.(commit.id, commit.line);
    setOpen(false);
  };

  const add = () => {
    if (newLine === undefined) return;
    const blank = newLine();
    if (editor === undefined) {
      setQuery("");
      onAdd?.(blank);
    } else openEditor(null, blank);
  };

  const remove = (line: T) => {
    const id = getLineId(line);
    const { index, focus } = planRemoval(lines, shown, id, getLineId);
    focusNext.current = { id: focus };
    onRemove?.(id);
    toast?.show({
      message: fillCopy(copy.lineItems.removed, { name: labelOf(line) }),
      ...(onRestore === undefined
        ? {}
        : {
            action: {
              label: copy.lineItems.undo,
              onSelect: () => onRestore(line, index),
            },
          }),
    });
  };

  /* ── the table ──────────────────────────────────────────────────── */

  const tableColumns: EditColumn<T>[] = columns.map((c) => ({
    id: c.id,
    header: c.header,
    ...(c.width === undefined ? {} : { width: c.width }),
    ...(c.numeric === undefined ? {} : { numeric: c.numeric }),
    ...(c.stack === undefined ? {} : { stack: c.stack }),
    ...(c.brief === undefined ? {} : { brief: c.brief }),
    render: (line: T) => {
      const drawn = c.cell === undefined ? plain(c.value(line)) : c.cell(line);
      /* An amount never breaks in two: «Bs.» over «12.500,00» reads as two values. */
      return c.numeric === true ? <span className="whitespace-nowrap">{drawn}</span> : drawn;
    },
    ...(c.edit === undefined || !canChange
      ? {}
      : {
          /* The control takes the column's width and does not impose its own: an input's
             natural width is twenty characters, and in an auto-sized table that pushes
             the amounts off the card the moment a row goes into editing. */
          edit: (line: T, set: (next: T) => void) => (
            <div className="contain-inline-size">{c.edit?.(line, set)}</div>
          ),
        }),
  }));

  if (canEdit || canRemove) {
    tableColumns.push({
      id: "\u0000actions",
      header: "",
      width: 1,
      /* On a card the press opens the editor, and the editor removes: the buttons
         would be two more targets on a small screen. Without an editor the trash
         is the only way to remove, so it stays — at the card's top right, lit. */
      stack: canEdit ? "hidden" : "trail",
      render: (line: T) => {
        const id = getLineId(line);
        const nameId = `${formId}-line-${id}`;
        return (
          /* Hidden until the row is hovered or holds focus, like `RowActions`: a pencil
             and a trash can lit on each of twenty lines are forty invitations. They
             fade instead of unmounting, so Tab still reaches them. Pressing them does
             not put the row into in-place editing. */
          <span
            data-line={id}
            className="flex items-center justify-end gap-0.5 whitespace-nowrap opacity-0 transition-opacity duration-(--duration-instant) group-hover/row:opacity-100 focus-within:opacity-100 in-data-stacked:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <span id={nameId} className="sr-only">
              {labelOf(line)}
            </span>
            {canEdit ? (
              <IconButton
                icon={Pencil}
                label={copy.lines.edit}
                aria-describedby={nameId}
                haspopup="dialog"
                onClick={() => openEditor(id, line)}
              />
            ) : null}
            {canRemove ? (
              <IconButton
                icon={Trash2}
                label={copy.lines.remove}
                tone="danger"
                aria-describedby={nameId}
                onClick={() => remove(line)}
              />
            ) : null}
          </span>
        );
      },
    });
  }

  const addButton = canAdd ? (
    <Button role="secondary" size="sm" icon={Plus} onClick={add} data-line-add="">
      {copy.lines.add}
    </Button>
  ) : null;

  const count =
    q === ""
      ? fillCopy(lines.length === 1 ? copy.lineItems.one : copy.lineItems.many, {
          count: lines.length.toLocaleString(copy.locale),
        })
      : fillCopy(copy.lineItems.shown, {
          shown: shown.length.toLocaleString(copy.locale),
          count: lines.length.toLocaleString(copy.locale),
        });

  return (
    <section
      ref={root}
      aria-label={copy.lineItems.table}
      className="flex min-w-0 flex-col gap-4"
    >
      {lines.length === 0 ? (
        /* Said, with its way out: an empty document is a question («what is sold
           here?»), not a blank box. In read mode there is no way out to offer. */
        <Empty align="start" sentence={copy.lines.empty} action={addButton ?? undefined} />
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
            {searchable ? (
              <div className="w-full max-w-(--container-search) min-w-0 flex-1">
                <span id={searchLabelId} className="sr-only">
                  {copy.lines.search}
                </span>
                {/* Named through the field context, the way a control inside a `Field`
                    is — the label is read aloud and not drawn: the placeholder already
                    says it on screen. */}
                <FieldIdsContext.Provider
                  value={{
                    id: `${searchLabelId}-input`,
                    labelId: searchLabelId,
                    describedBy: undefined,
                    invalid: false,
                  }}
                >
                  <SearchField
                    value={query}
                    onChange={setQuery}
                    placeholder={copy.lines.search}
                  />
                </FieldIdsContext.Provider>
              </div>
            ) : null}
            <span className="text-meta text-muted tabular-nums" aria-live="polite">
              {count}
            </span>
            {addButton === null ? null : <span className="ml-auto">{addButton}</span>}
          </div>

          <EditableTable<T>
            rows={shown}
            columns={tableColumns}
            getRowId={getLineId}
            empty={fillCopy(copy.lineItems.noMatch, { query: query.trim() })}
            layout={layout}
            {...(canEdit
              ? {
                  onOpen: (id: string) => {
                    const line = lines.find((l) => getLineId(l) === id);
                    if (line !== undefined) openEditor(id, line);
                  },
                }
              : {})}
            {...(canChange && columns.some((c) => c.edit !== undefined)
              ? { onChange: (id: string, next: T) => onChange?.(id, next) }
              : {})}
          />
        </div>
      )}

      {totals === undefined || totals.length === 0 ? null : (
        /* Inset like the table's cells, so the last figure lines up with the amounts. */
        <div className="px-4">
          <Totals rows={totals} />
        </div>
      )}

      {editor === undefined || session === null ? null : (
        <Dialog
          open={open}
          width="sm"
          title={session.id === null ? copy.lineItems.newLine : copy.lines.edit}
          {...(context === undefined ? {} : { context })}
          {...(session.id === null ? {} : { subtitle: labelOf(session.draft) })}
          onClose={() => setOpen(false)}
          footer={
            <>
              {session.id === null || !canRemove ? null : (
                /* Apart, at the other end from «Listo»: removing is not the way the
                   form is meant to close. */
                <span className="mr-auto">
                  <IconButton
                    icon={Trash2}
                    label={copy.lines.remove}
                    tone="danger"
                    onClick={() => {
                      const line = lines.find((l) => getLineId(l) === session.id);
                      setOpen(false);
                      if (line !== undefined) remove(line);
                    }}
                  />
                </span>
              )}
              <Button role="ghost" size="sm" onClick={() => setOpen(false)}>
                {copy.dialog.cancel}
              </Button>
              <Button role="primary" size="sm" type="submit" form={formId}>
                {copy.lines.done}
              </Button>
            </>
          }
        >
          <form
            id={formId}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="flex flex-col gap-3"
          >
            {editor(session.draft, setDraft, {
              tried: session.tried,
              isNew: session.id === null,
            })}
          </form>
        </Dialog>
      )}
    </section>
  );
}
