import assert from "node:assert/strict";
import { test } from "node:test";

import { narrowed } from "@sincpro/web-ui/views/list/useNarrowList";

test("narrow, a list with rows folds its table into them", () => {
  assert.deepEqual(narrowed(["rows", "table", "board"], "table", true), {
    offered: ["rows", "board"],
    present: "rows",
  });
});

/* It drew lines with no names: rows it had no `row` for. */
test("narrow, a list with only a table keeps its table", () => {
  assert.deepEqual(narrowed(["table"], "table", true), {
    offered: ["table"],
    present: "table",
  });
});

test("wide, nothing changes", () => {
  assert.deepEqual(narrowed(["rows", "table"], "table", false), {
    offered: ["rows", "table"],
    present: "table",
  });
});
