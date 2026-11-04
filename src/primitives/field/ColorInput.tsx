"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { type ControlProps, nameOf, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import {
  ColorField,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  Input,
  parseColor,
} from "react-aria-components";

/** A hex the color parser takes, or `null`. */
function colorOf(value: string) {
  try {
    return value.trim() === "" ? null : parseColor(value);
  } catch {
    return null;
  }
}

const SWATCH = "size-(--size-icon-md) shrink-0 rounded-mark border border-line-strong";

/**
 * A color: the label of a tag, the color of a stage, a brand color — as a hex «#1F6FEB».
 *
 * Context: it is React Aria's colour set. `ColorField` takes the hex typed or pasted (with or
 * without `#`) and reads it back normalised; `ColorSwatch` draws it with the colour's NAME
 * as its accessible name («azul oscuro vívido»), so a screen reader hears a colour and not
 * six hex digits; `ColorSwatchPicker` is the row of `swatches` the application offers — its
 * own palette, never one baked in here — moved through with the arrow keys.
 *
 * The colours are DATA (what the record holds), so they are drawn from the value and not
 * from the tokens; everything around them is the system's.
 */
export function ColorInput({
  id: ownId,
  value,
  onChange,
  swatches,
  placeholder = "#RRGGBB",
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** «#RRGGBB»; `""` is no colour. */
  value: string;
  onChange?: (hex: string) => void;
  /** The application's palette, offered above the field. */
  swatches?: readonly string[];
  placeholder?: string;
}) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const color = colorOf(value);

  if (useFormMode(mode) === "read") {
    return (
      <ReadValue
        mono
        value={
          color === null ? null : (
            <span className="flex items-center gap-2">
              <ColorSwatch color={color} className={SWATCH} />
              {color.toString("hex")}
            </span>
          )
        }
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      {swatches === undefined || swatches.length === 0 ? null : (
        <ColorSwatchPicker
          aria-label={copy.field.palette}
          {...(color === null ? {} : { value: color })}
          onChange={(next) => onChange?.(next.toString("hex"))}
          className="flex flex-wrap gap-1"
        >
          {swatches.map((one) => (
            <ColorSwatchPickerItem
              key={one}
              color={one}
              isDisabled={disabled}
              className="rounded-mark p-0.5 outline-0 data-focus-visible:outline-2 data-focus-visible:outline-primary data-selected:ring-2 data-selected:ring-primary"
            >
              <ColorSwatch className={SWATCH} />
            </ColorSwatchPickerItem>
          ))}
        </ColorSwatchPicker>
      )}
      <ColorField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
        value={color}
        onChange={(next) => onChange?.(next === null ? "" : next.toString("hex"))}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full min-w-0"
      >
        <FieldGroup isInvalid={invalid} isDisabled={disabled}>
          {color === null ? (
            <span aria-hidden className={`ml-2 ${SWATCH} bg-ground`} />
          ) : (
            <ColorSwatch color={color} className={`ml-2 ${SWATCH}`} />
          )}
          <Input
            aria-describedby={describedBy}
            placeholder={placeholder}
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-meta text-ink uppercase outline-0 placeholder:text-muted disabled:cursor-not-allowed"
          />
        </FieldGroup>
      </ColorField>
    </div>
  );
}
