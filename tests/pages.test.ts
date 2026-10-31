import assert from "node:assert/strict";

import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@sincpro/web-ui/components/listing/pages";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { formatDateTime } from "@sincpro/web-ui/primitives/value/Fecha";
import { test } from "vitest";

test("exact date is numeric; locale chooses day/month order", () => {
  installCopy({ locale: "en-US" });
  const english = formatDateTime(new Date(2026, 8, 14, 15, 13));
  assert.match(english, /09\/14\/2026/);
  assert.match(english, /15:13/);
  assert.doesNotMatch(english, /sept/i);

  installCopy({ locale: "es-ES" });
  const spanish = formatDateTime(new Date(2026, 8, 14, 15, 13));
  assert.match(spanish, /14\/09\/2026/);
  assert.match(spanish, /15:13/);
  installCopy();
});

test("default page size is 80, with presets 25 / 80 / 100", () => {
  assert.equal(DEFAULT_PAGE_SIZE, 80);
  assert.deepEqual([...PAGE_SIZES], [25, 80, 100]);
});
