"use client";

import {
  type CalendarDateTime,
  DateFormatter,
  type DateValue,
  parseDateTime,
  parseTime,
  type Time,
  toCalendarDate,
} from "@internationalized/date";
import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Calendar } from "@sincpro/web-ui/primitives/date/Calendar";
import { Segments } from "@sincpro/web-ui/primitives/date/DatePicker";
import { FieldButton, FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { CalendarDays } from "lucide-react";
import {
  DatePicker as AriaDatePicker,
  Dialog,
  TimeField as AriaTimeField,
} from "react-aria-components";

/**
 * A time of day, and a day with its time — an appointment, a delivery slot — as an ERP
 * stores them: `"09:05"` and `"2026-10-30T09:05"`.
 *
 * Context: the same contract as `DatePicker` — a string in, a string out, converted here
 * once. The time is 24h and without seconds because that is what a backend column of a
 * time keeps; the time with a date is LOCAL and without a zone, because «the delivery is
 * on the 30th at nine» is a wall-clock time where the warehouse is, not an instant: putting
 * a zone on it is the backend's decision, not the field's.
 *
 * What the person SEES follows the locale of the copy: the hour cycle (12h with «p. m.» or
 * 24h) is the one `Intl` gives that locale through `AriaLocale`. CLDR writes `es-BO` in 12h;
 * a company that works in 24h passes `hourCycle={24}` — the value stays `"15:05"` either way.
 */

const pad = (n: number) => String(n).padStart(2, "0");

const hhmm = (time: { hour: number; minute: number }) =>
  `${pad(time.hour)}:${pad(time.minute)}`;

/* `"09:05"` or `"09:05:00"` — a column of type time often comes with its seconds. */
function parseClock(value: string | null | undefined): Time | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    return parseTime(value);
  } catch {
    return null;
  }
}

/* `"2026-10-30T09:05"`; a bare `"2026-10-30"` is that day at midnight, so a `min` can be a day. */
function parseStamp(value: string | null | undefined): CalendarDateTime | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    return parseDateTime(value);
  } catch {
    return null;
  }
}

/* React Aria's `toString()` adds the seconds; the contract is to the minute. */
function stampOf(value: DateValue): string {
  const time = "hour" in value ? hhmm(value) : "00:00";
  return `${toCalendarDate(value).toString()}T${time}`;
}

type HourCycle = 12 | 24;

/* Read mode draws what the segments would: the locale's format, its hour cycle unless the
   control forces one. Everything is formatted in UTC from UTC parts, so the zone of the
   machine never moves the clock. */
function useReadClock(options: Intl.DateTimeFormatOptions, hourCycle?: HourCycle) {
  const copy = useUiCopy();
  return new DateFormatter(copy.locale, {
    ...options,
    timeZone: "UTC",
    ...(hourCycle === undefined ? {} : { hourCycle: hourCycle === 24 ? "h23" : "h12" }),
  });
}

type Shared = {
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** 12h or 24h. By default, the one of the copy's locale. Only the display: the value is
   *  always 24h. */
  hourCycle?: HourCycle;
  /** The name of the control when it is NOT inside a `Field` — a cell of an editable table.
   *  Inside a field, the field's label names it. */
  "aria-label"?: string;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the value. */
  mode?: FormMode;
};

/** A time of day typed by segments — the hour of an appointment, the opening of a shift.
 *  The value is `"HH:MM"` in 24h, or `null`. */
export function TimeField({
  value,
  onChange,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  min,
  max,
  hourCycle,
  mode,
  "aria-label": ariaLabel,
}: Shared & {
  value: string | null;
  onChange?: (next: string | null) => void;
  /** The earliest and latest time that can be typed, as `"HH:MM"`. */
  min?: string;
  max?: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const format = useReadClock({ timeStyle: "short" }, hourCycle);
  if (useFormMode(mode) === "read") {
    const time = parseClock(value);
    return (
      <ReadValue
        value={
          time === null
            ? ""
            : format.format(new Date(Date.UTC(1970, 0, 1, time.hour, time.minute)))
        }
      />
    );
  }
  return (
    <AriaLocale>
      <AriaTimeField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        value={parseClock(value)}
        onChange={(next) => onChange?.(next === null ? null : hhmm(next))}
        minValue={parseClock(min) ?? undefined}
        maxValue={parseClock(max) ?? undefined}
        hourCycle={hourCycle}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full"
      >
        <FieldGroup>
          <Segments />
        </FieldGroup>
      </AriaTimeField>
    </AriaLocale>
  );
}

/** A day and its time — a delivery slot, an appointment: the day typed or picked on the
 *  calendar, the time typed after it. The value is a local `"YYYY-MM-DDTHH:MM"`, or `null`. */
export function DateTimePicker({
  value,
  onChange,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  min,
  max,
  hourCycle,
  mode,
  "aria-label": ariaLabel,
}: Shared & {
  value: string | null;
  onChange?: (next: string | null) => void;
  /** The earliest and latest moment, as `"YYYY-MM-DDTHH:MM"` or a bare day `"YYYY-MM-DD"`. */
  min?: string;
  max?: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const format = useReadClock({ dateStyle: "medium", timeStyle: "short" }, hourCycle);
  if (useFormMode(mode) === "read") {
    const stamp = parseStamp(value);
    return <ReadValue value={stamp === null ? "" : format.format(stamp.toDate("UTC"))} />;
  }
  return (
    <AriaLocale>
      <AriaDatePicker
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        value={parseStamp(value)}
        onChange={(next) => onChange?.(next === null ? null : stampOf(next))}
        minValue={parseStamp(min) ?? undefined}
        maxValue={parseStamp(max) ?? undefined}
        granularity="minute"
        hourCycle={hourCycle}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full"
      >
        <FieldGroup>
          <Segments />
          <FieldButton className="mr-1 ml-auto">
            <CalendarDays aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
          </FieldButton>
        </FieldGroup>
        <Popover placement="bottom end">
          <Dialog className="p-3 outline-0">
            <Calendar />
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </AriaLocale>
  );
}
