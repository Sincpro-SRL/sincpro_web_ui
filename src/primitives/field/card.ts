/* ==================================================================== *
 *  A PAYMENT CARD NUMBER — what it is, how it is written, whether it holds.
 *
 *  Pure: the control (`CardNumberInput`) draws with it, and an application
 *  validates with the same functions before sending, so «the field accepted it»
 *  and «the form accepts it» never disagree.
 *
 *  ── Digits in, digits out ───────────────────────────────────────────
 *
 *  The value is the DIGITS: «4242424242424242». The spaces are how it is read,
 *  not what it is — the grouping depends on the brand (Amex is 4-6-5, the rest
 *  4-4-4-4), so storing them would store a presentation.
 *
 *  ── The brand from the first digits (IIN) ───────────────────────────
 *
 *  The ranges are the published issuer prefixes, most specific first: Discover's
 *  `622126–622925` lives inside UnionPay's `62`, so Discover is asked before.
 *  The names are proper nouns and are not translated.
 * ==================================================================== */

export type CardBrand =
  "visa" | "mastercard" | "amex" | "discover" | "diners" | "jcb" | "unionpay" | "maestro";

type BrandRule = {
  brand: CardBrand;
  name: string;
  prefix: RegExp;
  /** The lengths a number of this brand can have. */
  lengths: readonly number[];
  /** How many digits per group, left to right. */
  groups: readonly number[];
};

const FOUR = [4, 4, 4, 4, 3] as const;

const RULES: readonly BrandRule[] = [
  {
    brand: "amex",
    name: "American Express",
    prefix: /^3[47]/,
    lengths: [15],
    groups: [4, 6, 5],
  },
  {
    brand: "diners",
    name: "Diners Club",
    prefix: /^3(?:0[0-5]|[689])/,
    lengths: [14, 15, 16, 17, 18, 19],
    groups: [4, 6, 4, 5],
  },
  { brand: "jcb", name: "JCB", prefix: /^35/, lengths: [16, 17, 18, 19], groups: FOUR },
  { brand: "visa", name: "Visa", prefix: /^4/, lengths: [13, 16, 19], groups: FOUR },
  {
    brand: "mastercard",
    name: "Mastercard",
    prefix: /^(?:5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720))/,
    lengths: [16],
    groups: FOUR,
  },
  {
    brand: "discover",
    name: "Discover",
    prefix: /^(?:6011|65|64[4-9]|622(?:12[6-9]|1[3-9]\d|[2-8]\d\d|9[01]\d|92[0-5]))/,
    lengths: [16, 17, 18, 19],
    groups: FOUR,
  },
  {
    brand: "unionpay",
    name: "UnionPay",
    prefix: /^62/,
    lengths: [16, 17, 18, 19],
    groups: FOUR,
  },
  {
    brand: "maestro",
    name: "Maestro",
    prefix: /^(?:5[06-9]|6\d)/,
    lengths: [12, 13, 14, 15, 16, 17, 18, 19],
    groups: FOUR,
  },
];

/** The longest a card number gets, of any brand. */
export const CARD_MAX_DIGITS = 19;

/** Only the digits of what was typed or pasted: «4242 4242-4242» → «424242424242». */
export function cardDigits(text: string): string {
  return text.replace(/\D/g, "");
}

function ruleOf(digits: string, brand?: CardBrand | null): BrandRule | undefined {
  if (brand !== undefined && brand !== null) return RULES.find((one) => one.brand === brand);
  return RULES.find((one) => one.prefix.test(digits));
}

/** The brand the first digits say, or `null` while they do not say one yet. */
export function cardBrand(digits: string): CardBrand | null {
  return ruleOf(cardDigits(digits))?.brand ?? null;
}

/** How the brand is written: «American Express». */
export function cardBrandName(brand: CardBrand): string {
  return RULES.find((one) => one.brand === brand)?.name ?? brand;
}

/** The most digits a number of this brand takes — where typing stops. */
export function cardMaxDigits(digits: string, brand?: CardBrand | null): number {
  const lengths = ruleOf(cardDigits(digits), brand)?.lengths;
  return lengths === undefined ? CARD_MAX_DIGITS : Math.max(...lengths);
}

/** The digits in the brand's groups: «378282246310005» → «3782 822463 10005». */
export function formatCardNumber(digits: string, brand?: CardBrand | null): string {
  const clean = cardDigits(digits);
  const groups = ruleOf(clean, brand)?.groups ?? FOUR;
  const parts: string[] = [];
  let at = 0;
  for (const size of groups) {
    if (at >= clean.length) break;
    parts.push(clean.slice(at, at + size));
    at += size;
  }
  if (at < clean.length) parts.push(clean.slice(at));
  return parts.join(" ");
}

/** The Luhn check digit holds: a mistyped digit or two swapped neighbours fail it. */
export function luhnValid(digits: string): boolean {
  const clean = cardDigits(digits);
  if (clean.length === 0) return false;
  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    let digit = Number(clean[clean.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** A whole number: a known brand, one of its lengths, and the check digit holds. */
export function isValidCardNumber(digits: string): boolean {
  const clean = cardDigits(digits);
  const rule = ruleOf(clean);
  if (rule === undefined) return false;
  return rule.lengths.includes(clean.length) && luhnValid(clean);
}

/** Only the last four, the way a card is shown once it is stored: «•••• 4242». */
export function maskCardNumber(digits: string): string {
  const clean = cardDigits(digits);
  if (clean.length === 0) return "";
  return `•••• ${clean.slice(-4)}`;
}

/* ── The expiry «MM/AA» and the security code ─────────────────────────── */

/** The digits of an expiry, a leading zero put in for a month that can only be one digit:
 *  «4» is April, so «04»; «1» may still be October. At most four: MMAA. */
export function expiryDigits(text: string): string {
  const clean = cardDigits(text);
  const padded = /^[2-9]/.test(clean) ? `0${clean}` : clean;
  return padded.slice(0, 4);
}

/** How the expiry reads: «1228» → «12/28». */
export function formatExpiry(digits: string): string {
  const clean = cardDigits(digits).slice(0, 4);
  return clean.length <= 2 ? clean : `${clean.slice(0, 2)}/${clean.slice(2)}`;
}

/** The month and the full year of a whole expiry, or `null` while it is not one. */
export function expiryParts(digits: string): { month: number; year: number } | null {
  const clean = cardDigits(digits);
  if (clean.length !== 4) return null;
  const month = Number(clean.slice(0, 2));
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(clean.slice(2)) };
}

/** A real month that has not ended yet: a card is good through the last day of its month. */
export function isExpiryValid(digits: string, now: Date = new Date()): boolean {
  const parts = expiryParts(digits);
  if (parts === null) return false;
  const current = now.getFullYear() * 12 + now.getMonth();
  return parts.year * 12 + (parts.month - 1) >= current;
}

/** How many digits the security code has: four on the front of an Amex, three elsewhere. */
export function cardCodeLength(brand: CardBrand | null | undefined): 3 | 4 {
  return brand === "amex" ? 4 : 3;
}
