"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { CircleHelp } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button, Dialog, DialogTrigger } from "react-aria-components";

const mark = tv({
  base: "inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-pill text-muted outline-0 transition-colors duration-(--duration-instant) hover:bg-ink/8 hover:text-ink aria-expanded:bg-ink/8 aria-expanded:text-ink forced-colors:text-[ButtonText]",
  variants: {
    isFocusVisible: {
      true: "outline-2 outline-offset-1 outline-primary forced-colors:outline-[Highlight]",
    },
  },
});

/**
 * A sentence that does not fit on the page, attached to a mark.
 *
 * Context: `title` on a field is a native tooltip and nobody finds it. Odoo
 * puts a `?` next to the label; pressing it is how you read the help without
 * it eating a line. The mark is the affordance; the sentence is the content.
 *
 * ── Why a click and a popover, and not a `Tooltip` ──
 *
 * A `Tooltip` is a LABEL: a few words that show on hover and vanish when the
 * pointer leaves — useless on a tablet, and gone before a sentence is read.
 * This is content, so it opens on press (mouse, touch, Enter or Space) and
 * stays until it is put away: a second press, Escape, or a click outside. It
 * is React Aria's `DialogTrigger` on the system's `Popover` — the same white
 * surface as a calendar or a small filter form — so placement, flipping when
 * there is no room below, focus moving in and back to the `?`, and Escape are
 * React Aria's, not a hand-written listener.
 *
 * The sentence also lives, hidden, next to the mark under `id`: a field points
 * its `aria-describedby` there, and a closed popover is not in the page for a
 * screen reader to read.
 */
export function Hint({
  children,
  label = "?",
  id,
}: {
  children: ReactNode;
  /** Visible mark. The `?` is the default because it is the one that gets
   *  recognized as «there is more to read». */
  label?: ReactNode;
  /** For `aria-describedby` on the field the help belongs to. */
  id?: string;
}) {
  const auto = useId();
  const textId = id ?? auto;

  return (
    <span className="inline-flex shrink-0">
      <DialogTrigger>
        <Button
          aria-label={typeof children === "string" ? children : undefined}
          className={(state) => mark(state)}
        >
          {label === "?" ? (
            <CircleHelp className="size-3.5" strokeWidth={2} aria-hidden />
          ) : (
            label
          )}
        </Button>
        {/* `rounded-box`, not the panel's radius: one or two lines of text are too short
            for 16px corners, which turn them into a pill. */}
        <Popover placement="bottom" className="max-w-64 rounded-box">
          <Dialog
            aria-labelledby={textId}
            className="px-3 py-2.5 text-micro leading-relaxed text-ink outline-0"
          >
            {children}
          </Dialog>
        </Popover>
      </DialogTrigger>
      <span id={textId} hidden>
        {children}
      </span>
    </span>
  );
}
