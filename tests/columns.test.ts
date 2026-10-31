import assert from "node:assert/strict";

import {
  type ColumnSpec,
  defaultVisibleIds,
  reconcileVisible,
  toggleColumn,
} from "@sincpro/web-ui/components/listing/columns";
import { toggleCollapsed } from "@sincpro/web-ui/components/listing/tree";
import { test } from "vitest";

const COLUMNS: ColumnSpec[] = [
  { id: "name", label: "name" },
  { id: "origin", label: "origin", optional: true },
  { id: "rows", label: "rows", optional: true },
  { id: "size", label: "size", optional: true, defaultHidden: true },
];

test("required columns start visible; optional-hidden do not", () => {
  assert.deepEqual(defaultVisibleIds(COLUMNS), ["name", "origin", "rows"]);
});

test("a required column cannot leave the view", () => {
  const next = toggleColumn(COLUMNS, ["name", "origin"], "name");
  assert.ok(next.includes("name"));
});

test("an optional column can hide and come back", () => {
  const hidden = toggleColumn(COLUMNS, ["name", "origin", "rows"], "origin");
  assert.deepEqual(hidden, ["name", "rows"]);
  const shown = toggleColumn(COLUMNS, hidden, "origin");
  assert.deepEqual(shown, ["name", "origin", "rows"]);
});

test("hiding every optional column still leaves the required one", () => {
  let visible = defaultVisibleIds(COLUMNS);
  visible = toggleColumn(COLUMNS, visible, "origin");
  visible = toggleColumn(COLUMNS, visible, "rows");
  assert.deepEqual(visible, ["name"]);
});

test("all-optional frames keep at least one column", () => {
  const payload: ColumnSpec[] = [
    { id: "a", label: "a", optional: true },
    { id: "b", label: "b", optional: true },
  ];
  const next = toggleColumn(payload, ["a"], "a");
  assert.deepEqual(next, ["a"]);
});

test("unknown ids drop out; new required ids come in", () => {
  assert.deepEqual(reconcileVisible(COLUMNS, ["gone", "origin"]), ["name", "origin"]);
});

test("collapsing a branch is a toggle of its key", () => {
  assert.deepEqual(toggleCollapsed([], "uploaded"), ["uploaded"]);
  assert.deepEqual(toggleCollapsed(["uploaded"], "uploaded"), []);
});
