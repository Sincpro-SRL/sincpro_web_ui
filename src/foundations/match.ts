/**
 * Where a typed search falls inside a text — «tería» inside «Ferretería» — so a list can SHOW
 * why each option is there.
 *
 * Context: a picker filters accent- and case-insensitively (React Aria's `useFilter`, base
 * sensitivity): «ferreteria» finds «Ferretería». Highlighting has to agree with it, or the
 * option is listed with nothing marked and reads as a wrong match. So the text is folded the
 * same way — decomposed, marks dropped, lower-cased in the locale — while remembering which
 * original character each folded one came from, and the spans are cut on the ORIGINAL text:
 * what is drawn keeps its accents.
 */

export type MatchSpan = { text: string; hit: boolean };

function fold(char: string, locale: string | undefined): string {
  return char.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale);
}

/** The text cut into what matched the query and what did not, in order. An empty query (or
 *  one that does not occur) is one span with no hit. */
export function matchSpans(text: string, query: string, locale?: string): MatchSpan[] {
  const wanted = [...query.trim()].map((char) => fold(char, locale)).join("");
  if (wanted === "") return [{ text, hit: false }];

  /* `origin[i]` is where, in the original text, folded character i came from. One more entry
     at the end maps «the end of the folded text» to the end of the original. */
  let folded = "";
  const origin: number[] = [];
  let at = 0;
  for (const char of text) {
    const piece = fold(char, locale);
    for (let k = 0; k < piece.length; k += 1) origin.push(at);
    folded += piece;
    at += char.length;
  }
  origin.push(text.length);

  const spans: MatchSpan[] = [];
  let cursor = 0;
  let found = folded.indexOf(wanted);
  while (found !== -1) {
    const start = origin[found] ?? text.length;
    const end = origin[found + wanted.length] ?? text.length;
    if (start > cursor) spans.push({ text: text.slice(cursor, start), hit: false });
    if (end > start) spans.push({ text: text.slice(start, end), hit: true });
    cursor = Math.max(cursor, end);
    found = folded.indexOf(wanted, found + wanted.length);
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), hit: false });
  return spans.length === 0 ? [{ text, hit: false }] : spans;
}

/** Whether the query occurs in the text, folded the same way as `matchSpans`. */
export function matches(text: string, query: string, locale?: string): boolean {
  return matchSpans(text, query, locale).some((span) => span.hit);
}

/** The word of a hidden search text where the query fell — the code «CEM-IP30» out of
 *  «CEM-IP30 7771234000017» — to say why an option whose name does not match is listed. */
export function matchedWord(text: string, query: string, locale?: string): string | null {
  for (const word of text.split(/\s+/)) {
    if (word !== "" && matches(word, query, locale)) return word;
  }
  return null;
}
