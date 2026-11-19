/* ==================================================================== *
 *  A KEY COMBINATION — written once, pressed on any keyboard, read the way that keyboard says it.
 *
 *  Context: an ERP is worked from the keyboard — next record, duplicate, save — and a shortcut
 *  written as a hint in a menu that nothing binds is a promise the screen does not keep. The
 *  combination is written ONE way and this module reads it three:
 *
 *      "Alt+D"         what is written: modifiers, then the key, joined with «+»
 *      matchesKeys     whether a keydown IS it — by the key's PLACE for a letter or a digit
 *                      (`KeyD`), so Alt+D on a Mac, where it types «∂», still matches
 *      keysLabel       how it is drawn: «⌥D» on a Mac, «Alt+D» elsewhere
 *      keysAria        what `aria-keyshortcuts` says: «Alt+D»
 *
 *  `Mod` is the platform's command key — ⌘ on a Mac, Ctrl elsewhere —: «Mod+S» saves on both.
 *  Pure: what is bound and when lives in `useShortcuts`.
 * ==================================================================== */

/** The keyboard the page is used with — what a combination is drawn and matched for. */
export type KeyboardPlatform = "apple" | "other";

/** A combination as written: «Alt+D», «Mod+S», «Alt+Shift+P», «Escape». */
export type Keys = string;

export interface ParsedKeys {
  alt: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  /** The platform's command key: ⌘ on a Mac, Ctrl elsewhere. */
  mod: boolean;
  /** The key itself, as written: «D», «S», «ArrowLeft», «Escape». */
  key: string;
}

/** What a keydown carries that a combination is compared to. */
export interface KeyPress {
  key: string;
  code: string;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function parseKeys(keys: Keys): ParsedKeys {
  const parts = keys.split("+").map((one) => one.trim());
  const key = parts.pop() ?? "";
  const has = (name: string) => parts.some((one) => one.toLowerCase() === name);
  return {
    alt: has("alt") || has("option"),
    shift: has("shift"),
    ctrl: has("ctrl") || has("control"),
    meta: has("meta") || has("cmd"),
    mod: has("mod"),
    key,
  };
}

/** Whether the press IS the combination — every modifier exactly, the key by its place when it
 *  is a letter or a digit (layouts and Alt change what it types, not where it is). */
export function matchesKeys(
  press: KeyPress,
  keys: Keys,
  platform: KeyboardPlatform,
): boolean {
  const want = parseKeys(keys);
  const ctrl = want.ctrl || (want.mod && platform === "other");
  const meta = want.meta || (want.mod && platform === "apple");
  if (
    press.altKey !== want.alt ||
    press.shiftKey !== want.shift ||
    press.ctrlKey !== ctrl ||
    press.metaKey !== meta
  )
    return false;
  if (/^[a-z]$/i.test(want.key)) return press.code === `Key${want.key.toUpperCase()}`;
  if (/^\d$/.test(want.key)) return press.code === `Digit${want.key}`;
  return press.key.toLowerCase() === want.key.toLowerCase();
}

/** Whether the combination needs a modifier — then it works while a field is being typed in;
 *  a bare key does not, or typing «d» would duplicate the record. */
export function needsModifier(keys: Keys): boolean {
  const want = parseKeys(keys);
  return want.alt || want.ctrl || want.meta || want.mod;
}

const APPLE: Record<string, string> = {
  alt: "⌥",
  shift: "⇧",
  ctrl: "⌃",
  meta: "⌘",
  mod: "⌘",
};
const OTHER: Record<string, string> = {
  alt: "Alt",
  shift: "Shift",
  ctrl: "Ctrl",
  meta: "Meta",
  mod: "Ctrl",
};
const KEY_WORDS: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Escape: "Esc",
  Enter: "↵",
};

/** How the combination is drawn on this keyboard: «⌥D» on a Mac, «Alt+D» elsewhere. */
export function keysLabel(keys: Keys, platform: KeyboardPlatform | null): string {
  if (platform === null) return keys;
  const want = parseKeys(keys);
  const key = KEY_WORDS[want.key] ?? want.key.toUpperCase();
  const names = platform === "apple" ? APPLE : OTHER;
  const mods = (["mod", "ctrl", "alt", "shift", "meta"] as const)
    .filter((one) => want[one] && !(one === "meta" && want.mod))
    .map((one) => names[one]!);
  return platform === "apple" ? [...mods, key].join("") : [...mods, key].join("+");
}

/** What `aria-keyshortcuts` says on this keyboard: «Alt+D», «Meta+S». */
export function keysAria(keys: Keys, platform: KeyboardPlatform | null): string {
  const want = parseKeys(keys);
  const mod = platform === "apple" ? "Meta" : "Control";
  return [
    ...(want.mod ? [mod] : []),
    ...(want.ctrl ? ["Control"] : []),
    ...(want.meta && !want.mod ? ["Meta"] : []),
    ...(want.alt ? ["Alt"] : []),
    ...(want.shift ? ["Shift"] : []),
    want.key.length === 1 ? want.key.toUpperCase() : want.key,
  ].join("+");
}
