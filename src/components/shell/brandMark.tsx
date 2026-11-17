import type { ReactElement } from "react";

/**
 * A product's mark: the URL of an image, or an element drawn inline.
 *
 * Context: an image paints with the colours baked into its file, so it cannot follow the
 * theme nor the surface it sits on — a navy crest disappears on a navy sidebar and glares in
 * the dark theme. An inline `<svg>` that paints with `currentColor` or the tokens
 * (`var(--color-chrome-accent)`) follows both. A string stays a URL, so `logo: "/logo.svg"`
 * keeps working.
 */
export type BrandLogo = string | ReactElement;

/** Draws a `BrandLogo` in a box the host sizes. Decorative: the product's name is written
 *  beside it, and saying it twice is noise for a screen reader. */
export function BrandMark({ logo, className }: { logo: BrandLogo; className: string }) {
  if (typeof logo === "string") {
    return <img src={logo} alt="" className={`${className} object-contain`} />;
  }
  return (
    <span aria-hidden className={`${className} flex items-center justify-center *:size-full`}>
      {logo}
    </span>
  );
}
