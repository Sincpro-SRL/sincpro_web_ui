"use client";

import { useSidebarDrawer } from "@sincpro/web-ui/components/shell/sidebarDrawer";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { modShortcut, useKeyboardPlatform } from "@sincpro/web-ui/foundations/shortcut";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Search } from "lucide-react";

/**
 * THE WAY INTO THE PALETTE, drawn — «Buscar…  ⌘K».
 *
 * Context: a command palette that only opens with a key is a feature nobody finds. quipu's
 * people asked for «a global search» while ⌘K already opened one. This is the visible door: it
 * reads like a search field, it says the shortcut so the next time the hand goes to the
 * keyboard, and pressing it calls `onSearch` — the application opens its palette there.
 *
 * It does NOT listen for the shortcut. The palette does (composer's ⌘K); a second listener here
 * would open it twice, or open it in an application whose palette uses another key.
 *
 * Inside the phone drawer it closes the drawer first: the palette opens over the page, not
 * over a drawer about to cover it.
 */
export type SearchEntryProps = {
  onSearch: () => void;
  /** What it says. «Buscar…» by default; «Buscar socios…» when the palette searches one thing. */
  label?: string;
  /** The key the palette listens for together with ⌘ / Ctrl: `K` by default. `false` draws no
   *  shortcut — the palette has none, or it is not a ⌘ one. */
  shortcut?: string | false;
  /** `row` fills its column (the sidebar). `bar` sizes to its words, and on a phone folds to
   *  the magnifier alone (a bar on top). */
  layout?: "row" | "bar";
  /** By default the surface it sits on. */
  surface?: Surface;
};

const SKIN = {
  canvas: {
    box: "border-ui-control-border bg-ui-control text-muted hover:border-line-strong hover:text-ink focus-visible:outline-primary",
    keys: "border-line text-muted",
  },
  chrome: {
    box: "border-chrome-ink/15 bg-chrome-ink/6 text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink focus-visible:outline-chrome-link",
    keys: "border-chrome-ink/20 text-chrome-muted",
  },
} as const;

export function SearchEntry({
  onSearch,
  label,
  shortcut = "K",
  layout = "row",
  surface,
}: SearchEntryProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const drawer = useSidebarDrawer();
  const platform = useKeyboardPlatform();
  const skin = SKIN[sup];
  const keys =
    shortcut === false || platform === null ? null : modShortcut(shortcut, platform);
  const bar = layout === "bar";
  return (
    <button
      type="button"
      onClick={() => {
        if (drawer?.isOpen === true) drawer.close();
        onSearch();
      }}
      {...(keys === null ? {} : { "aria-keyshortcuts": keys.aria })}
      className={`flex h-(--size-control-sm) min-w-0 cursor-pointer items-center gap-2 rounded-ui-control border px-2 text-meta transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-2 ${
        bar ? "shrink-0 max-sm:w-(--size-control-sm) max-sm:justify-center" : "w-full"
      } ${skin.box}`}
      data-ui="search-entry"
      data-surface={sup}
    >
      <Search className="size-(--size-icon-md) shrink-0" strokeWidth={2} aria-hidden />
      <span className={`min-w-0 flex-1 truncate text-left ${bar ? "max-sm:sr-only" : ""}`}>
        {label ?? copy.shell.search}
      </span>
      {keys === null ? null : (
        /* Seen, not heard: `aria-keyshortcuts` already tells a screen reader, and «⌘K» read
           aloud is noise after the name. Not drawn for a finger: a phone has no ⌘. */
        <kbd
          aria-hidden
          className={`shrink-0 rounded-control border px-1.5 font-mono text-micro pointer-coarse:hidden ${
            bar ? "max-sm:hidden" : ""
          } ${skin.keys}`}
          data-ui="search-entry.keys"
        >
          {keys.label}
        </kbd>
      )}
    </button>
  );
}
