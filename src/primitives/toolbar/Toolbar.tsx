"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import type { ReactNode } from "react";
import {
  Separator as AriaSeparator,
  Toolbar as AriaToolbar,
  type ToolbarRenderProps,
} from "react-aria-components";

/**
 * A row of controls that is ONE stop for the keyboard: the actions above an editable table,
 * the bar of a rich-text editor.
 *
 * Context: a table with eight actions above it costs eight Tabs before reaching the first
 * cell. Inside a toolbar Tab enters and leaves the group once, and the arrows move between
 * its controls — the way every desktop application has always worked. React Aria does the
 * moving by walking the DOM for focusable elements, so the system's own `Button` and
 * `IconButton` (plain native buttons) work inside it as they are, with nothing to forward.
 *
 * It draws no box of its own: it sits on whatever surface it is placed, like the actions of a
 * record header. The gap is the one between buttons of a row; a `ToolbarSeparator` splits
 * the groups (edit · insert · export) so a long bar still reads as a few decisions.
 */
const toolbar = tv({
  base: "flex gap-1",
  variants: {
    orientation: {
      horizontal: "flex-row flex-wrap items-center",
      vertical: "flex-col items-start",
    },
  },
});

export function Toolbar({
  label,
  children,
  orientation = "horizontal",
}: {
  /** What the group is, read aloud on entering it: «Acciones de las líneas». A screen with
   *  two toolbars is two unnamed groups otherwise. */
  label: string;
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <AriaToolbar
      aria-label={label}
      orientation={orientation}
      className={(state: ToolbarRenderProps) => toolbar({ orientation: state.orientation })}
    >
      {children}
    </AriaToolbar>
  );
}

/** A hairline between two groups of a `Toolbar`, across its direction. */
export function ToolbarSeparator({
  orientation = "vertical",
}: {
  /** `vertical` (the default) splits a horizontal toolbar; `horizontal`, a vertical one. */
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <AriaSeparator
      orientation={orientation}
      className={
        orientation === "vertical"
          ? "mx-1 h-(--size-icon-lg) w-px shrink-0 border-none bg-line-strong forced-colors:bg-[ButtonBorder]"
          : "my-1 h-px w-full border-none bg-line-strong forced-colors:bg-[ButtonBorder]"
      }
    />
  );
}
