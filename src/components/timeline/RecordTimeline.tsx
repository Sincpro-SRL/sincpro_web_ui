"use client";

import {
  hoursMinutes,
  lanesOf,
  rangeOf,
  shiftDate,
  snap,
  snapOf,
  TIMELINE_SCALES,
  type TimelineScale,
  unitSpan,
} from "@sincpro/web-ui/components/timeline/time";
import { TimelineToolbar } from "@sincpro/web-ui/components/timeline/TimelineToolbar";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

/** A row of the timeline: what the records are grouped by — a person, a room, a machine. */
export type TimelineRow = {
  id: string;
  label: string;
  /** The row's face: `true` draws the initials of `label`, a string is a photo's URL. */
  avatar?: boolean | string;
  /** A second line, quiet: the role, the department. */
  detail?: string;
};

export type RecordTimelineProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  /** The row a record goes in: its employee, its room. A grouping, as Odoo's «group by». */
  rowOf: (item: T) => string;
  /** The rows, in order — including the ones with nothing in this period (someone who did not
   *  come is part of the answer). Without it they come from the records. */
  rows?: readonly TimelineRow[];
  startOf: (item: T) => Date;
  endOf: (item: T) => Date;
  /** The record's name, on its bar. */
  titleOf?: (item: T) => string;
  /** What the bar says, replacing the default: the name, and on a day or a week its duration
   *  and its hours — «03:48 (09:12–13:13)». */
  labelOf?: (item: T) => ReactNode;
  toneOf?: (item: T) => Tone;
  /** The head of the names column: «Empleado». */
  rowHeader?: string;
  /** Controlled scale, or the one it starts on. */
  scale?: TimelineScale;
  defaultScale?: TimelineScale;
  onScaleChange?: (next: TimelineScale) => void;
  scales?: readonly TimelineScale[];
  /** Controlled date, or the one it starts on (today). */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (next: Date) => void;
  /** A bar was dragged (in time, or to another row) or stretched. The app saves and passes the
   *  new `items`; until then the bar goes back. */
  onMove?: (item: T, start: Date, end: Date, row: string) => void;
  /** An empty stretch of a row was pressed: create a record there, one column long. */
  onCreate?: (row: string, start: Date, end: Date) => void;
  onOpen?: (item: T) => void;
};

const FILL: Record<Tone, string> = {
  neutral: "bg-muted text-surface",
  info: "bg-info text-surface",
  good: "bg-good text-surface",
  warn: "bg-warn text-surface",
  bad: "bg-bad text-surface",
  accent: "bg-primary text-surface",
};

/* Pixels a column asks for at the middle zoom; the zoom multiplies them. Past the screen's width
   the track scrolls sideways — the names column stays. */
const BASE: Record<TimelineScale, number> = { day: 44, week: 150, month: 44, year: 96 };
const ZOOM = [0.5, 0.75, 1, 1.5, 2.25];
const BAR = 26;
const GAP = 4;

type Draft = { id: string; start: number; end: number; row: string };

/**
 * Records on a timeline, grouped in rows — Odoo's Gantt view: attendances by employee, shifts,
 * room bookings, work orders by machine.
 *
 * Context: a project Gantt (`RecordGantt`) is one task per row with dependencies; THIS is the
 * other one people mean by «Gantt» in an ERP — a grouping with N records per row, read across
 * time. The scale says the period (a day by hours, a week, a month by days, a year by months);
 * the toolbar moves it (‹ › date · today), zooms, switches scale and takes the whole screen.
 *
 * Controlled: a drag shows a draft and reports `onMove` on release; the bar stays where
 * `items` says. Everything the pointer does has a key: Alt + ← / → moves by the snap, with
 * Shift it stretches, Alt + ↑ / ↓ changes the row; every move is announced.
 */
