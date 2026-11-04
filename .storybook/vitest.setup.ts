import { afterEach, beforeEach } from "vitest";

/**
 * Context: a story that renders and logs an error is a broken story — React's key warnings, a
 * failed prop type, a hook misuse. The old smoke failed on them; so does this: every
 * `console.error` and `console.warn` during a story fails it, except what the page prints and
 * says nothing about the story.
 */
const NOISE = [
  /favicon/i,
  /Failed to load resource.*404/i,
  /Download the React DevTools/i,
  /*
   * About the HARNESS, not the story. testing-library turns React's act environment off while
   * it waits (`findBy…`, `waitFor`, user-event); a suspended view that resolves inside that
   * window — the composer's `ViewHost` loads every view through `lazy()` — makes React warn
   * from `pingSuspendedRoot` that an act is in progress with the flag off. The view resolving
   * is correct behaviour; when it lands in the window is timing. On the CI runner it landed
   * there every time («CRM · Oportunidad», run 41908089097) and failed `main`.
   */
  /The current testing environment is not configured to support act/,
];

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
