"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { cn, focusRing } from "@sincpro/web-ui/foundations/variants";
import { tagTone } from "@sincpro/web-ui/primitives/tag/Tag";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
  Button as AriaButton,
  type Key,
  type Selection,
  Tag as AriaTag,
  TagGroup,
  TagList,
} from "react-aria-components";

/* ==================================================================== *
 *  A STRIP OF CHIPS. The same one everywhere.
 *
 *  Context: the search bar used to draw chips in four different ways — the
 *  term's, the filter's, the level's, the list of attributes' — and the four
 *  are the same thing: a short word, sometimes with what clarifies it,
 *  sometimes pressable, sometimes with an ×. Four copies means that when the
 *  fifth one is added nobody knows which one to copy, and the day the radius
 *  changes, three of the four change.
 *
 *  ── A chip is a VALUE, not a button ────────────────────────────────
 *
 *  That is why the default has no relief and no cursor: it says what there is.
 *  It becomes pressable when there is something to choose —`onSelect`— and it
 *  can be removed when removing it means something —`onRemove`—. A chip that
 *  looks pressable and does nothing teaches that chips are not pressed, and
 *  then the one that does do something is never touched.
 *
 *  A strip where no chip does anything is plain text in a row: no grid, no tab
 *  stop. Only when a chip can be pressed or removed does it become React Aria's
 *  `TagGroup` — one tab stop for the whole strip, arrows between chips, Enter
 *  or Space to press, Backspace or Delete to remove the focused one. The keys
 *  are React Aria's, so they are the same as in every other tag group a
 *  keyboard user has met.
 *
 *  ── What CLARIFIES goes inside, muted ──────────────────────────────
 *
 *  «cliente · Andina» is the field and its value; «= · es» is the symbol and
 *  its word. Two separate chips for that would be two things to choose where
 *  there is one.
 * ==================================================================== */

export type TagItem = {
  id: string;
  label: string;
  /** What clarifies it without having to read it whole: which table a field
   *  comes from, which symbol a comparison is. It goes muted and inside. */
  note?: string;
  icon?: LucideIcon;
  /** Choose it. Without this the chip is a value and is not pressed. */
  onSelect?: () => void;
  /** Remove it, when removing it means something. It is a separate button
   *  inside the chip — and Backspace/Delete on the focused chip — so removing
   *  is not the same as choosing. */
  onRemove?: () => void;
  /** The accessible name of the × . React Aria already names it «Remove» +
   *  the chip; this replaces the verb when the chip needs a more exact one
   *  («quitar el filtro»). */
  removeLabel?: string;
  /** It is chosen right now. */
  selected?: boolean;
  /** It is MARKED by the keyboard of someone else — the search input that
   *  drives a list of suggestions — which is different from chosen: marked is
   *  «Enter takes this one», chosen is «this one is already set». */
  active?: boolean;
  /** What the chip MEANS, the same tones as `Tag`: a customer category «crédito vencido»
   *  in `bad`. Neutral by default — most tags classify, they do not warn. Chosen and
   *  marked chips keep their own paint: that state is what the strip is saying then. */
  tone?: Tone;
  title?: string;
};

export function Tags({
  items,
  surface,
  label,
  labelledBy,
  stack = false,
  multiple = false,
}: {
  items: readonly TagItem[];
  /** By default it inherits the surface that wraps it. */
  surface?: Surface;
  /** The accessible name of the strip. A strip of values is read as text and
   *  does not need one; a strip that can be pressed or removed is a control,
   *  and a control without a name is announced as «grid» and nothing else. */
  label?: string;
  /** The id of a visible label that names the strip — the label of the `Field` it lives
   *  in. It wins over `label`. */
  labelledBy?: string;
  /**
   * One below the other, and not on a line that wraps.
   *
   * The difference is not aesthetic: a strip ACCOMPANIES —they are the parts of
   * something being written, and are read together— and a list IS CHOSEN FROM,
   * and there the eye goes down a column and so does the keyboard. Twelve
   * attributes wrapped in three lines are twelve things to sweep in a zigzag to
   * find one.
   */
  stack?: boolean;
  /** When chips carry `selected`, more than one can be chosen at a time. By
   *  default the choice is ONE — a join, a grain, a period — and the strip is
   *  announced as single-select. */
  multiple?: boolean;
}) {
  const sup = useSurface(surface);
  if (items.length === 0) return null;
  const interactive = items.some((i) => i.onSelect !== undefined || i.onRemove !== undefined);
  if (!interactive)
    return <StillStrip items={items} surface={sup} label={label} stack={stack} />;
  return (
    <AriaLocale>
      <ChipGroup
        items={items}
        surface={sup}
        label={label}
        labelledBy={labelledBy}
        stack={stack}
        multiple={multiple}
      />
    </AriaLocale>
  );
}

