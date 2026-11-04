import assert from "node:assert/strict";

import {
  ChatComposer,
  type ChatMessage,
  dayLabel,
  groupByDay,
  startsRun,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the thread is read in time order, cut into days, and a day has a name. These
 * rules are pure, so they are checked here without a browser; the thread's scrolling and the
 * composer's Enter are behaviour, and they are the stories' `play`.
 */

const msg = (id: string, author: string, at: Date, mine = false): ChatMessage => ({
  id,
  author,
  body: id,
  at,
  mine,
});

test("messages come out in time order even when they arrive out of order, cut by day", () => {
  const groups = groupByDay([
    msg("c", "Ana", new Date(2026, 10, 4, 9, 0)),
    msg("a", "Ana", new Date(2026, 10, 3, 18, 0)),
    msg("b", "Andrés", new Date(2026, 10, 3, 8, 0), true),
  ]);
  assert.deepEqual(
    groups.map((g) => g.messages.map((m) => m.id)),
    [["b", "a"], ["c"]],
  );
  assert.equal(groups[0]?.key, "2026-11-03");
});

test("a day is named Hoy and Ayer, and older days are written out", () => {
  const now = new Date(2026, 10, 4, 15, 0);
  const words = { today: "Hoy", yesterday: "Ayer" };
  assert.equal(dayLabel(new Date(2026, 10, 4, 1, 0), now, words, "es"), "Hoy");
  assert.equal(dayLabel(new Date(2026, 10, 3, 23, 0), now, words, "es"), "Ayer");
  assert.match(dayLabel(new Date(2026, 9, 20), now, words, "es"), /20/);
});

test("a message draws its author's name only where a run of one author starts", () => {
  const run = [
    msg("1", "Ana", new Date(2026, 10, 4, 9)),
    msg("2", "Ana", new Date(2026, 10, 4, 9, 1)),
    msg("3", "Andrés", new Date(2026, 10, 4, 9, 2), true),
    msg("4", "Ana", new Date(2026, 10, 4, 9, 3)),
  ];
  assert.deepEqual(
    run.map((_, i) => startsRun(run, i)),
    [true, false, true, true],
  );
});

test("the composer draws the send button disabled while the text is empty", () => {
  const html = renderToStaticMarkup(<ChatComposer onSend={() => undefined} />);
  /* The default copy is English; the application installs Spanish with installCopy. */
  assert.match(html, />Send</);
  assert.match(html, /aria-label="Message"/);
  assert.match(html, /disabled/);
});
