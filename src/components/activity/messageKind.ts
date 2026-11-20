import { currentCopy, type UiCopy } from "@sincpro/web-ui/foundations/uiCopy";

/* Without `"use client"`, apart from `Messages.tsx`: a server component that builds the kinds
   an `Activity` offers calls `writeANote()` like any function. */

/** A way of writing. `note` stays inside; everything else leaves, and what
 *  changes between them is only the channel and who is on the other side. */
export type MessageKind = {
  id: string;
  label: string;
  /** It stays inside. Without this the kit assumes it leaves, which is the
   *  answer that errs on the side of asking. */
  internal?: boolean;
  /** Who gets it, in their own words: names for a mail, numbers for WhatsApp.
   *  Shown before sending, never after. */
  recipients?: readonly string[];
  placeholder?: string;
};

/**
 * WRITE A NOTE, the way every list has.
 *
 * It is a function and not a constant because its words come from the copy, and a
 * constant would freeze them with whatever there was when the module loaded —that is, the
 * factory ones— even if another is installed afterwards. Without `copy`, the installed ones; a
 * component passes it those of its branch.
 */
export function writeANote(copy: UiCopy = currentCopy()): MessageKind {
  return {
    id: "note",
    label: copy.activity.writeNote,
    internal: true,
    placeholder: copy.activity.notePlaceholder,
  };
}
