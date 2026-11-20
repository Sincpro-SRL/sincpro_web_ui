import type { Surface } from "@sincpro/web-ui/foundations/types";

/**
 * THE LOOK OF A BUTTON, as classes — the four roles, the three sizes, the two surfaces. See
 * the long note at the top of `Button.tsx` for why there are four roles and not one more.
 *
 * Context: it lives apart from `Button` because `Button.tsx` carries `"use client"` (a button
 * reads its surface from context), and a React Server Components bundler turns every export
 * of a client module into a client reference: `buttonClasses("primary", "md")` called from a
 * server component returned a reference instead of a class string. Here, without the
 * directive, it is a function anywhere.
 */

export type ButtonRole = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/** The height comes from `--size-control-*`; the padding and the type follow.
 *
 *      sm  a row, the header of a block
 *      md  the working size — the action bar of a record
 *      lg  a SINGLE, prominent action: a dialog's CTA, an empty state
 *
 *  **Every button in the same row measures the same.** `lg` is not «the
 *  primary»: it is for when the button is alone. Mixing heights in a bar looks
 *  like an alignment mistake, not like hierarchy — and hierarchy is already
 *  done by the color and the weight, which work without changing the size of
 *  anything.
 *
 *  The padding grows FASTER than the height (3 → 4 → 6). A tall, narrow button
 *  reads as a stretched icon; what gives it presence is the air on the sides of
 *  the label, not the height alone. */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-(--size-control-sm) px-3 gap-1.5 text-meta",
  md: "h-(--size-control-md) px-4 gap-2 text-body",
  lg: "h-(--size-control-lg) px-6 gap-2 text-lead",
};

/** The weight per role. See the header note: it is not aesthetics, it is half
 *  of the hierarchy — the half that keeps working out of the corner of your
 *  eye. */
const WEIGHT: Record<ButtonRole, string> = {
  primary: "font-semibold",
  secondary: "font-medium",
  ghost: "font-medium",
  danger: "font-semibold",
};

/** Each role on its two surfaces. The table exists so that adding a third
 *  surface is one column here and not an `if` scattered across the tree — and
 *  so that the day a combination is missing, the compiler says so. */
const ROLE: Record<ButtonRole, Record<Surface, string>> = {
  primary: {
    // `btn-accent` is the brand gradient, use 3 of 4. Barely a glint of metal:
    // a strong gradient turns a tool into a landing page.
    canvas:
      "btn-accent border border-transparent hover:brightness-[1.04] active:brightness-95",
    chrome:
      "btn-accent border border-transparent hover:brightness-[1.04] active:brightness-95",
  },
  secondary: {
    // Quiet on purpose. The blue belongs to `ghost` (go) and the gold to
    // `primary` (do). A secondary painted in the action color is a second
    // primary, which is the defect this file exists to stop.
    canvas: "border border-line-strong bg-ink/6 text-ink hover:bg-ink/10",
    chrome:
      "border border-chrome-muted/30 bg-chrome-raised text-chrome-ink hover:bg-chrome-ink/10",
  },
  ghost: {
    canvas: "border border-transparent text-primary hover:bg-primary/8",
    chrome: "border border-transparent text-chrome-link hover:bg-chrome-ink/8",
  },
  danger: {
    canvas: "border border-transparent bg-danger text-surface hover:bg-danger-hover",
    chrome: "border border-transparent bg-danger text-surface hover:bg-danger-hover",
  },
};

/** The look of a button, without the button.
 *
 *  Context: it exists because there are things that LOOK like a button and are
 *  not — a menu trigger is the case. Without this, each one copies the classes
 *  and by the third copy they no longer match: that is exactly what happened
 *  with «＋ Crear», which was the only primary button in the product with a
 *  different height. */
export function buttonClasses(
  role: ButtonRole = "secondary",
  size: ButtonSize = "md",
  surface: Surface = "canvas",
): string {
  return `inline-flex shrink-0 items-center justify-center rounded-ui-button whitespace-nowrap transition-[background-color,border-color,filter,color] duration-(--duration-instant) ease-(--ease-out) disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${SIZE[size]} ${WEIGHT[role]} ${ROLE[role][surface]}`;
}
