import type { Tone } from "@sincpro/web-ui/foundations/types";

/* Without `"use client"`, apart from `Table.tsx`: a cell a server component draws takes the
   same tone. */

/** The background of a cell, by tone. It replaces the row wash on that cell:
 *  a hovered row and a painted cell are two signals, and stacking them reads
 *  as a third color. */
export const CELL_TONE: Record<Tone, string> = {
  neutral: "bg-ink/6",
  info: "bg-info/12",
  good: "bg-good/12",
  warn: "bg-warn/15",
  bad: "bg-bad/12",
  accent: "bg-accent/20",
};
