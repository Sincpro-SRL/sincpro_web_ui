"use client";

import { useFieldIds } from "@sincpro/web-ui/foundations/form";
import { type FormMode, useFormMode } from "@sincpro/web-ui/foundations/form";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { type ChoiceOption, labelOf } from "@sincpro/web-ui/primitives/choice/options";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
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
  /**
   * `cards` draws each option as a box pressed whole, with its icon — the payment methods of
   * a till, «Comer aquí / Para llevar» on a kiosk, the shipping of a shop: few options, chosen
   * by a finger, where the dot of a list is too small a target. The grid fits as many as the
   * width takes. It is still one radio group: arrows move, one is chosen.
   */
  look?: "list" | "cards";
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
  look = "list",
}: RadioGroupProps) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  if (useFormMode(mode) === "read") return <ReadValue value={labelOf(options, value)} />;
  if (look === "cards") {
    return (
      <AriaRadioGroup
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        value={value}
        onChange={(next) => onChange?.(next)}
        isInvalid={invalid}
        isDisabled={disabled}
        data-ui="radio-group"
        data-look="cards"
        className="grid min-w-0 grid-cols-(--grid-tiles-sm) gap-2"
      >
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <RadioField
              key={o.value}
              value={o.value}
              isDisabled={o.disabled}
              className="flex min-w-0"
            >
              <RadioButton
                data-ui="radio-group.card"
                className={({ isSelected, isFocusVisible, isDisabled }) =>
                  `relative flex min-h-(--size-control-lg) w-full min-w-0 cursor-pointer flex-col items-start gap-1 rounded-ui-record-card border p-3 text-left transition-colors duration-(--duration-instant) ${
                    isSelected
                      ? "border-primary bg-primary/6 ring-1 ring-primary"
                      : "border-line-strong bg-surface hover:border-ink/40"
                  } ${isFocusVisible ? "outline-2 outline-offset-2 outline-primary" : ""} ${
                    isDisabled ? "cursor-not-allowed opacity-45" : ""
                  }`
                }
              >
                {(state) => (
                  <>
                    <span className={`absolute top-3 right-3 ${mark(state)}`}>
                      <span
                        className={`size-1.5 rounded-pill bg-surface transition-transform duration-(--duration-instant) ${
                          state.isSelected ? "scale-100" : "scale-0"
                        }`}
                      />
                    </span>
                    {Icon === undefined ? null : (
                      <Icon
                        aria-hidden
                        className={`size-(--size-icon-lg) ${state.isSelected ? "text-primary" : "text-muted"}`}
                        strokeWidth={1.75}
                      />
                    )}
                    <span className="min-w-0 pr-6 text-body font-medium text-ink">
                      {o.label}
                    </span>
                    {o.description === undefined ? null : (
                      <span className="min-w-0 text-micro text-muted">{o.description}</span>
                    )}
                  </>
                )}
              </RadioButton>
            </RadioField>
          );
        })}
      </AriaRadioGroup>
    );
  }
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
          className="flex min-w-0 flex-col"
        >
          {/* The option fades when it cannot be chosen; its description does NOT: it is
              usually the reason («requiere una licencia»), and a reason nobody can read
              explains nothing. */}
          <RadioButton className="group flex min-w-0 cursor-pointer items-start gap-2.5 text-meta text-ink disabled:cursor-not-allowed data-disabled:opacity-45">
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
