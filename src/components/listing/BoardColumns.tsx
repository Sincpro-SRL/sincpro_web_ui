"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { StatusDot } from "@sincpro/web-ui/primitives/tag/Tag";
import { type KeyboardEvent, type ReactNode, useState } from "react";

/** One stage of a board: its id (what `of` returns), its name, and its tone. */
export type BoardColumn = { id: string; label: string; tone?: Tone };

/** How a board lays its cards in stages, and what moving one means. */
export type BoardStages<T> = {
  /** The stage a record is in. */
  of: (item: T) => string;
  columns: readonly BoardColumn[];
  /** A card dropped in another stage. Without it the board is read-only: nothing drags. */
  onMove?: (item: T, to: string) => void;
  /** How a record is named when a move is announced: «S00142 pasó a pedido». */
  nameOf?: (item: T) => string;
};

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
  const { of, columns, onMove, nameOf } = stages;
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
        return (
          <section
            key={column.id}
            aria-label={column.label}
            {...(onMove === undefined
              ? {}
              : {
                  onDragOver: (event) => {
                    event.preventDefault();
                    setOver(column.id);
                  },
                  onDragLeave: () => setOver(null),
                  onDrop: (event) => {
                    event.preventDefault();
                    move(event.dataTransfer.getData("text/plain"), column.id);
                    setOver(null);
                    setDragging(null);
                  },
                })}
            className={`flex w-(--container-lane) shrink-0 flex-col gap-2 rounded-box border p-2 transition-colors duration-(--duration-instant) ${
              over === column.id ? "border-primary/50 bg-primary/6" : "border-line bg-ink/3"
            }`}
          >
            <header className="flex min-w-0 items-center justify-between gap-2 px-1 py-0.5">
              <h3 className="min-w-0 truncate text-meta font-semibold text-ink">
                {column.tone === undefined ? (
                  column.label
                ) : (
                  <StatusDot tone={column.tone} label={column.label} />
                )}
              </h3>
              <span className="shrink-0 text-micro text-muted tabular-nums">
                {inside.length}
              </span>
            </header>
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
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  );
}
