"use client";

import {
  TIMELINE_SCALES,
  type TimelineScale,
} from "@sincpro/web-ui/components/timeline/time";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { SegmentedControl } from "@sincpro/web-ui/primitives/choice/SegmentedControl";
import { Slider } from "@sincpro/web-ui/primitives/choice/Slider";
import { DatePicker } from "@sincpro/web-ui/primitives/date/DatePicker";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";

/** `2026-10-29` ↔ a local Date, the way `DatePicker` speaks. */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export type TimelineToolbarProps = {
  /** The period being looked at, and what it says: «29 de octubre de 2026». */
  title?: ReactNode;
  /** Where it stands. Without `onDateChange` there is no date navigation (a project Gantt shows
   *  its whole span). */
  date?: Date;
  onDateChange?: (next: Date) => void;
  /** The arrows: one period back or forward. */
  onStep?: (steps: -1 | 1) => void;
  scale?: TimelineScale;
  onScaleChange?: (next: TimelineScale) => void;
  /** The scales offered, in order. All four by default. */
  scales?: readonly TimelineScale[];
  /** 1 (widest view) to 5 (closest). */
  zoom?: number;
  onZoomChange?: (next: number) => void;
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
};

/**
 * The bar over a timeline — a Gantt, a planning, a schedule: where am I (‹ › a date · today),
 * how close (zoom), at what scale (day · week · month · year) and the whole screen.
 *
 * Context: Odoo's Gantt toolbar, as one piece shared by `RecordTimeline` and `RecordGantt`, so
 * the two read the same. Every part is optional: what has no handler is not drawn — a
 * control that does nothing is a dead end.
 */
export function TimelineToolbar({
  title,
  date,
  onDateChange,
  onStep,
  scale,
  onScaleChange,
  scales = TIMELINE_SCALES,
  zoom,
  onZoomChange,
  fullscreen = false,
  onFullscreenChange,
}: TimelineToolbarProps) {
  const copy = useUiCopy();
  const words = copy.timeline;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2">
      {onStep === undefined && onDateChange === undefined ? null : (
        <div className="flex shrink-0 items-center gap-1">
          {onStep === undefined ? null : (
            <>
              <IconButton icon={ChevronLeft} label={words.prev} onClick={() => onStep(-1)} />
              <IconButton icon={ChevronRight} label={words.next} onClick={() => onStep(1)} />
            </>
          )}
          {onDateChange === undefined || date === undefined ? null : (
            <>
              <div className="w-40">
                <DatePicker
                  aria-label={words.goTo}
                  value={isoDay(date)}
                  onChange={(next) => {
                    if (next !== null) onDateChange(fromIso(next));
                  }}
                />
              </div>
              <Button role="secondary" size="sm" onClick={() => onDateChange(new Date())}>
                {words.today}
              </Button>
            </>
          )}
        </div>
      )}
      {title === undefined ? null : (
        <p className="min-w-0 flex-1 truncate text-body font-semibold text-ink first-letter:uppercase">
          {title}
        </p>
      )}
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3">
        {zoom === undefined || onZoomChange === undefined ? null : (
          <div className="flex items-center gap-1">
            <IconButton
              icon={ZoomOut}
              label={words.zoomOut}
              disabled={zoom <= 1}
              onClick={() => onZoomChange(Math.max(1, zoom - 1))}
            />
            <div className="w-24">
              <Slider
                aria-label={words.zoom}
                value={zoom}
                min={1}
                max={5}
                output={false}
                onChange={onZoomChange}
              />
            </div>
            <IconButton
              icon={ZoomIn}
              label={words.zoomIn}
              disabled={zoom >= 5}
              onClick={() => onZoomChange(Math.min(5, zoom + 1))}
            />
          </div>
        )}
        {scale === undefined || onScaleChange === undefined ? null : (
          <SegmentedControl
            aria-label={words.scale}
            size="sm"
            value={scale}
            onChange={(next) => onScaleChange(next as TimelineScale)}
            options={scales.map((one) => ({ value: one, label: words.scales[one] }))}
          />
        )}
        {onFullscreenChange === undefined ? null : (
          <IconButton
            icon={fullscreen ? Minimize2 : Maximize2}
            label={fullscreen ? words.exitFullscreen : words.fullscreen}
            onClick={() => onFullscreenChange(!fullscreen)}
          />
        )}
      </div>
    </div>
  );
}
