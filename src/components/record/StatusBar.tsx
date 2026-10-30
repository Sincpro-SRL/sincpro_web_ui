"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { cn, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { Check, CircleAlert } from "lucide-react";
import { Radio, RadioGroup } from "react-aria-components";

/* ---------------------------------------------------------------- *
 *  THE STATE · 1 · the stage bar
 * ---------------------------------------------------------------- */

export interface Stage {
  id: string;
  label: string;
}

/** The track the stages sit in. Same rail as the other grouped controls on each
 *  surface: a tinted well with a hairline, and on the chrome TRANSLUCENT —ink at 8 %
 *  over the navy— so the header's brand wash goes across it and it reads as a layer,
 *  not as one more box stuck on top. */
const trackStyles = tv({
  base: "min-w-0 gap-0.5 rounded-control border p-0.5",
  variants: {
    surface: {
      canvas: "border-line bg-ground",
      chrome: "border-chrome-ink/15 bg-chrome-ink/8",
    },
    layout: {
      trail: "inline-flex max-w-full shrink-0 items-stretch",
      stacked: "flex w-full flex-col",
    },
  },
});

/** One stage. Three steps —done, current, next— and ONE way of painting each, the
 *  same in both layouts and with or without `onSelect`:
 *
 *      done     ink, medium, with a check — the path behind
 *      current  FILLED — the only solid segment in the track
 *      next     muted — in sight, not reached
 *
 *  The current stage is the only fill. Being selectable adds hover and press TINTS
 *  (never a fill), and the stage being viewed is an underline under its label: a
 *  mark of a different KIND, so it can sit on any of the three steps — the current
 *  one included — without competing with the fill. */
const stageStyles = tv({
  extend: focusRing,
  base: "relative flex min-w-0 items-center gap-1.5 rounded-mark px-2.5 text-meta whitespace-nowrap transition-colors duration-(--duration-instant)",
  variants: {
    surface: { canvas: "", chrome: "outline-chrome-link" },
    step: { done: "font-medium", current: "font-semibold", next: "" },
    failed: { true: "", false: "" },
    selectable: { true: "cursor-pointer", false: "" },
    layout: { trail: "h-(--size-control-sm)", stacked: "w-full py-1 text-left" },
  },
  compoundVariants: [
    /* A keyboard ring is drawn OUTSIDE the segment, over its neighbours: lifted
       above them, or the next segment's paint covers half of it. */
    { isFocusVisible: true, class: "z-10" },
    { surface: "canvas", step: "done", class: "text-ink" },
    { surface: "canvas", step: "next", class: "text-muted" },
    { surface: "canvas", step: "current", failed: false, class: "bg-primary text-surface" },
    { surface: "canvas", step: "current", failed: true, class: "bg-danger text-surface" },
    { surface: "chrome", step: "done", class: "text-chrome-ink" },
    { surface: "chrome", step: "next", class: "text-chrome-muted" },
    {
      surface: "chrome",
      step: "current",
      failed: false,
      class: "bg-chrome-ink text-chrome",
    },
    { surface: "chrome", step: "current", failed: true, class: "bg-chrome-bad text-chrome" },
    {
      selectable: true,
      surface: "canvas",
      step: ["done", "next"],
      class: "hover:bg-ink/6 pressed:bg-ink/10",
    },
    {
      selectable: true,
      surface: "chrome",
      step: ["done", "next"],
      class: "hover:bg-chrome-ink/12 pressed:bg-chrome-ink/18",
    },
    {
      selectable: true,
      surface: "canvas",
      step: "current",
      failed: false,
      class: "hover:bg-primary-hover",
    },
  ],
});

/** Which step something is on, **with the steps that come next in sight**.
 *
 *  ── One track, one language ──────────────────────────────────────────
 *
 *  The stages are segments of ONE track, Odoo's statusbar: the order is the
 *  direction. What is behind is ink with a check, what comes next is muted, and the
 *  current stage is the only FILLED segment — `primary` on the canvas, the chrome's
 *  ink inverted on the rail. With `failed` that fill turns `danger` and carries an
 *  alert mark, so the failure is not only a color.
 *
 *  A clipped arrow per step was tried and dropped: the notch between two arrows
 *  reads as a gap — four chips, not a path.
 *
 *  ── Narrow: it STACKS, it does not hide ──────────────────────────────
 *
 *  Four stages side by side do not fit in a 480 px drawer, and the answer is not
 *  tucking them behind a chevron: a state you have to open stops answering «where
 *  is this at?», which is the only question it has. It stacks — one stage per row —
 *  in the same track, with the same three paints and the same marks. What changes
 *  is the DIRECTION, not how much is shown nor how it is painted.
 *
 *  ── And it can be CHOSEN ─────────────────────────────────────────────
 *
 *  With `onSelect` the track is a React Aria `RadioGroup`: one stage at a time,
 *  arrow keys move between them, Tab enters at the chosen one. It is not
 *  «advancing» — a stage does not change by pressing it — it is choosing which
 *  stage we are talking about: in a list grouped by stage, pressing «generando» asks
 *  for those. So the record's CURRENT stage (`current`, the fill, `aria-current`)
 *  and the stage being VIEWED (`selected`, the underline, the checked radio) are two
 *  different things and are painted differently. Without `onSelect` it is a plain
 *  ordered list and the current stage is `aria-current="step"`. */
