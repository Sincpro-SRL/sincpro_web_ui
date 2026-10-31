"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import type { ComponentProps } from "react";

export type KanbanStateValue = "normal" | "done" | "blocked";

const ORDER: readonly KanbanStateValue[] = ["normal", "done", "blocked"];
const FILL: Record<KanbanStateValue, string> = {
  normal: "bg-line-strong",
  done: "bg-good",
  blocked: "bg-bad",
};

/** The dot as `PopoverTrigger`'s opener: it hands over `expanded` / `haspopup`, which a bare
 *  `<button>` would pass to the DOM as unknown attributes. */
function DotButton({
  expanded,
  haspopup,
  ...rest
}: ComponentProps<"button"> & {
  expanded?: boolean;
  haspopup?: "menu" | "dialog" | "listbox";
}) {
  return <button type="button" aria-expanded={expanded} aria-haspopup={haspopup} {...rest} />;
}

/**
 * Odoo's kanban state — the traffic light on a card: in progress, ready for the next stage,
 * blocked.
 *
 * Context: it answers «can this move on?» without opening the record, and the stage alone does
 * not say it — two cards in «propuesta», one waiting on the customer, one ready to send. A dot
 * never goes alone (docs/PRINCIPLES.md §3): its word is the button's name and title, and the
 * list it opens says all three. Without `onChange` it only shows.
 */
export function KanbanState({
  value,
  onChange,
}: {
  value: KanbanStateValue;
  onChange?: (next: KanbanStateValue) => void;
}) {
  const copy = useUiCopy();
  const words = copy.kanbanState;
  const said = `${words.label}: ${words[value]}`;
  const dot = (state: KanbanStateValue) => (
    <span aria-hidden className={`block size-2.5 rounded-pill ${FILL[state]}`} />
  );

  if (onChange === undefined) {
    return (
      <span role="img" aria-label={said} title={said} className="inline-flex p-1">
        {dot(value)}
      </span>
    );
  }

  return (
    <PopoverTrigger
      label={words.label}
      placement="bottom end"
      trigger={
        <DotButton
          aria-label={said}
          title={said}
          className="relative z-10 inline-flex rounded-pill p-1 transition-colors duration-(--duration-instant) hover:bg-ink/8 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {dot(value)}
        </DotButton>
      }
    >
      {(close) => (
        <div role="radiogroup" aria-label={words.label} className="flex flex-col p-1">
          {ORDER.map((state) => (
            <button
              key={state}
              type="button"
              role="radio"
              aria-checked={state === value}
              onClick={() => {
                onChange(state);
                close();
              }}
              className={`flex items-center gap-2 rounded-control px-2 py-1.5 text-left text-meta text-ink transition-colors duration-(--duration-instant) hover:bg-ink/5 ${
                state === value ? "font-medium" : ""
              }`}
            >
              {dot(state)}
              {words[state]}
            </button>
          ))}
        </div>
      )}
    </PopoverTrigger>
  );
}
