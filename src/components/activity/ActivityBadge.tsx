"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Clock } from "lucide-react";
import type { ReactNode } from "react";

export type ActivityState = "overdue" | "today" | "planned" | "none";

const TONE: Record<ActivityState, string> = {
  overdue: "text-bad",
  today: "text-warn",
  planned: "text-good",
  none: "text-muted",
};

/**
 * The record's next planned activity, on its card or its row: a clock in the tone of how late
 * it is — overdue, today, planned — and the word with it.
 *
 * Context: in a pipeline the question is not «what stage» but «who is waiting on us»; Odoo
 * answers it with this clock on every card. A tone alone says nothing to a screen reader or to
 * whoever does not see red, so the state is the name, and `detail` («Llamar · mañana 10:00») is
 * the title. With `onClick` it opens the activities (a popover, the record's activity panel).
 */
export function ActivityBadge({
  state,
  detail,
  onClick,
}: {
  state: ActivityState;
  detail?: ReactNode;
  onClick?: () => void;
}) {
  const copy = useUiCopy();
  const word = copy.activityState[state];
  const title = typeof detail === "string" ? `${word} · ${detail}` : word;
  const body = (
    <>
      <Clock
        aria-hidden
        className={`size-(--size-icon-sm) ${TONE[state]}`}
        strokeWidth={2.25}
      />
      <span className="sr-only">{word}</span>
    </>
  );
  if (onClick === undefined) {
    return (
      <span title={title} className="inline-flex items-center p-1">
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="relative z-10 inline-flex items-center rounded-pill p-1 transition-colors duration-(--duration-instant) hover:bg-ink/8 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {body}
    </button>
  );
}
