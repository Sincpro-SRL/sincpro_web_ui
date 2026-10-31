"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Star } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";

export type PriorityProps = {
  /** 0 is «sin prioridad». */
  value: number;
  /** How many stars. Odoo's three, by default. */
  max?: number;
  /** Without it the stars only show. Pressing the star already set clears it, the way Odoo
   *  does — the only way back to «none» that needs no extra control. */
  onChange?: (next: number) => void;
  /** The group's name, when it is not «Prioridad». */
  label?: string;
};

/**
 * Priority as stars: how urgent a lead, a task or a ticket is, read in a list at a glance.
 *
 * Context: a select «baja / media / alta» is read as a word in a column of words; stars are
 * counted without reading. They are a radio group: arrows move, and it is named — «Prioridad:
 * 2 de 3» — so it is not colour alone. In the `warn` tone, not the gold: the gold is the
 * screen's primary action.
 */
export function Priority({ value, max = 3, onChange, label }: PriorityProps) {
  const copy = useUiCopy();
  const name = label ?? copy.priority.label;
  const stars = Array.from({ length: max }, (_, at) => at + 1);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const said =
    value === 0 ? copy.priority.none : fillCopy(copy.priority.level, { value, max });

  const icon = (n: number) => (
    <Star
      aria-hidden
      className={`size-(--size-icon-md) ${n <= value ? "fill-warn text-warn" : "text-line-strong"}`}
      strokeWidth={1.75}
    />
  );

  if (onChange === undefined) {
    return (
      <span
        role="img"
        aria-label={`${name}: ${said}`}
        className="inline-flex items-center gap-0.5"
      >
        {stars.map((n) => (
          <span key={n}>{icon(n)}</span>
        ))}
      </span>
    );
  }

  const step = (event: KeyboardEvent, n: number) => {
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? Math.min(max, n + 1)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? Math.max(1, n - 1)
          : null;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    buttons.current[next - 1]?.focus();
  };

  return (
    <span role="radiogroup" aria-label={name} className="inline-flex items-center gap-0.5">
      {stars.map((n) => (
        <button
          key={n}
          ref={(node) => {
            buttons.current[n - 1] = node;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={fillCopy(copy.priority.level, { value: n, max })}
          /* One stop in the tab order — the set star, or the first — and the arrows inside. */
          tabIndex={n === Math.max(value, 1) ? 0 : -1}
          onClick={() => onChange(n === value ? 0 : n)}
          onKeyDown={(event) => step(event, n)}
          className="rounded-control p-0.5 transition-colors duration-(--duration-instant) hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          {icon(n)}
        </button>
      ))}
    </span>
  );
}
