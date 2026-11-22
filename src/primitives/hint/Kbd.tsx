"use client";

import type { Keys } from "@sincpro/web-ui/foundations/keys";
import { keysLabel } from "@sincpro/web-ui/foundations/keys";
import { useKeyboardPlatform } from "@sincpro/web-ui/foundations/shortcut";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { ReactNode } from "react";

export type KbdProps = {
  /** A combination written the system's way («Mod+K», «Alt+ArrowDown»): drawn the way THIS
   *  keyboard says it — «⌘K» on a Mac, «Ctrl K» elsewhere. Nothing is drawn until the
   *  platform is known, rather than a «Ctrl» on a Mac corrected in front of the person. */
  keys?: Keys;
  /** A key written as is — «Tab», «/», «Enter» — when there is no platform to ask. */
  children?: ReactNode;
  surface?: Surface;
};

/**
 * A key, drawn as a key: «⌘K» at the end of the search entry, «Tab» after a completion, the
 * legend of what each key does.
 *
 * Context: four places drew their own `<kbd>` — two paddings, two line heights, one with a
 * minimum width — and a key looked a little different in each. It is a reference, not an
 * action: mono, the quiet size, muted, a hairline around it. Seen, not heard (`aria-hidden`):
 * the control it belongs to says its shortcut with `aria-keyshortcuts`, and «⌘K» read aloud
 * after the name is noise. Not drawn under a finger: a touch screen has no keyboard.
 */
export function Kbd({ keys, children, surface: surfaceProp }: KbdProps) {
  const surface = useSurface(surfaceProp);
  const platform = useKeyboardPlatform();
  const label =
    keys === undefined ? children : platform === null ? null : keysLabel(keys, platform);
  if (label === null || label === undefined) return null;
  return (
    <kbd
      aria-hidden
      data-ui="kbd"
      data-surface={surface}
      className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-control border px-1 font-mono text-micro leading-tight touch:hidden ${bySurface(
        surface,
        "border-line bg-surface text-muted",
        "border-chrome-ink/30 text-chrome-muted",
      )}`}
    >
      {label}
    </kbd>
  );
}
