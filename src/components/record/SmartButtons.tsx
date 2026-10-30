"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";
import { Children, createContext, type ReactNode, useContext } from "react";

/* ---------------------------------------------------------------- *
 *  THE SMART BUTTONS
 * ---------------------------------------------------------------- */

/** On the chrome the counters share one bar. Each button reads that and drops
 *  its own frame, the way a stage drops its own arrow. */
const SmartGroup = createContext(false);

/** What hangs off this record, with its number, and can be pressed.
 *
 *  It answers TWO questions with a single control: *is there any?* and *how
 *  many?*. Without this you have to open it to discover there is nothing — the
 *  most expensive click in any interface.
 *
 *  **`—` is not `0`.** «I don't know yet» and «there is none» are two different
 *  answers, and confusing them makes somebody decide on data that has not
 *  arrived yet. */
export function SmartButton({
  icon: Icon,
  count,
  label,
  onClick,
  disabled = false,
  surface,
  layout = "stacked",
}: {
  icon: LucideIcon;
  count?: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** By default it inherits it from the surface that wraps it. */
  surface?: Surface;
  /**
   * `stacked` — the figure on top and the label below. For the sheet, where
   *             there is height.
   * `inline`  — everything on one line. For the rail.
   *
   * Context: in the rail, a two-line box next to breadcrumbs and a one-line
   * pager imposes its height on the whole row, and the other two end up
   * floating in the middle of a band that is twice as tall as them. That was
   * «something looks off».
   */
  layout?: "stacked" | "inline";
}) {
  const copy = useUiCopy();
  const empty = count === 0;
  const activeSurface = useSurface(surface);
  const isInline = layout === "inline";
  const grouped = useContext(SmartGroup);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || onClick === undefined}
      className={`flex shrink-0 items-center gap-2 text-left transition-[background-color,border-color,box-shadow] duration-(--duration-instant) disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary ${
        grouped
          ? `not-disabled:hover:bg-chrome-ink/10 focus-visible:-outline-offset-2 ${
              isInline ? "h-(--size-control-sm) px-2.5" : "px-2.5 py-1"
            }`
          : `rounded-control border focus-visible:outline-offset-2 ${
              isInline ? "h-(--size-control-sm) px-2" : "px-2.5 py-1"
            } ${bySurface(
              activeSurface,
              "border-ink/12 bg-surface shadow-raised not-disabled:hover:border-primary/40 not-disabled:hover:bg-primary/4",
              "border-chrome-ink/12 bg-chrome-ink/6 not-disabled:hover:border-chrome-link/40 not-disabled:hover:bg-chrome-ink/12",
            )}`
      }`}
    >
      <Icon
        className={`size-(--size-icon-md) shrink-0 ${bySurface(
          activeSurface,
          empty ? "text-muted/50" : "text-muted",
          empty ? "text-chrome-muted/50" : "text-chrome-muted",
        )}`}
        strokeWidth={1.75}
      />
      <span
        className={`min-w-0 leading-tight ${isInline ? "flex items-baseline gap-1.5" : ""}`}
      >
        <span
          className={`text-meta font-medium tabular-nums ${isInline ? "" : "block"} ${bySurface(
            activeSurface,
            empty ? "text-muted" : "text-ink",
            empty ? "text-chrome-muted" : "text-chrome-ink",
          )}`}
        >
          {count === undefined ? "—" : count.toLocaleString(copy.locale)}
        </span>
        <span
          className={`text-micro ${isInline ? "" : "block"} ${bySurface(activeSurface, "text-muted", "text-chrome-muted")}`}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

export function SmartButtons({ children }: { children: ReactNode }) {
  const surface = useSurface();
  if (surface !== "chrome") {
    return <div className="flex flex-wrap items-stretch gap-1.5">{children}</div>;
  }
  const items = Children.toArray(children);
  return (
    <SmartGroup.Provider value={true}>
      <div className="flex min-w-0 items-stretch overflow-hidden rounded-control border border-chrome-ink/15 bg-chrome-ink/8">
        {items.map((child, i) => (
          <div
            key={i}
            className={
              i === 0 ? "flex min-w-0" : "flex min-w-0 border-l border-chrome-ink/20"
            }
          >
            {child}
          </div>
        ))}
      </div>
    </SmartGroup.Provider>
  );
}
