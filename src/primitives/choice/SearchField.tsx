"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
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
};

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
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  onSubmit,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
}: SearchFieldProps) {
  const { id, labelledBy, describedBy } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
  });
  return (
    <AriaLocale>
      <AriaSearchField
        id={id}
        aria-labelledby={labelledBy}
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
