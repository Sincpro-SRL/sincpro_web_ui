"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { cn, tv } from "@sincpro/web-ui/foundations/variants";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { FieldButton, FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, SquareArrowOutUpRight } from "lucide-react";
import { type ReactNode, useContext, useMemo, useRef, useState } from "react";
import {
  ComboBox as AriaComboBox,
  ComboBoxStateContext,
  Input,
  type Key,
  ListBox,
  ListBoxItem,
  Text,
  useFilter,
} from "react-aria-components";

/* ==================================================================== *
 *  PICKER — a many2one: type in the field, choose from a floating list.
 *
 *  "some metadata that might help is not visible". The culprit is structural:
 *  **an `<option>` is ONE LINE OF TEXT**. It admits neither two lines, nor
 *  tags, nor a number aligned to the right. So choosing between «Almacén
 *  Central» and «Almacén Central — tránsito» was done blind — and the
 *  difference between the two (four thousand units on hand against zero, the
 *  city, who runs it) is exactly what had to be seen in order to choose well.
 *
 *  Here every option is a row with a name, tags and specs: the same rows as the
 *  catalog, inside the dropdown. The CLOSED field is just the name — typing
 *  filters. A second search box on top of the list was a control you had to
 *  skip over, and expanding the list INLINE shoved the rest of the form down
 *  the page.
 *
 *  ── React Aria's combobox, our rows ─────────────────────────────────
 *
 *  The field is React Aria's `ComboBox`: the input is the search, the list is
 *  its `ListBox`, and the keyboard is theirs — arrows walk the options, Enter
 *  takes the marked one, Escape closes and puts the chosen name back, Home/End
 *  and Page keys move through the list, and a screen reader hears the option it
 *  lands on. What stays ours is what to SHOW: the filter over the name, the
 *  specs and the hidden `haystack` (accent-insensitive, in the locale of the
 *  copy table), the cap and its footer.
 *
 *  ── It floats, like Menu, and is not an inline expansion ────────────
 *
 *  Lives inside dialogs. A dialog on top of another one is the road to
 *  simulated windows; the list floats in the system's `Popover`, which React
 *  Aria places, flips when there is no room below, and keeps out of reach of
 *  any `overflow-hidden` panel.
 *
 *  ── The cap of 8 and the footer ─────────────────────────────────────
 *
 *  With a hundred and eighty products, a complete list is a scroll inside
 *  another scroll. The first 8 are shown and the footer says how many are
 *  left — the number matters: "see more" does not tell apart two that are
 *  missing from a hundred and seventy.
 *
 *  It is not `ComboBox`: that one chooses among a closed list already in
 *  memory with one muted line per option. This one chooses a RECORD among
 *  hundreds, and needs to show what tells two records apart.
 * ==================================================================== */

export interface PickerItem {
  id: string;
  name: string;
  /** The data that allows choosing well, already formatted: stock on hand, a
   *  price, a tax id. In tabular figures, so they line up between options, which
   *  is what makes them comparable at a glance. */
  meta?: string;
  tags?: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Extra text WHERE TO SEARCH that is not drawn: the internal code and the
   *  barcode of a product, the NIT of a customer.
   *
   *  Context: it is the difference between being able to type the code printed
   *  on the box and finding the product, and having to remember what it was
   *  called. Drawing every code of every option is not an alternative. */
  haystack?: string;
}

/** The id of the «see all…» row. Not a record id: it cannot collide with one. */
const BROWSE_ALL = "\u0000browse-all";
const CAP = 8;

/* No focus ring on an option: the focus stays in the input (the list is driven from it),
   and the marked row is said by its tint — a ring inside the list as well as around the
   field is two marks for one place. */
const option = tv({
  base: "flex w-full min-w-0 cursor-default gap-2 rounded-control px-2 text-left outline-0 select-none forced-color-adjust-none",
  variants: {
    hints: {
      true: "items-start py-1.5",
      false: "items-center py-1",
    },
    isFocused: {
      true: "bg-primary/8 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isHovered: {
      true: "bg-ink/4",
    },
    isPressed: {
      true: "bg-primary/12",
    },
    isDisabled: {
      true: "opacity-45 forced-colors:text-[GrayText]",
    },
  },
  compoundVariants: [{ isFocused: true, isHovered: true, class: "bg-primary/8" }],
});

