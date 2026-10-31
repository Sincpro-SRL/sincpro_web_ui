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
  tags,
  meta,
  figure,
  media,
  onOpen,
}: {
  /** The record's name — the entry point of the card. */
  title: ReactNode;
  /** The state, as a `Tag`: read before the name, the way a board is scanned. */
  tags?: ReactNode;
  /** The facts that tell two cards apart — a number, a date. */
  meta?: ReactNode;
  /** The record's key figure, on the right of the name — an amount. */
  figure?: ReactNode;
  /** The record's picture — a product photo, a customer's logo — or its icon. A board of
   *  products is recognised by the pictures before a single name is read. */
  media?: { src?: string; alt?: string; icon?: LucideIcon };
  /** Opens the record. Without it the card is not pressable. */
  onOpen?: () => void;
}) {
  const body = (
    <>
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
        <p className="min-w-0 truncate text-lead font-medium text-ink">{title}</p>
        {figure === undefined ? null : (
          <p className="shrink-0 text-lead font-semibold tabular-nums text-ink">{figure}</p>
        )}
      </div>
      {meta === undefined ? null : (
        <p className="text-micro tabular-nums text-muted">{meta}</p>
      )}
    </>
  );
  const box =
    "flex w-full min-w-0 flex-col gap-2 rounded-box border border-line bg-surface p-4 text-left";
  if (onOpen === undefined) return <div className={box}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${box} transition-colors duration-(--duration-instant) hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary`}
    >
      {body}
    </button>
  );
}
