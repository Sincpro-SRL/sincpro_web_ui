"use client";

/* ==================================================================== *
 *  BUTTON — DO.
 *
 *  The product had THREE contradictory primaries at the same time: a blue
 *  `+ Crear`, a golden `Registrar pago` and a blue `+ Importar facturas`. Three equal
 *  weights saying three different things, and therefore no hierarchy at all.
 *
 *  The rule that fixes it is four roles and not one more:
 *
 *      primary     DO         — solid gold, `ink` on top (6.98:1)
 *      secondary   do without urgency — a box with an edge
 *      ghost       goes along — no weight, only the color of «go»
 *      danger      DESTROY    — and it cannot be undone
 *
 *  **Only one solid gold per surface.** `+ Crear` is the chrome's CTA,
 *  `Registrar pago` the panel's: they do not compete because they do not share a
 *  surface.
 *
 *  ── Why a labeled button is a box, and an icon target is a circle ──
 *
 *  `pill` is «what is a capsule and not a box» — a tag, a chip, a counter.
 *  A labeled button is the opposite: a box that gets pressed. A row of actions
 *  in capsules reads as a row of tags, and then what has to be pressed and
 *  what merely informs have the same silhouette. `radius/control` is the step
 *  for «what is touched and measures one line of text».
 *
 *  An icon-only target has no line of text. It is a square hit area, and a
 *  square with an 8px corner still reads as a leftover box. The circle is the
 *  silhouette of that target (the same call Spectrum makes for icon-only
 *  buttons). It does not meet the tag: the tag has text, the circle does not.
 *
 *  ── The weight of the type is hierarchy too ─────────────────────────
 *
 *  The four roles do NOT carry the same weight, and that is deliberate. The
 *  primary goes in `semibold` because it is the only thing on the screen that
 *  has to be seen from far away; the rest in `medium`. Putting all four at the
 *  same weight forces color to do the whole job of hierarchy by itself — and
 *  then someone glancing at the screen out of the corner of their eye, or who
 *  cannot tell the gold from the red apart, sees four identical buttons.
 *
 *  ── `surface`: the prop wins, the context is the default ────────────
 *
 *  The same piece lives on both surfaces and does NOT behave the same: on the
 *  canvas, «ghost» is painted with the navigation blue (7.48:1); on the chrome
 *  that blue gives 1.4:1 and the lightened one has to be used. The band that is
 *  dark (`AppFrame`'s bar, a `Record.Rail surface="chrome"`) provides its surface
 *  through `SurfaceProvider`, so a button written inside it takes the right
 *  palette without remembering to say so — which is how a navy band ends up with
 *  canvas-colored buttons. The explicit prop still wins, so a one-off decision
 *  stays auditable by reading the JSX.
 *
 *  ── What this file does NOT do ──────────────────────────────────────
 *
 *  It does not know what an invoice is, it does not call anything, it has no
 *  state and it does not write a single value by hand: every height, every
 *  radius and every color comes from a token. If it needed any of those things,
 *  it would not be a primitive.
 * ==================================================================== */
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import {
  Tooltip,
  TooltipTrigger,
  useInTooltipTrigger,
} from "@sincpro/web-ui/primitives/overlay/Tooltip";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";

export type ButtonRole = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type { Surface };

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

/** The icon accompanies the label and never replaces it.
 *
 *  Size `sm` (12px) on the small button and `md` (16px) on the medium one, with
 *  the stroke that belongs to each — see the iconography scale: what stays
 *  constant is the optical weight, not the number. */
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
  return `inline-flex shrink-0 items-center justify-center rounded-control whitespace-nowrap transition-[background-color,border-color,filter,color] duration-(--duration-instant) ease-(--ease-out) disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${SIZE[size]} ${WEIGHT[role]} ${ROLE[role][surface]}`;
}

const ICON: Record<ButtonSize, { size: string; stroke: number }> = {
  sm: { size: "size-(--size-icon-sm)", stroke: 2 },
  md: { size: "size-(--size-icon-md)", stroke: 1.75 },
  lg: { size: "size-(--size-icon-lg)", stroke: 1.5 },
};

/** What kind of thing a trigger opens. `menu` is the default because it is what the
 *  `expanded` prop always announced; a `PopoverTrigger` opens a `dialog`, a picker a
 *  `listbox`. */
export type ButtonPopup = "menu" | "dialog" | "listbox";

/** The native attributes a system button lets through.
 *
 *  Context: React Aria's triggers (`TooltipTrigger`, `DialogTrigger`, a `Toolbar`) talk to
 *  the control by handing it a `ref` and DOM props — pointer and focus handlers,
 *  `aria-describedby`, `aria-expanded`. A button that drops them is a button the tooltip
 *  never learns was hovered. So everything native goes through, and `ref` is a plain prop
 *  (React 19).
 *
 *  What stays out on purpose: `className` and `style` — the look is the role, the size and
 *  the surface, and a primitive that takes classes from outside stops being the one place
 *  where a button is decided; `role`, because here it is the button's ROLE in the hierarchy
 *  (`primary`…), not an ARIA role; and the attributes the props below already own. */
