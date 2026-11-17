import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  filterCriteria,
  groupCriteria,
  type GroupingControl,
  GroupingLevels,
  SearchBar,
  Tags,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: what is SET — an applied filter, a grouping level, a ticked cut — is a selection,
 * and wears the selection's navy; it is marked with `Checkbox`'s box, because those columns
 * are a multiple choice. It was the gold (the one primary action's colour) and a ring that
 * turned into a dot (a radio's mark).
 */

const LEVEL_ON: GroupingControl = {
  levels: [{ field: "state" }],
  add: () => {},
  remove: () => {},
  toggle: () => {},
  has: (field) => field === "state",
  move: () => {},
  clear: () => {},
};

const grouping = () =>
  renderToStaticMarkup(
    <GroupingLevels
      fields={[
        { field: "state", label: "estado" },
        { field: "salesperson", label: "vendedor" },
      ]}
      control={LEVEL_ON}
    />,
  );

test("a grouping field is ticked with the checkbox's box, and says so", () => {
  const html = grouping();
  /* Both rows draw the box; only the one set is filled. */
  assert.equal(html.match(/rounded-mark border/g)?.length, 2);
  assert.equal(html.match(/border-primary bg-primary/g)?.length, 1);
  assert.match(html, /aria-pressed="true"[^>]*>.*?estado/);
  assert.match(html, /aria-pressed="false"[^>]*>.*?vendedor/);
  /* No radio: no ring that turns into a dot. */
  assert.doesNotMatch(html, /size-1\.5 rounded-pill bg-primary/);
});

test("what is set is drawn in the selection's navy, never in the gold", () => {
  const level = grouping();
  assert.match(level, /border-primary\/30 bg-primary\/8/);

  const bar = renderToStaticMarkup(
    <SearchBar
      facets={[]}
      criteria={[
        filterCriteria({ field: "state", operator: "=", value: "posted" }, "publicadas"),
        groupCriteria({ field: "state" }, "estado"),
      ]}
      onCriteriaChange={() => {}}
      filters={[{ options: [{ id: "posted", label: "publicadas", checked: true }] }]}
    />,
  );
  assert.match(bar, /border-primary\/30 bg-primary\/8/);

  const tags = renderToStaticMarkup(
    <Tags items={[{ id: "a", label: "elegido", selected: true }]} />,
  );
  assert.match(tags, /border-primary\/30 bg-primary\/8/);

  for (const html of [level, bar, tags]) assert.doesNotMatch(html, /accent/);
});

/* The gold is the ONE primary action (PRINCIPLES §3, `tokens.css`: «never as the border that
   marks a state»). These are the places where a CONSUMER chooses the accent tone on purpose
   — a brand classification, a metric — and nothing else may draw a gold border. */
const ACCENT_BORDER_ALLOWED: Record<string, string> = {
  "src/primitives/tag/Tag.tsx":
    "the `accent` tone a consumer picks for a brand classification",
  "src/primitives/value/Metric.tsx": "the `accent` tone a consumer picks for a figure",
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") || path.endsWith(".ts") ? [path] : [];
  });
}

test("no state is marked with a gold border outside the tones a consumer chooses", () => {
  const offenders = sources("src")
    .filter((path) => !(path in ACCENT_BORDER_ALLOWED))
    .filter((path) => /border-accent/.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});
