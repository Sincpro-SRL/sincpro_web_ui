import type { Tone } from "@sincpro/web-ui/foundations/types";

/**
 * One tag that can be put on a record: what is stored (`value`, the id) and what is read
 * (`label`), plus the tone it MEANS when it means something.
 *
 * Context: the same plain shape as `ChoiceOption` — the categories of a customer and the
 * labels of an invoice come from data, and the ids go back to the backend as they came.
 */
export interface TagOption {
  value: string;
  label: string;
  /** Neutral by default: «mayorista» classifies, it does not warn. */
  tone?: Tone;
  /** A person: its face on the chip and in the list — `true` for initials, a URL for a photo. */
  avatar?: true | string;
}

/** How the typed text is compared — the locale's, handed in by the component. */
export type TagMatch = {
  /** `label` contains `query`, ignoring case and accents. */
  contains: (label: string, query: string) => boolean;
  /** `a` and `b` are the same word, ignoring case and accents. */
  same: (a: string, b: string) => boolean;
};

/**
 * What the inline input offers for a given text.
 *
 * Context: pure and outside the component because it is the contract of the field — the
 * chosen ones never come back as options (choosing «mayorista» twice is a duplicate, not a
 * choice), the typed text filters, and «create» is offered only when the text names NO
 * existing tag, chosen or not: creating «Mayorista» next to «mayorista» is how a catalog
 * ends up with both.
 */
export function tagChoices(
  options: readonly TagOption[],
  value: readonly string[],
  text: string,
  match: TagMatch,
  creatable: boolean,
): { available: TagOption[]; create: string | null } {
  const chosen = new Set(value);
  const query = text.trim();
  const available = options.filter(
    (option) =>
      !chosen.has(option.value) && (query === "" || match.contains(option.label, query)),
  );
  const create =
    creatable && query !== "" && !options.some((option) => match.same(option.label, query))
      ? query
      : null;
  return { available, create };
}

/** The value with one more id at the end; the same value when it is already there. */
export function withTag(value: readonly string[], id: string): string[] {
  return value.includes(id) ? [...value] : [...value, id];
}

/** The value without that id. */
export function withoutTag(value: readonly string[], id: string): string[] {
  return value.filter((one) => one !== id);
}
