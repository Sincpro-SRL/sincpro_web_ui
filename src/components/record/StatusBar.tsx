"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { cn, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { MenuList } from "@sincpro/web-ui/primitives/menu/Menu";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { Check, ChevronDown, CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button as AriaButton, MenuTrigger, Radio, RadioGroup } from "react-aria-components";

/* ---------------------------------------------------------------- *
 *  THE STATE · 1 · the stage bar
 * ---------------------------------------------------------------- */

export interface Stage {
  id: string;
  label: string;
  /** Drawn before its name in every widget — a truck for «En camino», a seal for «Firmada».
   *  On the failed stage the alert takes its place: a failure is never hidden behind an icon. */
  icon?: LucideIcon;
  /** The icon it wears when it is the CURRENT stage — or the one being looked at, when they
   *  can be chosen —: `Circle` → `CircleDot`, an outline → its filled twin. Absent, `icon`. */
  activeIcon?: LucideIcon;
  /** What the stage means, said when it is pointed at: «Publicada en el SIAT, ya no se edita». */
  hint?: string;
  /** How many are there — in a list grouped by stage, «Por cobrar 12». Zero is drawn: it is an
   *  answer too. */
  count?: number;
}

/** The track the stages sit in. Same rail as the other grouped controls on each
 *  surface: a tinted well with a hairline, and on the chrome TRANSLUCENT —ink at 8 %
 *  over the navy— so the header's brand wash goes across it and it reads as a layer,
 *  not as one more box stuck on top. */
