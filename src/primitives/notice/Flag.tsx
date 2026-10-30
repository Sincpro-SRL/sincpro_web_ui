"use client";

import type { Tone } from "@sincpro/web-ui/foundations/types";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { CircleAlert, CircleCheck, Info, type LucideIcon, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Dialog, DialogTrigger, Heading } from "react-aria-components";

/* ==================================================================== *
 *  FLAG — something is off with THIS row, this field, this figure.
 *
 *  Context: a warning about one line of a document does not belong at the
 *  top of the document. «Sin existencias» on the printer of line 3, «precio
 *  por debajo del costo» on line 7: written as record-level notices they pile
 *  up over the form and say nothing about WHERE. Odoo draws them as a small
 *  coloured mark on the line itself — the stock widget. This is that mark.
 *
 *  ── The colour is not the message ───────────────────────────────────
 *
 *  Each tone has its own SHAPE as well as its colour (a triangle warns, a
 *  circle with a bar stops, an «i» informs, a check confirms), and the mark is
 *  named by its sentence: someone who does not tell red from green, and a
 *  screen reader, get the same message as everyone else (PRINCIPLES §3).
 *
 *  ── Always tinted ───────────────────────────────────────────────────
 *
 *  A bare icon in the colour of the tone is lost among forty rows of figures:
 *  the mark sits on a disc of its tone at rest, not only on hover, so the eye
 *  finds the one row that needs it while scanning the column.
 *
 *  ── A press, not a hover ────────────────────────────────────────────
 *
 *  Like `Hint`, the detail is CONTENT — «3 pedidas, 0 en el depósito central,
 *  llegan 10 el 4/11» — so it opens on press (mouse, touch, Enter, Space) in
 *  the system's popover and stays until it is put away. A tooltip would be
 *  gone before the sentence is read, and does not exist on a tablet.
 * ==================================================================== */

export type FlagTone = Extract<Tone, "bad" | "warn" | "info" | "good">;

const ICON: Record<FlagTone, LucideIcon> = {
  bad: CircleAlert,
  warn: TriangleAlert,
  info: Info,
  good: CircleCheck,
};

const mark = tv({
  base: "inline-flex size-5 shrink-0 cursor-default items-center justify-center rounded-pill outline-0 transition-colors duration-(--duration-instant) forced-colors:text-[ButtonText]",
  variants: {
    tone: {
      bad: "bg-bad/12 text-bad hover:bg-bad/20 aria-expanded:bg-bad/20",
      warn: "bg-warn/15 text-warn hover:bg-warn/25 aria-expanded:bg-warn/25",
      info: "bg-info/12 text-info hover:bg-info/20 aria-expanded:bg-info/20",
      good: "bg-good/12 text-good hover:bg-good/20 aria-expanded:bg-good/20",
    },
    isFocusVisible: {
      true: "outline-2 outline-offset-1 outline-primary forced-colors:outline-[Highlight]",
    },
  },
});

export type FlagProps = {
  tone: FlagTone;
  /** The sentence the mark stands for — «Sin existencias». It names the mark and heads
   *  the popover. */
  label: string;
  /** What explains it, inside the popover: the figures, what to do. */
  children?: ReactNode;
};

/** A toned mark that opens its sentence. See the file's header. */
export function Flag({ tone, label, children }: FlagProps) {
  const Icon = ICON[tone];
  return (
    <DialogTrigger>
      {/* A press on the mark must not also press what it sits in — a table row that
          opens for editing, a card that opens its record. */}
      <span className="inline-flex shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button aria-label={label} className={(state) => mark({ ...state, tone })}>
          <Icon className="size-(--size-icon-sm)" strokeWidth={2.25} aria-hidden />
        </Button>
      </span>
      <Popover placement="bottom start" className="max-w-72 rounded-box">
        <Dialog className="flex flex-col gap-1 px-3 py-2.5 outline-0">
          <Heading slot="title" className="text-meta font-medium text-ink">
            {label}
          </Heading>
          {children === undefined ? null : (
            <div className="text-micro leading-relaxed text-muted">{children}</div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
