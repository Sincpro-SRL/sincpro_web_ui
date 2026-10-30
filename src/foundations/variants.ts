import { composeRenderProps } from "react-aria-components";
import { cnMerge, createTV } from "tailwind-variants/config";

/**
 * How a component's classes are composed — the variants of a recipe, and the merge of a
 * consumer's `className` on top of the system's.
 *
 * Context: merging Tailwind classes needs to know which classes fight over the same
 * property. The merger only knows Tailwind's default scales, and this system has its own:
 * `text-meta` is a SIZE and `text-ink` a COLOR, but to a merger that has never heard of
 * `meta`, both are `text-*` colors — and `text-meta text-ink` silently loses one. Every
 * named scale in `tokens.css` is declared here so the merger reads it as what it is.
 * `tests/variants.test.ts` holds each pair that used to collide.
 */
const twMergeConfig = {
  extend: {
    theme: {
      text: ["micro", "meta", "body", "lead", "title", "display"],
      radius: ["mark", "control", "box", "panel", "pill"],
      shadow: ["raised", "float", "window"],
    },
  },
};

/** The system's `tv`: a recipe of base classes and variants, merged with the scales above. */
export const tv = createTV({ twMergeConfig });

/** Joins classes, and when two set the same property, the LAST one wins. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return cnMerge(...classes)({ twMergeConfig }) ?? "";
}

/**
 * The focus ring of every interactive piece: the same outline `Button` draws, driven by
 * React Aria's `isFocusVisible` — keyboard focus shows it, a mouse click does not.
 */
export const focusRing = tv({
  base: "outline-primary outline-offset-2 forced-colors:outline-[Highlight]",
  variants: {
    isFocusVisible: {
      false: "outline-0",
      true: "outline-2",
    },
  },
});

/**
 * A React Aria `className` can be a string or a function of the render state. This puts the
 * system's classes first and the consumer's after, so the consumer's win where they fight.
 */
export function composeClasses<T>(
  className: string | ((state: T) => string) | undefined,
  base: string,
): string | ((state: T) => string) {
  return composeRenderProps(className, (own) => cn(base, own));
}
