import { matchSpans } from "@sincpro/web-ui/foundations/match";

/**
 * A text with the part that matched the search marked — what the lists that filter as you
 * type (`Picker`, `TagsField`) draw in every row, and what an option of the application's own
 * (`renderOption`) uses to say the same. A `<mark>`, so it is also said as marked text, and
 * bold besides the tint: in forced colors the tint is gone and the weight is what remains.
 */
export function MatchedText({
  text,
  query,
  locale,
}: {
  text: string;
  query: string;
  locale?: string;
}) {
  if (query.trim() === "") return text;
  return matchSpans(text, query, locale).map((span, index) =>
    span.hit ? (
      <mark key={index} className="rounded-mark bg-accent/25 font-semibold text-current">
        {span.text}
      </mark>
    ) : (
      span.text
    ),
  );
}
