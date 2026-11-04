"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";

/* ==================================================================== *
 *  A MASK — a value of significant characters, drawn with separators.
 *
 *  A card number, an expiry «12/28», a NIT «1020304-5»: what is stored are the
 *  characters that MEAN something; the spaces, slashes and dashes are how it
 *  reads. Re-drawing them while typing moves the text under the caret, so the
 *  caret is kept by SIGNIFICANT character: after each change it goes back after
 *  as many of them as it was after. Deleting a separator alone deletes the
 *  character before it — what the person meant.
 *
 *  `maskedChange` is the pure part (tested on its own); `useMaskCaret` is the
 *  hook that puts the caret back once React has drawn the new text.
 * ==================================================================== */

export type MaskedChange = { next: string; caret: number };

/**
 * What a keystroke did to a masked value.
 *
 *     raw      the input's text right after the keystroke
 *     at       the caret in `raw`
 *     current  the significant characters before it
 *     drawn    how `current` was drawn
 *     clean    the significant characters of any text
 *     max      the most of them the value takes
 */
export function maskedChange({
  raw,
  at,
  current,
  drawn,
  clean,
  max,
}: {
  raw: string;
  at: number;
  current: string;
  drawn: string;
  clean: (text: string) => string;
  max: number;
}): MaskedChange {
  let next = clean(raw);
  let before = clean(raw.slice(0, at)).length;
  if (next === current && raw.length < drawn.length && before > 0) {
    next = next.slice(0, before - 1) + next.slice(before);
    before -= 1;
  }
  next = next.slice(0, max);
  return { next, caret: Math.min(before, next.length) };
}

/** Where, in the drawn text, the caret goes to sit after `count` significant characters. */
export function caretAfter(
  drawn: string,
  count: number,
  significant: (char: string) => boolean,
) {
  let seen = 0;
  let at = 0;
  while (at < drawn.length && seen < count) {
    if (significant(drawn[at] ?? "")) seen++;
    at++;
  }
  return at;
}

/**
 * The input's ref, and `keep(count)` to call in `onChange`: once the new text is drawn, the
 * caret goes back after `count` significant characters.
 */
export function useMaskCaret(
  drawn: string,
  significant: (char: string) => boolean,
): { input: RefObject<HTMLInputElement | null>; keep: (count: number) => void } {
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = input.current;
    const want = pending.current;
    if (element === null || want === null) return;
    pending.current = null;
    const at = caretAfter(drawn, want, significant);
    element.setSelectionRange(at, at);
  }, [drawn, significant]);

  return {
    input,
    keep: (count) => {
      pending.current = count;
    },
  };
}
