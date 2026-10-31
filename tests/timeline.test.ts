import assert from "node:assert/strict";

import {
  hoursMinutes,
  lanesOf,
  rangeOf,
  shiftDate,
  snap,
  unitSpan,
} from "@sincpro/web-ui/components/timeline/time";
import { test } from "vitest";

/** Context: the arithmetic of a timeline — periods, columns, snapping and stacking. */

const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m);

test("a day has 24 hour columns, a week 7 days from Monday, a month its days, a year 12", () => {
  assert.equal(rangeOf("day", at(29, 15), "es-BO").units.length, 24);
  const week = rangeOf("week", at(29), "es-BO");
  assert.equal(week.units.length, 7);
  assert.equal(week.start.getDay(), 1, "the week starts on Monday");
  assert.equal(rangeOf("month", at(29), "es-BO").units.length, 31);
  assert.equal(rangeOf("year", at(29), "es-BO").units.length, 12);
});

test("the arrows move one period", () => {
  assert.equal(shiftDate("week", at(29), 1).getDate(), 5);
  assert.equal(shiftDate("month", at(29), -1).getMonth(), 8);
});

test("a click on an empty column creates that column", () => {
  const { start, end } = unitSpan("day", at(29, 9, 40));
  assert.equal(start.getHours(), 9);
  assert.equal(+end - +start, 3_600_000);
});

test("bars that overlap go to the next lane; the ones that do not reuse it", () => {
  const items = [
    { s: at(29, 9), e: at(29, 13) },
    { s: at(29, 12), e: at(29, 14) },
    { s: at(29, 14), e: at(29, 18) },
  ];
  const { lane, count } = lanesOf(
    items,
    (i) => i.s,
    (i) => i.e,
  );
  assert.equal(count, 2);
  assert.deepEqual(
    items.map((i) => lane.get(i)),
    [0, 1, 0],
  );
});

test("snap and durations", () => {
  assert.equal(snap(20 * 60_000, 15 * 60_000), 15 * 60_000);
  assert.equal(hoursMinutes((3 * 60 + 48) * 60_000), "03:48");
});
