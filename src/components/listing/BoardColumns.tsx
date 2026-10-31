"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { StatusDot } from "@sincpro/web-ui/primitives/tag/Tag";
import { ChevronsLeftRight, Plus } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";

/** One stage of a board: its id (what `of` returns), its name, and its tone. */
export type BoardColumn = { id: string; label: string; tone?: Tone };

/** How a board lays its cards in stages, and what moving one means. */
export type BoardStages<T> = {
  /** The column a record goes in: its stage — or ANY field it is grouped by (the salesperson,
   *  the priority, the tag): a board is a grouping you can drag across. */
  of: (item: T) => string;
  /** The columns, in order. Without it they come from the records themselves, in the order
   *  they appear, named by `labelOf`. */
  columns?: readonly BoardColumn[];
  labelOf?: (id: string) => string;
  /** A card dropped in another stage. Without it the board is read-only: nothing drags. */
  onMove?: (item: T, to: string) => void;
  /** How a record is named when a move is announced: «S00142 pasó a pedido». */
  nameOf?: (item: T) => string;
  /** The figure on a column's head: the expected revenue of the opportunities in it. */
  total?: (items: readonly T[]) => ReactNode;
  /** The bar under a column's head: how its records stand, by tone — Odoo's activity bar
   *  (overdue red, today amber, planned green). `undefined` for a record with nothing to say. */
  progress?: (item: T) => Tone | undefined;
  /** «+» on a column's head: a name typed there creates a record in that column. */
  onQuickCreate?: (column: string, name: string) => void;
  /** A column at the end: «Agregar etapa». */
  onAddColumn?: (label: string) => void;
  /** Columns that start folded into a narrow strip (the won, the lost). */
  defaultFolded?: readonly string[];
};

/* The tones a progress bar draws, in the order they are read: what is wrong first. */
const PROGRESS_ORDER: readonly Tone[] = ["bad", "warn", "good", "info", "neutral", "accent"];
const PROGRESS_FILL: Record<Tone, string> = {
  bad: "bg-bad",
  warn: "bg-warn",
  good: "bg-good",
  info: "bg-info",
  neutral: "bg-muted",
  accent: "bg-primary",
};

/** One-line input of a board: quick create, a new column. Enter keeps it, Escape leaves. */
function BoardInput({
  label,
  placeholder,
  onCommit,
  onClose,
}: {
  label: string;
  placeholder: string;
  onCommit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <input
      autoFocus
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "Enter" && text.trim() !== "") {
          onCommit(text.trim());
          setText("");
        }
      }}
      onBlur={() => {
        if (text.trim() === "") onClose();
      }}
      className="h-(--size-control-md) w-full min-w-0 rounded-control border border-primary/60 bg-surface px-2.5 text-meta text-ink outline-none placeholder:text-muted"
    />
  );
}

/** The column's bar: its records counted by tone, what is wrong first. Said in words too. */
function ProgressBar<T>({
  items,
  progress,
}: {
  items: readonly T[];
  progress: (item: T) => Tone | undefined;
}) {
  const counts = new Map<Tone, number>();
  for (const item of items) {
    const tone = progress(item);
    if (tone !== undefined) counts.set(tone, (counts.get(tone) ?? 0) + 1);
  }
  const parts = PROGRESS_ORDER.filter((tone) => (counts.get(tone) ?? 0) > 0);
  if (parts.length === 0) return null;
  return (
    <div
      role="img"
      aria-label={parts.map((tone) => `${tone}: ${counts.get(tone)}`).join(", ")}
      className="mx-1 flex h-1.5 overflow-hidden rounded-pill bg-ink/8"
    >
      {parts.map((tone) => (
        <span
          key={tone}
          className={PROGRESS_FILL[tone]}
          style={{ width: `${((counts.get(tone) ?? 0) / items.length) * 100}%` }}
        />
      ))}
    </div>
  );
}

/* ==================================================================== *
 *  THE BOARD BY STAGES — Odoo's kanban.
 *
 *  Context: a pipeline (quotations → orders → invoiced, leads → won) is read across: how many
 *  in each stage, and which is stuck. One column per stage, the count on its head, and a card
 *  moved by dragging it to another column — the gesture IS the change of stage.
 *
 *  Dragging is not the only way: a focused card moves with Alt + ← / →, and the move is said
 *  out loud. A board that only drags is a board a keyboard cannot use.
 * ==================================================================== */
