"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { FieldButton, FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { Search, X } from "lucide-react";
import { Input, SearchField as AriaSearchField } from "react-aria-components";

export type SearchFieldProps = {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  /** Enter. For a search that runs on demand instead of on every keystroke. */
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  /** The name of the box when it is NOT inside a `Field` — the search of a list bar, of a
   *  panel. Inside a field, the field's label names it. Without either, see below. */
  "aria-label"?: string;
};

/** The trailing «…» of a placeholder is a visual cue that typing is expected, not part of
 *  the name: «Buscar una cuenta…» is announced as «Buscar una cuenta». */
function nameFromPlaceholder(placeholder: string | undefined): string | undefined {
  const name = placeholder?.replace(/[\s.…]+$/u, "").trim();
  return name === undefined || name === "" ? undefined : name;
}

/**
 * A plain search box: a text, a clear button, Enter to submit. To filter the rows of a panel,
 * the options of a long settings page, the lines of a document.
 *
 * Context: the system's `SearchBar` (in `components/search`) is a different thing — it builds
 * CRITERIA: facets, operators, chips, a model of the fields. That is the list's question.
 * This is the primitive under every other search: one string, no structure. Escape clears it
 * and the clear button says so aloud in the copy's language — both React Aria's.
 *
 * It does not follow the form's read mode: what is typed here is never data of the record, so
 * there is nothing to draw as text. The browser's own clear cross is hidden; ours is the one
 * the keyboard and the screen reader know.
 *
 * It is never nameless. Most search boxes live OUTSIDE a form — the bar of a list, a panel —
 * where there is no `Field` to label them, and a nameless one is read as «edit text» (React
 * Aria warns about it in the console). The name is, in this order: the enclosing `Field`'s
 * label, an explicit `aria-label`, the placeholder (what the eye reads is what the ear
 * should hear), and finally the copy table's «Search».
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  onSubmit,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  "aria-label": ariaLabel,
}: SearchFieldProps) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
  });
  /* A `Field` names it through its label; anything else falls back so it always has one. */
  const name =
    ariaLabel ??
    (labelledBy === undefined
      ? (nameFromPlaceholder(placeholder) ?? copy.choice.search)
      : undefined);
  return (
    <AriaLocale>
      <AriaSearchField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={name}
        aria-describedby={describedBy}
        value={value}
        onChange={(next) => onChange?.(next)}
        onSubmit={onSubmit}
        isDisabled={disabled}
        className="group w-full min-w-0"
      >
        <FieldGroup>
          <Search
            aria-hidden
            className="ml-2.5 size-(--size-icon-md) shrink-0 text-muted forced-colors:text-[ButtonText]"
            strokeWidth={2}
          />
          <Input
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden"
          />
          {/* Hidden, not removed, while empty: the field keeps its width and the text does
              not jump when the first letter makes it appear. */}
          <FieldButton className="mr-1 group-data-empty:invisible">
            <X aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
          </FieldButton>
        </FieldGroup>
      </AriaSearchField>
    </AriaLocale>
  );
}
