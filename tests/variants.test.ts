import assert from "node:assert/strict";
import { test } from "node:test";

import { cn, tv } from "@sincpro/web-ui/foundations/variants";

/**
 * Context: each pair here is a size and a color (or a radius and a border) that an
 * unconfigured merger reads as the same property and drops one of. If one of these starts
 * failing, a component somewhere lost its text size or its color without any error.
 */

test("a text size and a text color both survive", () => {
  assert.equal(cn("text-meta text-ink"), "text-meta text-ink");
  assert.equal(cn("text-micro text-muted"), "text-micro text-muted");
});

test("two sizes still merge: the last one wins", () => {
  assert.equal(cn("text-meta", "text-body"), "text-body");
});

test("two colors still merge: the last one wins", () => {
  assert.equal(cn("text-ink", "text-danger"), "text-danger");
});

test("a radius token and a border color both survive", () => {
  assert.equal(cn("rounded-control border-line"), "rounded-control border-line");
  assert.equal(cn("rounded-control", "rounded-box"), "rounded-box");
});

test("a shadow token and a shadow color both survive", () => {
  assert.equal(cn("shadow-float shadow-ink/10"), "shadow-float shadow-ink/10");
});

test("a recipe merges its variant over its base with the same scales", () => {
  const recipe = tv({
    base: "text-meta text-ink",
    variants: { tone: { danger: "text-danger" } },
  });
  assert.equal(recipe({ tone: "danger" }), "text-meta text-danger");
});