export function BoardColumns<T>({
  items,
  keyOf,
  stages,
  card,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  stages: BoardStages<T>;
  card: (item: T) => ReactNode;
}) {
  const copy = useUiCopy();
  const { of, onMove, nameOf, total, progress, onQuickCreate, onAddColumn } = stages;
  const columns: readonly BoardColumn[] =
    stages.columns ??
    [...new Set(items.map(of))].map((id) => ({ id, label: stages.labelOf?.(id) ?? id }));
  const [folded, setFolded] = useState<ReadonlySet<string>>(
    () => new Set(stages.defaultFolded ?? []),
  );
  const [creating, setCreating] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const byId = new Map(items.map((item) => [keyOf(item), item]));

  const move = (id: string, to: string) => {
    const item = byId.get(id);
    if (item === undefined || of(item) === to || onMove === undefined) return;
    onMove(item, to);
    const column = columns.find((one) => one.id === to)?.label ?? to;
    setSaid(fillCopy(copy.board.moved, { name: nameOf?.(item) ?? id, column }));
  };

  const toggleFold = (id: string) =>
    setFolded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const dropOn = (id: string) =>
    onMove === undefined
      ? {}
      : {
          onDragOver: (event: React.DragEvent) => {
            event.preventDefault();
            setOver(id);
          },
          onDragLeave: () => setOver(null),
          onDrop: (event: React.DragEvent) => {
            event.preventDefault();
            move(event.dataTransfer.getData("text/plain"), id);
            setOver(null);
            setDragging(null);
          },
        };

  const byKeyboard = (event: KeyboardEvent<HTMLElement>, item: T) => {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    const at = columns.findIndex((one) => one.id === of(item));
    const next = columns[at + (event.key === "ArrowLeft" ? -1 : 1)];
    if (next === undefined) return;
    event.preventDefault();
    move(keyOf(item), next.id);
  };

  return (
    <div className="flex min-w-0 items-start gap-3 overflow-x-auto p-3">
      {columns.map((column) => {
        const inside = items.filter((item) => of(item) === column.id);
        if (folded.has(column.id)) {
          /* Folded: a strip with its count and its name down the spine. Still a drop target —
             dropping on «perdido» is how a lost deal is marked. */
          return (
            <section
              key={column.id}
              aria-label={column.label}
              {...dropOn(column.id)}
              className={`flex w-12 shrink-0 flex-col items-center gap-2 rounded-box border py-2 ${
                over === column.id ? "border-primary/50 bg-primary/6" : "border-line bg-ink/3"
              }`}
            >
              <IconButton
                icon={ChevronsLeftRight}
                label={fillCopy(copy.board.unfold, { column: column.label })}
                onClick={() => toggleFold(column.id)}
              />
              <span className="text-micro text-muted tabular-nums">{inside.length}</span>
              <span className="text-vertical text-meta font-semibold text-ink">
                {column.label}
              </span>
            </section>
          );
        }
        return (
          <section
            key={column.id}
            aria-label={column.label}
            {...dropOn(column.id)}
            className={`flex w-(--container-lane) shrink-0 flex-col gap-2 rounded-box border p-2 transition-colors duration-(--duration-instant) ${
              over === column.id ? "border-primary/50 bg-primary/6" : "border-line bg-ink/3"
            }`}
          >
            <header className="flex min-w-0 items-center gap-1.5 px-1 py-0.5">
              <h3 className="min-w-0 flex-1 truncate text-meta font-semibold text-ink">
                {column.tone === undefined ? (
                  column.label
                ) : (
                  <StatusDot tone={column.tone} label={column.label} />
                )}
              </h3>
              <span className="shrink-0 text-micro text-muted tabular-nums">
                {inside.length}
              </span>
              {onQuickCreate === undefined ? null : (
                <IconButton
                  icon={Plus}
                  label={fillCopy(copy.board.quickCreate, { column: column.label })}
                  onClick={() => setCreating(column.id)}
                />
              )}
              <IconButton
                icon={ChevronsLeftRight}
                label={fillCopy(copy.board.fold, { column: column.label })}
                onClick={() => toggleFold(column.id)}
              />
            </header>
            {total === undefined ? null : (
              <p className="px-1 text-meta font-semibold text-ink tabular-nums">
                {total(inside)}
              </p>
            )}
            {progress === undefined || inside.length === 0 ? null : (
              <ProgressBar items={inside} progress={progress} />
            )}
            {creating === column.id && onQuickCreate !== undefined ? (
              <BoardInput
                label={fillCopy(copy.board.quickCreate, { column: column.label })}
                placeholder={copy.board.quickPlaceholder}
                onCommit={(name) => onQuickCreate(column.id, name)}
                onClose={() => setCreating(null)}
              />
            ) : null}
            {inside.length === 0 ? (
              <p className="px-1 py-3 text-micro text-muted">{copy.board.emptyLane}</p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-2">
                {inside.map((item) => {
                  const id = keyOf(item);
                  return (
                    <li
                      key={id}
                      {...(onMove === undefined
                        ? {}
                        : {
                            draggable: true,
                            tabIndex: 0,
                            title: copy.board.moveHint,
                            "aria-keyshortcuts": "Alt+ArrowLeft Alt+ArrowRight",
                            onDragStart: (event) => {
                              event.dataTransfer.setData("text/plain", id);
                              event.dataTransfer.effectAllowed = "move";
                              setDragging(id);
                            },
                            onDragEnd: () => setDragging(null),
                            onKeyDown: (event) => byKeyboard(event, item),
                          })}
                      className={`flex min-w-0 flex-col rounded-box focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        onMove === undefined ? "" : "cursor-grab active:cursor-grabbing"
                      } ${dragging === id ? "opacity-50" : ""}`}
                    >
                      {card(item)}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
      {onAddColumn === undefined ? null : (
        <div className="flex w-(--container-lane) shrink-0 flex-col gap-2 p-2">
          {adding ? (
            <BoardInput
              label={copy.board.addColumn}
              placeholder={copy.board.addColumnPlaceholder}
              onCommit={(label) => {
                onAddColumn(label);
                setAdding(false);
              }}
              onClose={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-(--size-control-md) items-center gap-1.5 rounded-control px-2 text-meta text-muted transition-colors duration-(--duration-instant) hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Plus aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
              {copy.board.addColumn}
            </button>
          )}
        </div>
      )}
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  );
}
