"use client";

import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { Check } from "lucide-react";
import {
  Button as AriaButton,
  Menu as AriaMenu,
  MenuItem,
  MenuTrigger,
} from "react-aria-components";

/* ==================================================================== *
 *  A WORD THAT OPENS INTO ITS OPTIONS — the join of a node, the comparison of a chip.
 *
 *  Context: the bar has a few words that are touched and changed in place —«todas»,
 *  «contiene»— and each one is a small decision with three to ten answers. They opened a list
 *  drawn inside the bar: clipped by a list's bar (it clips the search box sideways), without
 *  Escape, without arrows, and still open after a click elsewhere. A word you can only change
 *  with the mouse is half a control.
 *
 *  Here it is React Aria's menu: the list floats in the overlay layer (never clipped), the
 *  arrows move, a letter jumps, Enter chooses, Escape closes and gives the focus back to the
 *  word. The word itself is drawn by whoever uses it — a dotted word in a node, a segment of a
 *  chip —; this piece is only the behaviour and the list.
 * ==================================================================== */

export interface WordOption<K extends string> {
  id: K;
  label: string;
  /** What tells it apart when the word alone does not: «<=» beside «como mucho». */
  note?: string;
}

export function WordChoice<K extends string>({
  value,
  options,
  onChange,
  label,
  word,
  className,
}: {
  value: K;
  options: readonly WordOption<K>[];
  onChange: (next: K) => void;
  /** What the word decides — the trigger's and the list's name. */
  label: string;
  /** The word as it reads in the bar —«como mucho», «todas»—. It STARTS the trigger's name
   *  («como mucho, comparar total de otra manera»): a name that does not hold what is seen
   *  fails whoever drives the screen by voice, saying the word they read. */
  word: string;
  /** How the word looks; the trigger is a button and takes the focus ring from here. */
  className: string;
}) {
  return (
    <MenuTrigger>
      <AriaButton aria-label={`${word}, ${label.toLocaleLowerCase()}`} className={className}>
        {word}
      </AriaButton>
      <Popover placement="bottom start" className="min-w-36 p-1">
        <AriaMenu
          aria-label={label}
          selectionMode="single"
          selectedKeys={[value]}
          disallowEmptySelection
          autoFocus="first"
          onAction={(key) => onChange(String(key) as K)}
          className="flex max-h-72 flex-col gap-0.5 overflow-y-auto outline-0"
        >
          {options.map((one) => (
            <MenuItem
              key={one.id}
              id={one.id}
              textValue={one.label}
              className="flex cursor-pointer items-center gap-2 rounded-ui-option px-2 py-1 text-meta text-ink outline-0 transition-colors duration-(--duration-instant) data-focused:bg-ui-option-active"
            >
              {({ isSelected }) => (
                <>
                  <span className="flex size-(--size-icon-sm) shrink-0 items-center justify-center">
                    {isSelected ? (
                      <Check
                        className="size-(--size-icon-sm) text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate ${isSelected ? "font-medium" : ""}`}
                  >
                    {one.label}
                  </span>
                  {one.note === undefined ? null : (
                    <span className="shrink-0 font-mono text-micro text-muted">
                      {one.note}
                    </span>
                  )}
                </>
              )}
            </MenuItem>
          ))}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}
