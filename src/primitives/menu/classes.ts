/* Without `"use client"`: `Menu.tsx` carries it, and a React Server Components bundler turns
   every export of a client module into a client reference — a class string asked for on the
   server came back as a reference. */

/**
 * The look of a list control's trigger — «Filtros ▾», «Columnas ▾», «Ordenar ▾» — without
 * the menu.
 *
 * Context: a control of the bar that opens a PANEL and not a list of options (the sort
 * criteria) still has to look like its neighbours; copying these classes is how the third
 * trigger ends up one pixel off. Same reason `buttonClasses` exists.
 */
export function menuTriggerClasses({
  variant = "button",
  surface = "canvas",
  active = false,
  current = false,
  open = false,
  focusVisible = false,
  iconOnly = false,
}: {
  variant?: "button" | "text";
  surface?: "canvas" | "chrome";
  active?: boolean;
  /** The screen on view is inside this menu: a bar under the label. */
  current?: boolean;
  open?: boolean;
  focusVisible?: boolean;
  iconOnly?: boolean;
}): string {
  /* `text` is the menu of a BAR: no frame and no background, just the highlight
     on hover. Five bordered menus on top of an application are five buttons
     competing with the ones in the view, and the bar stops reading as an index.
     `button` is the menu of a CONTROL —"filters ▾", "group ▾"—, and there the
     frame is what says it can be pressed. */
  const tone =
    variant === "text"
      ? surface === "chrome"
        ? `border-transparent text-chrome-muted hover:bg-chrome-ink/12 hover:text-chrome-ink ${
            active || open ? "bg-chrome-ink/12 text-chrome-ink" : ""
          }`
        : `border-transparent text-muted hover:bg-ink/6 hover:text-ink ${
            active || open ? "bg-ink/6 text-ink" : ""
          }`
      : surface === "chrome"
        ? `border-chrome-muted/35 bg-chrome-raised text-chrome-ink hover:border-chrome-accent/45 ${
            active ? "border-chrome-accent/60" : ""
          }`
        : `border-line-strong bg-surface hover:border-primary/45 hover:bg-primary/5 ${
            active ? "border-primary/60 text-primary" : "text-ink"
          }`;
  /* «Here» is a SHAPE under the label, in the colour that marks the place on each surface:
     the gold on the chrome (where it is legible, 6.70:1), the navy on the canvas. */
  const here = current
    ? `relative after:absolute after:inset-x-2.5 after:bottom-0.5 after:h-0.5 after:rounded-pill ${
        surface === "chrome"
          ? "text-chrome-ink after:bg-chrome-accent"
          : "text-ink after:bg-primary"
      }`
    : "";
  return `inline-flex h-(--size-control-sm) shrink-0 cursor-default items-center gap-1.5 border text-micro font-medium whitespace-nowrap outline-0 transition-colors duration-(--duration-instant) ${
    focusVisible ? "outline-2 outline-offset-2 outline-primary" : ""
  } ${iconOnly ? "w-(--size-control-sm) justify-center rounded-pill" : "rounded-control px-2.5"} ${tone} ${here}`;
}
