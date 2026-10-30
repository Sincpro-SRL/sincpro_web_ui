import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Context: a template is a whole screen built ONLY from the public API — the proof that the
 * system is enough to build the product. The moment a template needs a `className` to look
 * right, that class is a component the system is missing: a page background, a card, a
 * spacing between two blocks. Writing it in the template hides the gap, and the next screen
 * of the product writes it again, slightly different.
 *
 * So a template carries no styling at all. When this fails, add the missing piece to the
 * package — and keep the template as composition.
 */

const TEMPLATES = join(import.meta.dirname, "..", "stories", "templates");

test("templates compose the public API without styling of their own", () => {
  const styled = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".tsx"))
    .flatMap((name) =>
      readFileSync(join(TEMPLATES, name), "utf8")
        .split("\n")
        .map((line, i) => ({ where: `${name}:${i + 1}`, line }))
        .filter(({ line }) => /\b(className|style)=/.test(line))
        .map(({ where, line }) => `${where}  ${line.trim()}`),
    );
  assert.deepEqual(styled, [], "move these into a component of the package");
});

test("templates import only from the package, never from its internals", () => {
  const deep = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".tsx"))
    .flatMap((name) =>
      readFileSync(join(TEMPLATES, name), "utf8")
        .split("\n")
        .filter((line) => /from "@sincpro\/web-ui\//.test(line))
        .map((line) => `${name}  ${line.trim()}`),
    );
  assert.deepEqual(deep, [], "a template uses what a consumer can import: @sincpro/web-ui");
});
