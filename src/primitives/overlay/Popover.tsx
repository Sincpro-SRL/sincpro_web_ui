"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import type { ReactNode } from "react";
import {
  composeRenderProps,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components";

/**
 * What floats over the page anchored to something: the calendar of a date picker, the list
 * of a combobox, a small form opened from a button.
 *
 * Context: it is the same surface the system's `Menu` floats on — raised white, strong
 * hairline, the `float` shadow — so everything that opens on top of the page reads as one
 * kind of thing. React Aria places it, flips it when it does not fit, traps and returns the
 * focus and closes it on Escape; this only dresses it.
 */
const popover = tv({
  base: "rounded-panel border border-line-strong bg-surface text-ink shadow-float outline-0 transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) forced-colors:bg-[Canvas]",
  variants: {
    isEntering: {
      true: "opacity-0 placement-bottom:-translate-y-1 placement-top:translate-y-1",
    },
    isExiting: {
      true: "opacity-0",
    },
  },
});

export type PopoverProps = Omit<AriaPopoverProps, "children"> & { children: ReactNode };

export function Popover({ children, className, offset = 6, ...props }: PopoverProps) {
  return (
    <AriaPopover
      offset={offset}
      {...props}
      className={composeRenderProps(className, (own, state) =>
        popover({ ...state, className: own }),
      )}
    >
      {children}
    </AriaPopover>
  );
}