const trackStyles = tv({
  base: "min-w-0 gap-0.5 border p-0.5",
  variants: {
    surface: {
      canvas: "border-line bg-ground",
      chrome: "border-chrome-ink/15 bg-chrome-ink/8",
    },
    layout: {
      trail: "inline-flex max-w-full shrink-0 items-stretch",
      stacked: "flex w-full flex-col",
    },
    /* `well` is Odoo's track; `pill` the segmented control — the action dock's shape: a pill
       holding pills, on the paper's surface. */
    shape: { well: "rounded-control", pill: "rounded-pill" },
  },
  compoundVariants: [
    { shape: "pill", surface: "canvas", class: "border-line-strong bg-surface" },
    /* Stacked, a pill of rows is a capsule nobody reads as a list: the box's corners. */
    { shape: "pill", layout: "stacked", class: "rounded-box" },
  ],
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
  base: "relative flex min-w-0 items-center gap-1.5 text-meta whitespace-nowrap transition-colors duration-(--duration-instant)",
  variants: {
    shape: { well: "rounded-mark px-2.5", pill: "rounded-pill px-3" },
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
/**
 * How the state is drawn — the same stages, four widgets:
 *
 *     track     Odoo's statusbar: segments of one well, the current one filled. The default, in
 *               both styles.
 *     steps     dots joined by a line, the current one ringed.
 *     progress  a segmented bar with each stage's name under its segment: how far it is, at a
 *               glance, and where.
 *     pill      ONE chip, «● Publicada · 2/3», that unfolds the stages when they can be chosen:
 *               the state where room is short.
 */
export type StatusLook = "track" | "segmented" | "steps" | "progress" | "pill";

/**
 * What each stage shows:
 *
 *     both     its icon (when it has one) and its name. The default.
 *     label    the names only — no icon, no check.
 *     icon     the icons only; the name is said to a screen reader and on hover. A stage with
 *              no icon shows its number.
 *     current  the icons, and the name of the current stage (and of the one being looked at):
 *              where the record is, said; the rest, a glance — the state where room is short.
 *
 * Whatever is shown, a failed stage keeps its alert: a failure is never only a colour.
 */
export type StatusDisplay = "both" | "label" | "icon" | "current";

/** What `renderStage` is told about the stage it draws. */
export interface StageState {
  /** Behind, on it, or ahead. */
  step: "done" | "current" | "next";
  /** It is the current stage, and the record failed there. */
  failed: boolean;
  /** It is the one being looked at (chosen), when the stages can be chosen. */
  viewed: boolean;
  index: number;
}

export function StatusBar({
  stages,
  current,
  failed = false,
  surface: surfaceProp,
  onSelect,
  selected,
  layout,
  look = "track",
  display = "both",
  renderStage,
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
  /**
   * `track` (the default) is Odoo's statusbar: segments of one well, the current one filled.
   * `segmented` is the same in a pill of pills — the action dock's shape. `steps`, `progress`
   * and `pill` are the other widgets (`StatusLook`). Every one draws a stage's `icon`,
   * `activeIcon`, `hint` and `count`.
   */
  look?: StatusLook;
  /** What each stage shows: `both`, `label`, `icon` or `current` (`StatusDisplay`). */
  display?: StatusDisplay;
  /**
   * Draws a stage your way, INSIDE the system's segment — which keeps the order, the paint of
   * the step, the focus, the choosing and the names for a screen reader. Write the stage's
   * name in it, or say it with a visually hidden text. `track`, `segmented` and `steps`.
   */
  renderStage?: (stage: Stage, state: StageState) => ReactNode;
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

  /** The icon a stage wears now: its `activeIcon` when it is current or looked at. */
  function iconOf(stage: Stage, step: "done" | "current" | "next", viewed: boolean) {
    return (step === "current" || viewed) && stage.activeIcon !== undefined
      ? stage.activeIcon
      : stage.icon;
  }

  /** Whether the stage's name is SEEN — otherwise it is said (visually hidden, and on hover). */
  function nameShown(step: "done" | "current" | "next", viewed: boolean) {
    return (
      display === "both" ||
      display === "label" ||
      (display === "current" && (step === "current" || viewed))
    );
  }

  /** The alert, the stage's icon, the check, its number — or nothing. Stacked keeps the slot
   *  even when it is empty, so the labels line up in a column; side by side an empty slot
   *  would only be a gap. */
  function mark(stage: Stage, i: number, step: "done" | "current" | "next", viewed: boolean) {
    const icon = "size-(--size-icon-sm) shrink-0";
    if (step === "current" && failed) {
      return <CircleAlert className={icon} strokeWidth={2} aria-hidden />;
    }
    const Icon = display === "label" ? undefined : iconOf(stage, step, viewed);
    /* The stage's own icon says it better than the check: done is still read in its ink. */
    if (Icon !== undefined) return <Icon className={icon} strokeWidth={2} aria-hidden />;
    /* Its name hidden and no icon of its own: its place in the order. */
    if (!nameShown(step, viewed)) {
      return (
        <span aria-hidden className="min-w-(--size-icon-sm) text-center tabular-nums">
          {(i + 1).toLocaleString(copy.locale)}
        </span>
      );
    }
    if (step === "done" && display !== "label") {
      return <Check className={icon} strokeWidth={2} aria-hidden />;
    }
    return stacked ? <span className={icon} aria-hidden /> : null;
  }

  /** How many are on the stage, after its name — quieter than the name. */
  function countOf(stage: Stage) {
    return stage.count === undefined ? null : (
      <span className="shrink-0 tabular-nums opacity-70">
        {stage.count.toLocaleString(copy.locale)}
      </span>
    );
  }

  function content(
    stage: Stage,
    i: number,
    step: "done" | "current" | "next",
    viewed: boolean,
  ) {
    if (renderStage !== undefined) {
      return renderStage(stage, {
        step,
        failed: step === "current" && failed,
        viewed,
        index: i,
      });
    }
    const seen = nameShown(step, viewed);
    return (
      /* Its name hidden, the hint — else the name — is what pointing at it says. */
      <span
        className="flex min-w-0 items-center gap-1.5"
        title={seen ? undefined : (stage.hint ?? stage.label)}
      >
        {mark(stage, i, step, viewed)}
        <span
          title={seen ? stage.hint : undefined}
          aria-current={step === "current" && selectable ? "step" : undefined}
          className={cn(
            seen ? "min-w-0 truncate" : "sr-only",
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
        {countOf(stage)}
      </span>
    );
  }

  const rounded = look === "segmented" ? "pill" : "well";
  const track = trackStyles({ surface, layout: shape, shape: rounded });

  if (look === "pill") {
    const chrome = surface === "chrome";
    const now = stages[at];
    const dot = failed
      ? chrome
        ? "bg-chrome-bad"
        : "bg-danger"
      : chrome
        ? "bg-chrome-link"
        : "bg-primary";
    /* Its name is what it shows, said first what it is: «Estado: Publicada 2/3». As a button
       the name comes from its content (voice control matches what is SEEN); a status takes no
       name from content, so it says it in a label. */
    const said = `${copy.record.status}: ${now?.label ?? current} ${at + 1}/${stages.length}`;
    const NowIcon =
      now === undefined || display === "label" ? undefined : iconOf(now, "current", false);
    const chip = (
      <>
        {NowIcon !== undefined && !failed ? (
          <NowIcon
            className={`size-(--size-icon-sm) shrink-0 ${chrome ? "text-chrome-link" : "text-primary"}`}
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <span aria-hidden className={`size-2 shrink-0 rounded-pill ${dot}`} />
        )}
        <span className="font-semibold">{now?.label ?? current}</span>
        <span className={`tabular-nums ${chrome ? "text-chrome-muted" : "text-muted"}`}>
          {`${at + 1}/${stages.length}`}
        </span>
      </>
    );
    const frame = `inline-flex h-(--size-control-sm) shrink-0 items-center gap-1.5 rounded-pill border px-2.5 text-meta ${
      chrome
        ? "border-chrome-ink/20 bg-chrome-ink/8 text-chrome-ink"
        : "border-line-strong bg-surface text-ink"
    }`;
    if (!selectable) {
      return (
        <span
          role="status"
          aria-label={said}
          data-failed={failed ? true : undefined}
          className={frame}
        >
          {chip}
        </span>
      );
    }
    /* The chip IS the trigger: the same face, a chevron added — the stages open below it. */
    return (
      <MenuTrigger>
        <AriaButton
          className={({ isFocusVisible }) =>
            cn(
              frame,
              "cursor-pointer transition-colors duration-(--duration-instant)",
              chrome
                ? "hover:bg-chrome-ink/14"
                : "hover:border-primary/45 hover:bg-primary/5",
              isFocusVisible && "outline-2 outline-offset-2 outline-primary",
            )
          }
        >
          <span className="sr-only">{`${copy.record.status}: `}</span>
          {chip}
          <ChevronDown
            className={`size-(--size-icon-sm) ${chrome ? "text-chrome-muted" : "text-muted"}`}
            strokeWidth={2}
            aria-hidden
          />
        </AriaButton>
        <Popover placement="bottom end" className="min-w-44">
          <MenuList
            label={copy.record.status}
            closeOnSelect
            emptyText=""
            width="sm"
            groups={[
              {
                options: stages.map((stage) => ({
                  id: stage.id,
                  label: stage.label,
                  ...(display === "label" || stage.icon === undefined
                    ? {}
                    : { icon: stage.icon }),
                  ...(stage.count === undefined
                    ? {}
                    : { hint: stage.count.toLocaleString(copy.locale) }),
                  checked: stage.id === (selected ?? current),
                })),
              },
            ]}
            onAction={(id) => onSelect?.(String(id))}
          />
        </Popover>
      </MenuTrigger>
    );
  }

  if (look === "progress" && !stacked) {
    const chrome = surface === "chrome";
    const barOf = (step: "done" | "current" | "next") =>
      step === "current"
        ? failed
          ? chrome
            ? "bg-chrome-bad"
            : "bg-danger"
          : chrome
            ? "bg-chrome-link"
            : "bg-primary"
        : step === "done"
          ? chrome
            ? "bg-chrome-link/45"
            : "bg-primary/40"
          : chrome
            ? "bg-chrome-ink/15"
            : "bg-ink/10";
    const labelOf = (step: "done" | "current" | "next") =>
      step === "current"
        ? `font-semibold ${chrome ? "text-chrome-ink" : "text-ink"}`
        : step === "done"
          ? chrome
            ? "text-chrome-ink"
            : "text-ink"
          : chrome
            ? "text-chrome-muted"
            : "text-muted";
    const segment = (stage: Stage, i: number, viewed: boolean) => {
      const where = stepOf(i);
      return (
        <>
          <span aria-hidden className={`block h-1.5 w-full rounded-pill ${barOf(where)}`} />
          <span
            aria-current={where === "current" && selectable ? "step" : undefined}
            className={cn(
              "mt-1 flex min-w-0 items-center gap-1 text-micro whitespace-nowrap",
              labelOf(where),
              viewed && "underline decoration-2 underline-offset-4",
            )}
          >
            {(() => {
              const Icon = display === "label" ? undefined : iconOf(stage, where, viewed);
              return where === "current" && failed ? (
                <CircleAlert className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : Icon !== undefined ? (
                <Icon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : where === "done" && display !== "label" ? (
                <Check className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
              ) : null;
            })()}
            <span
              className={nameShown(where, viewed) ? "min-w-0 truncate" : "sr-only"}
              title={stage.hint}
            >
              {stage.label}
            </span>
            {countOf(stage)}
          </span>
        </>
      );
    };
    /* Each stage asks for room for its name: squeezed, «Borrador Publicada» read as one. */
    const row = "grid shrink-0 auto-cols-fr grid-flow-col gap-1.5";
    if (!selectable) {
      return (
        <ol aria-label={copy.record.status} data-look="progress" className={row}>
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              aria-current={stepOf(i) === "current" ? "step" : undefined}
              data-failed={stepOf(i) === "current" && failed ? true : undefined}
              className="flex w-24 min-w-0 flex-col"
            >
              {segment(stage, i, false)}
            </li>
          ))}
        </ol>
      );
    }
    return (
      <RadioGroup
        aria-label={copy.record.status}
        orientation="horizontal"
        {...(selected === undefined ? {} : { value: selected })}
        onChange={onSelect}
        data-look="progress"
        className={row}
      >
        {stages.map((stage, i) => (
          <Radio
            key={stage.id}
            value={stage.id}
            className={({ isFocusVisible }) =>
              cn(
                "flex w-24 min-w-0 cursor-pointer flex-col rounded-mark",
                isFocusVisible && "outline-2 outline-offset-2 outline-primary",
              )
            }
          >
            {({ isSelected }) => segment(stage, i, isSelected)}
          </Radio>
        ))}
      </RadioGroup>
    );
  }

  if (look === "steps" && !stacked) {
    const chrome = surface === "chrome";
    const dotOf = (step: "done" | "current" | "next") =>
      step === "current"
        ? failed
          ? `${chrome ? "bg-chrome-bad" : "bg-danger"} ring-3 ${chrome ? "ring-chrome-bad/25" : "ring-danger/20"}`
          : `${chrome ? "bg-chrome-ink" : "bg-primary"} ring-3 ${chrome ? "ring-chrome-ink/25" : "ring-primary/20"}`
        : step === "done"
          ? chrome
            ? "bg-chrome-ink/60"
            : "bg-ink/55"
          : `border ${chrome ? "border-chrome-muted/60" : "border-line-strong"} bg-transparent`;
    const labelOf = (step: "done" | "current" | "next") =>
      step === "current"
        ? `font-semibold ${chrome ? "text-chrome-ink" : "text-ink"}`
        : step === "done"
          ? chrome
            ? "text-chrome-ink"
            : "text-ink"
          : chrome
            ? "text-chrome-muted"
            : "text-muted";
    const joinOf = (i: number) =>
      i <= at
        ? chrome
          ? "bg-chrome-ink/45"
          : "bg-ink/35"
        : chrome
          ? "bg-chrome-muted/35"
          : "bg-line-strong";
    const step = (stage: Stage, i: number, viewed: boolean) => {
      const where = stepOf(i);
      if (renderStage !== undefined) {
        return (
          <>
            {i === 0 ? null : (
              <span aria-hidden className={`h-px w-5 shrink-0 ${joinOf(i)}`} />
            )}
            {renderStage(stage, {
              step: where,
              failed: where === "current" && failed,
              viewed,
              index: i,
            })}
          </>
        );
      }
      const StepIcon = display === "label" ? undefined : iconOf(stage, where, viewed);
      return (
        <>
          {i === 0 ? null : <span aria-hidden className={`h-px w-5 shrink-0 ${joinOf(i)}`} />}
          <span aria-hidden className={`size-2 shrink-0 rounded-pill ${dotOf(where)}`} />
          {where === "current" && failed ? (
            <CircleAlert
              className={`size-(--size-icon-sm) shrink-0 ${chrome ? "text-chrome-bad" : "text-danger"}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : StepIcon !== undefined ? (
            <StepIcon
              className={`size-(--size-icon-sm) shrink-0 ${labelOf(where)}`}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
          <span
            title={stage.hint}
            aria-current={where === "current" && selectable ? "step" : undefined}
            className={cn(
              nameShown(where, viewed)
                ? "min-w-0 truncate text-meta whitespace-nowrap"
                : "sr-only",
              labelOf(where),
              viewed && "underline decoration-2 underline-offset-4",
            )}
          >
            {stage.label}
          </span>
          {stage.count === undefined ? null : (
            <span className={`text-meta ${labelOf(where)}`}>{countOf(stage)}</span>
          )}
        </>
      );
    };
    if (!selectable) {
      return (
        <ol
          aria-label={copy.record.status}
          className="flex min-w-0 shrink-0 items-center gap-2"
        >
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              aria-current={stepOf(i) === "current" ? "step" : undefined}
              data-failed={stepOf(i) === "current" && failed ? true : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              {step(stage, i, false)}
            </li>
          ))}
        </ol>
      );
    }
    return (
      <RadioGroup
        aria-label={copy.record.status}
        orientation="horizontal"
        {...(selected === undefined ? {} : { value: selected })}
        onChange={onSelect}
        className="flex min-w-0 shrink-0 items-center gap-2"
      >
        {stages.map((stage, i) => (
          <Radio
            key={stage.id}
            value={stage.id}
            className={({ isFocusVisible }) =>
              cn(
                "flex min-w-0 cursor-pointer items-center gap-2 rounded-mark",
                isFocusVisible && "outline-2 outline-offset-2 outline-primary",
              )
            }
          >
            {({ isSelected }) => step(stage, i, isSelected)}
          </Radio>
        ))}
      </RadioGroup>
    );
  }

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
              className={stageStyles({
                surface,
                step,
                failed,
                selectable,
                layout: shape,
                shape: rounded,
              })}
            >
              {content(stage, i, step, false)}
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
                shape: rounded,
                isFocusVisible,
              })
            }
          >
            {({ isSelected }) => content(stage, i, step, isSelected)}
          </Radio>
        );
      })}
    </RadioGroup>
  );
}