const STRIP = "flex min-w-0 flex-wrap items-center gap-1";
const STACK = "flex min-w-0 flex-col items-stretch gap-0.5";

/** A strip nobody presses: text in a row, a list only when it is named. */
function StillStrip({
  items,
  surface,
  label,
  stack,
}: {
  items: readonly TagItem[];
  surface: Surface;
  label: string | undefined;
  stack: boolean;
}) {
  const listed = label !== undefined;
  return (
    <span
      className={stack ? STACK : STRIP}
      {...(listed ? { role: "list", "aria-label": label } : {})}
    >
      {items.map((item) => (
        <span
          key={item.id}
          {...(listed ? { role: "listitem" } : {})}
          {...(item.title === undefined ? {} : { title: item.title })}
          className={shell({ item, surface, stack, removable: false, pressable: false })}
        >
          <Inside item={item} />
        </span>
      ))}
    </span>
  );
}

function ChipGroup({
  items,
  surface,
  label,
  labelledBy,
  stack,
  multiple,
}: {
  items: readonly TagItem[];
  surface: Surface;
  label: string | undefined;
  labelledBy: string | undefined;
  stack: boolean;
  multiple: boolean;
}) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const removable = items.some((i) => i.onRemove !== undefined);
  /* Selection is React Aria's only when the chips SAY whether they are chosen: then the
     strip is announced as a selectable list and each chip as selected or not. Chips that
     only act (`onSelect` without `selected`) are actions, and pressing one does not leave
     anything «selected» behind. */
  const selecting = items.some((i) => i.selected !== undefined && i.onSelect !== undefined);
  const chosen = new Set(items.filter((i) => i.selected === true).map((i) => i.id));

  /* The choice is the consumer's: the strip reports which chip was pressed and waits for the
     next `selected`. In a single choice the chip that ARRIVES is the one pressed; pressing
     the chosen one again reports that one, the way a radio reports the click on itself. */
  const onSelectionChange = (next: Selection) => {
    if (next === "all") return;
    const keys = new Set([...next].map(String));
    const added = [...keys].filter((k) => !chosen.has(k));
    const dropped = [...chosen].filter((k) => !keys.has(k));
    const pressed = multiple ? [...added, ...dropped] : added.length > 0 ? added : dropped;
    for (const key of pressed) byId.get(key)?.onSelect?.();
  };

  /* Backspace on a chip removes it — and only the chips that can be removed: a chip without
     `onRemove` in a strip that has some is still a value. */
  const onRemove = (keys: Set<Key>) => {
    for (const key of keys) byId.get(String(key))?.onRemove?.();
  };

  return (
    <TagGroup
      /* The name falls back to the chips themselves: «cliente: Andina, estado: vencida» says
         what the strip holds, which is better than an anonymous grid. */
      {...(labelledBy === undefined
        ? { "aria-label": label ?? items.map((i) => i.label).join(", ") }
        : { "aria-labelledby": labelledBy })}
      {...(removable ? { onRemove } : {})}
      {...(selecting
        ? {
            selectionMode: multiple ? "multiple" : "single",
            selectedKeys: chosen,
            onSelectionChange,
          }
        : {})}
      /* Escape belongs to whatever holds the strip — the popover it lives in closes with it —
         and not to «clear the selection», which would erase the choice without a word. */
      escapeKeyBehavior="none"
      className="min-w-0"
    >
      <TagList items={items} className={stack ? STACK : STRIP}>
        {(item) => (
          <AriaTag
            id={item.id}
            textValue={item.note === undefined ? item.label : `${item.label} ${item.note}`}
            {...(!selecting && item.onSelect !== undefined
              ? { onAction: item.onSelect }
              : {})}
            {...(item.title === undefined ? {} : { title: item.title })}
            className={({ isFocusVisible, isHovered }) =>
              cn(
                shell({
                  item,
                  surface,
                  stack,
                  removable: item.onRemove !== undefined,
                  pressable: item.onSelect !== undefined,
                }),
                item.onSelect !== undefined && isHovered && item.active !== true
                  ? bySurface(surface, "border-ink/40", "border-chrome-ink/40")
                  : "",
                "outline-offset-1",
                focusRing({ isFocusVisible }),
              )
            }
          >
            <Inside item={item} />
            {item.onRemove === undefined ? null : <Remove item={item} surface={surface} />}
          </AriaTag>
        )}
      </TagList>
    </TagGroup>
  );
}