type NativeProps<E extends "button" | "a", Own extends string> = Omit<
  ComponentPropsWithRef<E>,
  "children" | "className" | "style" | "role" | Own
>;

/** `aria-haspopup` + `aria-expanded`, only when the button opens something. Spread AFTER the
 *  native props, and only when it applies, so it never erases what a React Aria trigger
 *  already wrote. */
function popupAttrs(expanded: boolean | undefined, haspopup: ButtonPopup | undefined) {
  if (expanded === undefined && haspopup === undefined) return {};
  return {
    "aria-haspopup": haspopup ?? "menu",
    ...(expanded === undefined ? {} : { "aria-expanded": expanded }),
  };
}

export type ButtonProps = NativeProps<
  "button",
  "type" | "disabled" | "title" | "aria-haspopup" | "aria-expanded"
> & {
  children: ReactNode;
  role?: ButtonRole;
  size?: ButtonSize;
  surface?: Surface;
  /** To the left of the label. Never alone: a button with only an icon is an
   *  `IconButton` and has its own piece, with its mandatory `aria-label`. */
  icon?: LucideIcon;
  disabled?: boolean;
  title?: string;
  /** `submit` for the button that sends the form it is in. `button` by default, so a
   *  button dropped inside a `<form>` never submits it by accident. */
  type?: "button" | "submit";
  /** Context: the button that opens a dropdown has to say so. Without
   *  `aria-expanded`, a screen reader announces it as an ordinary button and
   *  whoever uses it does not know there is something open underneath. */
  expanded?: boolean;
  /** What it opens, written to `aria-haspopup`. `menu` when absent. */
  haspopup?: ButtonPopup;
};

export function Button({
  children,
  role = "secondary",
  size = "md",
  surface: surfaceProp,
  icon: Icon,
  disabled = false,
  title,
  type = "button",
  expanded,
  haspopup,
  ref,
  ...native
}: ButtonProps) {
  const surface = useSurface(surfaceProp);
  const ic = ICON[size];
  return (
    <button
      {...native}
      ref={ref}
      type={type}
      title={title}
      disabled={disabled}
      {...popupAttrs(expanded, haspopup)}
      /* The role in the DOM: `make smoke` counts the primaries of a view — the rule is
         ONE per screen, and a rule nobody checks is a suggestion. */
      data-emphasis={role}
      className={buttonClasses(role, size, surface)}
    >
      {Icon === undefined ? null : (
        <Icon className={`${ic.size} shrink-0`} strokeWidth={ic.stroke} aria-hidden />
      )}
      {children}
    </button>
  );
}

export type ButtonLinkProps = NativeProps<"a", "href" | "download" | "title"> & {
  children: ReactNode;
  href: string;
  role?: ButtonRole;
  size?: ButtonSize;
  surface?: Surface;
  icon?: LucideIcon;
  /** The name it is saved with. `true` lets the server decide it. */
  download?: string | boolean;
  title?: string;
};

/**
 * The same button, but it is a real link.
 *
 * Context: it exists because a `<button>` that navigates breaks middle-click,
 * «open in a new tab» and «save as» — and downloading a file is exactly that.
 * The look is shared entirely with `Button`: two different silhouettes for
 * «download» and «synthesize» in the same bar is the problem this file exists
 * in order not to have.
 *
 * It does not carry `inline-block`: a flex item gets blockified anyway, and with
 * that class the `<a>`'s box measured its padding with zero content and the text
 * was painted on top of its neighbor.
 */
export function ButtonLink({
  children,
  href,
  role = "secondary",
  size = "md",
  surface: surfaceProp,
  icon: Icon,
  download,
  title,
  ref,
  ...native
}: ButtonLinkProps) {
  const surface = useSurface(surfaceProp);
  const ic = ICON[size];
  return (
    <a
      {...native}
      ref={ref}
      data-emphasis={role}
      href={href}
      title={title}
      {...(download === undefined ? {} : { download })}
      className={`${buttonClasses(role, size, surface)} no-underline`}
    >
      {Icon === undefined ? null : (
        <Icon className={`${ic.size} shrink-0`} strokeWidth={ic.stroke} aria-hidden />
      )}
      {children}
    </a>
  );
}

/** The `IconButton` is SQUARE: its side is the height of its step. An icon
 *  button narrower than it is tall has less area than it appears to, and misses
 *  when you aim right at the edges. */
export type IconTone = "normal" | "action" | "danger";

/** Outside the component because the button and the link share it: the same
 *  icon has to look the same whether it leads to an action or to a file. */
const TONE: Record<IconTone, Record<Surface, string>> = {
  normal: {
    canvas: "text-muted hover:bg-ink/6 hover:text-ink",
    chrome: "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
  },
  action: {
    canvas: "text-primary hover:bg-primary/8",
    chrome: "text-chrome-link hover:bg-chrome-link/12",
  },
  danger: {
    canvas: "text-danger hover:bg-danger/8",
    chrome: "text-chrome-bad hover:bg-chrome-bad/12",
  },
};

