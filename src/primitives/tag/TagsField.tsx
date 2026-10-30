"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { fieldGroupStyles, listOptionStyles } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  tagChoices,
  type TagOption,
  withoutTag,
  withTag,
} from "@sincpro/web-ui/primitives/tag/choices";
import { type TagItem, Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { Plus } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ComboBox as AriaComboBox,
  ComboBoxStateContext,
  Group,
  Input,
  type Key,
  ListBox,
  ListBoxItem,
  useFilter,
  useLocale,
} from "react-aria-components";

/* ==================================================================== *
 *  TAGSFIELD — a many2many written as chips: the categories of a customer, the labels of an
 *  invoice.
 *
 *  Context: the read form of this value is `Tags` — a strip of chips. Editing it is the same
 *  strip plus ONE way in: the chips stay where they are read (removable with their × or
 *  Backspace), and an input right after the last one adds the next. A separate «add tag»
 *  button that opens a list would be two controls for one value, and a multi-select with
 *  checkboxes hides what is chosen behind a closed field — the opposite of a many2many,
 *  whose whole point is that the categories are seen.
 *
 *  ── React Aria's tag group and React Aria's combobox, side by side ──
 *
 *  The chips are `Tags` (React Aria's `TagGroup`): one tab stop, arrows between chips,
 *  Backspace or Delete removes the focused one. The input is React Aria's `ComboBox`: typing
 *  filters in the copy table's locale («exportacion» finds «exportación»), arrows walk the
 *  list, Enter adds. Two additions are ours, both what a person who types tags expects:
 *  while typing, the FIRST match is marked, so Enter adds it (typing «may» and Enter is the
 *  whole gesture, and the row it takes is the tinted one); and Backspace in the empty input
 *  removes the last chip.
 *
 *  The chosen tags never come back as options — choosing «mayorista» twice is a duplicate,
 *  not a choice. «Create «…»» is offered only when `onCreate` is given and the text names no
 *  existing tag (see `tagChoices`).
 *
 *  The value is a plain `string[]` of ids, in the order they were added — what the backend
 *  stores in a many2many, never React Aria's `Selection`.
 * ==================================================================== */

/** The key of the «create» row. Not an id: it cannot collide with one. */
const CREATE = "\u0000create";

export type TagsFieldProps = {
  /** The ids of the chosen tags, in the order they were added. */
  value: readonly string[];
  onChange?: (next: string[]) => void;
  /** Every tag that can be put on the record — chosen ones included, for their labels. */
  options: readonly TagOption[];
  /**
   * Create a tag from the typed text and return its new id (or a promise of it); the field
   * then adds it. Without it there is no «create» row — the catalog is closed.
   *
   * Context: the id is returned and not invented here because the record is created by the
   * backend (Odoo's `name_create`); the consumer also appends the new option to `options`.
   */
  onCreate?: (label: string) => string | Promise<string>;
  /** The input's placeholder while no tag is chosen. Defaults to the copy table's «Add…». */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  /** The name of the control when it is NOT inside a `Field` — a cell of an editable table.
   *  Inside a field, the field's label names it. */
  "aria-label"?: string;
  /** Forces the mode. By default it inherits the form's: in read mode it draws `Tags`. */
  mode?: FormMode;
};

/** The chosen tags as chips, in the order of `value`. An id missing from `options` is still
 *  drawn (as itself): hiding it would hide data the record has. */
function chosenOptions(options: readonly TagOption[], value: readonly string[]): TagOption[] {
  const byId = new Map(options.map((option) => [option.value, option]));
  return value.map((id) => byId.get(id) ?? { value: id, label: id });
}

/**
 * A many2many as removable chips plus an inline combobox that adds one more.
 *
 * Works inside `<Field label=…>`: the field's label names both the input and the strip of
 * chips, and its hint and error describe the input. In read mode it is `Tags`.
 */
export function TagsField({ mode, ...props }: TagsFieldProps) {
  if (useFormMode(mode) === "read") {
    const chosen = chosenOptions(props.options, props.value);
    if (chosen.length === 0) return <ReadValue value={null} />;
    return (
      <span className="flex min-h-(--size-control-md) items-center">
        <Tags
          items={chosen.map((option) => ({
            id: option.value,
            label: option.label,
            ...(option.tone === undefined ? {} : { tone: option.tone }),
          }))}
        />
      </span>
    );
  }
  /* The filter reads the locale from React Aria's context, so the box that provides it has
     to be ABOVE the component that asks for it. */
  return (
    <AriaLocale>
      <EditableTagsField {...props} />
    </AriaLocale>
  );
}