export function RecordTimeline<T>({
  items,
  keyOf,
  rowOf,
  rows: givenRows,
  startOf,
  endOf,
  titleOf,
  labelOf,
  toneOf,
  rowHeader,
  scale: outerScale,
  defaultScale = "week",
  onScaleChange,
  scales = TIMELINE_SCALES,
  date: outerDate,
  defaultDate,
  onDateChange,
  onMove,
  onCreate,
  onOpen,
}: RecordTimelineProps<T>) {
  const copy = useUiCopy();
  const words = copy.timeline;
  const [ownScale, setOwnScale] = useState<TimelineScale>(defaultScale);
  const [ownDate, setOwnDate] = useState<Date>(() => defaultDate ?? new Date());
  const scale = outerScale ?? ownScale;
  const date = outerDate ?? ownDate;
  const setScale = (next: TimelineScale) => {
    if (outerScale === undefined) setOwnScale(next);
    onScaleChange?.(next);
  };
  const setDate = (next: Date) => {
    if (outerDate === undefined) setOwnDate(next);
    onDateChange?.(next);
  };
  const [zoom, setZoom] = useState(3);
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const justDragged = useRef(false);
  const [said, setSaid] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const follow = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", follow);
    return () => document.removeEventListener("fullscreenchange", follow);
  }, []);

  const range = rangeOf(scale, date, copy.locale);
  const from = +range.start;
  const span = +range.end - from;
  const step = snapOf(scale);
  const cell = BASE[scale] * (ZOOM[zoom - 1] ?? 1);
  const time = new Intl.DateTimeFormat(copy.locale, {
    hour: "2-digit",
    minute: "2-digit",
    /* 09:12–13:13 and not «09:12 a. m.–01:13 p. m.»: a bar has room for the hours. */
    hourCycle: "h23",
  });
  const day = new Intl.DateTimeFormat(copy.locale, { day: "numeric", month: "short" });

  const rows: readonly TimelineRow[] =
    givenRows ?? [...new Set(items.map(rowOf))].map((id) => ({ id, label: id }));
  const shown = items.filter((item) => +endOf(item) > from && +startOf(item) < from + span);

  /* Where each record is drawn: its own dates, or the draft while it is being dragged. */
  const placed = (item: T) => {
    const id = keyOf(item);
    if (draft !== null && draft.id === id) {
      return { start: new Date(draft.start), end: new Date(draft.end), row: draft.row };
    }
    return { start: startOf(item), end: endOf(item), row: rowOf(item) };
  };

  const describe = (start: Date, end: Date) =>
    scale === "day" || scale === "week"
      ? `${hoursMinutes(+end - +start)} (${time.format(start)}–${time.format(end)})`
      : `${day.format(start)} – ${day.format(end)}`;

  const report = (item: T, start: Date, end: Date, row: string) => {
    onMove?.(item, start, end, row);
    setSaid(
      fillCopy(words.moved, {
        name: titleOf?.(item) ?? keyOf(item),
        range: describe(start, end),
      }),
    );
  };

  const drag = (event: PointerEvent<HTMLElement>, item: T, mode: "move" | "resize") => {
    if (onMove === undefined || event.button !== 0) return;
    event.stopPropagation();
    const track = event.currentTarget.closest<HTMLElement>("[data-track]");
    if (track === null) return;
    const perPx = span / track.getBoundingClientRect().width;
    const x0 = event.clientX;
    const start0 = +startOf(item);
    const end0 = +endOf(item);
    const id = keyOf(item);
    const row0 = rowOf(item);
    const move = (next: globalThis.PointerEvent) => {
      const delta = snap((next.clientX - x0) * perPx, step);
      const under = document
        .elementFromPoint(next.clientX, next.clientY)
        ?.closest<HTMLElement>("[data-row]")?.dataset["row"];
      const draftNow: Draft =
        mode === "move"
          ? { id, start: start0 + delta, end: end0 + delta, row: under ?? row0 }
          : { id, start: start0, end: Math.max(start0 + step, end0 + delta), row: row0 };
      draftRef.current = draftNow;
      setDraft(draftNow);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      const done = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (done === null) return;
      const changed = done.start !== start0 || done.end !== end0 || done.row !== row0;
      if (!changed) return;
      justDragged.current = true;
      report(item, new Date(done.start), new Date(done.end), done.row);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const byKeyboard = (event: KeyboardEvent<HTMLElement>, item: T) => {
    if (onMove === undefined || !event.altKey) return;
    const start = +startOf(item);
    const end = +endOf(item);
    const row = rowOf(item);
    const at = rows.findIndex((one) => one.id === row);
    const dir = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (dir !== 0) {
      event.preventDefault();
      if (event.shiftKey) {
        report(
          item,
          new Date(start),
          new Date(Math.max(start + step, end + dir * step)),
          row,
        );
      } else {
        report(item, new Date(start + dir * step), new Date(end + dir * step), row);
      }
      return;
    }
    const vertical = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    const target = rows[at + vertical];
    if (vertical !== 0 && target !== undefined) {
      event.preventDefault();
      report(item, new Date(start), new Date(end), target.id);
    }
  };

  const create = (event: React.MouseEvent<HTMLElement>, row: TimelineRow) => {
    if (onCreate === undefined) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const at = new Date(from + ((event.clientX - rect.left) / rect.width) * span);
    const { start, end } = unitSpan(scale, at);
    onCreate(row.id, start, end);
  };

  const now = Date.now();
  const nowAt = now > from && now < from + span ? ((now - from) / span) * 100 : null;
  const percent = (time: number) =>
    ((Math.min(Math.max(time, from), from + span) - from) / span) * 100;

  return (
    <div
      ref={root}
      className="flex min-w-0 flex-col overflow-hidden rounded-box border border-line bg-surface"
    >
      <TimelineToolbar
        title={range.title}
        date={date}
        onDateChange={setDate}
        onStep={(steps) => setDate(shiftDate(scale, date, steps))}
        scale={scale}
        onScaleChange={setScale}
        scales={scales}
        zoom={zoom}
        onZoomChange={setZoom}
        fullscreen={fullscreen}
        onFullscreenChange={(next) => {
          if (next) void root.current?.requestFullscreen?.();
          else if (document.fullscreenElement !== null) void document.exitFullscreen();
        }}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          style={{
            minWidth: `calc(var(--container-timeline-label) + ${range.units.length * cell}px)`,
          }}
        >
          {/* The head: the names column's title, and the period's columns. */}
          <div className="sticky top-0 z-20 flex border-b border-line-strong bg-surface">
            <div className="sticky left-0 z-10 flex w-(--container-timeline-label) shrink-0 items-end border-r border-line bg-surface px-3 py-2 text-meta font-semibold text-ink">
              {rowHeader}
            </div>
            <div className="flex min-w-0 flex-1">
              {range.units.map((unit) => (
                <div
                  key={+unit.start}
                  className={`flex min-w-0 flex-1 items-center justify-center border-l border-line py-2 text-micro font-semibold whitespace-nowrap text-ink tabular-nums first:border-l-0 ${
                    unit.weekend ? "bg-ink/4" : ""
                  }`}
                >
                  {unit.label}
                </div>
              ))}
            </div>
          </div>
          {rows.map((row) => {
            const inRow = shown.filter((item) => placed(item).row === row.id);
            const { lane, count } = lanesOf(
              inRow,
              (item) => placed(item).start,
              (item) => placed(item).end,
            );
            const height = count * (BAR + GAP) + GAP * 2;
            return (
              <div key={row.id} data-row={row.id} className="flex border-b border-line">
                <div className="sticky left-0 z-10 flex w-(--container-timeline-label) shrink-0 items-center gap-2 border-r border-line bg-surface px-3">
                  {row.avatar === undefined || row.avatar === false ? null : (
                    <Avatar
                      name={row.label}
                      size="sm"
                      {...(typeof row.avatar === "string" ? { src: row.avatar } : {})}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-meta text-ink">{row.label}</p>
                    {row.detail === undefined ? null : (
                      <p className="truncate text-micro text-muted">{row.detail}</p>
                    )}
                  </div>
                </div>
                <div
                  data-track=""
                  onClick={(event) => create(event, row)}
                  className={`relative flex min-w-0 flex-1 ${onCreate === undefined ? "" : "cursor-cell"}`}
                  style={{ height }}
                >
                  {range.units.map((unit) => (
                    <div
                      key={+unit.start}
                      aria-hidden
                      className={`min-w-0 flex-1 border-l border-line first:border-l-0 ${unit.weekend ? "bg-ink/4" : ""}`}
                    />
                  ))}
                  {nowAt === null ? null : (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-bad"
                      style={{ left: `${nowAt}%` }}
                    />
                  )}
                  {inRow.map((item) => {
                    const { start, end } = placed(item);
                    const left = percent(+start);
                    const width = Math.max(percent(+end) - left, 0.6);
                    const tone = toneOf?.(item) ?? "neutral";
                    const title = titleOf?.(item);
                    const text =
                      labelOf?.(item) ??
                      [title, describe(start, end)]
                        .filter((part) => part !== undefined)
                        .join(" · ");
                    const dragging = draft !== null && draft.id === keyOf(item);
                    return (
                      <button
                        key={keyOf(item)}
                        type="button"
                        title={onMove === undefined ? undefined : words.moveHint}
                        aria-label={typeof text === "string" ? text : title}
                        {...(onMove === undefined
                          ? {}
                          : {
                              "aria-keyshortcuts":
                                "Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown",
                            })}
                        onPointerDown={(event) => drag(event, item, "move")}
                        onKeyDown={(event) => byKeyboard(event, item)}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (justDragged.current) {
                            justDragged.current = false;
                            return;
                          }
                          onOpen?.(item);
                        }}
                        className={`absolute z-1 flex items-center overflow-hidden rounded-control px-2 text-left text-micro font-medium whitespace-nowrap shadow-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${FILL[tone]} ${
                          onMove === undefined ? "" : "cursor-grab active:cursor-grabbing"
                        } ${dragging ? "opacity-80 ring-2 ring-primary" : ""}`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: GAP + (lane.get(item) ?? 0) * (BAR + GAP),
                          height: BAR,
                        }}
                      >
                        <span className="min-w-0 truncate">{text}</span>
                        {onMove === undefined ? null : (
                          <span
                            aria-hidden
                            onPointerDown={(event) => drag(event, item, "resize")}
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  );
}
