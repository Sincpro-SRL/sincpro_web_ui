import { afterEach, beforeEach } from "vitest";

/**
 * Context: a story that renders and logs an error is a broken story — React's key warnings, a
 * failed prop type, a hook misuse. The old smoke failed on them; so does this: every
 * `console.error` and `console.warn` during a story fails it, except what the page prints and
 * says nothing about the story.
 */
const NOISE = [/favicon/i, /Failed to load resource.*404/i, /Download the React DevTools/i];

let said: string[] = [];
const original = { error: console.error, warn: console.warn };

beforeEach(() => {
  said = [];
  for (const level of ["error", "warn"] as const) {
    console[level] = (...args: unknown[]) => {
      const text = args.map(String).join(" ");
      if (!NOISE.some((pattern) => pattern.test(text))) said.push(`${level}: ${text}`);
      original[level](...args);
    };
  }
});

afterEach(() => {
  console.error = original.error;
  console.warn = original.warn;
  if (said.length > 0)
    throw new Error(`the story logged:\n${said.join("\n").slice(0, 2000)}`);
});
