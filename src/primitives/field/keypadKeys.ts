/**
 * WHAT A KEY OF THE PAD DOES TO THE NUMBER BEING TYPED — pure, so a test, a server or a
 * keyboard handler applies the same rules as the on-screen pad (`Keypad`).
 *
 * Context: a till types quantities, discounts and prices with a thumb. The text is kept in
 * the machine's form — digits, one «.», an optional leading «-» — and the screen formats it
 * in the person's locale: what travels is «1250.5», what is read is «1.250,5». The rules
 * are the ones a cashier expects from a calculator: «0» then «5» is «5», not «05»; a second
 * decimal point does nothing; past the allowed decimals a digit does nothing; ⌫ on «-» leaves
 * nothing.
 */

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "00"
  | "decimal"
  | "backspace"
  | "clear"
  | "sign";

export type KeypadRules = {
  /** How many decimals the number takes — `0` for a quantity of units, `2` for money. A
   *  digit past them does nothing. Without it, any. */
  decimals?: number;
};

const DIGITS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

/** True for a key of the pad: what comes from a physical keyboard is a string. */
export function isKeypadKey(key: string): key is KeypadKey {
  return (
    DIGITS.has(key) ||
    key === "00" ||
    key === "decimal" ||
    key === "backspace" ||
    key === "clear" ||
    key === "sign"
  );
}

function appendDigits(text: string, digits: string, rules: KeypadRules): string {
  let next = text;
  for (const digit of digits) {
    const sign = next.startsWith("-") ? "-" : "";
    const body = next.slice(sign.length);
    const point = body.indexOf(".");
    if (
      point >= 0 &&
      rules.decimals !== undefined &&
      body.length - point - 1 >= rules.decimals
    ) {
      return next;
    }
    /* A lone zero is replaced, not prefixed: «0» then «5» is «5». */
    next = body === "0" ? `${sign}${digit}` : `${next}${digit}`;
  }
  return next;
}

/** The text after pressing `key`. */
export function applyKey(text: string, key: KeypadKey, rules: KeypadRules = {}): string {
  if (key === "clear") return "";
  if (key === "backspace") {
    const next = text.slice(0, -1);
    return next === "-" ? "" : next;
  }
  if (key === "sign") {
    if (text === "") return text;
    return text.startsWith("-") ? text.slice(1) : `-${text}`;
  }
  if (key === "decimal") {
    if (rules.decimals === 0 || text.includes(".")) return text;
    const sign = text.startsWith("-") ? "-" : "";
    const body = text.slice(sign.length);
    return `${sign}${body === "" ? "0" : body}.`;
  }
  if (key === "00") {
    /* Two zeros on nothing is still nothing typed: «00» is how a cashier writes hundreds. */
    if (text === "" || text === "-" || text === "0") return text;
    return appendDigits(text, "00", rules);
  }
  return appendDigits(text, key, rules);
}

/** The key a physical keyboard's key stands for, or `null`: digits, «.» and «,» (the decimal
 *  point whatever the locale), Backspace, Delete / Escape (clear), «-» (sign). */
export function keyOfKeyboard(key: string): KeypadKey | null {
  if (DIGITS.has(key)) return key as KeypadKey;
  if (key === "." || key === ",") return "decimal";
  if (key === "Backspace") return "backspace";
  if (key === "Delete" || key === "Escape") return "clear";
  if (key === "-") return "sign";
  return null;
}
