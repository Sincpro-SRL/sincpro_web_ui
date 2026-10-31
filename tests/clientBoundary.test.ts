import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { test } from "vitest";

/**
 * Context: in a React Server Components app (Next.js App Router) a module that runs a hook,
 * creates a context, attaches an event handler or touches `document`/`window` must start
 * with `"use client"` — without it the app fails at the first render, in the consumer's
 * code, far from the cause.
 *
 * The reverse is kept too: pure logic (calendar, pivot, criteria) stays free of the
 * directive, so a server component can call it.
 */

const SRC = join(import.meta.dirname, "..", "src");

/* `use…<T>(` counts: a hook called with a type argument is still a hook — the first
   version of this pattern missed `useStickyLayer<HTMLDivElement>()`. */
const CLIENT_ONLY =
  /\buse[A-Z]\w*\s*[<(]|\bcreateContext\b|\bon[A-Z][a-zA-Z]+=\{|\bdocument\.|\bwindow\./;

function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return modules(path);
    return /\.tsx?$/.test(entry.name) && entry.name !== "index.ts" ? [path] : [];
  });
}

test('every module that needs the client starts with "use client"', () => {
  const missing = modules(SRC).filter((file) => {
    const source = readFileSync(file, "utf8");
    return CLIENT_ONLY.test(source) && !source.startsWith('"use client";');
  });
  assert.deepEqual(missing, [], 'add `"use client";` as the first line of these modules');
});
