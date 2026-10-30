"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import { type ChoiceOption, labelOf } from "@sincpro/web-ui/primitives/choice/options";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import {
  RadioButton,
  RadioField,
  RadioGroup as AriaRadioGroup,
  Text,
} from "react-aria-components";

/**
 * One of few, all in sight: the payment method of a sale, the kind of a contact.
 *
 * Context: the rule against a `Select` — when there are few and there is room, they are
 * shown, because knowing what can be chosen is half the decision. `SegmentedControl` draws
 * them as buttons in a row, for two or three short words; this is the list form, for when an
 * option needs a second line that explains it, or when there are five.
 *
 * The mark is the system's `Checkbox` mark made round — same size, same border, same
 * primary when on — so a form that mixes both reads as one set of controls. A dot inside,
 * not a check: a round mark with a check is a checkbox that lost its corners.
 */

const mark = tv({
  base: "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-pill border transition-colors duration-(--duration-instant) forced-color-adjust-none",
  variants: {
    isSelected: {
      false: "border-line-strong bg-surface forced-colors:border-[ButtonBorder]",
      true: "border-primary bg-primary forced-colors:border-[Highlight] forced-colors:bg-[Highlight]",
    },
    isInvalid: {
      true: "border-danger forced-colors:border-[Mark]",
    },
    isFocusVisible: {
      true: "outline-2 outline-offset-2 outline-primary forced-colors:outline-[Highlight]",
    },
  },
});

export type RadioGroupProps = {
  /** The chosen option's `value`, or `null` while nothing is chosen. */
  value: string | null;
  onChange?: (next: string) => void;
  options: readonly ChoiceOption[];
  /** `horizontal` for a few one-word options in a wide form; descriptions read better in a
   *  column. */
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the label. */
  mode?: FormMode;
};

export function RadioGroup({
  value,
  onChange,
  options,
  orientation = "vertical",
  disabled = false,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  mode,
}: RadioGroupProps) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  if (useFormMode(mode) === "read") return <ReadValue value={labelOf(options, value)} />;
  return (
    <AriaRadioGroup
      id={id}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      value={value}
      onChange={(next) => onChange?.(next)}
      orientation={orientation}
      isInvalid={invalid}
      isDisabled={disabled}
      /* `py-2` puts the first label on the same line a text input's would sit on, so the
         field does not look shorter than its neighbours in the same row. */
      className={
        orientation === "horizontal"
          ? "flex min-w-0 flex-wrap items-start gap-x-5 gap-y-2 py-2"
          : "flex min-w-0 flex-col gap-2.5 py-2"
      }
    >
      {options.map((o) => (
        <RadioField
          key={o.value}
          value={o.value}
          isDisabled={o.disabled}
          className="flex min-w-0 flex-col data-disabled:opacity-45"
        >
          <RadioButton className="group flex min-w-0 cursor-pointer items-start gap-2.5 text-meta text-ink disabled:cursor-not-allowed">
            {(state) => (
              <>
                <span className={mark(state)}>
                  <span
                    className={`size-1.5 rounded-pill bg-surface transition-transform duration-(--duration-instant) ${
                      state.isSelected ? "scale-100" : "scale-0"
                    }`}
                  />
                </span>
                <span className="min-w-0">{o.label}</span>
              </>
            )}
          </RadioButton>
          {o.description === undefined ? null : (
            <Text slot="description" className="ml-6.5 text-micro text-muted">
              {o.description}
            </Text>
          )}
        </RadioField>
      ))}
    </AriaRadioGroup>
  );
}
