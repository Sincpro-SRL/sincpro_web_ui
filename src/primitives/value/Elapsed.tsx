"use client";

import { useNow } from "@sincpro/web-ui/foundations/clock";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import {
  elapsedMillis,
  type ElapsedSince,
  type ElapsedThresholds,
  elapsedTone,
  formatElapsed,
} from "@sincpro/web-ui/primitives/value/elapsedTime";
import { Timer } from "lucide-react";

/* The figure in its tone — text on a card, so the readable ones. */
const TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  info: "text-info",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  accent: "text-ink",
};

export type ElapsedProps = {
  /** When the wait started. */
  since: ElapsedSince;
  /** For a test or a screenshot: a fixed «now» instead of the live clock. */
  now?: number;
} & ElapsedThresholds;

/**
 * How long it has been waiting, live: «4:05», amber past `warnAfter`, red past `badAfter`.
 *
 * Context: a kitchen display reads AGE, not arrival — the cook looks for the red ticket, not
 * for «12:40». The figure ticks every second off one shared clock (`useNow`), and the clock
 * icon with the written time keeps the colour from being the only channel. On the server it
 * draws nothing: there is no «now» both sides agree on.
 */
export function Elapsed({ since, now: fixed, warnAfter, badAfter }: ElapsedProps) {
  const copy = useUiCopy();
  const live = useNow();
  const now = fixed ?? live;
  if (now === null) return null;
  const millis = elapsedMillis(since, now);
  const tone = elapsedTone(millis, {
    ...(warnAfter === undefined ? {} : { warnAfter }),
    ...(badAfter === undefined ? {} : { badAfter }),
  });
  const text = formatElapsed(millis);
  return (
    <span
      data-ui="elapsed"
      data-tone={tone ?? "neutral"}
      title={fillCopy(copy.elapsed.waiting, { time: text })}
      className={`inline-flex shrink-0 items-center gap-1 text-meta font-semibold tabular-nums ${TEXT[tone ?? "neutral"]}`}
    >
      <Timer aria-hidden className="size-(--size-icon-sm)" strokeWidth={2.25} />
      <span className="sr-only">{copy.elapsed.label}</span>
      {text}
    </span>
  );
}
