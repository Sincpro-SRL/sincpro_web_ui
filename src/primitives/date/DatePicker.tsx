"use client";

import { type CalendarDate, DateFormatter, parseDate } from "@internationalized/date";
import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { Calendar, RangeCalendar } from "@sincpro/web-ui/primitives/date/Calendar";
import { FieldButton, FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import { useFieldIds } from "@sincpro/web-ui/primitives/field/context";
import { ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { CalendarDays } from "lucide-react";
import {
  DateField as AriaDateField,
  DateInput,
  DatePicker as AriaDatePicker,
  DateRangePicker as AriaDateRangePicker,
  DateSegment,
  Dialog,
} from "react-aria-components";

/**
 * Dates as an ERP stores them — ISO strings, `"2026-10-30"` — typed segment by segment or
 * picked on a calendar.
 *
 * Context: the value is a string and not React Aria's `CalendarDate` because that is what
 * every backend sends and every other control of the system takes. The conversion happens
 * here, once, instead of at each of the hundred places an app reads a date.
 *
 * The field is SEGMENTED, not a free text box: the person types the day, the month and the
 * year in the order of their locale (day/month/year in `es-BO`), the arrows step each one,
 * and an impossible date cannot be written. That order comes from the copy table, never
 * from the browser — see `AriaLocale`.
 */

const segment = tv({
  base: "rounded-mark px-0.5 tabular-nums caret-transparent outline-0 type-literal:px-0 forced-color-adjust-none",
  variants: {
    isPlaceholder: { true: "text-muted" },
    isDisabled: { true: "text-muted forced-colors:text-[GrayText]" },
    isFocused: {
      true: "bg-primary text-surface forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
});

/** The typed segments inside the field box — shared with `TimeField` and `DateTimePicker`
 *  (internal: not in the family barrel). */
export function Segments({ slot }: { slot?: "start" | "end" }) {
  return (
    <DateInput slot={slot} className="flex min-w-0 items-center px-2.5 whitespace-nowrap">
      {(part) => <DateSegment segment={part} className={segment} />}
    </DateInput>
  );
}

function parse(iso: string | null | undefined): CalendarDate | null {
  if (iso === null || iso === undefined || iso === "") return null;
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
}

function useReadDate(): (iso: string | null) => string {
  const copy = useUiCopy();
  /* `toDate("UTC")` is midnight in UTC, so the formatter has to read it in UTC too: in the
     zone of the machine, anywhere west of Greenwich, the 30th was drawn as the 29th. */
  const format = new DateFormatter(copy.locale, { dateStyle: "medium", timeZone: "UTC" });
  return (iso) => {
    const date = parse(iso);
    return date === null ? "" : format.format(date.toDate("UTC"));
  };
}

type Shared = {
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** The earliest and latest day that can be chosen, as ISO dates. */
  min?: string;
  max?: string;
  /** The name of the control when it is NOT inside a `Field` — a cell of an editable table.
   *  Inside a field, the field's label names it. */
  "aria-label"?: string;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the value. */
  mode?: FormMode;
};

/** A date typed by segments, without a calendar: for a form where dates are known by heart
 *  (a birth date, a contract date). */
export function DateField({
  value,
  onChange,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  min,
  max,
  mode,
  "aria-label": ariaLabel,
}: Shared & { value: string | null; onChange?: (next: string | null) => void }) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const read = useReadDate();
  if (useFormMode(mode) === "read") return <ReadValue value={read(value)} />;
  return (
    <AriaLocale>
      <AriaDateField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        value={parse(value)}
        onChange={(next) => onChange?.(next === null ? null : next.toString())}
        minValue={parse(min) ?? undefined}
        maxValue={parse(max) ?? undefined}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full"
      >
        <FieldGroup>
          <Segments />
        </FieldGroup>
      </AriaDateField>
    </AriaLocale>
  );
}

/** A date typed by segments, or picked on a calendar from the button. */
export function DatePicker({
  value,
  onChange,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  min,
  max,
  mode,
  "aria-label": ariaLabel,
}: Shared & { value: string | null; onChange?: (next: string | null) => void }) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const read = useReadDate();
  if (useFormMode(mode) === "read") return <ReadValue value={read(value)} />;
  return (
    <AriaLocale>
      <AriaDatePicker
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        value={parse(value)}
        onChange={(next) => onChange?.(next === null ? null : next.toString())}
        minValue={parse(min) ?? undefined}
        maxValue={parse(max) ?? undefined}
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

export type DateRangeValue = { start: string; end: string };

/** A span of days — a period of a report, the validity of a contract — typed or picked on
 *  two months at once. */
export function DateRangePicker({
  value,
  onChange,
  id: ownId,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  min,
  max,
  mode,
  "aria-label": ariaLabel,
}: Shared & {
  value: DateRangeValue | null;
  onChange?: (next: DateRangeValue | null) => void;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const read = useReadDate();
  if (useFormMode(mode) === "read") {
    return (
      <ReadValue value={value === null ? "" : `${read(value.start)} – ${read(value.end)}`} />
    );
  }
  const start = parse(value?.start);
  const end = parse(value?.end);
  return (
    <AriaLocale>
      <AriaDateRangePicker
        id={id}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        value={start === null || end === null ? null : { start, end }}
        onChange={(next) =>
          onChange?.(
            next === null ? null : { start: next.start.toString(), end: next.end.toString() },
          )
        }
        minValue={parse(min) ?? undefined}
        maxValue={parse(max) ?? undefined}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full"
      >
        <FieldGroup>
          <Segments slot="start" />
          <span aria-hidden className="text-muted">
            –
          </span>
          <Segments slot="end" />
          <FieldButton className="mr-1 ml-auto">
            <CalendarDays aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
          </FieldButton>
        </FieldGroup>
        <Popover placement="bottom end">
          <Dialog className="p-3 outline-0">
            <RangeCalendar months={2} />
          </Dialog>
        </Popover>
      </AriaDateRangePicker>
    </AriaLocale>
  );
}
