import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { test } from "vitest";

/**
 * Context: the calendar (FullCalendar), the gantt (SVAR), the JSON editor (CodeMirror) and the
 * rich-text editor (Tiptap) are each hundreds of KB, and most screens never show them. Each
 * lives in ONE module, and the rest of the package reaches that module with `lazy(import())`
 * — so an application's bundler splits it into a chunk fetched when it is drawn. One static
 * import from a list, a builder or a field, and every screen pays for it again.
 *
 * Allowed static importers: the family barrel (the public export, for whoever wants it eager)
 * and `import type` (erased at build).
 */

const SRC = join(import.meta.dirname, "..", "src");

const HEAVY = [
  "components/calendar/RecordCalendar",
  "components/gantt/RecordGantt",
  "components/search/JsonEditor",
  "primitives/field/RichTextEditor",
] as const;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("los módulos pesados sólo se cargan cuando se dibujan", () => {
  const offenders: string[] = [];
  for (const file of files(SRC)) {
    const name = relative(SRC, file);
    if (name.endsWith("index.ts")) continue;
    const source = readFileSync(file, "utf8");
    for (const heavy of HEAVY) {
      if (name.startsWith(heavy)) continue;
      const statics = new RegExp(
        `^import\\s+(?!type\\b)[^;]*?from\\s+"@sincpro/web-ui/${heavy}";`,
        "ms",
      );
      if (statics.test(source)) offenders.push(`${name} → ${heavy}`);
    }
  }
  assert.deepEqual(offenders, []);
});
