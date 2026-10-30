"use client";

import type { ActivityEvent } from "@sincpro/web-ui/components/activity/Activity";
import {
  ASSIST_ICON,
  type AssistOrigin,
  type AssistSource,
} from "@sincpro/web-ui/components/assist/assist";
import { currentCopy, fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { cn, focusRing } from "@sincpro/web-ui/foundations/variants";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import { Tooltip, TooltipTrigger } from "@sincpro/web-ui/primitives/overlay/Tooltip";
import { DateValue } from "@sincpro/web-ui/primitives/value/Fecha";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Link } from "react-aria-components";

/* ==================================================================== *
 *  THE ASSISTANT'S MARK — how a screen says «this came from the assistant».
 *
 *  Three pieces, one look:
 *
 *      AssistLabel       the robot and the word «Asistente», in the info tone:
 *                        the header of anything the assistant proposes
 *      AssistSourceLink  «Fuente: orden de compra PO/2026/0042», a real link
 *      AssistMark        the small robot next to a value it SET, which opens
 *                        who, when and from what
 *
 *  ── Why the info tone, and never the gold ───────────────────────────
 *
 *  The gold is the ONE main action of a screen (PRINCIPLES §2–3). The assistant
 *  is not an action, it is a source of information — and `info` already means
 *  «a fact that changes how you read what is below». It is also never the color
 *  alone: the robot and the word are always there, so a person who does not tell
 *  teal from navy still reads «Asistente».
 *
 *  ── Why a robot and not sparkles ────────────────────────────────────
 *
 *  Sparkles celebrate; a business screen states. «An automated assistant did
 *  this» is the fact a person needs to weigh a value, and the robot says exactly
 *  that. The icon lives in `ASSIST_ICON`, so changing it is one line.
 * ==================================================================== */

/** The robot and the assistant's name: the header of a suggestion, a review, a pending
 *  state. `children` replaces the name — «Asistente sugiere». */
export function AssistLabel({ children, id }: { children?: ReactNode; id?: string }) {
  const copy = useUiCopy();
  const Icon = ASSIST_ICON;
  return (
    <span
      id={id}
      data-assist="label"
      className="inline-flex shrink-0 items-center gap-1 text-micro font-medium text-info"
    >
      <Icon className="size-(--size-icon-sm) shrink-0" strokeWidth={2} aria-hidden />
      {children ?? copy.assist.assistant}
    </span>
  );
}

/**
 * Where the assistant got it: «Fuente: orden de compra PO/2026/0042».
 *
 * Context: a value without its source is a value nobody can check, and an unchecked value
 * from a machine is the one people stop trusting after the first mistake. The source is a
 * LINK to the record it was read from — with `href` a real `<a>` (middle-click, copy), with
 * `onOpen` a link the screen answers — so checking it is one press, not a search.
 */
export function AssistSourceLink({ source }: { source: AssistSource }) {
  const copy = useUiCopy();
  const goes = source.href !== undefined || source.onOpen !== undefined;
  return (
    <span className="inline-flex max-w-full min-w-0 items-baseline gap-1 text-micro text-muted">
      <span className="shrink-0">{copy.assist.source}:</span>
      {goes ? (
        <Link
          {...(source.href === undefined ? {} : { href: source.href })}
          {...(source.onOpen === undefined ? {} : { onPress: source.onOpen })}
          className={({ isFocusVisible }) =>
            cn(
              "min-w-0 cursor-pointer truncate rounded-mark text-primary underline-offset-2 hover:underline",
              focusRing({ isFocusVisible }),
            )
          }
        >
          {source.label}
        </Link>
      ) : (
        <span className="min-w-0 truncate text-ink">{source.label}</span>
      )}
    </span>
  );
}

/** The mark's own button. It forwards `ref` and spreads native props, so `PopoverTrigger`
 *  anchors to it and `TooltipTrigger` names it — the same contract as `IconButton`, in the
 *  assistant's tone instead of the three an icon button has. */
