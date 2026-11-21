import assert from "node:assert/strict";

import {
  Elapsed,
  elapsedMillis,
  elapsedTone,
  formatElapsed,
  RecordCard,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a kitchen reads AGE, not arrival. The time is written like a stopwatch and takes a
 * tone by the domain's two thresholds (minutes); the colour never goes alone. On the server
 * there is no «now» both sides agree on, so it draws nothing until the first tick.
 */

const MIN = 60_000;

test("a wait reads like a stopwatch", () => {
  assert.equal(formatElapsed(0), "0:00");
  assert.equal(formatElapsed(4 * MIN + 5_000), "4:05");
  assert.equal(formatElapsed(62 * MIN + 3_000), "1:02:03");
});

test("never negative: a clock a little behind the server's writes «0:00»", () => {
  assert.equal(elapsedMillis(new Date(10_000), 5_000), 0);
  assert.equal(elapsedMillis("1970-01-01T00:00:01.000Z", 61_000), 60_000);
});

test("the tone comes from the two thresholds, and without them there is none", () => {
  const limits = { warnAfter: 10, badAfter: 20 };
  assert.equal(elapsedTone(5 * MIN, limits), "good");
  assert.equal(elapsedTone(10 * MIN, limits), "warn");
  assert.equal(elapsedTone(25 * MIN, limits), "bad");
  assert.equal(elapsedTone(25 * MIN, {}), undefined);
});

test("with a fixed «now» it writes the time, in its tone, named for a screen reader", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <Elapsed since={0} now={25 * MIN} warnAfter={10} badAfter={20} />
    </UiCopyProvider>,
  );
  assert.match(html, /data-tone="bad"/);
  assert.match(html, /text-bad/);
  assert.match(html, /<span class="sr-only">Esperando<\/span>25:00/);
});

test("on the server the live time draws nothing — it appears on the first tick", () => {
  const html = renderToStaticMarkup(<Elapsed since={0} warnAfter={10} />);
  assert.equal(html, "");
  /* A card that waits is still a card: only its timer and its stripe wait for the browser. */
  const card = renderToStaticMarkup(
    <RecordCard title="Mesa 4" elapsed={{ since: 0, warnAfter: 10, badAfter: 20 }} />,
  );
  assert.match(card, /Mesa 4/);
  assert.doesNotMatch(card, /record-card.stripe/);
});
