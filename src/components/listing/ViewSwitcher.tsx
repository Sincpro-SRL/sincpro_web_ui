"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";

/** How the same list is shown: table, board, timeline.
 *
 *  The icons go together and touching —a segmented group and not three loose
 *  buttons— because they are MUTUALLY EXCLUSIVE options of a single question.
 *  Three separate buttons read as three different actions, and then it is not
 *  understood that choosing one turns the other off.
 *
 *  The label goes in the `title` and in the `aria-label`, never drawn: they are
 *  three silhouettes that are learned once and recognized afterwards without
 *  reading, and writing them out would burn the width the search box needs. */
export interface ViewOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function ViewSwitcher({
  options,
  current,
  onSelect,
  surface,
}: {
  options: readonly ViewOption[];
  current: string;
  onSelect?: (id: string) => void;
  /** By default it inherits it from the surface that wraps it. */
  surface?: Surface;
}) {
  const activeSurface = useSurface(surface);
  const copy = useUiCopy();
  const rule = bySurface(activeSurface, "border-line-strong", "border-chrome-ink/45");

  return (
    <div
      role="group"
      aria-label={copy.present.group}
      className={`flex shrink-0 items-center overflow-hidden rounded-control border ${rule}`}
    >
      {options.map((o, i) => {
        const here = o.id === current;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect?.(o.id)}
            aria-pressed={here}
            title={o.label}
            aria-label={o.label}
            className={`inline-flex size-(--size-control-sm) items-center justify-center transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary ${
              i === 0 ? "" : `border-l ${rule}`
            } ${
              here
                ? bySurface(
                    activeSurface,
                    "bg-ink/8 text-ink",
                    "bg-chrome-link/20 text-chrome-link",
                  )
                : bySurface(
                    activeSurface,
                    "bg-surface text-muted hover:bg-ink/5 hover:text-ink",
                    "bg-chrome-ink/6 text-chrome-muted hover:bg-chrome-ink/14 hover:text-chrome-ink",
                  )
            }`}
          >
            <Icon className="size-(--size-icon-md)" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
