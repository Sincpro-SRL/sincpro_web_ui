/* Without `"use client"`, apart from `Count.tsx` (which reads its surface and its words from
   context): a server component that writes a count in words calls it. */

/** The text of a count: formatted for the locale, and «99+» past `max`. Exported for the
 *  hosts that also need it in words — a button's `aria-label`, a `title`. */
export function countText(
  value: number,
  format: (n: number) => string,
  max?: number,
): string {
  return max !== undefined && value > max ? `${format(max)}+` : format(value);
}
