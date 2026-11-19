"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Keys } from "@sincpro/web-ui/foundations/keys";
import { useKeysHint, useShortcuts } from "@sincpro/web-ui/foundations/shortcut";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ---------------------------------------------------------------- *
 *  THE PAGER
 * ---------------------------------------------------------------- */

/** Where I am inside the set I came from, and how I move to the next one.
 *
 *  **It turns a record into a position.** Without this, opening the third of a
 *  list of eighty and wanting to see the fourth forces going back, finding
 *  where you were and opening again — three actions for what is one arrow.
 *
 *  It goes far from the actions on purpose: moving between records is not doing
 *  something to this record. Stuck next to «Eliminar», one extra click on the
 *  wrong arrow is a destructive action. */
/** The combinations a pager answers by default: Odoo's — Alt+P the previous, Alt+N the next. */
const PAGER_KEYS = { prev: "Alt+P", next: "Alt+N" } as const;

export function Pager({
  index,
  total,
  onPrev,
  onNext,
  surface: surfaceProp,
  look = "plain",
  keys = PAGER_KEYS,
}: {
  /** 1-based: what gets shown is «12 de 80», not «11». */
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  surface?: Surface;
  /** `plain`: quiet, a count and two arrows. `pill`: the position stands out — a translucent
   *  primary pill, Odoo's — for the record's modern style, where the trail is the heading
   *  and the pager its counterpart on the line. */
  look?: "plain" | "pill";
  /** The combinations that move: Alt+P and Alt+N by default, `false` for none. Bound while the
   *  pager is on screen — the last record mounted answers (`useShortcuts`). */
  keys?: { prev: Keys; next: Keys } | false;
}) {
  const copy = useUiCopy();
  const surface = useSurface(surfaceProp);
  const isChrome = surface === "chrome";
  const pill = look === "pill";
  const atStart = index <= 1;
  const atEnd = index >= total;
  useShortcuts(
    keys === false
      ? []
      : [
          {
            keys: keys.prev,
            run: () => onPrev?.(),
            enabled: onPrev !== undefined && !atStart,
          },
          { keys: keys.next, run: () => onNext?.(), enabled: onNext !== undefined && !atEnd },
        ],
  );
  const prevHint = useKeysHint(keys === false ? undefined : keys.prev);
  const nextHint = useKeysHint(keys === false ? undefined : keys.next);
  const faint = pill
    ? isChrome
      ? "text-chrome-link"
      : "text-primary"
    : isChrome
      ? "text-chrome-muted"
      : "text-muted";
  const hover = pill
    ? isChrome
      ? "not-disabled:hover:bg-chrome-link/20"
      : "not-disabled:hover:bg-primary/15"
    : isChrome
      ? "not-disabled:hover:bg-chrome-ink/10 not-disabled:hover:text-chrome-ink"
      : "not-disabled:hover:bg-ink/6 not-disabled:hover:text-ink";
  /* On the chrome the ring is the chrome's link cyan, like the TopBar's: the
     primary navy on a navy band is a ring nobody sees. */
  const ring = isChrome
    ? "focus-visible:outline-chrome-link"
    : "focus-visible:outline-primary";
  const arrow = `inline-flex size-(--size-control-sm) items-center justify-center rounded-pill transition-colors duration-(--duration-instant) disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 ${ring} ${faint} ${hover}`;
  const titled = (word: string, hint: { label: string } | undefined) =>
    hint === undefined ? word : `${word} (${hint.label})`;

  return (
    <div
      data-ui="pager"
      data-look={look}
      className={`flex shrink-0 items-center gap-1 ${
        pill
          ? `rounded-pill border p-0.5 ${
              isChrome
                ? "border-chrome-link/30 bg-chrome-link/12"
                : "border-primary/20 bg-primary/8"
            }`
          : ""
      }`}
    >
      <span
        className={`tabular-nums ${pill ? `px-2 text-meta font-semibold ${faint}` : `text-micro ${faint}`}`}
      >
        {index} / {total.toLocaleString(copy.locale)}
      </span>
      {/* At the ends the arrow TURNS OFF, it does not disappear: a control that
          hides shifts the others, and whoever was going to press «previous»
          ends up pressing «next». */}
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-label={copy.record.prev}
        title={titled(copy.record.prev, prevHint)}
        {...(prevHint === undefined ? {} : { "aria-keyshortcuts": prevHint.aria })}
        className={arrow}
      >
        <ChevronLeft className="size-(--size-icon-md)" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-label={copy.record.next}
        title={titled(copy.record.next, nextHint)}
        {...(nextHint === undefined ? {} : { "aria-keyshortcuts": nextHint.aria })}
        className={arrow}
      >
        <ChevronRight className="size-(--size-icon-md)" strokeWidth={2} />
      </button>
    </div>
  );
}
