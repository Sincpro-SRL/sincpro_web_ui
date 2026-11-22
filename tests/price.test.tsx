import assert from "node:assert/strict";

import {
  discountPercent,
  formatPrice,
  Price,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a price is a promise. The discount is computed and rounded DOWN, so the tag never
 * says more than the shelf gives; a «before» that is not higher is not a discount; and each
 * figure is named, because a struck number says nothing to a screen reader.
 */

/* `Intl` joins the symbol and the figure with a no-break space, so they never part. */
const plain = (text: string) => text.replace(/\u00a0/g, " ");
const es = (node: ReactElement) =>
  plain(renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>));

test("the discount is rounded down — 80 for 99 is 19 %, not 20 %", () => {
  assert.equal(discountPercent(80, 100), 20);
  assert.equal(discountPercent(80, 99), 19);
  assert.equal(discountPercent(99.5, 100), undefined, "less than a whole percent is no tag");
});

test("a «before» equal, lower or missing is not a discount", () => {
  assert.equal(discountPercent(100, 100), undefined);
  assert.equal(discountPercent(120, 100), undefined);
  assert.equal(discountPercent(80, undefined), undefined);
  assert.equal(discountPercent(80, 0), undefined);
});

test("written in the locale, with its currency or with two decimals", () => {
  assert.equal(plain(formatPrice(80, { currency: "BOB" }, "es-BO")), "Bs 80,00");
  assert.equal(plain(formatPrice(1299.5, {}, "es-BO")), "1.299,50");
  assert.equal(
    plain(
      formatPrice(
        1299,
        { currency: "BOB", format: { maximumFractionDigits: 0, minimumFractionDigits: 0 } },
        "es-BO",
      ),
    ),
    "Bs 1.299",
  );
});

test("with a price before: struck, both named, and the tag computed", () => {
  const html = es(<Price value={80} compareAt={100} currency="BOB" />);
  assert.match(html, /<span class="sr-only">Ahora <\/span>Bs 80,00/);
  assert.match(html, /<del[^>]*><span class="sr-only">Antes <\/span>Bs 100,00<\/del>/);
  assert.match(html, /data-tone="good"[^>]*>-20%/);
});

test("a «before» that is not higher draws nothing beside the price", () => {
  const html = es(<Price value={120} compareAt={100} currency="BOB" />);
  assert.doesNotMatch(html, /<del/);
  assert.doesNotMatch(html, /Ahora/);
});

test("zero is «Gratis», and the unit is said, not only slashed", () => {
  assert.match(es(<Price value={0} currency="BOB" />), />Gratis</);
  const html = es(<Price value={120} currency="BOB" per="mes" />);
  assert.match(
    html,
    /<span aria-hidden="true"> \/ <\/span><span class="sr-only"> por <\/span>mes/,
  );
});
