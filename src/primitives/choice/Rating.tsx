"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { formatCount, formatWith } from "@sincpro/web-ui/primitives/value/format";
import { Star } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";

const STAR = {
  sm: "size-(--size-icon-sm)",
  md: "size-(--size-icon-md)",
  lg: "size-(--size-icon-lg)",
} as const;

const FIGURE = { sm: "text-micro", md: "text-meta", lg: "text-body" } as const;

export type RatingProps = {
  /** The average shown (`4.5`), or the stars given when it asks. 0 is «sin calificar». */
  value: number;
  /** How many stars. Five by default. */
  max?: number;
  /** How many opinions the average comes from — written after it: «4,5 (128)». */
  count?: number;
  /** Present = it asks: a star per radio, arrows move. Absent = it shows. */
  onChange?: (next: number) => void;
  /** The group's name when it is not inside a `Field` and not «Calificación». */
  label?: string;
  size?: keyof typeof STAR;
};

/* Half stars and no finer: 4.3 drawn as 43 % of a star is a difference nobody sees, and the
   figure beside it already says it exactly. */
const half = (value: number) => Math.round(value * 2) / 2;

function StarMark({ fill, size }: { fill: 0 | 0.5 | 1; size: keyof typeof STAR }) {
  return (
    <span aria-hidden className="relative inline-flex shrink-0">
      <Star className={`${STAR[size]} text-line-strong`} strokeWidth={1.75} />
      {fill === 0 ? null : (
        <span
          className={`absolute inset-y-0 left-0 overflow-hidden ${fill === 1 ? "w-full" : "w-1/2"}`}
        >
          <Star className={`${STAR[size]} fill-warn text-warn`} strokeWidth={1.75} />
        </span>
      )}
    </span>
  );
}

const fillOf = (value: number, n: number): 0 | 0.5 | 1 =>
  value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0;

/**
 * Stars: an average of opinions shown (a product, a supplier, a technician), or the opinion
 * asked (a survey, closing a ticket).
 *
 * Context: `Priority` is the sibling — Odoo's three stars of urgency, whole, no figure. This is
 * the other question, «how good»: an average, so it draws half stars, and the FIGURE beside
 * them, because «4,5» is read where four and a half stars are only estimated; and how many
 * opinions, because 5 out of 2 is not 4,6 out of 900. Shown, it is one image with one name —
 * «Calificación: 4,5 de 5, 128 opiniones» — so it is never colour alone. Asked, it is a radio
 * group named by its `Field`, one tab stop and the arrows inside; in read mode it is shown.
 * In `warn` like `Priority`: the gold is the screen's primary action.
 */
export function Rating({ value, max = 5, count, onChange, label, size = "md" }: RatingProps) {
  const copy = useUiCopy();
  const ids = useFieldIds({});
  const mode = useFormMode();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const name = label ?? copy.rating.label;
  const stars = Array.from({ length: max }, (_, at) => at + 1);
  const figure = formatWith(
    value,
    { maximumFractionDigits: 1, minimumFractionDigits: 1 },
    copy.locale,
  );

  if (onChange === undefined || mode === "read") {
    const shown = half(value);
    const said =
      value === 0
        ? copy.rating.none
        : fillCopy(copy.rating.average, { value: figure, max }) +
          (count === undefined
            ? ""
            : `, ${fillCopy(count === 1 ? copy.rating.countOne : copy.rating.count, { count: formatCount(count, copy.locale) })}`);
    return (
      <span
        role="img"
        aria-label={`${name}: ${said}`}
        data-ui="rating"
        data-size={size}
        className="inline-flex items-center gap-1.5"
      >
        <span className="inline-flex items-center gap-0.5">
          {stars.map((n) => (
            <StarMark key={n} fill={fillOf(shown, n)} size={size} />
          ))}
        </span>
        {value === 0 ? null : (
          <span aria-hidden className={`font-medium text-ink tabular-nums ${FIGURE[size]}`}>
            {figure}
          </span>
        )}
        {count === undefined ? null : (
          <span aria-hidden className={`text-muted tabular-nums ${FIGURE[size]}`}>
            ({formatCount(count, copy.locale)})
          </span>
        )}
      </span>
    );
  }

  const given = Math.round(value);
  const step = (event: KeyboardEvent, n: number) => {
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? Math.min(max, n + 1)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? Math.max(1, n - 1)
          : event.key === "Home"
            ? 1
            : event.key === "End"
              ? max
              : null;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    buttons.current[next - 1]?.focus();
  };

  return (
    <span
      role="radiogroup"
      {...(ids.labelledBy === undefined
        ? { "aria-label": name }
        : { "aria-labelledby": ids.labelledBy })}
      {...(ids.describedBy === undefined ? {} : { "aria-describedby": ids.describedBy })}
      {...(ids.invalid ? { "aria-invalid": true } : {})}
      id={ids.id}
      data-ui="rating"
      data-size={size}
      className="inline-flex items-center gap-0.5"
    >
      {stars.map((n) => (
        <button
          key={n}
          ref={(node) => {
            buttons.current[n - 1] = node;
          }}
          type="button"
          role="radio"
          aria-checked={given === n}
          aria-label={fillCopy(copy.rating.stars, { value: n, max })}
          /* One stop in the tab order — the given star, or the first — and the arrows inside. */
          tabIndex={n === Math.max(given, 1) ? 0 : -1}
          onClick={() => onChange(n)}
          onKeyDown={(event) => step(event, n)}
          className="hit-target rounded-control p-0.5 transition-colors duration-(--duration-instant) hover:bg-ink/6 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <StarMark fill={n <= given ? 1 : 0} size={size} />
        </button>
      ))}
    </span>
  );
}
