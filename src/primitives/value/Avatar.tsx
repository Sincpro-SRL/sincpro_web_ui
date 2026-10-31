"use client";

import { useSurface } from "@sincpro/web-ui/foundations/surface";

/* ==================================================================== *
 *  WHO — the person as a datum, not as a string of text.
 *
 *  «andres.g@sincpro.com.bo» in a cell is a correct and unreadable datum: twelve
 *  rows of emails get read letter by letter. An initial in a circle is
 *  recognized without reading, which is what is needed when the question is «who
 *  does this belong to?» and not «what is their email?».
 *
 *  ── The color comes out of the name and nobody picks it ──────────────
 *
 *  A hash of the name against the tone palette. It is deterministic —the same
 *  person always has the same color, on every screen— and that is why the color
 *  gets to mean something. If the consumer picked it, the same person would be
 *  green in one list and blue in another, and recognition without reading is lost
 *  entirely.
 *
 *  The color here is NOT a state: it is identity. That is why it uses the tone
 *  palette but never `bad` nor `warn` — a person is not «in error».
 * ==================================================================== */

const PALETTE = [
  "bg-info/15 text-info",
  "bg-good/15 text-good",
  "bg-accent/25 text-ink",
  "bg-primary/12 text-primary",
  "bg-ink/10 text-ink",
] as const;

/** The initials: two, and from the first two WORDS. «Ana María Gutiérrez» gives
 *  `AG` and not `AM` — the surname distinguishes more than the middle name. */
function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  return `${first}${last ?? ""}`.toUpperCase();
}

/* The same five identities on the dark chrome. The canvas palette there composed its tints
   over the navy and left ink letters on a dark disc — 1.61:1, unreadable (measured on the
   application bar). Same index, so a person keeps their color across the two surfaces. */
const CHROME_PALETTE = [
  "bg-chrome-link/20 text-chrome-link",
  "bg-chrome-good/20 text-chrome-good",
  "bg-chrome-accent/12 text-chrome-accent",
  "bg-chrome-link/14 text-chrome-ink",
  "bg-chrome-ink/14 text-chrome-ink",
] as const;

function toneOf(name: string, surface: "canvas" | "chrome" = "canvas"): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 100000;
  const palette = surface === "chrome" ? CHROME_PALETTE : PALETTE;
  return palette[h % palette.length]!;
}

/* The text doesn't go below `micro`: two initials at 10 px can't be read, and an
   unreadable initial is a colored circle — which is exactly what we don't want.
   What changes between sizes is the circle. */
export const SIZE = {
  sm: "size-5 text-micro",
  md: "size-6 text-micro",
  lg: "size-8 text-meta",
  /* The head of a contact card: the face is what the card is about. */
  xl: "size-12 text-body",
} as const;

/* Two initials, so the overlap stays short of the second letter. The ring is
   1px: a 2px ring of the surface color reads as a gap between people, which
   is the thing a stack is not. */
export const OVERLAP: Record<AvatarSize, string> = {
  sm: "-ml-1.5",
  md: "-ml-2",
  lg: "-ml-2.5",
  xl: "-ml-3.5",
};

export type AvatarSize = keyof typeof SIZE;

export function Avatar({
  name,
  size = "md",
  /** The photo, if there is one. Without it the initials go, which is the normal
   *  case here. */
  src,
}: {
  name: string;
  size?: AvatarSize;
  src?: string;
}) {
  const surface = useSurface();
  if (src !== undefined) {
    return (
      /* The photo lies over the initials, drawn invisible: an image has no text baseline, so
         a chip with a photo sat on the image's bottom edge in a row aligned by baseline (a
         `DataField`), higher than the label next to it. The hidden initials give the photo
         the same baseline the initials disc has. */
      <span
        title={name}
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill ${SIZE[size]}`}
      >
        <span aria-hidden className="invisible">
          {initials(name)}
        </span>
        <img src={src} alt={name} className="absolute inset-0 size-full object-cover" />
      </span>
    );
  }

  return (
    <span
      title={name}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-pill font-medium select-none ${SIZE[size]} ${toneOf(name, surface)}`}
    >
      {initials(name)}
    </span>
  );
}
