import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { test } from "vitest";

/**
 * Context: the two rules of docs/ARCHITECTURE.md that `make doctor` does not see. Levels are
 * checked there; these are finer: the TIERS inside the primitives (what shows does not depend
 * on what asks, what asks does not depend on what shows many) and NO CYCLES between modules,
 * type imports included — a type cycle is a dependency pointing the wrong way, the model
 * asking the interface for its shapes.
 */

const SRC = join(import.meta.dirname, "..", "src");

type Tier = "display" | "input" | "collection";
const RANK: Readonly<Record<Tier, number>> = { display: 0, input: 1, collection: 2 };

/** Every primitive family, in its tier. A new family has to be placed here — on purpose. */
const TIER_OF: Readonly<Record<string, Tier>> = {
  block: "display",
  button: "display",
  cell: "display",
  dialog: "display",
  disclosure: "display",
  hint: "display",
  menu: "display",
  notice: "display",
  overlay: "display",
  surface: "display",
  tabs: "display",
  tag: "display",
  toolbar: "display",
  value: "display",
  field: "input",
  choice: "input",
  date: "input",
  picker: "input",
  chart: "collection",
  table: "collection",
  tree: "collection",
};

/** Module id (`primitives/tag/Tag`) → the module ids it imports. Barrels are left out: they
 *  only re-export, and through them every family would reach every other one. */
function graph(): Map<string, string[]> {
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return files(path);
      return /\.tsx?$/.test(entry.name) && entry.name !== "index.ts" ? [path] : [];
    });
  const map = new Map<string, string[]>();
  for (const file of files(SRC)) {
    const id = relative(SRC, file).replace(/\.tsx?$/, "");
    const source = readFileSync(file, "utf8");
    const imports = [...source.matchAll(/from "@sincpro\/web-ui\/([^"]+)"/g)]
      .map((match) => match[1]!)
      .filter((target) => !target.endsWith("/index"));
    map.set(id, imports);
  }
  return map;
}

test("every primitive family has a tier", () => {
  const families = readdirSync(join(SRC, "primitives"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.deepEqual(
    families.filter((family) => TIER_OF[family] === undefined),
    [],
    "place the new family in TIER_OF (tests/architecture.test.ts) and docs/ARCHITECTURE.md §2",
  );
});

test("a primitive imports only from its tier or the ones below", () => {
  const familyOf = (id: string) =>
    id.startsWith("primitives/") ? id.split("/")[1] : undefined;
  const climbing: string[] = [];
  for (const [id, imports] of graph()) {
    const from = familyOf(id);
    if (from === undefined) continue;
    for (const target of imports) {
      const to = familyOf(target);
      if (to === undefined) continue;
      if (RANK[TIER_OF[to]!] > RANK[TIER_OF[from]!]) {
        climbing.push(`${id} [${TIER_OF[from]}] → ${target} [${TIER_OF[to]}]`);
      }
    }
  }
  assert.deepEqual(climbing, [], "a tier imports only from itself and the ones below it");
});

test("no module imports itself back, not even through types", () => {
  const modules = graph();
  const state = new Map<string, "open" | "done">();
  const path: string[] = [];
  const cycles: string[] = [];
  const visit = (id: string) => {
    state.set(id, "open");
    path.push(id);
    for (const next of modules.get(id) ?? []) {
      if (!modules.has(next)) continue;
      if (state.get(next) === "open") {
        cycles.push([...path.slice(path.indexOf(next)), next].join(" → "));
      } else if (state.get(next) === undefined) {
        visit(next);
      }
    }
    path.pop();
    state.set(id, "done");
  };
  for (const id of modules.keys()) if (state.get(id) === undefined) visit(id);
  assert.deepEqual(cycles, [], "break the cycle: the shared shape goes to the lower module");
});
