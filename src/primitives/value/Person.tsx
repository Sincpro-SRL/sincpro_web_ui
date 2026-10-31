"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import {
  Avatar,
  type AvatarSize,
  OVERLAP,
  SIZE,
} from "@sincpro/web-ui/primitives/value/Avatar";
import type { PersonContact } from "@sincpro/web-ui/primitives/value/contact";
import { RelationCard } from "@sincpro/web-ui/primitives/value/Relation";
import type { ComponentPropsWithRef, ReactNode } from "react";

/* ==================================================================== *
 *  WHO — a person as a chip and as a stack. The face itself is `Avatar`; what a person's
 *  card says (the face, the role, the ways to reach them, «Abrir») is the `RelationCard` of
 *  that person: a person IS a related record, and one card answers for all of them.
 * ==================================================================== */

export { Avatar, type AvatarSize } from "@sincpro/web-ui/primitives/value/Avatar";
export type { PersonContact } from "@sincpro/web-ui/primitives/value/contact";

/** The chip as the opener of its card. A native button that takes what `PopoverTrigger`
 *  hands its trigger — `ref`, the press handlers, `expanded` and `haspopup` — the same
 *  contract the system's buttons keep. */
function ChipButton({
  expanded,
  haspopup,
  children,
  ref,
  ...native
}: Omit<ComponentPropsWithRef<"button">, "className" | "type"> & {
  expanded?: boolean;
  haspopup?: "dialog";
}) {
  return (
    <button
      {...native}
      ref={ref}
      type="button"
      {...(haspopup === undefined ? {} : { "aria-haspopup": haspopup })}
      {...(expanded === undefined ? {} : { "aria-expanded": expanded })}
      /* The hover tint is a pseudo-element that spills past the box, not padding: padding
         moved the chip off the column of values, and negative margins to undo it made the
         chip wider than the room its parent measured — and it truncated itself. */
      className="relative isolate inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-control text-left outline-primary outline-offset-4 before:absolute before:-inset-x-1 before:-inset-y-0.5 before:-z-10 before:rounded-control before:transition-colors before:duration-(--duration-instant) hover:before:bg-ink/6 focus-visible:outline-2 aria-expanded:before:bg-ink/6 forced-colors:outline-[Highlight]"
    >
      {children}
    </button>
  );
}

export type UserChipProps = {
  name: string;
  size?: AvatarSize;
  src?: string;
  /** What goes next to the name in the chip: a role, an email, «hace 2 min». */
  detail?: ReactNode;
  /** What the person is, shown in the contact card: «Vendedora · Sucursal La Paz». */
  role?: string;
  /** The ways to reach them. Present = the chip opens a contact card. */
  contact?: PersonContact;
  /** Go to the person's record. Present = the chip opens its card with «Abrir». */
  onOpen?: () => void;
};

/**
 * The person with their name next to them. For a cell, a list row, a field in read mode or
 * a fact of a record.
 *
 * Context: a chip is a button ONLY when it has somewhere to go. With `contact` or `onOpen` it
 * opens the person's `RelationCard` (press, Enter or Space — React Aria's `DialogTrigger` through
 * `PopoverTrigger`: focus goes into the card, Escape and a click outside close it, and focus
 * comes back to the chip). Without them it stays text: a button that does nothing is a lie a
 * keyboard user pays for with one more Tab stop on every row.
 *
 * It opens on PRESS and not on hover: the card holds links, and content that has to be
 * reached with the pointer or the keyboard cannot disappear when the pointer leaves the name.
 */
export function UserChip({
  name,
  size = "md",
  src,
  detail,
  role,
  contact,
  onOpen,
}: UserChipProps) {
  const face = (
    <>
      {/* The name is written beside it: the photo's `alt` would say it twice. */}
      <span aria-hidden className="flex shrink-0">
        <Avatar name={name} size={size} {...(src === undefined ? {} : { src })} />
      </span>
      <span className="min-w-0 truncate text-meta text-ink">{name}</span>
      {detail === undefined ? null : (
        <span className="min-w-0 shrink truncate text-micro text-muted">{detail}</span>
      )}
    </>
  );

  const reachable =
    onOpen !== undefined ||
    (contact !== undefined &&
      Object.values(contact).some((v) => v !== undefined && v !== ""));
  if (!reachable) {
    return <span className="inline-flex min-w-0 items-center gap-2">{face}</span>;
  }

  return (
    <PopoverTrigger label={name} trigger={<ChipButton>{face}</ChipButton>}>
      {(close) => (
        <RelationCard
          name={name}
          media={{ person: true, ...(src === undefined ? {} : { src }) }}
          {...(role === undefined ? {} : { secondary: role })}
          {...(contact === undefined ? {} : { contact })}
          {...(onOpen === undefined
            ? {}
            : {
                onOpen: () => {
                  close();
                  onOpen();
                },
              })}
        />
      )}
    </PopoverTrigger>
  );
}

/** Several people in little width: the widget of a to-many relation.
 *
 *  Context: they overlap and get cut off at `max`. Five avatars in a row are five
 *  things; five overlapped with a «+3» are ONE thing that has eight inside, which
 *  is what the cell means to say.
 *
 *  The `title` carries the whole list: whoever needs the names has them without
 *  the column paying for their width. */
export function UserStack({
  names,
  max = 4,
  size = "md",
}: {
  names: readonly string[];
  max?: number;
  size?: AvatarSize;
}) {
  const copy = useUiCopy();
  if (names.length === 0) {
    return (
      <span className="text-meta text-muted italic" title={copy.person.unassigned}>
        {copy.person.unassigned}
      </span>
    );
  }

  const visible = names.length <= max ? names : names.slice(0, max - 1);
  const rest = names.length - visible.length;

  return (
    <span className="inline-flex items-center" title={names.join(", ")}>
      {visible.map((n, i) => (
        <span key={n} className={i === 0 ? "" : OVERLAP[size]}>
          <span className="block rounded-pill ring-1 ring-surface">
            <Avatar name={n} size={size} />
          </span>
        </span>
      ))}
      {rest <= 0 ? null : (
        <span
          className={`${OVERLAP[size]} inline-flex items-center justify-center rounded-pill bg-ink/10 font-medium tabular-nums text-muted ring-1 ring-surface ${SIZE[size]}`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