export function StatusBar({
  stages,
  current,
  failed = false,
  surface: surfaceProp,
  onSelect,
  selected,
  layout,
}: {
  stages: readonly Stage[];
  current: string;
  failed?: boolean;
  surface?: Surface;
  /** Present = the stages can be chosen. Nothing advances: it chooses which stage
   *  is being talked about. */
  onSelect?: (id: string) => void;
  /** Which one is chosen, when they can be chosen. It is not `current`: one thing
   *  is where the record is at, another which stage I am looking at. */
  selected?: string;
  /** `trail` side by side, `stacked` one per row. Without it the surface's density
   *  decides — it is what knows how much width there is. */
  layout?: "trail" | "stacked";
}) {
  const d = useDensity();
  const surface = useSurface(surfaceProp);
  const copy = useUiCopy();
  const at = stages.findIndex((s) => s.id === current);
  const shape = layout ?? byDensity(d, "trail", "stacked");
  const stacked = shape === "stacked";
  const selectable = onSelect !== undefined;

  function stepOf(i: number): "done" | "current" | "next" {
    if (i === at) return "current";
    return at >= 0 && i < at ? "done" : "next";
  }

  /** The check, the alert, or nothing. Stacked keeps the slot even when it is
   *  empty, so the labels line up in a column; side by side an empty slot would
   *  only be a gap. */
  function mark(step: "done" | "current" | "next") {
    const icon = "size-(--size-icon-sm) shrink-0";
    if (step === "done") return <Check className={icon} strokeWidth={2} aria-hidden />;
    if (step === "current" && failed) {
      return <CircleAlert className={icon} strokeWidth={2} aria-hidden />;
    }
    return stacked ? <span className={icon} aria-hidden /> : null;
  }

  function content(stage: Stage, step: "done" | "current" | "next", viewed: boolean) {
    return (
      <>
        {mark(step)}
        <span
          aria-current={step === "current" && selectable ? "step" : undefined}
          className={cn(
            "min-w-0 truncate",
            viewed &&
              "underline decoration-2 underline-offset-4 " +
                (step === "current"
                  ? "decoration-current"
                  : surface === "chrome"
                    ? "decoration-chrome-link"
                    : "decoration-primary"),
          )}
        >
          {stage.label}
        </span>
      </>
    );
  }

  const track = trackStyles({ surface, layout: shape });

  if (!selectable) {
    return (
      <ol aria-label={copy.record.status} className={track}>
        {stages.map((stage, i) => {
          const step = stepOf(i);
          return (
            <li
              key={stage.id}
              aria-current={step === "current" ? "step" : undefined}
              data-failed={step === "current" && failed ? true : undefined}
              className={stageStyles({ surface, step, failed, selectable, layout: shape })}
            >
              {content(stage, step, false)}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <RadioGroup
      aria-label={copy.record.status}
      orientation={stacked ? "vertical" : "horizontal"}
      /* Uncontrolled when the caller does not say which one: the arrows still move
         the choice instead of being swallowed by a value nobody updates. */
      {...(selected === undefined ? {} : { value: selected })}
      onChange={onSelect}
      className={track}
    >
      {stages.map((stage, i) => {
        const step = stepOf(i);
        return (
          <Radio
            key={stage.id}
            value={stage.id}
            data-failed={step === "current" && failed ? true : undefined}
            className={({ isFocusVisible }) =>
              stageStyles({
                surface,
                step,
                failed,
                selectable,
                layout: shape,
                isFocusVisible,
              })
            }
          >
            {({ isSelected }) => content(stage, step, isSelected)}
          </Radio>
        );
      })}
    </RadioGroup>
  );
}
