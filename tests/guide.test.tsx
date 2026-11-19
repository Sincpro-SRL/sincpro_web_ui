import assert from "node:assert/strict";

import { Guide, GuideSpot, placeCard, selectorOf } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a guided tour (#40). Where the card goes is pure and held here, with the selectors
 * a step's target names. Walking the tour — the veil, the drawer, the keyboard — is the
 * stories' play (`3 · Componentes/Ayuda/Guía`).
 */

const VIEW = { width: 1280, height: 800 };
const CARD = { width: 336, height: 180 };
const AT = { gap: 12, margin: 16 };

test("the card goes on the preferred side, centred on the target", () => {
  const target = { top: 100, left: 400, width: 200, height: 40 };
  const place = placeCard({ target, card: CARD, view: VIEW, ...AT });
  assert.equal(place.side, "bottom");
  assert.equal(place.top, 100 + 40 + 12);
  assert.equal(place.left, 400 + 100 - 336 / 2);
});

test("without room on that side it flips to the opposite one", () => {
  const target = { top: 680, left: 400, width: 200, height: 40 };
  const place = placeCard({ target, card: CARD, view: VIEW, ...AT });
  assert.equal(place.side, "top");
  assert.equal(place.top, 680 - 12 - 180);
});

test("a target at the window's edge keeps its card inside the margins", () => {
  const target = { top: 100, left: 4, width: 40, height: 40 };
  const place = placeCard({ target, card: CARD, view: VIEW, ...AT });
  assert.equal(place.left, 16);
  const right = placeCard({
    target: { top: 100, left: 1240, width: 36, height: 40 },
    card: CARD,
    view: VIEW,
    ...AT,
  });
  assert.equal(right.left, 1280 - 16 - 336);
});

test("a side is asked for: a tall sidebar item gets its card to the right", () => {
  const target = { top: 300, left: 8, width: 224, height: 30 };
  const place = placeCard({ target, card: CARD, view: VIEW, prefer: "right", ...AT });
  assert.equal(place.side, "right");
  assert.equal(place.left, 8 + 224 + 12);
  assert.equal(place.top, 300 + 15 - 90);
});

test("no target: the card is centred — a welcome, a goodbye", () => {
  const place = placeCard({ target: null, card: CARD, view: VIEW, ...AT });
  assert.equal(place.side, "center");
  assert.equal(place.left, (1280 - 336) / 2);
  assert.equal(place.top, (800 - 180) / 2);
});

test("a target that fills the window: the card goes over it, at the bottom, in view", () => {
  const target = { top: 0, left: 0, width: 1280, height: 800 };
  const place = placeCard({ target, card: CARD, view: VIEW, ...AT });
  assert.equal(place.side, "over");
  assert.equal(place.top, 800 - 16 - 180);
});

test("on a phone the card wider than the room starts at the margin, never off the screen", () => {
  const phone = { width: 390, height: 844 };
  const place = placeCard({
    target: { top: 200, left: 20, width: 350, height: 30 },
    card: { width: 358, height: 200 },
    view: phone,
    ...AT,
  });
  assert.ok(place.left >= 16);
  assert.ok(place.left + 358 <= 390 - 16 + 1);
});

test("a target names the system's anchors — a part, one item of it, a spot", () => {
  assert.equal(selectorOf({ part: "sidebar.search" }), '[data-ui="sidebar.search"]');
  assert.equal(
    selectorOf({ part: "navigation.item", key: "socios.cuotas" }),
    '[data-ui="navigation.item"][data-key="socios.cuotas"]',
  );
  assert.equal(selectorOf({ spot: "cifras" }), '[data-guide="cifras"]');
  assert.equal(selectorOf({ selector: "#mio" }), "#mio");
  assert.equal(
    selectorOf(() => null),
    null,
  );
  /* A value with a quote cannot break out of the attribute. */
  assert.equal(selectorOf({ spot: 'a"b' }), '[data-guide="a\\"b"]');
});

test("a spot changes no layout: a box-less wrapper with the anchor's name", () => {
  const html = renderToStaticMarkup(
    <GuideSpot id="cifras">
      <p>412</p>
    </GuideSpot>,
  );
  assert.equal(html, '<span data-guide="cifras" class="contents"><p>412</p></span>');
});

test("closed, a tour draws nothing — and on the server it never opens", () => {
  const steps = [{ id: "a", title: "Hola", body: "Bienvenida" }];
  assert.equal(
    renderToStaticMarkup(<Guide steps={steps} open={false} onClose={() => {}} />),
    "",
  );
  /* It opens after it has looked at the screen, which a server has not. */
  assert.equal(renderToStaticMarkup(<Guide steps={steps} open onClose={() => {}} />), "");
});
