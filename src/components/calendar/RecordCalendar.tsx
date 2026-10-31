"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import esLocale from "@fullcalendar/react/locales/es";
import formaThemePlugin from "@fullcalendar/react/themes/forma";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import type { ReactNode } from "react";

export type CalendarView = "month" | "week" | "day" | "agenda";

const VIEW: Record<CalendarView, string> = {
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
  agenda: "listWeek",
};

/* An event takes the colour of what it MEANS — the five tones — and the surface colour on top,
   which keeps ≥ 5.7:1 on every tone in both themes (see `tokens.css`). */
const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--color-muted)",
  info: "var(--color-info)",
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
  accent: "var(--color-primary)",
};

export type RecordCalendarProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  titleOf: (item: T) => string;
  startOf: (item: T) => Date;
  /** Without it the event lasts an hour, or the day when it is all-day. */
  endOf?: (item: T) => Date | undefined;
  allDayOf?: (item: T) => boolean;
  /** What the event means: an overdue call `bad`, a confirmed meeting `good`. */
  toneOf?: (item: T) => Tone;
  /** Who it is with or whose it is — a face on the event, the photo or the initials. */
  avatarOf?: (item: T) => { name: string; src?: string } | undefined;
  /** A second line under the title: the customer, the place. */
  metaOf?: (item: T) => string | undefined;
  /** The whole event drawn by the app — the calendar's equivalent of a board's `card`. Gets
   *  the record and the time text the calendar computed («10:00 – 11:30»). */
  renderEvent?: (item: T, time: string) => ReactNode;
  /** The view it opens on. The calendar's own buttons switch it afterwards. */
  view?: CalendarView;
  /** The day it opens on. Today by default. */
  date?: Date;
  /** An event was dragged to another moment or stretched. The calendar does NOT keep the move:
   *  `items` is the truth — the app saves and passes the new dates back. */
  onMove?: (item: T, start: Date, end: Date | null) => void;
  /** A stretch of empty time was selected: create something there. */
  onCreate?: (start: Date, end: Date, allDay: boolean) => void;
  /** An event was pressed. */
  onOpen?: (item: T) => void;
  /** A height of its own: `auto` grows with the month, a number or `40rem` scrolls inside. */
  height?: number | string;
};

/**
 * Records on a calendar — Odoo's calendar view: meetings, deliveries, due dates.
 *
 * Context: drawn by FullCalendar v7 (MIT standard views: month, week, day, agenda), dressed by
 * `tokens.css` (its `forma` palette points at web-ui's tokens, so it follows the theme). It is a
 * CONTROLLED view of the records: dragging or stretching an event reports `onMove` and the
 * library's own change is undone at once — the app persists and passes the new `items`, so the
 * screen never shows a date the backend refused. Resource rows (per person, per room) are
 * FullCalendar's premium scheduler: a licence away, not built here.
 */
export function RecordCalendar<T>({
  items,
  keyOf,
  titleOf,
  startOf,
  endOf,
  allDayOf,
  toneOf,
  avatarOf,
  metaOf,
  renderEvent,
  view = "month",
  date,
  onMove,
  onCreate,
  onOpen,
  height = "auto",
}: RecordCalendarProps<T>) {
  const copy = useUiCopy();
  const byId = new Map(items.map((item) => [keyOf(item), item]));
  const events = items.map((item) => {
    const tone = toneOf?.(item);
    const end = endOf?.(item);
    return {
      id: keyOf(item),
      title: titleOf(item),
      start: startOf(item),
      ...(end === undefined ? {} : { end }),
      ...(allDayOf === undefined ? {} : { allDay: allDayOf(item) }),
      ...(tone === undefined
        ? {}
        : { color: TONE_COLOR[tone], textColor: "var(--color-surface)" }),
    };
  });

  /* A record on the calendar, not a bare title: its face, its time, its name and a second
     line, in that reading order. Only when the app gave something more than a title. */
  const rich = avatarOf !== undefined || metaOf !== undefined || renderEvent !== undefined;
  const content = (info: { event: { id: string }; timeText: string }) => {
    const item = byId.get(info.event.id);
    if (item === undefined) return null;
    if (renderEvent !== undefined) return renderEvent(item, info.timeText);
    const person = avatarOf?.(item);
    const meta = metaOf?.(item);
    return (
      <span className="flex min-w-0 items-start gap-1.5 px-0.5 py-px">
        {person === undefined ? null : (
          <Avatar
            name={person.name}
            size="sm"
            {...(person.src === undefined ? {} : { src: person.src })}
          />
        )}
        <span className="flex min-w-0 flex-col">
          <span className="min-w-0 truncate">
            {info.timeText === "" ? null : (
              <b className="font-semibold tabular-nums">{info.timeText} </b>
            )}
            {titleOf(item)}
          </span>
          {meta === undefined ? null : (
            <span className="min-w-0 truncate opacity-80">{meta}</span>
          )}
        </span>
      </span>
    );
  };

  const moved = (info: {
    event: { id: string; start: Date | null; end: Date | null };
    revert: () => void;
  }) => {
    const item = byId.get(info.event.id);
    /* Undone first: the move is a request, and `items` answers it. */
    info.revert();
    if (item === undefined || info.event.start === null) return;
    onMove?.(item, info.event.start, info.event.end);
  };

  return (
    <div className="min-w-0 text-meta">
      <FullCalendar
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          formaThemePlugin,
        ]}
        locales={[esLocale]}
        locale={copy.locale.toLowerCase().startsWith("es") ? "es" : "en"}
        initialView={VIEW[view]}
        {...(date === undefined ? {} : { initialDate: date })}
        headerToolbar={{
          start: "prev,next today",
          center: "title",
          end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        height={height}
        events={events}
        editable={onMove !== undefined}
        selectable={onCreate !== undefined}
        nowIndicator
        /* The week and the day open on the working day, not on midnight. */
        scrollTime="07:00:00"
        {...(rich ? { eventContent: content } : {})}
        {...(onMove === undefined ? {} : { eventDrop: moved, eventResize: moved })}
        {...(onCreate === undefined
          ? {}
          : {
              select: (info: { start: Date; end: Date; allDay: boolean }) =>
                onCreate(info.start, info.end, info.allDay),
            })}
        {...(onOpen === undefined
          ? {}
          : {
              eventClick: (info: { event: { id: string } }) => {
                const item = byId.get(info.event.id);
                if (item !== undefined) onOpen(item);
              },
            })}
      />
    </div>
  );
}