function EditableTagsField({
  value,
  onChange,
  options,
  onCreate,
  placeholder,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  "aria-label": ariaLabel,
}: Omit<TagsFieldProps, "mode">) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const copy = useUiCopy();
  const { contains } = useFilter({ sensitivity: "base" });
  const { locale } = useLocale();
  const collator = useMemo(
    () => new Intl.Collator(locale, { sensitivity: "base", usage: "search" }),
    [locale],
  );
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /* The value after an `await` is the one of THEN, not the one of the render that started
     creating: a tag removed meanwhile must not come back. */
  const latest = useRef(value);
  latest.current = value;

  const { available, create } = tagChoices(
    options,
    value,
    text,
    { contains, same: (a, b) => collator.compare(a.trim(), b) === 0 },
    onCreate !== undefined && !disabled,
  );
  const listed: TagOption[] =
    create === null
      ? available
      : [
          ...available,
          { value: CREATE, label: fillCopy(copy.inlineEdit.createTag, { name: create }) },
        ];

  const commit = (key: Key | null) => {
    if (key === null) return;
    const chosen = String(key);
    setText("");
    if (chosen !== CREATE) {
      onChange?.(withTag(latest.current, chosen));
      return;
    }
    if (create === null || onCreate === undefined) return;
    void Promise.resolve(onCreate(create)).then((created) =>
      onChange?.(withTag(latest.current, created)),
    );
  };

  const remove = (tagId: string) => {
    const next = withoutTag(value, tagId);
    onChange?.(next);
    /* The last chip leaves and takes its strip with it: the focus goes to the input instead
       of falling to the page. */
    if (next.length === 0) inputRef.current?.focus();
  };

  const chips: TagItem[] = chosenOptions(options, value).map((option) => ({
    id: option.value,
    label: option.label,
    ...(option.tone === undefined ? {} : { tone: option.tone }),
    ...(disabled ? {} : { onRemove: () => remove(option.value) }),
  }));

  return (
    /* The chips sit beside the combobox, not inside it: React Aria builds the combobox's
       list from what it holds, and a tag group in there is read as part of that list. The
       popover is anchored to the whole box and as wide as it — the list continues the field,
       and the input alone is a sliver after the last chip. */
    <Group
      ref={boxRef}
      isDisabled={disabled}
      isInvalid={invalid}
      className={(state) =>
        fieldGroupStyles({
          ...state,
          /* The box grows with the chips: five categories wrap to a second line instead of
             scrolling out of sight. */
          className: "h-auto min-h-(--size-control-md) flex-wrap gap-1 py-1 pl-1.5",
        })
      }
    >
      {chips.length === 0 ? null : (
        <Tags
          items={chips}
          {...(labelledBy === undefined
            ? ariaLabel === undefined
              ? {}
              : { label: ariaLabel }
            : { labelledBy })}
        />
      )}
      <AriaComboBox
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        items={listed}
        selectedKey={null}
        onSelectionChange={commit}
        inputValue={text}
        onInputChange={setText}
        /* Arriving at the field shows what can still be added, the way a many2one opens its
           list on focus. With every tag chosen and no text there is nothing to show, and the
           list stays closed. */
        menuTrigger="focus"
        onOpenChange={(isOpen) => {
          if (isOpen) setWidth(boxRef.current?.getBoundingClientRect().width ?? null);
        }}
        isInvalid={invalid}
        isDisabled={disabled}
        className="flex min-w-24 flex-1"
      >
        <TagInput
          inputRef={inputRef}
          placeholder={
            value.length === 0 ? (placeholder ?? copy.inlineEdit.addTag) : undefined
          }
          firstKey={listed[0]?.value ?? null}
          onTake={commit}
          onBackspace={() => {
            const last = value.at(-1);
            if (last !== undefined) onChange?.(withoutTag(value, last));
          }}
          empty={text === ""}
        />
        <Popover
          triggerRef={boxRef}
          /* React Aria's combobox hands its popover the width of the INPUT — a sliver after
             the last chip. The box's own width, measured when the list opens, replaces it. */
          {...(width === null
            ? {}
            : { style: { "--trigger-width": `${width}px` } as CSSProperties })}
          placement="bottom start"
          className="w-(--trigger-width)"
        >
          <ListBox items={listed} className="max-h-[inherit] overflow-auto p-1 outline-0">
            {(item) => (
              <ListBoxItem
                id={item.value}
                textValue={item.label}
                className={(state) =>
                  cn(listOptionStyles(state), item.value === CREATE ? "text-primary" : "")
                }
              >
                {item.value === CREATE ? (
                  <>
                    <Plus
                      aria-hidden
                      className="size-(--size-icon-sm) shrink-0"
                      strokeWidth={2}
                    />
                    <span className="truncate font-medium">{item.label}</span>
                  </>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </AriaComboBox>
    </Group>
  );
}

/** The input after the chips. It reads the combobox's state to know whether the keyboard
 *  marked an option — Enter with nothing marked takes the first match. */
function TagInput({
  inputRef,
  placeholder,
  firstKey,
  onTake,
  onBackspace,
  empty,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string | undefined;
  firstKey: string | null;
  onTake: (key: Key) => void;
  onBackspace: () => void;
  empty: boolean;
}) {
  const state = useContext(ComboBoxStateContext);
  /* While typing, the first match is MARKED — so the row Enter is going to take is the row
     the eye sees tinted, not a guess. Only when the keyboard has not marked another one. */
  const open = state?.isOpen === true;
  useEffect(() => {
    if (state === null || !open || empty || firstKey === null) return;
    const focused = state.selectionManager.focusedKey;
    if (focused === null || state.collection.getItem(focused) === null) {
      state.selectionManager.setFocusedKey(firstKey);
    }
  }, [state, open, empty, firstKey]);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && empty) {
      onBackspace();
      return;
    }
    if (event.key !== "Enter" || empty || firstKey === null) return;
    if (state?.selectionManager.focusedKey != null) return;
    /* Stopped in the capture phase, so React Aria's own Enter — «commit nothing, reset the
       text» — does not run after ours. */
    event.preventDefault();
    event.stopPropagation();
    state?.close();
    onTake(firstKey);
  };
  return (
    <Input
      ref={inputRef}
      placeholder={placeholder}
      onKeyDownCapture={onKeyDown}
      className="h-(--size-control-sm) min-w-0 flex-1 bg-transparent px-1 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed"
    />
  );
}
