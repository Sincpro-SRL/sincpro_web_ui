"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { type ChoiceOption, labelOf } from "@sincpro/web-ui/primitives/choice/options";
import {
  FieldButton,
  FieldGroup,
  listOptionStyles,
} from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { Check, ChevronDown } from "lucide-react";
import {
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Text,
  useFilter,
} from "react-aria-components";

/**
 * One of many, found by typing: the customer of an invoice, the product of a line.
 *
 * Context: a `Select` makes you scroll a list you already know the name in; here you type
 * three letters of it. The filter is React Aria's `contains` in the locale of the copy table
 * (`AriaLocale`), so «jose» finds «José» and the comparison does not depend on the browser.
 * The value is the option's `value` string — what the backend stores — never React Aria's
 * `Key`.
 *
 * It is not `Picker`: that one chooses a RECORD among thousands, with metadata rows, a cap
 * and a "see more". This is a closed list already in memory — tens to a few hundred — where
 * one muted line under the name (a tax id, a city) is enough to tell two apart.
 *
 * When nothing matches, the list simply closes: an empty floating box tells nothing the
 * unchanged field does not, and the system has no "no results" sentence of its own here.
 */

/* The row every list dropped from a field shares — Select, Suggest and this one. */
const option = listOptionStyles;

export type ComboBoxProps = {
  /** The chosen option's `value`, or `null` when nothing is chosen. */
  value: string | null;
  onChange?: (next: string | null) => void;
  options: readonly ChoiceOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the label. */
  mode?: FormMode;
};

export function ComboBox({ mode, ...props }: ComboBoxProps) {
  /* Read mode draws the LABEL: the value is the backend's key, the label is what the form
     promised to show. */
  if (useFormMode(mode) === "read") {
    return <ReadValue value={labelOf(props.options, props.value)} />;
  }
  /* The filter reads the locale from React Aria's context, so the box that provides it has
     to be ABOVE the component that asks for it. */
  return (
    <AriaLocale>
      <EditableComboBox {...props} />
    </AriaLocale>
  );
}

function EditableComboBox({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
}: Omit<ComboBoxProps, "mode">) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <AriaComboBox
      id={id}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      /* `defaultItems` and not `items`: with `items` React Aria hands the filtering to the
         consumer. These are the same options every render — only the filtering is React
         Aria's. */
      defaultItems={options}
      value={value}
      onChange={(next) => onChange?.(next === null ? null : String(next))}
      defaultFilter={contains}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full"
    >
      <FieldGroup>
        <Input
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed"
        />
        <FieldButton className="mr-1">
          <ChevronDown aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
        </FieldButton>
      </FieldGroup>
      {/* As wide as the field, because the list continues it: a narrower list reads as a
          menu of something else, a wider one hides the next field for no reason. */}
      <Popover placement="bottom start" className="w-(--trigger-width)">
        <ListBox items={options} className="max-h-[inherit] overflow-auto p-1 outline-0">
          {(item) => (
            <ListBoxItem
              id={item.value}
              textValue={item.label}
              isDisabled={item.disabled}
              className={option}
            >
              {({ isSelected }) => (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Text
                      slot="label"
                      className={`truncate ${isSelected ? "font-medium" : ""}`}
                    >
                      {item.label}
                    </Text>
                    {item.description === undefined ? null : (
                      <Text slot="description" className="truncate text-micro text-muted">
                        {item.description}
                      </Text>
                    )}
                  </span>
                  <span className="flex size-(--size-icon-md) shrink-0 items-center justify-center">
                    {isSelected ? (
                      <Check
                        aria-hidden
                        className="size-(--size-icon-md) text-primary forced-colors:text-[HighlightText]"
                        strokeWidth={2}
                      />
                    ) : null}
                  </span>
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
