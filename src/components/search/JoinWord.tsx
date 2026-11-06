"use client";

import type { CriteriaJoin } from "@sincpro/web-ui/components/search/criteria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { useState } from "react";

/* ==================================================================== *
 *  HOW A NODE IS JOINED, in a word you touch.
 *
 *  All, any, none. They are three and not two: without «ninguna», negating something
 *  could only be written in the JSON, and a question the editor does not know how to
 *  build is a question most people will not ask.
 *
 *  ── A word, not a symbol ────────────────────────────────────────────
 *
 *  «Y» and «O» belong to whoever writes queries; «todas» and «cualquiera» belong to whoever
 *  searches. And they are the copy's, so changing them changes them on both sides
 *  at once.
 *
 *  ── It opens into its options, it does not rotate ──────────────────────
 *
 *  With three, a toggling button says neither which there are nor which is set: you
 *  have to press it to find out, and finding out changes what it filters.
 *
 *  It lives here and not inside the bar because the builder asks the same. A
 *  `<select>` there and a list here are two controls for one decision, and whoever
 *  learned one does not recognise the other.
 * ==================================================================== */

const OPTIONS: readonly CriteriaJoin[] = ["all", "any", "not"];

export function JoinWord({
  join,
  onChange,
  surface,
}: {
  join: CriteriaJoin;
  /** Without this the word is a value: it says how it joins, and is not touched. */
  onChange?: (next: CriteriaJoin) => void;
  surface?: Surface;
}) {
  const sup = useSurface(surface);
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const word = copy.search.joins[join === "not" ? "none" : join];

  if (onChange === undefined) {
    return <span className="shrink-0 text-micro text-muted">{word}</span>;
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={copy.search.switchJoin}
        className={`shrink-0 rounded-control px-1 text-micro font-medium underline decoration-dotted underline-offset-4 decoration-current/40 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
          sup,
          "text-muted hover:text-ink",
          "text-chrome-muted hover:text-chrome-ink",
        )}`}
      >
        {word}
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-40 mt-1 rounded-panel border border-line-strong bg-surface p-1.5 shadow-float">
          <Tags
            stack
            surface="canvas"
            label={copy.search.switchJoin}
            items={OPTIONS.map((one) => ({
              id: one,
              label: copy.search.joins[one === "not" ? "none" : one],
              selected: one === join,
              onSelect: () => {
                onChange(one);
                setOpen(false);
              },
            }))}
          />
        </span>
      ) : null}
    </span>
  );
}
