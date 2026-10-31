import assert from "node:assert/strict";

import { matchedWord, matches, matchSpans } from "@sincpro/web-ui/foundations/match";
import { flatten } from "@sincpro/web-ui/foundations/slots";
import { createElement, Fragment, isValidElement } from "react";
import { test } from "vitest";

test("the match ignores accents and case, and is cut on the original text", () => {
  assert.deepEqual(matchSpans("Ferretería El Progreso", "TERIA", "es"), [
    { text: "Ferre", hit: false },
    { text: "tería", hit: true },
    { text: " El Progreso", hit: false },
  ]);
});

test("every occurrence is marked, and an empty query marks nothing", () => {
  assert.equal(matchSpans("Cemento cemento", "cem", "es").filter((s) => s.hit).length, 2);
  assert.deepEqual(matchSpans("Cemento", "  ", "es"), [{ text: "Cemento", hit: false }]);
  assert.equal(matches("Clínica", "clin", "es"), true);
  assert.equal(matches("Clínica", "xyz", "es"), false);
});

test("the hidden word that matched is the one said", () => {
  assert.equal(matchedWord("CEM-IP30 7771234000017", "7771", "es"), "7771234000017");
  assert.equal(matchedWord("CEM-IP30", "zzz", "es"), null);
});

test("children written in a fragment keep distinct keys among their siblings", () => {
  const nodes = flatten([
    createElement("a", { key: "x" }),
    createElement(Fragment, { key: "f" }, createElement("b"), createElement("c")),
  ]);
  const keys = nodes.map((node) => (isValidElement(node) ? node.key : null));
  assert.equal(new Set(keys).size, 3);
});
