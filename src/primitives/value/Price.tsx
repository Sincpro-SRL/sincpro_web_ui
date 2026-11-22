"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { formatWith } from "@sincpro/web-ui/primitives/value/format";
import { discountPercent, formatPrice } from "@sincpro/web-ui/primitives/value/priceFormat";

const SIZE = {
  /* A line of a cart, a row of a price list. */
  sm: "text-body",
  /* A product's card — the size of a card's figure. */
  md: "text-lead",
  /* A product's page, a plan's card: the price IS the figure of the screen. */
  lg: "text-display",
} as const;

export type PriceProps = {
  value: number;
  /** ISO 4217 — `BOB`, `USD`. Without it the number goes with two decimals and no symbol. */
  currency?: string;
  /** The price before: drawn struck through, beside the discount it makes. Not drawn when
   *  it is not higher — a «before» that is not more is not a discount. */
  compareAt?: number;
  /** What the price is for — «mes», «kg», «persona» — written after it: «Bs 120,00 / mes». */
  per?: string;
  size?: keyof typeof SIZE;
  /** Any `Intl.NumberFormatOptions` over the currency's (no decimals for a whole price). */
  format?: Intl.NumberFormatOptions;
};

/**
 * A price as a shelf says it: the one to pay big, the one before struck through, and how much
 * less in a tag — a product's card, a cart's line, a plan.
 *
 * Context: «Bs 80,00» beside «Bs 100,00» is a riddle until one is struck — and a struck
 * number alone says nothing to a screen reader, so each is named («Antes», «Ahora»). The
 * discount is computed, not written by hand: a «−25 %» typed beside 80 for 100 is how a shop
 * ends up promising what it does not give (`discountPercent`, rounded down). In `good`: it is
 * news in the person's favour, and the gold is kept for the action of buying it. Zero is
 * «Gratis», not «Bs 0,00».
 */
export function Price({ value, currency, compareAt, per, size = "md", format }: PriceProps) {
  const copy = useUiCopy();
  const write = (n: number) => formatPrice(n, { currency, format }, copy.locale);
  const off = discountPercent(value, compareAt);
  const before = off === undefined ? undefined : compareAt;
  return (
    <span
      data-ui="price"
      data-size={size}
      className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"
    >
      <span className={`font-semibold whitespace-nowrap text-ink tabular-nums ${SIZE[size]}`}>
        {before === undefined ? null : <span className="sr-only">{copy.price.now} </span>}
        {value === 0 ? copy.price.free : write(value)}
        {per === undefined ? null : (
          <span className="text-meta font-normal text-muted">
            <span aria-hidden> / </span>
            <span className="sr-only"> {copy.price.per} </span>
            {per}
          </span>
        )}
      </span>
      {before === undefined || off === undefined ? null : (
        <>
          <del
            className="text-meta whitespace-nowrap text-muted tabular-nums"
            data-ui="price.before"
          >
            <span className="sr-only">{copy.price.before} </span>
            {write(before)}
          </del>
          <Tag tone="good" title={fillCopy(copy.price.off, { percent: String(off) })}>
            {formatWith(-off / 100, { style: "percent", signDisplay: "always" }, copy.locale)}
          </Tag>
        </>
      )}
    </span>
  );
}
