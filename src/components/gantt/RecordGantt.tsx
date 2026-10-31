"use client";

import { TimelineToolbar } from "@sincpro/web-ui/components/timeline/TimelineToolbar";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Gantt, type IApi, Willow } from "@svar-ui/react-gantt";
import { useEffect, useMemo, useRef, useState } from "react";

/** A dependency between two records: «B starts when A ends» (`e2s`, the usual one). */
export type GanttLink = {
  id: string;
  source: string;
  target: string;
  type?: "e2s" | "s2s" | "e2e" | "s2e";
};

export type GanttZoom = "day" | "week" | "month";

/* The two rows of the time scale per zoom, written with `Intl` in the system's language
   (SVAR's own format strings would ignore it), and how wide one cell of the finer row is. */
function scalesOf(zoom: GanttZoom, locale: string) {
  const say = (options: Intl.DateTimeFormatOptions) => (date: Date) =>
    new Intl.DateTimeFormat(locale, options).format(date);
  const week = (date: Date) => {
    const first = new Date(date.getFullYear(), 0, 1);
    return `S${Math.ceil(((+date - +first) / 86_400_000 + first.getDay() + 1) / 7)}`;
  };
  return {
    day: {
      cellWidth: 36,
      scales: [
        { unit: "month", step: 1, format: say({ month: "long", year: "numeric" }) },
        { unit: "day", step: 1, format: say({ day: "numeric" }) },
      ],
    },
    week: {
      cellWidth: 72,
      scales: [
        { unit: "month", step: 1, format: say({ month: "long", year: "numeric" }) },
        { unit: "week", step: 1, format: week },
      ],
    },
    month: {
      cellWidth: 96,
      scales: [
        { unit: "year", step: 1, format: say({ year: "numeric" }) },
        { unit: "month", step: 1, format: say({ month: "short" }) },
      ],
    },
  }[zoom];
}

export type RecordGanttProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  titleOf: (item: T) => string;
  startOf: (item: T) => Date;
  endOf: (item: T) => Date;
  /** 0 to 100. Without it the bar has no progress handle. */
  progressOf?: (item: T) => number;
  /** The record it hangs under — a task under its project. Summaries are drawn for parents. */
  parentOf?: (item: T) => string | undefined;
  /** A point in time rather than a span: a delivery, a sign-off. */
  milestoneOf?: (item: T) => boolean;
  links?: readonly GanttLink[];
  /** The scale it opens on; the toolbar switches it. */
  zoom?: GanttZoom;
  /** A bar was dragged or stretched. The app persists and passes the new `items`. */
  onMove?: (item: T, start: Date, end: Date) => void;
  onProgress?: (item: T, progress: number) => void;
  /** A bar was chosen. */
  onOpen?: (item: T) => void;
  /** The chart's height, toolbar included: it scrolls inside. */
  height?: string;
  /** The left grid's column title for the names. */
  nameHeader?: string;
};

/**
 * Records on a timeline — Odoo's Gantt view: projects, tasks, manufacturing orders.
 *
 * Context: drawn by SVAR React Gantt (MIT core: move, resize, progress, dependencies, zoom),
 * dressed by `tokens.css` (its Willow theme's `--wx-*` variables point at web-ui's tokens).
 * The chart keeps its own state while dragging; every finished change is reported (`onMove`,
 * `onProgress`) and the app passes the saved `items` back, which the chart re-reads. Without
 * `onMove` / `onProgress` it is read-only. Auto-scheduling, critical path and resource load are
 * SVAR's PRO edition: a licence away, not built here.
 */
export function RecordGantt<T>({
  items,
  keyOf,
  titleOf,
  startOf,
  endOf,
  progressOf,
  parentOf,
  milestoneOf,
  links = [],
  zoom = "day",
  onMove,
  onProgress,
  onOpen,
  height = "28rem",
  nameHeader,
}: RecordGanttProps<T>) {
  const copy = useUiCopy();
  /* The toolbar's: the scale starts at `zoom`, the closeness in the middle. */
  const [scale, setScale] = useState<GanttZoom>(zoom);
  const [closeness, setCloseness] = useState(3);
  const time = scalesOf(scale, copy.locale);
  const cellWidth = Math.round(
    time.cellWidth * ([0.5, 0.75, 1, 1.5, 2.25][closeness - 1] ?? 1),
  );
  const root = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const follow = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", follow);
    return () => document.removeEventListener("fullscreenchange", follow);
  }, []);
  const byId = useMemo(
    () => new Map(items.map((item) => [keyOf(item), item])),
    [items, keyOf],
  );
  const parents = new Set(items.map((item) => parentOf?.(item)).filter(Boolean));
  const tasks = items.map((item) => {
    const id = keyOf(item);
    const parent = parentOf?.(item);
    return {
      id,
      text: titleOf(item),
      start: startOf(item),
      end: endOf(item),
      ...(progressOf === undefined ? {} : { progress: progressOf(item) }),
      ...(parent === undefined ? {} : { parent }),
      type: milestoneOf?.(item) === true ? "milestone" : parents.has(id) ? "summary" : "task",
      open: true,
    };
  });
  const editable = onMove !== undefined || onProgress !== undefined;

  /* The chart reports through its store's actions: `update-task` for a move, a stretch or the
     progress handle — the finished one, not every pixel of the drag (`inProgress`). */
  const init = (api: IApi) => {
    api.on(
      "update-task",
      (ev: { id: unknown; task: Record<string, unknown>; inProgress?: boolean }) => {
        if (ev.inProgress === true) return;
        const item = byId.get(String(ev.id));
        if (item === undefined) return;
        const { start, end, progress } = ev.task;
        if (start instanceof Date && end instanceof Date) onMove?.(item, start, end);
        if (typeof progress === "number") onProgress?.(item, progress);
      },
    );
    api.on("select-task", (ev: { id: unknown }) => {
      const item = byId.get(String(ev.id));
      if (item !== undefined) onOpen?.(item);
    });
  };

  return (
    <div
      ref={root}
      className="flex min-w-0 flex-col overflow-hidden rounded-box border border-line bg-surface"
      style={{ height }}
    >
      <TimelineToolbar
        scale={scale}
        onScaleChange={(next) => {
          if (next !== "year") setScale(next);
        }}
        scales={["day", "week", "month"]}
        zoom={closeness}
        onZoomChange={setCloseness}
        fullscreen={fullscreen}
        onFullscreenChange={(next) => {
          if (next) void root.current?.requestFullscreen?.();
          else if (document.fullscreenElement !== null) void document.exitFullscreen();
        }}
      />
      <div className="min-h-0 flex-1">
        <Willow fonts={false}>
          <Gantt
            tasks={tasks}
            links={links.map((link) => ({ ...link, type: link.type ?? "e2s" }))}
            scales={time.scales}
            cellWidth={cellWidth}
            readonly={!editable}
            columns={[{ id: "text", header: nameHeader ?? "", width: 260 }]}
            init={init}
          />
        </Willow>
      </div>
    </div>
  );
}
