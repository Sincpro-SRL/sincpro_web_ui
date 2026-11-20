/**
 * THE THEME'S NAMES — the three choices, the attribute the stylesheet reads, how `system`
 * resolves. Pure, and without `"use client"`: a server layout reads the person's choice (a
 * cookie) and writes `<html data-theme>` itself with `THEME_ATTRIBUTE` and `isTheme`, so the
 * first paint is already the right palette. Writing it from the browser — `applyTheme`,
 * `ThemeProvider` — is `theme.tsx`.
 */

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