function MarkButton({
  label,
  expanded,
  haspopup,
  ref,
  ...native
}: Omit<ComponentPropsWithRef<"button">, "className" | "children" | "aria-label"> & {
  label: string;
  expanded?: boolean;
  haspopup?: "menu" | "dialog" | "listbox";
}) {
  const Icon = ASSIST_ICON;
  return (
    <TooltipTrigger>
      <button
        {...native}
        ref={ref}
        type="button"
        aria-label={label}
        {...(haspopup === undefined ? {} : { "aria-haspopup": haspopup })}
        {...(expanded === undefined ? {} : { "aria-expanded": expanded })}
        data-assist="mark"
        className="inline-flex size-(--size-control-sm) shrink-0 items-center justify-center rounded-pill text-info transition-colors duration-(--duration-instant) hover:bg-info/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
      </button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}

export type AssistMarkProps = {
  /** When, from what, and who accepted it. Each one that is present is said in the card. */
  origin?: AssistOrigin;
};

/**
 * The small robot next to a value the assistant set — provenance, after the fact.
 *
 * Context: once a suggestion is accepted the value looks like any other, and a week later
 * nobody remembers whether «30 días» was typed or proposed. The mark keeps that answer next
 * to the value: its tooltip says «Lo completó el asistente», and pressing it opens WHO
 * (the assistant, and the person who accepted), WHEN and FROM WHAT — with the source as a
 * link. It is a popover and not a tooltip because the source is a link, and a tooltip can
 * never be entered with the keyboard.
 *
 * Next to a field, write it in the field's `action`; next to a read value, use
 * `AssistedValue`.
 */
export function AssistMark({ origin = {} }: AssistMarkProps) {
  const copy = useUiCopy();
  return (
    <PopoverTrigger
      title={copy.assist.madeBy}
      placement="bottom end"
      trigger={<MarkButton label={copy.assist.madeBy} />}
    >
      <div className="flex max-w-72 min-w-0 flex-col gap-1.5 text-micro text-muted">
        {origin.source === undefined ? null : <AssistSourceLink source={origin.source} />}
        {origin.at === undefined ? null : <DateValue when={origin.at} format="exact" />}
        {origin.acceptedBy === undefined ? null : (
          <span>{fillCopy(copy.assist.acceptedBy, { name: origin.acceptedBy })}</span>
        )}
      </div>
    </PopoverTrigger>
  );
}

/** A read value with the assistant's mark after it: a `Record.Facts` value, a table cell. */
export function AssistedValue({
  children,
  origin,
}: {
  /** The value, drawn the way it would be without the mark. */
  children: ReactNode;
  origin?: AssistOrigin;
}) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-0.5">
      <span className="min-w-0 truncate">{children}</span>
      <AssistMark {...(origin === undefined ? {} : { origin })} />
    </span>
  );
}

/**
 * The assistant's entry in a record's history: the activity's event, with the robot as its
 * node, the assistant (and who accepted) as its author, and the source as its detail.
 *
 * Context: provenance has two places. The mark answers «where did THIS value come from»
 * while looking at it; the history answers «what has the assistant done on this record»,
 * in the order it happened, next to what people did. Same mark in both, so the eye learns
 * it once.
 *
 * Call it when the change happens (in the handler), not at module load: it reads the
 * installed copy, like the formatters do.
 */
export function assistEvent({
  id,
  label,
  at,
  source,
  acceptedBy,
}: {
  id: string;
  /** What happened, in the past: «completó 5 líneas desde la orden de compra». */
  label: ReactNode;
  at: Date | string | number;
  source?: AssistSource;
  acceptedBy?: string;
}): ActivityEvent {
  const copy = currentCopy();
  const by =
    acceptedBy === undefined
      ? copy.assist.assistant
      : `${copy.assist.assistant} · ${fillCopy(copy.assist.acceptedBy, { name: acceptedBy })}`;
  return {
    id,
    label,
    at,
    by,
    icon: ASSIST_ICON,
    ...(source === undefined ? {} : { detail: <AssistSourceLink source={source} /> }),
  };
}
