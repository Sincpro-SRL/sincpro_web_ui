/**
 * Where a tour's card goes, beside what it points at.
 *
 * Context: pure on purpose. The tour measures — the target's box, the card's size, the
 * window — and this decides, so the one part of a tour that is easy to get subtly wrong (a
 * card under the fold, a card covering what it explains, a card off the left edge on a
 * phone) is held by tests that need no browser.
 *
 *  1. No target: the card is centred — a welcome, a goodbye.
 *  2. The preferred side, then its opposite, then the other two: the first one where the
 *     whole card fits between the target and the window's margin wins.
 *  3. Along that side the card is centred on the target, and clamped inside the margins:
 *     a target at the window's edge keeps its card in view.
 *  Final: no side fits (the target is most of the window — a whole list): the card goes to
 *     the bottom of the window, over the target, where it covers the least of its top.
 */

export type GuideSide = "top" | "bottom" | "left" | "right";

export type Box = { top: number; left: number; width: number; height: number };

export type Size = { width: number; height: number };

export type CardPlacement = {
  top: number;
  left: number;
  /** Which side of the target it ended on; `center` without a target, `over` when no side had
   *  room. */
  side: GuideSide | "center" | "over";
};

const ORDER: Record<GuideSide, readonly GuideSide[]> = {
  bottom: ["bottom", "top", "right", "left"],
  top: ["top", "bottom", "right", "left"],
  right: ["right", "left", "bottom", "top"],
  left: ["left", "right", "bottom", "top"],
};

/** Between `min` and `max`; when the card is wider than the room, its start edge wins — the
 *  title is what must stay readable. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function fits(
  side: GuideSide,
  target: Box,
  card: Size,
  view: Size,
  gap: number,
  margin: number,
) {
  switch (side) {
    case "bottom":
      return target.top + target.height + gap + card.height <= view.height - margin;
    case "top":
      return target.top - gap - card.height >= margin;
    case "right":
      return target.left + target.width + gap + card.width <= view.width - margin;
    case "left":
      return target.left - gap - card.width >= margin;
  }
}

export function placeCard({
  target,
  card,
  view,
  prefer = "bottom",
  gap,
  margin,
}: {
  target: Box | null;
  card: Size;
  view: Size;
  prefer?: GuideSide;
  /** Between the target and the card. */
  gap: number;
  /** The card never comes closer than this to the window's edge. */
  margin: number;
}): CardPlacement {
  const across = (value: number) => clamp(value, margin, view.width - margin - card.width);
  const down = (value: number) => clamp(value, margin, view.height - margin - card.height);
  if (target === null) {
    return {
      top: down((view.height - card.height) / 2),
      left: across((view.width - card.width) / 2),
      side: "center",
    };
  }
  const middleX = target.left + target.width / 2 - card.width / 2;
  const middleY = target.top + target.height / 2 - card.height / 2;
  const side = ORDER[prefer].find((one) => fits(one, target, card, view, gap, margin));
  switch (side) {
    case "bottom":
      return { top: target.top + target.height + gap, left: across(middleX), side };
    case "top":
      return { top: target.top - gap - card.height, left: across(middleX), side };
    case "right":
      return { top: down(middleY), left: target.left + target.width + gap, side };
    case "left":
      return { top: down(middleY), left: target.left - gap - card.width, side };
    case undefined:
      return {
        top: down(view.height - margin - card.height),
        left: across(middleX),
        side: "over",
      };
  }
}
