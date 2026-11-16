"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { useMemo } from "react";

/* ==================================================================== *
 *  COUNT — how many things are behind something, or that something asks.
 *
 *      Facturas  31        Pagos  4 ⬤        🔔⁹⁹⁺
 *                 ^ soft            ^ dot      ^ solid, over an icon
 *
 *  It was drawn five times, by five components, with four rules: the
 *  sidebar hid the zero and formatted the number, the tabs drew the zero,
 *  the systray cut at «99+» without formatting, and a menu option asked for
 *  «an already formatted counter» that existed nowhere — so the application
 *  that wanted «Carrito 3» on its own button drew a sixth one.
 *
 *  ── Two questions, one piece ─────────────────────────────────────────
 *
 *  `neutral` — the default — says HOW MANY: «Facturas 31». Quiet, because a
 *  column of counts beside a column of labels is read when looked for, not
 *  before. Any other tone says that something in there ASKS: «3 rejected».
 *  Without `value` it is a dot: something arrived and counting it adds
 *  nothing.
 *
 *  ── The zero is not drawn, unless it is an answer ───────────────────
 *
 *  A «0» beside every quiet screen is a column of noise the eye has to read
 *  to learn nothing. Where the zero IS the answer — a tab that would have to
 *  be opened to find out it is empty — `showZero` draws it, fainter.
 *
 *  ── `current` takes the colour of its host ──────────────────────────
 *
 *  The count of the row you are on reads in that row's colour (the sidebar's
 *  blue, the open tab's ink): `currentColor`, not a colour chosen here, so
 *  every host keeps its own and none needs a variant.
 * ==================================================================== */

export type CountProps = {
  /** How many. Without it the count is a dot: something is there, not counted. */
  value?: number;
  /** `neutral` counts; any other tone says that something asks for attention. */
  tone?: Tone;
  /** Filled: the badge over an icon (a bell, a cart), which has to read on its own. */
  solid?: boolean;
  /** Past this it reads «99+». Without it every number is written in full. */
  max?: number;
  /** Draw the zero, fainter: where «0» is an answer and not noise (a tab). */
  showZero?: boolean;
  /** The thing it counts is the current one — the count takes its host's colour. */
  current?: boolean;
  surface?: Surface;
  /** When the host already says the number in its name (`aria-label`), the count is only
   *  seen: hidden from assistive technology so it is not read twice. */
  "aria-hidden"?: boolean;
};

/* Static and in a table: Tailwind cannot compose `bg-${tone}/12`. The gold is never text on
   the canvas (2.43:1), so there its count is ink on a gold wash — the same rule as `Tag`. */
const SOFT: Record<Tone, Record<Surface, string>> = {
  neutral: { canvas: "bg-ink/8 text-muted", chrome: "bg-chrome-ink/10 text-chrome-muted" },
  info: { canvas: "bg-info/12 text-info", chrome: "bg-chrome-link/15 text-chrome-link" },
  good: { canvas: "bg-good/12 text-good", chrome: "bg-chrome-good/15 text-chrome-good" },
  warn: { canvas: "bg-warn/14 text-warn", chrome: "bg-chrome-warn/15 text-chrome-warn" },
  bad: { canvas: "bg-bad/12 text-bad", chrome: "bg-chrome-bad/15 text-chrome-bad" },
  accent: {
    canvas: "bg-accent/20 text-ink",
    chrome: "bg-chrome-accent/15 text-chrome-accent",
  },
};

const SOLID: Record<Tone, Record<Surface, string>> = {
  neutral: { canvas: "bg-ink text-surface", chrome: "bg-chrome-ink text-chrome" },
  info: { canvas: "bg-info text-surface", chrome: "bg-chrome-link text-chrome" },
  good: { canvas: "bg-good text-surface", chrome: "bg-chrome-good text-chrome" },
  warn: { canvas: "bg-warn text-surface", chrome: "bg-chrome-warn text-chrome" },
  bad: { canvas: "bg-bad text-surface", chrome: "bg-chrome-bad text-chrome" },
  accent: { canvas: "bg-accent text-on-accent", chrome: "bg-chrome-accent text-chrome" },
};

const DOT: Record<Tone, Record<Surface, string>> = {
  neutral: { canvas: "bg-muted", chrome: "bg-chrome-muted" },
  info: { canvas: "bg-info", chrome: "bg-chrome-link" },
  good: { canvas: "bg-good", chrome: "bg-chrome-good" },
  warn: { canvas: "bg-warn", chrome: "bg-chrome-warn" },
  bad: { canvas: "bg-bad", chrome: "bg-chrome-bad" },
  accent: { canvas: "bg-accent", chrome: "bg-chrome-accent" },
};

/** The text of a count: formatted for the locale, and «99+» past `max`. Exported for the
 *  hosts that also need it in words — a button's `aria-label`, a `title`. */
export function countText(
  value: number,
  format: (n: number) => string,
  max?: number,
): string {
  return max !== undefined && value > max ? `${format(max)}+` : format(value);
}

function skinOf(
  tone: Tone,
  surface: Surface,
  { solid, current, zero }: { solid: boolean; current: boolean; zero: boolean },
): string {
  if (solid) return SOLID[tone][surface];
  if (zero)
    return surface === "chrome" ? "bg-chrome-ink/6 text-chrome-muted" : "bg-ink/5 text-muted";
  if (current && tone === "neutral") return "bg-current/12 text-current";
  return SOFT[tone][surface];
}

export function Count({
  value,
  tone = "neutral",
  solid = false,
  max,
  showZero = false,
  current = false,
  surface,
  "aria-hidden": hidden,
}: CountProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const number = useMemo(() => new Intl.NumberFormat(copy.locale), [copy.locale]);

  if (value === undefined) {
    return (
      <span
        data-count="dot"
        className={`inline-block size-1.5 shrink-0 rounded-pill ${DOT[tone][sup]}`}
        aria-hidden
      />
    );
  }
  if (value <= 0 && !showZero) return null;

  return (
    <span
      data-count={value}
      {...(hidden === true ? { "aria-hidden": true } : {})}
      className={`inline-flex min-w-4 shrink-0 items-center justify-center rounded-pill text-micro tabular-nums ${
        solid ? "px-1 leading-none font-semibold" : "px-1.5 leading-normal font-medium"
      } ${skinOf(tone, sup, { solid, current, zero: value <= 0 })}`}
    >
      {countText(value, number.format, max)}
    </span>
  );
}