export type PickerProps = {
  id?: string;
  items: readonly PickerItem[];
  value?: string;
  onChange?: (id: string) => void;
  placeholder?: string;
  /** What to do with the ones that don't fit. Without this, the footer only
   *  informs. */
  onBrowseAll?: () => void;
  /** Open the chosen record. Drawn as a trailing affordance, the way a many2one
   *  offers "open" next to "pick". Absent when there is nothing chosen. */
  onOpen?: (id: string) => void;
  emptyText?: string;
  /** Placeholder of the field while it is being typed into. It is NOT a second
   *  box — the field itself is the search. */
  searchPlaceholder?: string;
  /** The options are still coming. It gets said, not hidden: an empty picker
   *  while loading reads as "there is nothing", which is a different answer. */
  loading?: boolean;
  loadingText?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the name. */
  mode?: FormMode;
};

export function Picker({ mode, ...props }: PickerProps) {
  if (useFormMode(mode) === "read") {
    return <ReadValue value={props.items.find((i) => i.id === props.value)?.name ?? null} />;
  }
  /* The filter reads the locale from React Aria's context, so the box that provides it has
     to be ABOVE the component that asks for it. */
  return (
    <AriaLocale>
      <EditablePicker {...props} />
    </AriaLocale>
  );
}

function EditablePicker({
  id: ownId,
  items,
  value,
  onChange,
  placeholder,
  onBrowseAll,
  onOpen,
  emptyText,
  searchPlaceholder,
  loading = false,
  loadingText,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
}: Omit<PickerProps, "mode">) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const copy = useUiCopy();
  const { contains } = useFilter({ sensitivity: "base" });
  const shownPlaceholder = placeholder ?? copy.picker.placeholder;
  const shownEmpty = emptyText ?? copy.picker.empty;
  const shownSearch = searchPlaceholder ?? copy.picker.search;
  const shownLoading = loadingText ?? copy.picker.loading;

  const chosen = items.find((i) => i.id === value);
  const chosenName = chosen?.name ?? "";

  /* Both the text and the choice are controlled, so React Aria never rewrites the field
     from its own collection — which is capped and filtered, and may not hold the chosen
     record at all. `query` is what filters: empty when the list opens (the whole list,
     not just the one already chosen), the typed text after that. */
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(chosenName);
  const [query, setQuery] = useState("");
  const [shownFor, setShownFor] = useState(chosenName);
  if (!open && shownFor !== chosenName) {
    setShownFor(chosenName);
    setText(chosenName);
  }

  const filtered = useMemo(() => {
    const q = query.trim();
    if (q === "") return items;
    return items.filter((i) => contains(`${i.name} ${i.meta ?? ""} ${i.haystack ?? ""}`, q));
  }, [items, query, contains]);

  const visible = loading ? [] : filtered.slice(0, CAP);
  const remaining = loading ? 0 : filtered.length - visible.length;
  const hasMarks = items.some((i) => i.icon !== undefined);
  const hasHints = visible.some((i) => i.meta !== undefined);

  /* «See all…» is an OPTION at the end of the list and not a button in a footer: the
     arrows reach it like any other row. As a footer button it was out of the keyboard's
     path — Tab leaves the field and closes the list before getting there. */
  const browsable = remaining > 0 && onBrowseAll !== undefined;
  const listed: readonly PickerItem[] = browsable
    ? [...visible, { id: BROWSE_ALL, name: copy.picker.browseAll }]
    : visible;

  const closeList = useRef<(() => void) | null>(null);

  const take = (key: Key | null) => {
    if (key === null) return;
    const next = String(key);
    if (next === BROWSE_ALL) {
      /* The full list opens somewhere else (a dialog, a panel): this one closes and the
         field keeps the chosen name. */
      closeList.current?.();
      setText(chosenName);
      setQuery("");
      onBrowseAll?.();
      return;
    }
    setText(items.find((i) => i.id === next)?.name ?? "");
    setQuery("");
    if (next !== value) onChange?.(next);
  };

  return (
    <AriaComboBox
      id={id}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      items={listed}
      value={value ?? null}
      onChange={take}
      inputValue={text}
      onInputChange={(next) => {
        setText(next);
        setQuery(next);
      }}
      onOpenChange={(isOpen, trigger) => {
        setOpen(isOpen);
        if (isOpen && trigger !== "input") setQuery("");
        if (!isOpen) {
          setText(chosenName);
          setQuery("");
        }
      }}
      /* Opening on focus is what a many2one does: you arrive at the field to choose, and
         the options are the answer before the first letter. */
      menuTrigger="focus"
      /* An empty list stays open to SAY it is empty (or loading) instead of vanishing. */
      allowsEmptyCollection
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <CloseBridge into={closeList} />
      <FieldGroup>
        <Input
          placeholder={loading ? shownLoading : open ? shownSearch : shownPlaceholder}
          title={shownSearch}
          /* Arriving selects the name, so the first letter typed replaces it. Only when
             ARRIVING: React Aria hands the focus back to the input while the list is open,
             and selecting again then would swallow every second letter. */
          onFocus={(event) => {
            if (!open) event.currentTarget.select();
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed"
        />
        {value !== undefined && value !== "" && onOpen !== undefined ? (
          <IconButton
            icon={SquareArrowOutUpRight}
            label={copy.picker.open}
            size="sm"
            disabled={disabled}
            onClick={() => onOpen(value)}
          />
        ) : null}
        <FieldButton className="mr-1">
          <ChevronDown aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
        </FieldButton>
      </FieldGroup>

      {/* As wide as the field, because the list continues it. */}
      <Popover
        placement="bottom start"
        className="flex w-(--trigger-width) flex-col overflow-hidden"
      >
        <ListBox
          items={listed}
          renderEmptyState={() => (
            <p className="px-3 py-3 text-center text-meta text-muted">
              {loading ? shownLoading : shownEmpty}
            </p>
          )}
          className="min-h-0 flex-1 overflow-y-auto p-1 outline-0"
        >
          {(item) =>
            item.id === BROWSE_ALL ? (
              <ListBoxItem
                id={BROWSE_ALL}
                textValue={item.name}
                className={(state) =>
                  `${option({ ...state, hints: false })} mt-1 border-t border-line text-primary`
                }
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-micro tabular-nums text-muted">
                    {fillCopy(copy.picker.more, {
                      count: remaining.toLocaleString(copy.locale),
                    })}
                  </span>
                </span>
              </ListBoxItem>
            ) : (
              <ListBoxItem
                id={item.id}
                textValue={item.name}
                isDisabled={item.disabled}
                className={(state) => option({ ...state, hints: hasHints })}
              >
                {({ isSelected }) => (
                  <Row item={item} selected={isSelected} marks={hasMarks} hints={hasHints} />
                )}
              </ListBoxItem>
            )
          }
        </ListBox>

        {remaining > 0 && !browsable ? (
          <div className="flex shrink-0 items-center gap-2 border-t border-line bg-ground px-2.5 py-1.5">
            <span className="text-micro tabular-nums text-muted">
              {fillCopy(copy.picker.more, { count: remaining.toLocaleString(copy.locale) })}
            </span>
            <span className="text-micro text-muted">{copy.picker.refine}</span>
          </div>
        ) : null}
      </Popover>
    </AriaComboBox>
  );
}

function Row({
  item,
  selected,
  marks,
  hints,
}: {
  item: PickerItem;
  selected: boolean;
  marks: boolean;
  hints: boolean;
}) {
  const Icon = item.icon;
  return (
    <>
      {marks ? (
        <span
          className={cn(
            hints ? "mt-0.5" : "",
            "flex size-(--size-icon-sm) shrink-0 items-center justify-center",
          )}
        >
          {selected ? (
            <Check
              aria-hidden
              className="size-(--size-icon-sm) text-primary forced-colors:text-[HighlightText]"
              strokeWidth={2.5}
            />
          ) : Icon !== undefined ? (
            <Icon
              aria-hidden
              className="size-(--size-icon-sm) text-muted"
              strokeWidth={1.75}
            />
          ) : null}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <Text
            slot="label"
            className={cn(
              "min-w-0 truncate text-meta text-ink",
              selected ? "font-medium" : "",
            )}
          >
            {item.name}
          </Text>
          {item.tags}
        </span>
        {item.meta === undefined ? null : (
          <Text slot="description" className="truncate text-micro tabular-nums text-muted">
            {item.meta}
          </Text>
        )}
      </span>
      {/* Without icons there is no mark column: the check goes at the end, so the chosen
          one is still said by something other than weight. */}
      {!marks && selected ? (
        <Check
          aria-hidden
          className="size-(--size-icon-sm) shrink-0 text-primary forced-colors:text-[HighlightText]"
          strokeWidth={2.5}
        />
      ) : null}
    </>
  );
}

/** Hands the combobox's `close` to the code outside it: React Aria owns the open state and
 *  offers no controlled `isOpen`, and the «see all…» row has to close the list it lives in. */
function CloseBridge({ into }: { into: { current: (() => void) | null } }) {
  const state = useContext(ComboBoxStateContext);
  into.current = state === null ? null : () => state.close();
  return null;
}
