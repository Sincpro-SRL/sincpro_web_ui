"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { formatDuration, parseDuration } from "@sincpro/web-ui/primitives/field/duration";
import {
  controlClasses,
  type ControlProps,
  nameOf,
  ReadValue,
} from "@sincpro/web-ui/primitives/field/Field";
import { type KeyboardEvent, useState } from "react";
import { Input, TextField as AriaTextField } from "react-aria-components";

/**
 * A duration in hours, typed and read as «8:30» — the hours of a timesheet, the time a task
 * is estimated at.
 *
 * Context: a `NumberInput` with «8,5» is right for the sum and wrong for the person, who
 * says «ocho y media» and thinks in minutes. So the value stays a NUMBER of hours (8.5, what
 * adds up) and the box speaks hours and minutes. While typing it is free text — «8:30»,
 * «8,5», «8h30», «45m» all mean something — and on leaving the field (or Enter) it is read
 * and redrawn as «h:mm». Something that is not a duration goes back to the last good value
 * instead of being saved as zero. ↑/↓ add or take `step` minutes, 15 by default.
 */
export function DurationInput({
  id: ownId,
  value,
  onChange,
  placeholder = "0:00",
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  step = 15,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** Hours: 8.5 is «8:30». `""` is the empty field. */
  value: number | "";
  onChange?: (hours: number | "") => void;
  placeholder?: string;
  /** Minutes the arrow keys add or take. */
  step?: number;
}) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  /** What is being typed; `null` when the box just shows the value. */
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value === "" ? "" : formatDuration(value);

  if (useFormMode(mode) === "read") {
    return (
      <ReadValue
        value={
          value === "" ? null : (
            <span className="tabular-nums">
              {shown} {copy.field.hours}
            </span>
          )
        }
      />
    );
  }

  const commit = () => {
    if (draft === null) return;
    const parsed = parseDuration(draft);
    setDraft(null);
    if (parsed !== null && parsed !== value) onChange?.(parsed);
  };

  const arrows = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") return commit();
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const base = draft === null ? value : parseDuration(draft);
    const hours = base === "" || base === null ? 0 : base;
    const minutes = Math.round(hours * 60) + (event.key === "ArrowUp" ? step : -step);
    setDraft(null);
    onChange?.(minutes / 60);
  };

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={draft ?? shown}
      onChange={setDraft}
      inputMode="decimal"
      isInvalid={invalid}
      isDisabled={disabled}
      className="flex w-full min-w-0 items-center gap-2"
    >
      <Input
        aria-describedby={describedBy}
        placeholder={placeholder}
        spellCheck={false}
        onBlur={commit}
        onKeyDown={arrows}
        className={`${controlClasses(invalid)} tabular-nums`}
      />
      <span className="shrink-0 text-meta text-muted">{copy.field.hours}</span>
    </AriaTextField>
  );
}
