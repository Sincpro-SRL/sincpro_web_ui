"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Breadcrumb as AriaBreadcrumb, Breadcrumbs, Link } from "react-aria-components";

/* ---------------------------------------------------------------- *
 *  THE BREADCRUMBS
 * ---------------------------------------------------------------- */

export interface Crumb {
  label: string;
  /** Absent on the last one: the place you are already at cannot be pressed. */
  onClick?: () => void;
}

/** The three tones of a trail, per surface: where I came from, where I am, and the
 *  chevron between them. The chevron is the faintest thing in the row on purpose —
 *  it is punctuation, and punctuation louder than the words makes the words hard to
 *  read. */
const crumbStyles = tv({
  extend: focusRing,
  base: "block min-w-0 rounded-mark text-meta transition-colors duration-(--duration-instant)",
  variants: {
    surface: { canvas: "", chrome: "outline-chrome-link" },
    kind: {
      link: "cursor-pointer hover:underline hover:underline-offset-4",
      inert: "cursor-default",
      current: "cursor-default font-medium",
    },
  },
  compoundVariants: [
    { surface: "canvas", kind: ["link", "inert"], class: "text-muted" },
    { surface: "canvas", kind: "link", class: "hover:text-ink" },
    { surface: "canvas", kind: "current", class: "text-ink" },
    { surface: "chrome", kind: ["link", "inert"], class: "text-chrome-muted" },
    { surface: "chrome", kind: "link", class: "hover:text-chrome-ink" },
    { surface: "chrome", kind: "current", class: "text-chrome-ink" },
  ],
});

/**
 * Where I came from, without eating the line.
 *
 * Built on React Aria's `Breadcrumbs`: the LAST crumb is the page I am on, so it
 * gets `aria-current="page"` and stops being pressable — React Aria decides that
 * from its position, not from whether the caller forgot an `onClick`. The others
 * are `Link`s, so they press with Enter, show the system focus ring only from the
 * keyboard, and read as links to a screen reader.
 *
 * **The hierarchy is in the TONE, not in a color.** Ancestors are quiet
 * (`text-muted`), the current page is ink and medium weight: the eye lands on where
 * I am and reads backwards. Painting the ancestors in the link blue made the whole
 * row the same weight — four blue words and no «here».
 *
 * Two things keep it inside its place, and they are two because they are two
 * different problems:
 *
 *  1. **Each crumb asks for `--container-crumb` and no more.** A name in this
 *     product reaches fifty characters, so one crumb is enough to eat the band even
 *     when the trail has three. The rest is cut with «…» and the full name stays in
 *     the `title`.
 *  2. **With more than `folded` crumbs, the MIDDLE ones fold** into a «…» menu.
 *     By COUNT, not by width: a six-crumb trail is long on any screen. The first
 *     —the root, where you go back to— and the last —where I am— never fold, and
 *     what folded is still navigable, in order.
 *
 * Folding and truncating are not the same and that is why both exist: one removes
 * CRUMBS and the other removes LETTERS.
 */
export function Breadcrumb({
  crumbs,
  surface: surfaceProp,
  folded = 3,
}: {
  crumbs: readonly Crumb[];
  surface?: Surface;
  /** From how many crumbs the middle folds. Below this every crumb is drawn:
   *  folding two crumbs hides half the trail to save one chevron. */
  folded?: number;
}) {
  const copy = useUiCopy();
  const surface = useSurface(surfaceProp);
  const edge = surface === "chrome" ? "text-chrome-muted/50" : "text-line-strong";

  /* The first and the last always; the middle goes to the menu when there are too many. */
  const folds = crumbs.length > folded;
  const hidden = folds ? crumbs.slice(1, -1) : [];
  const shown: readonly (Crumb | null)[] = folds
    ? [crumbs[0]!, null, crumbs[crumbs.length - 1]!]
    : crumbs;

  return (
    <nav aria-label={copy.record.location} className="flex min-w-0">
      <Breadcrumbs
        aria-label={copy.record.location}
        className="flex min-w-0 flex-wrap items-center gap-1"
      >
        {shown.map((crumb, i) => {
          const key = crumb === null ? "folded" : `${i}-${crumb.label}`;
          const last = i === shown.length - 1;
          return (
            <AriaBreadcrumb key={key} id={key} className="flex min-w-0 items-center gap-1">
              {i === 0 ? null : (
                <ChevronRight
                  className={`size-(--size-icon-sm) shrink-0 ${edge}`}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              {crumb === null ? (
                <Menu
                  label={copy.record.location}
                  title={copy.record.location}
                  icon={MoreHorizontal}
                  iconOnly
                  chevron={false}
                  variant="text"
                  size="sm"
                  surface={surface === "chrome" ? "chrome" : "canvas"}
                  align="start"
                  groups={[
                    {
                      options: hidden.map((one, at) => ({
                        id: `crumb-${at}`,
                        label: one.label,
                        disabled: one.onClick === undefined,
                        onSelect: one.onClick,
                      })),
                    },
                  ]}
                />
              ) : (
                <Link
                  /* React Aria already disables the last one; a middle crumb with
                     nowhere to go is disabled too, instead of a link that does
                     nothing. */
                  isDisabled={last ? undefined : crumb.onClick === undefined}
                  onPress={crumb.onClick}
                  className={({ isFocusVisible }) =>
                    crumbStyles({
                      surface,
                      isFocusVisible,
                      kind: last ? "current" : crumb.onClick === undefined ? "inert" : "link",
                    })
                  }
                >
                  {/* The `title` lives on the text and not on the link: React Aria's
                      `Link` does not forward it, and the cut name has to be readable
                      somewhere. */}
                  <span
                    className="block max-w-(--container-crumb) truncate"
                    title={crumb.label}
                  >
                    {crumb.label}
                  </span>
                </Link>
              )}
            </AriaBreadcrumb>
          );
        })}
      </Breadcrumbs>
    </nav>
  );
}
