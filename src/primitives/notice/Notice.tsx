"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { AlertTriangle, type LucideIcon, PackageX } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Context: the ways a view says there is no content yet, and they are
 * different because each one is fixed by a different person.
 *
 *     Skeleton  the content is coming. The silhouette stays so the eye
 *               knows where the rows will land.
 *     Empty     there is nothing yet, or the filter left nothing. It is NORMAL.
 *     Failed    something broke. It carries the backend's sentence whole and
 *               verbatim.
 *     Missing   nobody knows how to resolve this. It is a wiring error.
 *
 * A generic «something went wrong» for all four forces you to open the console.
 * A loading sentence drawn with `Empty` is the same mistake: it answers
 * «there is nothing» while the data is still on its way.
 */

/** Quiet stand-in for a list that has not arrived.
 *
 *  The bars are the row: a name on the left, a figure on the right. That is
 *  the scan of a list, held in place so the page does not jump when the rows
 *  land. There is no shimmer. A pulse already means «this state is alive»
 *  (`StatusDot`); a second one would spend motion on a wait. The sentence is
 *  for the screen reader — the bars are not the message. */
const SKELETON_NAME = ["w-48", "w-36", "w-56", "w-40", "w-44", "w-32"] as const;

export function Skeleton({
  rows = 6,
  label,
}: {
  /** How many row-silhouettes. Six is a screen of a list, not a guess at
   *  the real count. */
  rows?: number;
  /** What a screen reader hears. The bars stay silent. */
  label: string;
}) {
  const d = useDensity();
  return (
    <div aria-busy="true" className="flex flex-col">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={`flex items-center ${byDensity(d, "gap-3 px-2 py-2", "gap-2 px-1.5 py-1")}`}
        >
          <span
            className={`h-3.5 rounded-control bg-ink/8 ${SKELETON_NAME[i % SKELETON_NAME.length]}`}
          />
          <span className="ml-auto h-3 w-14 rounded-control bg-ink/5" />
        </div>
      ))}
    </div>
  );
}

/** What is shown when there is nothing to show: a sentence, and the gesture
 *  that resolves it if there is one. Never a drawing. */
export function Empty({
  sentence,
  action,
  /** Centered for an empty list; left-aligned inside a block, where centering it
   *  detaches it from everything else. */
  align = "center",
}: {
  sentence: string;
  action?: ReactNode;
  align?: "center" | "start";
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-wrap gap-3 px-4 py-10 ${
        centered ? "flex-col items-center text-center" : "items-center"
      }`}
    >
      <p className="max-w-short text-body text-muted">{sentence}</p>
      {action}
    </div>
  );
}

/**
 * The sentence the backend wrote, whole and verbatim.
 *
 * Context: a hairline around a quiet red wash — it is not an alarm, it is an
 * explanation. A bar on the left alone reads as a cut. Trimming the message or
 * replacing it with one of our own is what forces you to go to the console to
 * find out what happened.
 */
export function Failed({
  heading,
  sentence,
  action,
}: {
  heading: string;
  sentence: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-control border border-bad/40 bg-bad/5 px-3 py-2.5">
      <p className="text-body font-medium text-bad">{heading}</p>
      <p className="mt-1.5 max-w-prose text-lead leading-relaxed text-ink">{sentence}</p>
      {action === undefined ? null : <div className="mt-2.5">{action}</div>}
    </div>
  );
}

/**
 * Nobody knows how to draw this. It carries the full identifier because that is
 * the only thing that makes it fixable.
 */
export function Missing({
  heading,
  detail,
  icon: Icon = PackageX,
  tone = "warn",
}: {
  heading: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "warn" | "bad";
}) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon
        className={`size-(--size-icon-lg) ${tone === "bad" ? "text-bad" : "text-warn"}`}
        strokeWidth={1.75}
      />
      <p className="text-meta font-medium text-ink">{heading}</p>
      {detail === undefined ? null : (
        <p className="max-w-short font-mono text-micro break-all text-muted">{detail}</p>
      )}
    </div>
  );
}

/** The icon `Missing` uses for what broke while being drawn, so that whoever
 *  composes does not have to choose it. */
export const ICONO_ROTO = AlertTriangle;
