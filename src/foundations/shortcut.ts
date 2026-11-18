"use client";

import { useSyncExternalStore } from "react";

/**
 * Context: a shortcut is drawn the way the person's keyboard says it — «⌘K» on a Mac, «Ctrl K»
 * everywhere else. A «Ctrl K» on a Mac is a shortcut that does not work, and people stop
 * reading the others. Only the browser knows the platform: on the server and while hydrating
 * it is `null`, and the shortcut appears right after instead of being drawn wrong and
 * corrected in front of the person.
 */
export type KeyboardPlatform = "apple" | "other";

type NavigatorWithHints = Navigator & { userAgentData?: { platform?: string } };

function readPlatform(): KeyboardPlatform {
  const nav = navigator as NavigatorWithHints;
  /* `userAgentData` where there is one (Chromium); `platform` is deprecated but it is the
     only answer Safari and Firefox give. */
  const name = nav.userAgentData?.platform ?? nav.platform;
  return /mac|iphone|ipad|ipod/i.test(name) ? "apple" : "other";
}

const unchanging = () => () => {};

/** The keyboard the page is being used with; `null` on the server and while hydrating. */
export function useKeyboardPlatform(): KeyboardPlatform | null {
  return useSyncExternalStore(unchanging, readPlatform, () => null);
}

export type ModShortcut = {
  /** What is drawn: «⌘K», «Ctrl K». */
  label: string;
  /** For `aria-keyshortcuts`: «Meta+K», «Control+K». */
  aria: string;
};

/** The platform's command key with `key`: ⌘ on a Mac, Ctrl elsewhere. */
export function modShortcut(key: string, platform: KeyboardPlatform): ModShortcut {
  return platform === "apple"
    ? { label: `⌘${key}`, aria: `Meta+${key}` }
    : { label: `Ctrl ${key}`, aria: `Control+${key}` };
}
