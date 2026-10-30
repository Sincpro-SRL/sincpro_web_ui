"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Check, Minus } from "lucide-react";
import { useId } from "react";
import {
  Checkbox as AriaCheckbox,
  ListBox,
  ListBoxItem,
  type Selection,
  Text,
} from "react-aria-components";

/* ==================================================================== *
 *  CHECKS — a form answer, and a list you can select more than one of.
 *
 *  `Switch` changes something NOW. A check is the opposite: it is an answer
 *  that waits to be submitted. Using one for the other promises a confirmation
 *  that does not exist, or hides one that does.
 *
 *  `CheckList` is the case a native checkbox stack cannot draw: each row has
 *  a name AND a second line (what the option is). The keyboard is the listbox
 *  one — arrows move, Space toggles — because Tab through twelve options is
 *  how a form becomes a chore. Both are React Aria's: `Checkbox` is a real
 *  checkbox input underneath, `CheckList` a `ListBox` with multiple selection.
 * ==================================================================== */

export interface CheckItem {
  value: string;
  label: string;
  /** The second line: what the thing is, not a second name. */
  detail?: string;
  disabled?: boolean;
}

function Mark({
  on,
  mixed,
  focus = false,
  invalid = false,
}: {
  on: boolean;
  mixed: boolean;
  focus?: boolean;
  invalid?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-mark border transition-colors duration-(--duration-instant) forced-color-adjust-none ${
        on
          ? "border-primary bg-primary text-surface forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]"
          : `bg-surface text-transparent ${invalid ? "border-danger" : "border-line-strong"} forced-colors:border-[ButtonBorder]`
      } ${focus ? "outline-2 outline-offset-2 outline-primary forced-colors:outline-[Highlight]" : ""}`}
    >
      {mixed ? (
        <Minus className="size-3" strokeWidth={2.5} />
      ) : (
        <Check className="size-3" strokeWidth={2.5} />
      )}
    </span>
  );
}

/**
 * One yes/no answer of a form: «Exento de IVA», «Enviar la factura por correo al
 * publicar».
 *
 * Context: it is React Aria's `Checkbox` — a native checkbox input inside the label, so the
 * whole sentence is the click target, Space toggles it and the form reads it as a checkbox.
 * `mixed` is its indeterminate state: the parent of a group where only some are on, and
 * pressing it turns them ALL on — never all off, because «some» is closer to «all» than to
 * «none» in what the person was doing.
 *
 * Inside a `Field` it is named by the field's label AND its own sentence, and described by
 * the field's hint and error — the same wiring as `Switch`.
 */
export function Checkbox({
  checked,
  mixed = false,
  onChange,
  label,
  disabled = false,
  mode,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
}: {
  checked: boolean;
  /** Some of the children are on. Pressing it turns them all on. */
  mixed?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  mode?: FormMode;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const textId = useId();
  const on = checked || mixed;

  if (useFormMode(mode) === "read") {
    return (
      <span className="flex min-h-(--size-control-md) items-center gap-2 text-meta text-ink">
        <Mark on={on} mixed={mixed && !checked} />
        {label}
      </span>
    );
  }

  return (
    <AriaCheckbox
      id={id}
      /* Only when a field names it too: alone, the label it is wrapped in already does. */
      aria-labelledby={labelledBy === undefined ? undefined : `${labelledBy} ${textId}`}
      aria-describedby={describedBy}
      isSelected={checked}
      isIndeterminate={mixed}
      onChange={(next) => onChange?.(mixed ? true : next)}
      isDisabled={disabled}
      isInvalid={invalid}
      className="group inline-flex min-w-0 cursor-pointer items-center gap-2.5 text-meta text-ink disabled:cursor-not-allowed disabled:opacity-45"
    >
      {({ isSelected, isIndeterminate, isFocusVisible, isInvalid }) => (
        <>
          <Mark
            on={isSelected || isIndeterminate}
            mixed={isIndeterminate}
            focus={isFocusVisible}
            invalid={isInvalid}
          />
          <span id={textId} className="min-w-0">
            {label}
          </span>
        </>
      )}
    </AriaCheckbox>
  );
}

/** The chosen values, in the order the person picked them — what `onChange` hands back. */
function valuesOf(keys: Selection, items: readonly CheckItem[]): string[] {
  if (keys === "all") return items.filter((item) => !item.disabled).map((item) => item.value);
  return [...keys].map(String);
}

/**
 * Several answers, all in sight, more than one allowed: the taxes of a product, the
 * warehouses a user can see, the documents of an export.
 *
 * Context: it is React Aria's `ListBox` with `selectionMode="multiple"` and not a stack of
 * checkboxes, because what it is to a keyboard is ONE stop with a list inside — Tab lands on
 * it, the arrows move, Space toggles, Home and End jump, a letter finds the row — and twelve
 * Tab stops is how a form becomes a chore. A disabled row is drawn and skipped. The value is
 * a plain `string[]`, never React Aria's `Selection`.
 *
 * `mono` is for when the label was written by the machine — an account code, a tax code —
 * and the detail was written by a person. The two faces are the point.
 */
export function CheckList({
  label,
  items,
  value,
  onChange,
  mono = false,
  emptyLabel,
  describedBy: ownDescribedBy,
  mode,
}: {
  label: string;
  items: readonly CheckItem[];
  value: readonly string[];
  onChange?: (next: string[]) => void;
  mono?: boolean;
  /** What read mode says when nothing is chosen. By default, the copy table's `field.none`. */
  emptyLabel?: string;
  describedBy?: string;
  mode?: FormMode;
}) {
  const labelId = useId();
  const { describedBy } = useFieldIds({ describedBy: ownDescribedBy });
  const none = useUiCopy().field.none;

  if (useFormMode(mode) === "read") {
    const picked = items.filter((item) => value.includes(item.value));
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-micro text-muted">{label}</p>
        <p className={`text-meta text-ink ${mono ? "font-mono" : ""}`}>
          {picked.length === 0
            ? (emptyLabel ?? none)
            : picked.map((item) => item.label).join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p id={labelId} className="text-micro text-muted">
        {label}
      </p>
      <ListBox
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        items={items}
        selectionMode="multiple"
        selectedKeys={value}
        onSelectionChange={(keys) => onChange?.(valuesOf(keys, items))}
        disabledKeys={items.filter((item) => item.disabled).map((item) => item.value)}
        shouldFocusWrap
        className="flex flex-col overflow-hidden rounded-box border border-line bg-surface outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {(item) => (
          <ListBoxItem
            id={item.value}
            textValue={item.label}
            className={({ isSelected, isFocusVisible, isDisabled }) =>
              `flex min-w-0 cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-left outline-0 last:border-b-0 ${
                isFocusVisible
                  ? "outline-2 -outline-offset-2 outline-primary forced-colors:outline-[Highlight]"
                  : ""
              } ${isDisabled ? "cursor-not-allowed opacity-45" : ""} ${
                isSelected ? "bg-primary/8" : "hover:bg-ink/4"
              }`
            }
          >
            {({ isSelected }) => (
              <>
                <Mark on={isSelected} mixed={false} />
                <span className="flex min-w-0 flex-col">
                  <Text
                    slot="label"
                    className={`truncate text-meta text-ink ${mono ? "font-mono" : ""}`}
                  >
                    {item.label}
                  </Text>
                  {item.detail === undefined ? null : (
                    <Text slot="description" className="truncate text-micro text-muted">
                      {item.detail}
                    </Text>
                  )}
                </span>
              </>
            )}
          </ListBoxItem>
        )}
      </ListBox>
    </div>
  );
}
