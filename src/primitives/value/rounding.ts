/* ==================================================================== *
 *  ROUNDING — to a multiple, and saying how.
 *
 *  Context: `maximumFractionDigits` rounds what is DRAWN; the value underneath
 *  keeps its tail, and a total of drawn values then differs from the drawn
 *  total by a cent. An ERP rounds the VALUE, and not always to a decimal: cash
 *  to 0,05 (Bolivia has no 1-centavo coin in circulation), a unit of measure to
 *  its precision (a box is 1, a kilo 0,001), a price to 0,10. And the method
 *  is part of the rule: half up for a price, half even for statistics, up for
 *  what is charged per started hour, down for what is paid.
 *
 *  Pure, in the display tier so a value that shows (`Numeric`) and a control
 *  that asks (`NumberInput`) round with the same function.
 * ==================================================================== */

export type RoundingMethod = "half-up" | "half-even" | "up" | "down";

export type Rounding = {
  /** The multiple: 0.05 rounds to five cents, 1 to a whole unit, 0.001 to grams. */
  increment: number;
  /** `half-up` by default — what a price expects. `up`/`down` are away from/towards zero. */
  method?: RoundingMethod;
};

/** How many decimals a number is written with: 0.05 → 2. Used to cut the binary tail that
 *  `0.1 + 0.2` leaves, so 1.15 rounded to 0.05 is 1.15 and not 1.1500000000000001. */
function decimalsOf(value: number): number {
  const text = String(value);
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0;
}

/** `value` rounded to a multiple of `increment`, by `method`. */
export function roundTo(
  value: number,
  increment: number,
  method: RoundingMethod = "half-up",
): number {
  if (!Number.isFinite(value) || !(increment > 0)) return value;
  const decimals = decimalsOf(increment);
  /* The quotient, cleaned of the float tail before deciding: 1.15 / 0.05 is 22.999999… */
  const steps = Number((Math.abs(value) / increment).toFixed(9));
  const whole = Math.floor(steps);
  const fraction = Number((steps - whole).toFixed(9));
  let rounded: number;
  switch (method) {
    case "up":
      rounded = fraction > 0 ? whole + 1 : whole;
      break;
    case "down":
      rounded = whole;
      break;
    case "half-even":
      rounded = fraction > 0.5 || (fraction === 0.5 && whole % 2 === 1) ? whole + 1 : whole;
      break;
    default:
      rounded = fraction >= 0.5 ? whole + 1 : whole;
  }
  const result = Number((rounded * increment).toFixed(decimals));
  return value < 0 ? -result : result;
}