const BOX =
  "inline-flex shrink-0 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const SQUARE: Record<ButtonSize, string> = {
  sm: "size-(--size-control-sm)",
  md: "size-(--size-control-md)",
  lg: "size-(--size-control-lg)",
};

/** The label of an icon, shown.
 *
 *  Context: the native `title` was the only way to learn what an icon does, and it is the
 *  browser's tooltip — late, unstyled, never on keyboard focus. So an icon target draws the
 *  system's `Tooltip` with its `label` instead, on hover AND on focus, and drops the `title`
 *  so two tooltips never show at once. `false` brings the `title` back, for the rare icon
 *  whose name is already written next to it. Inside a `TooltipTrigger` the consumer's
 *  tooltip wins and this one steps aside. */
function Labelled({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: boolean;
  children: (title: string | undefined) => ReactNode;
}) {
  const wrapped = useInTooltipTrigger();
  if (wrapped) return children(undefined);
  if (!tooltip) return children(label);
  return (
    <TooltipTrigger>
      {children(undefined)}
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}

export type IconButtonProps = NativeProps<
  "button",
  "type" | "disabled" | "title" | "aria-label" | "aria-haspopup" | "aria-expanded"
> & {
  icon: LucideIcon;
  /** What is read aloud and shown in the tooltip. It is not optional: an icon
   *  alone does not say what it does, and whoever knows already knew what to
   *  press. */
  label: string;
  size?: ButtonSize;
  surface?: Surface;
  tone?: IconTone;
  disabled?: boolean;
  type?: "button" | "submit";
  /** Opens a menu and says whether it is open. Without this, a screen reader
   *  announces «button» where there is a dropdown. */
  expanded?: boolean;
  /** What it opens, written to `aria-haspopup`. `menu` when absent. */
  haspopup?: ButtonPopup;
  /** The system's `Tooltip` with the `label`, on hover and focus. On by default; `false`
   *  falls back to the native `title`. */
  tooltip?: boolean;
};

/** Only an icon, and that is why the label is mandatory even though it is not
 *  drawn.
 *
 *  It exists because «download» was a grey 11 px `↓` character with no box: the
 *  most frequent action of a row was the hardest one to hit. Here it has its
 *  full control height and a background on hover — the target is the same as
 *  that of a button with text, only without the text. */
export function IconButton({
  icon: Icon,
  label,
  size = "sm",
  surface: surfaceProp,
  tone = "normal",
  disabled = false,
  type = "button",
  expanded,
  haspopup,
  tooltip = true,
  ref,
  ...native
}: IconButtonProps) {
  const surface = useSurface(surfaceProp);
  const ic = ICON[size];
  return (
    <Labelled label={label} tooltip={tooltip}>
      {(title) => (
        <button
          {...native}
          ref={ref}
          type={type}
          title={title}
          aria-label={label}
          disabled={disabled}
          {...popupAttrs(expanded, haspopup)}
          className={`${BOX} disabled:pointer-events-none disabled:opacity-45 ${SQUARE[size]} ${TONE[tone][surface]}`}
        >
          <Icon className={ic.size} strokeWidth={ic.stroke} aria-hidden />
        </button>
      )}
    </Labelled>
  );
}

export type IconLinkProps = NativeProps<"a", "href" | "download" | "title" | "aria-label"> & {
  icon: LucideIcon;
  label: string;
  href: string;
  /** The name it is saved with. Present = the browser downloads the file
   *  instead of navigating. */
  download?: string;
  size?: ButtonSize;
  surface?: Surface;
  tone?: IconTone;
  /** As in `IconButton`: the system's `Tooltip` by default, the native `title` with
   *  `false`. */
  tooltip?: boolean;
};

/**
 * The same icon, but it is a real link.
 *
 * Context: it exists for the same reason as `ButtonLink` — downloading a file or
 * going to a view is NOT pressing a button. With a `<button>` you lose
 * middle-click, «copy the address» and the browser's `download`, which is the
 * only thing that keeps a 150 MB CSV from going through the tab's memory.
 */
export function IconLink({
  icon: Icon,
  label,
  href,
  download,
  size = "sm",
  surface: surfaceProp,
  tone = "action",
  tooltip = true,
  ref,
  ...native
}: IconLinkProps) {
  const surface = useSurface(surfaceProp);
  const ic = ICON[size];
  return (
    <Labelled label={label} tooltip={tooltip}>
      {(title) => (
        <a
          {...native}
          ref={ref}
          href={href}
          {...(download === undefined ? {} : { download })}
          title={title}
          aria-label={label}
          className={`${BOX} ${SQUARE[size]} ${TONE[tone][surface]}`}
        >
          <Icon className={ic.size} strokeWidth={ic.stroke} aria-hidden />
        </a>
      )}
    </Labelled>
  );
}
