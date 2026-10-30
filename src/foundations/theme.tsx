"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/* ==================================================================== *
 *  THEME — which palette the tokens resolve to.
 *
 *  The palettes live in `tokens.css`: the same `--color-*` names, redefined under
 *  `data-theme="dark"` (and under `prefers-color-scheme: dark` when nothing forces
 *  light). Components never read the theme — they use `bg-surface` and `text-ink`
 *  and the cascade does the rest. This file is only the way an APP chooses:
 *
 *      "system"  follow the operating system (no attribute is written)
 *      "light"   force light  → data-theme="light"
 *      "dark"    force dark   → data-theme="dark"
 *
 *  ── Why the attribute and not a class or a context-only value ──────
 *
 *  Because a stylesheet can see it: `[data-theme="dark"]` re-points the tokens for
 *  EVERYTHING below that element, including a portal (a menu, a dialog) that React
 *  mounts under `document.body` and a context would not reach. So the provider's
 *  job is to write one attribute, by default on `<html>` where the portals are
 *  also underneath. Nothing is persisted here: where a choice is remembered
 *  (localStorage, the user's profile) is the application's decision.
 * ==================================================================== */

export type Theme = "system" | "light" | "dark";
/** What the palette actually is once `system` has been looked up. */
export type ResolvedTheme = "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"];
/** The attribute the stylesheet reads. */
export const THEME_ATTRIBUTE = "data-theme";

/** `system` is the operating system's answer; the other two are themselves. Pure, so it can
 *  be tested without a browser. */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}

/** True for a string that is one of the three values — what comes out of storage or a URL
 *  is `string | null`, and this is the way back to `Theme`. */
export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/** Writes the choice on an element. `system` REMOVES the attribute: the stylesheet then
 *  follows `prefers-color-scheme` by itself, and an attribute saying "system" would be a
 *  value no selector reads. Returns nothing; the DOM is the output. */
export function applyTheme(theme: Theme, element: Element = document.documentElement): void {
  if (theme === "system") element.removeAttribute(THEME_ATTRIBUTE);
  else element.setAttribute(THEME_ATTRIBUTE, theme);
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The operating system's preference, live. Server snapshot: light — the same as the
 *  stylesheet's default when it cannot ask. */
function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(DARK_QUERY);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
}

/** What `<html>` says right now — read for code that has no provider above it (an editor
 *  that has to pick a built-in theme) and must still follow a switch made elsewhere. */
function useRootAttribute(): string | null {
  return useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [THEME_ATTRIBUTE],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.getAttribute(THEME_ATTRIBUTE),
    () => null,
  );
}

type ThemeValue = {
  /** What the app chose. */
  theme: Theme;
  /** What the palette is — `system` already looked up. */
  resolved: ResolvedTheme;
  setTheme: (next: Theme) => void;
};

const Ctx = createContext<ThemeValue | null>(null);

export type ThemeProviderProps = {
  /** Controlled: the app owns the value (and persists it). */
  value?: Theme;
  /** Uncontrolled: the starting choice. */
  defaultValue?: Theme;
  /** Called with every choice, controlled or not — the place to persist it. */
  onChange?: (next: Theme) => void;
  /** Where `data-theme` is written. `<html>` by default; pass an element to theme a subtree
   *  (a preview, a story). A portal mounted outside it keeps the document's theme. */
  element?: Element | null;
  children?: ReactNode;
};

export function ThemeProvider({
  value,
  defaultValue = "system",
  onChange,
  element,
  children,
}: ThemeProviderProps) {
  const [own, setOwn] = useState<Theme>(defaultValue);
  const theme = value ?? own;
  const systemDark = useSystemPrefersDark();

  const setTheme = useCallback(
    (next: Theme) => {
      setOwn(next);
      onChange?.(next);
    },
    [onChange],
  );

  /* An effect and not a render-time write: the DOM is outside React's tree, and writing it
     during render would run on the server and twice in StrictMode. */
  useEffect(() => {
    const target = element === undefined ? document.documentElement : element;
    if (target === null) return;
    applyTheme(theme, target);
    return () => target.removeAttribute(THEME_ATTRIBUTE);
  }, [theme, element]);

  const context = useMemo<ThemeValue>(
    () => ({ theme, resolved: resolveTheme(theme, systemDark), setTheme }),
    [theme, systemDark, setTheme],
  );

  return <Ctx.Provider value={context}>{children}</Ctx.Provider>;
}

/** The choice, the palette it resolves to, and the way to change it. Without a provider it
 *  still reads (what `<html>` and the OS say) and `setTheme` writes `<html>` directly, so a
 *  one-off call site works without wrapping the app. */
export function useTheme(): ThemeValue {
  const provided = useContext(Ctx);
  const attribute = useRootAttribute();
  const systemDark = useSystemPrefersDark();
  return useMemo<ThemeValue>(() => {
    if (provided !== null) return provided;
    const theme: Theme = isTheme(attribute) ? attribute : "system";
    return {
      theme,
      resolved: resolveTheme(theme, systemDark),
      setTheme: (next) => applyTheme(next),
    };
  }, [provided, attribute, systemDark]);
}
