/* ==================================================================== *
 *  A PATTERN — where each character of an identifier goes.
 *
 *      #   a digit
 *      A   a letter, written in capitals
 *      *   a letter or a digit
 *
 *  Anything else is a separator drawn between them: «###-#######» for a
 *  reference, «AA## #### #### #### #### ####» for an IBAN. Separators are never
 *  letters or digits — those always mean a slot.
 *
 *  The value is only what fills the slots («BO12345…»); the separators are
 *  drawn. Pure: `PatternInput` types with it and a form checks with it.
 * ==================================================================== */

const SLOT = /[#A*]/;

function fits(slot: string, char: string): boolean {
  if (slot === "#") return /\d/.test(char);
  if (slot === "A") return /[a-z]/i.test(char);
  return /[a-z\d]/i.test(char);
}

/** The slots of a pattern, in order. */
function slotsOf(pattern: string): string[] {
  return [...pattern].filter((char) => SLOT.test(char));
}

/** What of a text fills the pattern's slots, in order — a character a slot does not take is
 *  dropped, letters go to capitals. «1020304-5» on «###-#######» is «10203045». */
export function patternValue(text: string, pattern: string): string {
  const slots = slotsOf(pattern);
  let value = "";
  for (const char of text) {
    const slot = slots[value.length];
    if (slot === undefined) break;
    if (fits(slot, char)) value += char.toUpperCase();
  }
  return value;
}

/** The value drawn on the pattern, up to its last character: a separator is drawn only once
 *  something comes after it, so deleting never leaves a dangling «-». */
export function formatPattern(value: string, pattern: string): string {
  let out = "";
  let pending = "";
  let at = 0;
  for (const char of pattern) {
    if (at >= value.length) break;
    if (SLOT.test(char)) {
      out += pending + (value[at] ?? "");
      pending = "";
      at++;
    } else {
      pending += char;
    }
  }
  return out;
}

/** Every slot is filled. */
export function isPatternComplete(value: string, pattern: string): boolean {
  return patternValue(value, pattern).length === slotsOf(pattern).length;
}

/** How many characters the pattern takes. */
export function patternLength(pattern: string): number {
  return slotsOf(pattern).length;
}