function paint(item: TagItem, surface: Surface): string {
  if (item.active === true) {
    return bySurface(
      surface,
      "border border-primary bg-primary text-surface",
      "border border-chrome-link bg-chrome-link text-chrome",
    );
  }
  if (item.selected === true) {
    return bySurface(
      surface,
      "border border-accent/40 bg-accent/18 text-ink",
      "border border-chrome-link/40 bg-chrome-link/25 text-chrome-ink",
    );
  }
  if (item.tone !== undefined && item.tone !== "neutral") return tagTone(item.tone, surface);
  return bySurface(
    surface,
    "border border-line-strong bg-ink/5 text-ink",
    "border border-chrome-muted/30 bg-chrome-ink/12 text-chrome-ink",
  );
}

/* Stacked, each chip takes its whole line: a column of chips of different widths does not
   read as a list, it reads as a mess — and the blank on the right is what lets it be
   pressed without aiming. */
function shell({
  item,
  surface,
  stack,
  removable,
  pressable,
}: {
  item: TagItem;
  surface: Surface;
  stack: boolean;
  removable: boolean;
  pressable: boolean;
}): string {
  return cn(
    stack ? "flex w-full justify-start" : "inline-flex shrink-0",
    "min-w-0 items-center gap-1 rounded-pill py-0.5 text-micro transition-colors duration-(--duration-instant)",
    paint(item, surface),
    removable ? "pr-0.5 pl-2" : "px-2",
    pressable ? "cursor-pointer" : "cursor-default",
  );
}

function Inside({ item }: { item: TagItem }): ReactNode {
  const Icon = item.icon;
  return (
    <>
      {Icon === undefined ? null : (
        <Icon className="size-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      )}
      <span className="min-w-0 truncate">{item.label}</span>
      {item.note === undefined ? null : (
        <span className="shrink-0 opacity-60">· {item.note}</span>
      )}
    </>
  );
}

/* The × is React Aria's `remove` slot: it removes THIS chip and never presses it, so
   removing a pressable chip does not also choose it. */
function Remove({ item, surface }: { item: TagItem; surface: Surface }) {
  return (
    <AriaButton
      slot="remove"
      {...(item.removeLabel === undefined ? {} : { "aria-label": item.removeLabel })}
      className={({ isFocusVisible }) =>
        cn(
          "inline-flex size-4 shrink-0 cursor-default items-center justify-center rounded-pill transition-colors duration-(--duration-instant)",
          bySurface(
            surface,
            "hover:bg-ink/15 pressed:bg-ink/20",
            "hover:bg-chrome-ink/25 pressed:bg-chrome-ink/30",
          ),
          focusRing({ isFocusVisible }),
        )
      }
    >
      <X className="size-3" strokeWidth={2.5} aria-hidden />
    </AriaButton>
  );
}
