"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { FieldGroup, listOptionStyles } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  ListBoxItem,
  useFilter,
} from "react-aria-components";

/**
 * A text with suggestions: the open field that proposes.
 *
 * Context: there were two text controls and neither served the most common case of an ERP
 * form. `Select` is a CLOSED list —what is not there cannot be written— and `TextInput` is
 * free but does not help. The unit of a product, the bank of a payment, the city of a
 * customer: fields where values already exist and they have to be offered **without
 * forbidding a new one**.
 *
 * What not having it costs shows in the data: without suggestions «Bs.», «BOB» and
 * «bolivianos» end up in the same column, and then somebody writes a `CASE` to unify them.
 *
 * ── Why it is not a `<datalist>` ────────────────────────────────────
 *
 * Because every browser draws it its own way and none follows the tokens: in the middle of a
 * form with the system's type, radius and colors, an operating-system dropdown appears. It is
 * React Aria's `ComboBox` with `allowsCustomValue` instead: the list floats on the system's
 * `Popover`, the keyboard is a combobox's (arrows move, Enter picks, Escape closes), and
 * whatever is typed stays typed. The filter is React Aria's `contains` in the copy's locale,
 * so «potosi» finds «Potosí».
 *
 * ── What it is NOT ──────────────────────────────────────────────────
 *
 * It is not `ComboBox`, whose value must be one of its options, nor `Picker`, which chooses
 * ONE record among thousands with its own search, metadata rows and dialog. This is a text
 * field that also proposes: the list is short, it is of values and not of records, and what
 * is stored is what was written.
 */

export type SuggestProps = {
  id?: string;
  value: string;
  onChange?: (next: string) => void;
  /** What already exists. Short: if they are hundreds, what is needed is a `Picker`. */
  suggestions: readonly string[];
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  mono?: boolean;
  mode?: FormMode;
  /** How many are shown at once. More than this is a list to be read, and reading a list
   *  is what this control exists to avoid. */
  max?: number;
  /** The name of the field when it is not inside a `Field`. */
  "aria-label"?: string;
};

const MAX = 8;

export function Suggest({ mode, ...props }: SuggestProps) {
  if (useFormMode(mode) === "read")
    return <ReadValue value={props.value} mono={props.mono} />;
  /* The filter reads the locale from React Aria's context, so the box that provides it has
     to be ABOVE the component that asks for it. */
  return (
    <AriaLocale>
      <EditableSuggest {...props} />
    </AriaLocale>
  );
}

function EditableSuggest({
  id: ownId,
  value,
  onChange,
  suggestions,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mono = false,
  max = MAX,
  "aria-label": ariaLabel,
}: Omit<SuggestProps, "mode">) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const { contains } = useFilter({ sensitivity: "base" });

  /* Filtered by what is typed, hiding the one that ALREADY is exactly the value: offering
     what someone just finished typing is a suggestion that suggests nothing. The list is
     filtered here and not by React Aria because of that rule and of `max`. */
  const needle = value.trim();
  /* «Exactly» ignores case but NOT accents: «potosi» still offers «Potosí», which is the
     spelling the person was reaching for. */
  const exact = needle.toLocaleLowerCase();
  const shown = suggestions
    .filter((one) => one.toLocaleLowerCase() !== exact)
    .filter((one) => needle === "" || contains(one, needle))
    .slice(0, max)
    .map((one) => ({ id: one }));

  return (
    <AriaComboBox
      id={id}
      aria-labelledby={labelledBy}
      aria-label={labelledBy === undefined ? (ariaLabel ?? placeholder) : ariaLabel}
      /* An open field: what is typed is the value, a suggestion only fills it faster. */
      allowsCustomValue
      inputValue={value}
      onInputChange={(next) => onChange?.(next)}
      items={shown}
      /* It proposes as soon as the field is entered, like the hand-written one did: the
         suggestions are most useful BEFORE anything is typed. */
      menuTrigger="focus"
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <FieldGroup>
        <Input
          aria-describedby={describedBy}
          placeholder={placeholder}
          className={`h-full min-w-0 flex-1 bg-transparent px-2.5 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed ${
            mono ? "font-mono" : ""
          }`}
        />
      </FieldGroup>
      <Popover placement="bottom start" className="w-(--trigger-width)">
        <ListBox className="max-h-[inherit] overflow-auto p-1 outline-0">
          {(item: { id: string }) => (
            <ListBoxItem id={item.id} textValue={item.id} className={listOptionStyles}>
              <span className={`min-w-0 truncate ${mono ? "font-mono" : ""}`}>{item.id}</span>
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
