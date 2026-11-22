import { currentCopyLocale } from "@sincpro/web-ui/foundations/uiCopy";
import { formatWith } from "@sincpro/web-ui/primitives/value/format";

/** How much less the price is than the one before, as a whole percentage — `undefined` when
 *  it is not less (a «before» equal or lower is not a discount, and is not drawn as one).
 *
 *  Context: rounded DOWN, never to the nearest: 80 for 99 is 19.2 % — «−20 %» would promise
 *  more than the shelf gives, and a price is a promise. */
export function discountPercent(
  value: number,
  compareAt: number | undefined,
): number | undefined {
  if (compareAt === undefined || !(compareAt > 0) || !(value < compareAt) || value < 0) {
    return undefined;
  }
  const off = Math.floor(((compareAt - value) / compareAt) * 100);
  return off > 0 ? off : undefined;
}

/** A price written in the session's locale: with its currency when there is one («Bs 80,00»),
 *  with two decimals when there is none. `format` overrides either. */
export function formatPrice(
  value: number,
  { currency, format }: { currency?: string; format?: Intl.NumberFormatOptions } = {},
  locale = currentCopyLocale(),
): string {
  const options: Intl.NumberFormatOptions =
    currency === undefined
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2, ...format }
      : { style: "currency", currency, ...format };
  return formatWith(value, options, locale);
}
