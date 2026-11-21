"use client";

import type { CriteriaJoin } from "@sincpro/web-ui/components/search/criteria";
import { WordChoice } from "@sincpro/web-ui/components/search/WordChoice";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";

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
 *  learned one does not recognise the other. The list is `WordChoice`'s: it floats, the arrows
 *  move through it, Escape closes it.
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
  const word = copy.search.joins[join === "not" ? "none" : join];

  if (onChange === undefined) {
    return <span className="shrink-0 text-micro text-muted">{word}</span>;
  }

  return (
    <WordChoice
      value={join}
      options={OPTIONS.map((one) => ({
        id: one,
        label: copy.search.joins[one === "not" ? "none" : one],
      }))}
      onChange={onChange}
      label={copy.search.switchJoin}
      word={word}
      className={`shrink-0 rounded-control px-1 text-micro font-medium underline decoration-dotted underline-offset-4 decoration-current/40 transition-colors outline-0 hover:decoration-current data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-primary ${bySurface(
        sup,
        "text-muted hover:text-ink",
        "text-chrome-muted hover:text-chrome-ink",
      )}`}
    />
  );
}
