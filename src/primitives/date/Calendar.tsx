"use client";

import { type CalendarDate, parseDate } from "@internationalized/date";
import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  type DateValue as AriaDateValue,
  RangeCalendar as AriaRangeCalendar,
  useLocale,
} from "react-aria-components";

/**
 * The month grid — on its own, or inside the popover of a date picker.
 *
 * Context: keyboard and screen reader behave like a native calendar because React Aria
 * implements the grid pattern (arrows move a day, PageUp/PageDown a month, Home/End the
 * week). The selected day is the system's `primary`, not the gold: the gold is for the ONE
 * action of a screen, and a calendar is not an action.
 */

const navButton = tv({
  extend: focusRing,
  base: "inline-flex size-(--size-control-sm) items-center justify-center rounded-control text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink pressed:bg-ink/10 disabled:text-line-strong",
});

function Header() {
  const { direction } = useLocale();
  const [Prev, Next] =
    direction === "rtl" ? [ChevronRight, ChevronLeft] : [ChevronLeft, ChevronRight];
  return (
    <header className="mb-2 flex items-center gap-1">
      <AriaButton slot="previous" className={navButton}>
        <Prev aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
      </AriaButton>
      <CalendarHeading className="flex-1 text-center text-body font-semibold text-ink first-letter:uppercase" />
      <AriaButton slot="next" className={navButton}>
        <Next aria-hidden className="size-(--size-icon-md)" strokeWidth={2} />
      </AriaButton>
    </header>
  );
}

function WeekDays() {
  return (
    <CalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="pb-1 text-micro font-medium text-muted">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeader>
  );
}

const dayCell = tv({
  extend: focusRing,
  base: "flex size-(--size-control-md) cursor-default items-center justify-center rounded-control text-meta tabular-nums outside-month:text-line-strong forced-color-adjust-none",
  variants: {
    isSelected: {
      false: "text-ink hover:bg-ink/6 pressed:bg-ink/10",
      true: "bg-primary font-medium text-surface invalid:bg-danger forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isDisabled: {
      true: "text-line-strong hover:bg-transparent forced-colors:text-[GrayText]",
    },
    isToday: {
      true: "font-semibold underline decoration-2 underline-offset-4",
    },
  },
});

/* ISO in, ISO out — the same contract as `DatePicker`. Inside a picker none of these are
   passed and the calendar reads the picker's state from React Aria's context; only the
   props that ARE given are forwarded, so an `undefined` never shadows that context. */
function iso(value: string | null | undefined): CalendarDate | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function defined<T extends object>(props: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(props).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export type CalendarProps = {
  /** The chosen day, as an ISO date — `"2026-10-30"`. */
  value?: string | null;
  onChange?: (next: string) => void;
  /** The earliest and latest day that can be chosen, as ISO dates. */
  min?: string;
  max?: string;
  /** A day that cannot be chosen — a holiday, a closed day. Receives the ISO date. */
  isUnavailable?: (date: string) => boolean;
  "aria-label"?: string;
};

/** One month, to pick one day. */
export function Calendar({
  value,
  onChange,
  min,
  max,
  isUnavailable,
  ...rest
}: CalendarProps) {
  const props = defined({
    value: iso(value),
    onChange:
      onChange === undefined ? undefined : (next: AriaDateValue) => onChange(next.toString()),
    minValue: iso(min) ?? undefined,
    maxValue: iso(max) ?? undefined,
    isDateUnavailable:
      isUnavailable === undefined
        ? undefined
        : (date: AriaDateValue) => isUnavailable(date.toString()),
  });
  return (
    <AriaLocale>
      <AriaCalendar {...rest} {...props} className="w-fit">
        <Header />
        <CalendarGrid className="border-separate border-spacing-0.5">
          <WeekDays />
          <CalendarGridBody>
            {(date) => <CalendarCell date={date} className={dayCell} />}
          </CalendarGridBody>
        </CalendarGrid>
      </AriaCalendar>
    </AriaLocale>
  );
}

const rangeDay = tv({
  extend: focusRing,
  base: "flex size-full items-center justify-center rounded-control forced-color-adjust-none",
  variants: {
    position: {
      none: "text-ink group-hover:bg-ink/6 group-pressed:bg-ink/10",
      middle: "text-ink group-hover:bg-primary/18",
      cap: "bg-primary font-medium text-surface group-invalid:bg-danger forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isDisabled: {
      true: "text-line-strong forced-colors:text-[GrayText]",
    },
  },
});

export type RangeCalendarProps = {
  /** The chosen span, as ISO dates. */
  value?: { start: string; end: string } | null;
  onChange?: (next: { start: string; end: string }) => void;
  min?: string;
  max?: string;
  /** Two months side by side: what a range across a month boundary needs to be seen whole. */
  months?: 1 | 2;
  "aria-label"?: string;
};

/** One or two months, to pick a span: the first click opens it, the second closes it. */
export function RangeCalendar({
  months = 1,
  value,
  onChange,
  min,
  max,
  ...rest
}: RangeCalendarProps) {
  const start = iso(value?.start);
  const end = iso(value?.end);
  const props = defined({
    value: value === undefined ? undefined : start && end ? { start, end } : null,
    onChange:
      onChange === undefined
        ? undefined
        : (next: { start: AriaDateValue; end: AriaDateValue }) =>
            onChange({ start: next.start.toString(), end: next.end.toString() }),
    minValue: iso(min) ?? undefined,
    maxValue: iso(max) ?? undefined,
  });
  return (
    <AriaLocale>
      <AriaRangeCalendar {...rest} {...props} visibleDuration={{ months }} className="w-fit">
        <Header />
        <div className="flex gap-4">
          {Array.from({ length: months }, (_, i) => (
            <CalendarGrid
              key={i}
              offset={{ months: i }}
              className="border-separate border-spacing-y-0.5"
            >
              <WeekDays />
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="group size-(--size-control-md) cursor-default text-meta tabular-nums outside-month:invisible selected:bg-primary/10 selection-start:rounded-s-control selection-end:rounded-e-control"
                  >
                    {({
                      formattedDate,
                      isSelected,
                      isSelectionStart,
                      isSelectionEnd,
                      isFocusVisible,
                      isDisabled,
                    }) => (
                      <span
                        className={rangeDay({
                          position:
                            isSelected && (isSelectionStart || isSelectionEnd)
                              ? "cap"
                              : isSelected
                                ? "middle"
                                : "none",
                          isDisabled,
                          isFocusVisible,
                        })}
                      >
                        {formattedDate}
                      </span>
                    )}
                  </CalendarCell>
                )}
              </CalendarGridBody>
            </CalendarGrid>
          ))}
        </div>
      </AriaRangeCalendar>
    </AriaLocale>
  );
}
