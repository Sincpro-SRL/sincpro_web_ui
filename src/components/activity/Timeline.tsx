"use client";

import { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { DateValue } from "@sincpro/web-ui/primitives/value/Fecha";
import { Children, type ReactNode } from "react";

const DOT_TONE: Record<Tone, { canvas: string; chrome: string }> = {
  neutral: { canvas: "bg-muted", chrome: "bg-chrome-muted" },
  info: { canvas: "bg-info", chrome: "bg-chrome-link" },
  good: { canvas: "bg-good", chrome: "bg-chrome-good" },
  warn: { canvas: "bg-warn", chrome: "bg-chrome-warn" },
  bad: { canvas: "bg-bad", chrome: "bg-chrome-bad" },
  accent: { canvas: "bg-accent", chrome: "bg-chrome-accent" },
};

export type TimelineItemProps = {
  label: ReactNode;
  at: Date | string | number;
  tone?: Tone;
  action?: ReactNode;
};

function Item({ label, at, tone = "neutral", action }: TimelineItemProps) {
  const surface = useSurface();
  const isChrome = surface === "chrome";
  const text = isChrome ? "text-chrome-ink" : "text-ink";
  const rail = isChrome ? "bg-chrome-ink/20" : "bg-line";

  return (
    <li className="group/item relative flex gap-3 pb-4 last:pb-0">
      <span className="relative flex w-2 shrink-0 justify-center">
        <span className={`mt-1 size-2 shrink-0 rounded-pill ${DOT_TONE[tone][surface]}`} />
        <span className={`absolute top-3 bottom-0 w-px group-last/item:hidden ${rail}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className={`min-w-0 text-meta ${text}`}>{label}</span>
          <DateValue when={at} format="exact" />
        </div>
        {action === undefined ? null : <div className="mt-1">{action}</div>}
      </div>
    </li>
  );
}

export type TimelineProps = {
  children?: ReactNode;
  empty?: { sentence: string; action?: ReactNode };
  surface?: Surface;
};

/** Renders items in the order given — this kit's convention is newest first. */
export function Timeline({ children, empty, surface }: TimelineProps) {
  const activeSurface = useSurface(surface);

  if (Children.toArray(children).length === 0) {
    return empty === undefined ? null : (
      <Empty
        sentence={empty.sentence}
        {...(empty.action === undefined ? {} : { action: empty.action })}
      />
    );
  }

  return (
    <SurfaceProvider value={activeSurface}>
      <ol className="flex flex-col">{children}</ol>
    </SurfaceProvider>
  );
}

Timeline.Item = Item;
