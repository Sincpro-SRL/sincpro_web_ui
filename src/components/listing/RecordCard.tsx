"use client";

import { Thumb } from "@sincpro/web-ui/primitives/cell/CellStack";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One record as a card — the board presentation of a list.
 *
 * Context: the board drew this card inline, and a list that wanted its own card wrote its
 * own `div` — which looked the same and could not be opened: the default card was a button
 * with `onOpen`, the custom one was not. A card is the record's door in the board the way a
 * row is in the table, so it is a component and it is always pressable when there is
 * somewhere to go.
 *
 * Its hierarchy is the row's: the state first (what it is), the name as the entry point,
 * the facts below in the quiet size.
 */
export function RecordCard({
  title,
  subtitle,
  tags,
  meta,
  figure,
  media,
  footer,
  onOpen,
}: {
  title: ReactNode;
  /** Who or what it is about, under the title: the customer of an opportunity. */
  subtitle?: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode;
  figure?: ReactNode;
  media?: { src?: string; alt?: string; icon?: LucideIcon };
  /** The card's last line, its controls: priority, kanban state, next activity, the owner's
   *  avatar — each its own button, pressable without opening the card. */
  footer?: ReactNode;
  onOpen?: () => void;
}) {
  /* The card is a box, and the TITLE is the button that opens it, stretched over the whole
     card (`after:inset-0`). It used to be a `<button>` around everything: a priority star or a
     kanban state inside it would be a control inside a control, which is invalid and which a
     screen reader announces as one thing. The footer's controls sit above the stretch. */
  const titleText = <span className="min-w-0 truncate">{title}</span>;
  return (
    <div
      className={`relative flex w-full min-w-0 flex-col gap-2 rounded-box border border-line bg-surface p-4 text-left ${
        onOpen === undefined
          ? ""
          : "transition-colors duration-(--duration-instant) focus-within:border-line-strong hover:border-line-strong"
      }`}
    >
      {media === undefined ? null : (
        <Thumb
          size="lg"
          {...(media.src === undefined ? {} : { src: media.src })}
          {...(media.alt === undefined ? {} : { alt: media.alt })}
          {...(media.icon === undefined ? {} : { icon: media.icon })}
        />
      )}
      {/* In a row of their own and at their own width: as a flex child of the card a tag
          stretched to the card's width. */}
      {tags === undefined ? null : <div className="flex flex-wrap gap-1.5">{tags}</div>}
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        {onOpen === undefined ? (
          <p className="flex min-w-0 text-lead font-medium text-ink">{titleText}</p>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 text-left text-lead font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-box focus-visible:after:outline-2 focus-visible:after:outline-primary"
          >
            {titleText}
          </button>
        )}
        {figure === undefined ? null : (
          <p className="shrink-0 text-lead font-semibold tabular-nums text-ink">{figure}</p>
        )}
      </div>
      {subtitle === undefined ? null : (
        /* Above the stretched title, at its own width: the subtitle may be a link to ANOTHER
           record (the customer), which must open that one and not the card. */
        <p className="relative z-10 -mt-1.5 w-fit max-w-full min-w-0 truncate text-meta text-muted">
          {subtitle}
        </p>
      )}
      {meta === undefined ? null : (
        <p className="text-micro tabular-nums text-muted">{meta}</p>
      )}
      {footer === undefined ? null : (
        <div className="relative z-10 flex min-w-0 items-center gap-1.5">{footer}</div>
      )}
    </div>
  );
}
