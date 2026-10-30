/**
 * Context: a gallery that repeats by hand what `tokens.css` says is a second
 * truth and it goes out of sync on the first change. Here the value is READ
 * from the document and the contrast is COMPUTED.
 *
 * The number matters as much as the color: a token without its contrast
 * invites you to use it where it cannot be read, which is how the gold ended
 * up being a color that could not say anything.
 */

export type RGB = readonly [number, number, number];

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** The WCAG 2.1 contrast, in the format the standard asks you to read: `4.5` is 4,5:1. */
export function ratio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Context: kept apart from the browser so the token test can measure without
 *  mounting a DOM — it is the only way to make sure the contrast written in a
 *  comment cannot lie. */
export function parseHex(hex: string): RGB | null {
  const clean = hex.trim().replace("#", "");
  const size = clean.length === 3 ? 1 : clean.length === 6 ? 2 : 0;
  if (size === 0 || !/^[0-9a-fA-F]+$/.test(clean)) return null;

  const channel = (i: number) => {
    const chunk = clean.slice(i * size, i * size + size);
    return parseInt(size === 1 ? chunk + chunk : chunk, 16);
  };
  return [channel(0), channel(1), channel(2)];
}

/** The effective value of a CSS variable, exactly as the browser resolved it:
 *  if tomorrow the gold changes hue, the gallery shows it without anyone
 *  touching it. */
export function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Context: it goes through the browser —it paints on a 1×1 canvas— instead of
 *  parsing by hand, so it works the same if a token moves to `oklch()`,
 *  `color-mix()` or a name. Whatever the browser could not paint counts as
 *  black, and then the contrast comes out absurd and it shows, instead of
 *  breaking the page. */
function channels(color: string): RGB {
  const direct = parseHex(color);
  if (direct !== null) return direct;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return [0, 0, 0];

  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
}

export function contrast(a: string, b: string): number {
  return ratio(channels(a), channels(b));
}

export type Verdict = "AAA" | "AA" | "AA grande" | "pasa" | "no pasa" | "no aplica";

/**
 * What the color is used for, because **the threshold depends on the usage and
 * not on the color**. The witness case are the lines: `--color-line` gives
 * 1,26:1 and that is NOT a defect — it is what «a line that separates without
 * shouting» has to give. Marking it «no pasa» would invite raising it until it
 * shouts.
 *
 *   text        1.4.3 — 4,5:1 small, 3:1 large, 7:1 for AAA
 *   graphic     1.4.11 — 3:1, and that is enough: an icon or a border that MEANS something
 *   decorative  there is no minimum: there is nothing to perceive in order to understand
 */
export type Usage = "text" | "graphic" | "decorative";

/** Context: it returns the word and not a boolean because «no pasa» and «AA
 *  grande» are different permissions — the second one allows a 24px heading and
 *  forbids an 11px label, and that decides whether a token can live inside a
 *  pill. */
export function verdict(value: number, usage: Usage = "text"): Verdict {
  if (usage === "decorative") return "no aplica";
  if (usage === "graphic") return value >= 3 ? "pasa" : "no pasa";
  if (value >= 7) return "AAA";
  if (value >= 4.5) return "AA";
  if (value >= 3) return "AA grande";
  return "no pasa";
}

/** The contrast formatted the way `tokens.css` writes it: decimal comma and `:1`. */
export function ratioLabel(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}:1`;
}
