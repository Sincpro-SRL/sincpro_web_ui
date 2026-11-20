"use client";

import {
  type KeyboardPlatform,
  type Keys,
  keysAria,
  keysLabel,
  matchesKeys,
  type ModShortcut,
  modShortcut,
  needsModifier,
} from "@sincpro/web-ui/foundations/keys";
import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Context: a shortcut is drawn the way the person's keyboard says it — «⌘K» on a Mac, «Ctrl K»
 * everywhere else. A «Ctrl K» on a Mac is a shortcut that does not work, and people stop
 * reading the others. Only the browser knows the platform: on the server and while hydrating
 * it is `null`, and the shortcut appears right after instead of being drawn wrong and
 * corrected in front of the person.
 */
export type { KeyboardPlatform };

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

/* `modShortcut` is a plain function (`keys.ts`), without the directive, so a server component
   draws a shortcut too; re-exported so every path that read it here keeps reading it. */
export type { ModShortcut };
export { modShortcut };

/* ==================================================================== *
 *  SHORTCUTS THAT RUN — not only drawn.
 *
 *  Context: «Ctrl+P» written beside «Imprimir» in a menu that nothing binds is a promise the
 *  screen does not keep. `useShortcuts` binds them while the piece that declares them is on
 *  screen, and the declarations STACK: the record in a peek over the page answers Alt+D, not
 *  the page under it — the last one mounted wins, and when it goes the one below answers
 *  again. A combination with a modifier works while a field is being typed in; a bare key
 *  does not, or typing «d» would duplicate the record.
 * ==================================================================== */

export interface Shortcut {
  /** «Alt+D», «Mod+S», «Alt+P»: see `foundations/keys`. */
  keys: Keys;
  run: () => void;
  /** Off for now — an action disabled, a pager at its end. */
  enabled?: boolean;
}

const stack: { current: readonly Shortcut[] }[] = [];

function editable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return;
  const platform = readPlatform();
  for (let at = stack.length - 1; at >= 0; at--) {
    for (const one of stack[at]!.current) {
      if (one.enabled === false || !matchesKeys(event, one.keys, platform)) continue;
      if (!needsModifier(one.keys) && editable(event.target)) continue;
      event.preventDefault();
      one.run();
      return;
    }
  }
}

/** Binds these combinations while the calling piece is mounted — the last mounted wins. */
export function useShortcuts(shortcuts: readonly Shortcut[]): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });
  useEffect(() => {
    const entry = latest;
    stack.push(entry);
    if (stack.length === 1) window.addEventListener("keydown", onKeyDown);
    return () => {
      const at = stack.indexOf(entry);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}

/** How a combination is drawn and announced on this keyboard: the label for a tooltip or a
 *  menu, `aria-keyshortcuts` for the control. `undefined` until the platform is known. */
export function useKeysHint(
  keys: Keys | undefined,
): { label: string; aria: string } | undefined {
  const platform = useKeyboardPlatform();
  /* On the server the keyboard is unknown: no hint rather than a wrong one (Ctrl on a Mac). It
     appears after hydration, as the search entry's does. */
  return keys === undefined || platform === null
    ? undefined
    : { label: keysLabel(keys, platform), aria: keysAria(keys, platform) };
}
