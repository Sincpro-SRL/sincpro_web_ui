"use client";

import { tv } from "@sincpro/web-ui/foundations/variants";
import {
  Children,
  createContext,
  type DOMAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import {
  composeRenderProps,
  Focusable,
  OverlayArrow,
  Tooltip as AriaTooltip,
  type TooltipProps as AriaTooltipProps,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components";

/**
 * The name of a control that has no visible name — an icon button of a table row, of a
 * toolbar — shown when the pointer rests on it or the keyboard reaches it.
 *
 * Context: it is not the other two ways of putting words next to a mark.
 *
 * - `Hint` is CONTENT: a sentence of help that does not fit on the page, behind a `?`. It
 *   opens on press and stays, because it is meant to be read, on a tablet too.
 * - The native `title` is the browser's tooltip: it shows late, unstyled, never on keyboard
 *   focus and never on touch — the person who navigates with Tab never learns what the
 *   trash can is. That is why icon targets no longer use it.
 *
 * `Tooltip` is the LABEL, shown: a few words, on hover AND on focus, never interactive, never
 * pinned. It is drawn on the chrome (the dark surface of the shell) because it is not part
 * of the page — it is a whisper about one control, and the dark box reads as that against
 * a page of white surfaces. React Aria decides when: its default delay on the first hover,
 * then the next tooltip of the row opens at once (warm-up), and Escape closes it.
 *
 * Every `IconButton` and `IconLink` already draws one with its `label`; write a
 * `TooltipTrigger` by hand only for a control that is not an icon target, or to say more
 * than the label.
 */
const tooltip = tv({
  base: "group max-w-64 rounded-control bg-chrome px-2 py-1 text-micro text-chrome-ink shadow-float transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) forced-colors:border forced-colors:border-[ButtonBorder] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]",
  variants: {
    isEntering: {
      true: "opacity-0 placement-top:translate-y-1 placement-bottom:-translate-y-1 placement-left:translate-x-1 placement-right:-translate-x-1",
    },
    isExiting: {
      true: "opacity-0",
    },
  },
});

export type TooltipProps = Omit<AriaTooltipProps, "children" | "offset"> & {
  /** A few words. A sentence of help is a `Hint`, not a tooltip. */
  children: ReactNode;
  /** The small point toward the control. On by default: in a row of five icons it says
   *  WHICH one is being named. */
  arrow?: boolean;
};

export function Tooltip({ children, arrow = true, className, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={arrow ? 8 : 4}
      {...props}
      className={composeRenderProps(className, (own, state) =>
        tooltip({ ...state, className: own }),
      )}
    >
      {arrow ? (
        <OverlayArrow>
          <svg
            viewBox="0 0 8 8"
            aria-hidden
            className="block size-2 fill-chrome group-placement-bottom:rotate-180 group-placement-left:-rotate-90 group-placement-right:rotate-90 forced-colors:fill-[Canvas]"
          >
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
      ) : null}
      {children}
    </AriaTooltip>
  );
}

/** True inside the control slot of a `TooltipTrigger`: an `IconButton` written there leaves
 *  its own tooltip out, so the consumer's is the only one. */
const InTooltipTrigger = createContext(false);

export function useInTooltipTrigger(): boolean {
  return useContext(InTooltipTrigger);
}

function isDisabledControl(control: unknown): boolean {
  if (!isValidElement<{ disabled?: unknown; isDisabled?: unknown }>(control)) return false;
  return control.props.disabled === true || control.props.isDisabled === true;
}

/**
 * Ties a control to its `Tooltip`: the control first, the tooltip second.
 *
 * Context: the timing is React Aria's on purpose — its default delay before the first one,
 * and the warm-up that opens the next one at once while the pointer runs along a row of
 * icons. A tooltip that opens on every pass of the mouse is noise; one that makes you wait
 * on each icon of a row is a toll. `delay` is here for the rare control that needs it, not
 * to tune each screen.
 *
 * ── Why the control is wrapped in `Focusable` here ──
 *
 * React Aria's trigger hands its pointer, focus and `aria-describedby` props to the control
 * through context, and only a React Aria component reads that context. `Focusable` is the
 * adapter for everything else: it clones the control with those props and a `ref`. Doing it
 * here means a consumer writes `<TooltipTrigger><Button …/><Tooltip …/></TooltipTrigger>`
 * with the system's own buttons — they forward `ref` and spread native props — or with a
 * plain `<button>`, and never has to know the adapter exists.
 */
export function TooltipTrigger({
  children,
  delay,
  closeDelay,
  disabled = false,
}: {
  /** The control — one element that forwards `ref` and spreads native props, like every
   *  system button — then the `Tooltip`. */
  children: ReactNode;
  /** Milliseconds before the first tooltip opens. React Aria's default when absent. */
  delay?: number;
  closeDelay?: number;
  disabled?: boolean;
}) {
  const [control, ...tooltip] = Children.toArray(children);
  return (
    <AriaTooltipTrigger delay={delay} closeDelay={closeDelay} isDisabled={disabled}>
      <InTooltipTrigger.Provider value>
        {/* `Focusable` wants exactly one element; anything else is a consumer error React
            reports by itself. A disabled control is not focusable, and it has to be told so
            or it warns — and keeps a `tabIndex` the disabled button ignores anyway. */}
        <Focusable isDisabled={isDisabledControl(control)}>
          {control as ReactElement<DOMAttributes<Element>, string>}
        </Focusable>
      </InTooltipTrigger.Provider>
      {tooltip}
    </AriaTooltipTrigger>
  );
}
