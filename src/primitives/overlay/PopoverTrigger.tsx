"use client";

import { Popover, type PopoverProps } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  cloneElement,
  type DOMAttributes,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { Dialog, DialogTrigger, Heading, Pressable } from "react-aria-components";

/** What the trigger has to accept: the system's `Button` and `IconButton` both do — they
 *  forward `ref`, spread native props and say what they open. */
type TriggerElement = ReactElement<{
  expanded?: boolean;
  haspopup?: "menu" | "dialog" | "listbox";
}>;

type Naming =
  /** Drawn at the top of the popover, and its accessible name. */
  | { title: string; label?: undefined }
  /** The accessible name when the popover has no visible title — a detail card whose
   *  first line already says what it is. */
  | { title?: undefined; label: string };

export type PopoverTriggerProps = Naming & {
  /** The button that opens it — a system `Button` or `IconButton`, written as an element. */
  trigger: TriggerElement;
  /** The content. As a function it receives `close`, for the «Aplicar» of a small form. */
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?: PopoverProps["placement"];
};

/**
 * A small form or a detail opened from a button, floating next to it: «filtrar por monto»,
 * «ver detalle del cliente».
 *
 * Context: it is the step below `Dialog`. A dialog takes the screen and asks something
 * before moving on; this asks two numbers WITHOUT hiding the table they filter — the
 * person keeps seeing what the answer is about. It floats on the system's `Popover`, so it
 * looks like the calendar of a date picker and the list of a combobox.
 *
 * ── Why `trigger={<Button …/>}` and not a compound `<PopoverTrigger.Button>` ──
 *
 * The opener is an ordinary system button, written the way every other button of the
 * screen is written. A compound form would need a second button component — a React Aria
 * `Button` dressed like ours — and two buttons that look the same and are different
 * components drift apart by the third release. One prop, one element, one button.
 *
 * ── It is React Aria's `DialogTrigger`, through `Pressable` ──
 *
 * `DialogTrigger` hands its trigger the press handlers and a `ref` through context; React
 * Aria's `Pressable` is the adapter that clones them onto any element that forwards `ref`
 * and spreads native props — which the system's buttons do. So the popover is anchored to
 * the button itself, focus goes into the dialog and comes back to the button, and Escape
 * and a click outside close it. The open state is kept here only to tell the button
 * `expanded` and `haspopup="dialog"`, so it says what it opens the same way a menu
 * trigger says it.
 */
export function PopoverTrigger({
  trigger,
  title,
  label,
  children,
  placement = "bottom start",
}: PopoverTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Pressable>
        {
          /* React Aria types the child as an intrinsic element; a component that forwards
             `ref` and spreads native props is the same thing to it at runtime. */
          cloneElement(trigger, { expanded: open, haspopup: "dialog" }) as ReactElement<
            DOMAttributes<Element>,
            string
          >
        }
      </Pressable>
      <Popover placement={placement}>
        <Dialog
          aria-label={label}
          className="max-h-[inherit] max-w-sm min-w-56 overflow-auto p-3 outline-0"
        >
          {({ close }) => (
            <>
              {title === undefined ? null : (
                <Heading slot="title" className="mb-2 text-meta font-semibold text-ink">
                  {title}
                </Heading>
              )}
              {typeof children === "function" ? children(close) : children}
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
