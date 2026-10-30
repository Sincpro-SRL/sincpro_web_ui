"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
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
export function Pager({
  index,
  total,
  onPrev,
  onNext,
  surface: surfaceProp,
}: {
  /** 1-based: what gets shown is «12 de 80», not «11». */
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  surface?: Surface;
}) {
  const copy = useUiCopy();
  const surface = useSurface(surfaceProp);
  const isChrome = surface === "chrome";
  const faint = isChrome ? "text-chrome-muted" : "text-muted";
  const hover = isChrome
    ? "not-disabled:hover:bg-chrome-ink/10 not-disabled:hover:text-chrome-ink"
    : "not-disabled:hover:bg-ink/6 not-disabled:hover:text-ink";
  /* On the chrome the ring is the chrome's link cyan, like the TopBar's: the
     primary navy on a navy band is a ring nobody sees. */
  const ring = isChrome
    ? "focus-visible:outline-chrome-link"
    : "focus-visible:outline-primary";
  const arrow = `inline-flex size-(--size-control-sm) items-center justify-center rounded-pill transition-colors duration-(--duration-instant) disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 ${ring} ${faint} ${hover}`;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className={`text-micro tabular-nums ${faint}`}>
        {index} / {total.toLocaleString(copy.locale)}
      </span>
      {/* At the ends the arrow TURNS OFF, it does not disappear: a control that
          hides shifts the others, and whoever was going to press «previous»
          ends up pressing «next». */}
      <button
        type="button"
        onClick={onPrev}
        disabled={index <= 1}
        aria-label={copy.record.prev}
        title={copy.record.prev}
        className={arrow}
      >
        <ChevronLeft className="size-(--size-icon-md)" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= total}
        aria-label={copy.record.next}
        title={copy.record.next}
        className={arrow}
      >
        <ChevronRight className="size-(--size-icon-md)" strokeWidth={2} />
      </button>
    </div>
  );
}
