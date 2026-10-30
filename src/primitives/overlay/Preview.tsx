"use client";

import { Popover, type PopoverProps } from "@sincpro/web-ui/primitives/overlay/Popover";
import { type DOMAttributes, isValidElement, type ReactElement, type ReactNode } from "react";
import { Focusable, Link, PreviewTrigger } from "react-aria-components";

/**
 * A glance at a record without leaving the screen: the customer of an invoice, the product
 * of a line — who or what it is, shown when the pointer rests on its name, the keyboard
 * stops on it or a finger presses it long.
 *
 * Context: it sits between the two other things that float from a mark.
 *
 * - `Tooltip` is a LABEL: a few words about a control, never interactive — React Aria makes
 *   it a `role="tooltip"` the keyboard cannot enter. A customer's debt, phone and «Abrir»
 *   are not a label.
 * - `PopoverTrigger` is ASKED FOR: a press on a button opens a dialog that takes the focus
 *   until it is closed. Right for a small form; too much ceremony to see whose NIT it is.
 *
 * `Preview` is React Aria's `PreviewTrigger`: a NON-modal popover (`role="dialog"`, named by
 * `label`) that opens on hover, on keyboard focus and on long press, and that MAY hold
 * interactive content. It does not take the focus when it opens — the person who tabs past
 * a column of customers keeps walking the table — but Tab from the trigger goes into it,
 * Escape closes it and returns to the trigger, and the pointer can travel diagonally from the
 * name to the card without it closing (React Aria's safe area). A long press moves the focus
 * into it, so a touch screen reader lands on the card. All of that is React Aria's; this
 * only floats it on the system's `Popover` — the surface, hairline, radius and `float`
 * shadow everything that opens over the page has.
 *
 * ── The delays: 600 ms to open, 200 ms to close ──────────────────────
 *
 * They are React Aria's defaults, written here so a change in the library does not change
 * the system silently. 600 ms is the line between crossing and resting: in a table the
 * pointer crosses customer names all day on its way to something else, and a card of 18rem
 * that covered four rows on every pass would be noise. Below ~400 ms it opens on the way;
 * above a second it feels broken to the person who did stop to look. Keyboard focus waits the
 * same, so tabbing quickly does not open a card per row. Once one is open the next opens at
 * once (React Aria's warm-up): comparing the customers of six invoices is a run down the
 * column, not six waits. It is shorter than a tooltip's on purpose — a preview is asked for
 * by resting on a NAME you want to know about; a tooltip names an icon you mostly know.
 * 200 ms to close is only for the jittery exit; the trip to the card is covered by the
 * safe area, not by the delay.
 *
 * ── The trigger ──────────────────────────────────────────────────────
 *
 * React Aria hands the trigger its hover, focus, long-press and `aria-*` props through
 * context. A React Aria `Link` — the name of a `RelationValue` — reads that context itself,
 * so it is passed as is. Anything else — a system `Button`, a `ButtonLink`, a plain `<a>` —
 * goes through `Focusable`, the adapter that clones those props and a `ref` onto an element
 * that forwards `ref` and spreads native props (the same one `TooltipTrigger` uses). Wrapping
 * the `Link` too would hand it the props twice.
 */
const PREVIEW_DELAY = 600;
const PREVIEW_CLOSE_DELAY = 200;

export type PreviewProps = {
  /** What the preview is of — a link to the record, written as an element: a React Aria
   *  `Link`, or anything that forwards `ref` and spreads native props. It must be
   *  focusable: the keyboard reaches the preview through it. */
  trigger: ReactElement;
  /** The accessible name of the floating card: «Resumen de Distribuidora Andina». */
  label: string;
  /** What floats: a `RelationCard`, a few facts. It may hold actions — «Abrir». */
  children: ReactNode;
  placement?: PopoverProps["placement"];
  /** Milliseconds resting on the trigger before it opens. 600 by default — see above. */
  delay?: number;
  closeDelay?: number;
  /** The trigger stays, the preview does not open. */
  disabled?: boolean;
};

export function Preview({
  trigger,
  label,
  children,
  placement = "bottom start",
  delay = PREVIEW_DELAY,
  closeDelay = PREVIEW_CLOSE_DELAY,
  disabled = false,
}: PreviewProps) {
  const readsContext = isValidElement(trigger) && trigger.type === Link;
  return (
    <PreviewTrigger delay={delay} closeDelay={closeDelay} isDisabled={disabled}>
      {readsContext ? (
        trigger
      ) : (
        /* React Aria types the child as an intrinsic element; a component that forwards
           `ref` and spreads native props is the same thing to it at runtime. */
        <Focusable>{trigger as ReactElement<DOMAttributes<Element>, string>}</Focusable>
      )}
      <Popover placement={placement} aria-label={label}>
        <div className="max-h-[inherit] max-w-sm overflow-auto p-3">{children}</div>
      </Popover>
    </PreviewTrigger>
  );
}
