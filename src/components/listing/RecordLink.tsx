"use client";

import type { ReactNode } from "react";

/* ==================================================================== *
 *  THE NAME THAT OPENS THE RECORD.
 *
 *  Every list was drawing this button by hand, and each one picked a
 *  different cutoff: 28ch, 32ch, 42ch. The name is a link — blue, because
 *  it goes somewhere — and it truncates at the cell, not at a number
 *  somebody guessed. The click does not also open the row: the name and
 *  the row are two gestures, and both have to arrive.
 * ==================================================================== */

export function RecordLink({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  /** The whole name, when the cell shows only what fits. */
  title?: string;
}) {
  /* With nowhere to go it is the record's name, not a button: a control that looks pressable
     and does nothing is a dead end. */
  if (onClick === undefined) {
    return (
      <span
        {...(title === undefined ? {} : { title })}
        className="block min-w-0 max-w-full truncate text-meta font-medium text-ink"
      >
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      {...(title === undefined ? {} : { title })}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="block min-w-0 max-w-full truncate rounded-control text-left text-meta font-medium text-primary transition-colors duration-(--duration-instant) hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
    >
      {children}
    </button>
  );
}
