"use client";

import { currentCopy, type UiCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { TextArea } from "@sincpro/web-ui/primitives/field/Field";
import { Send, Users, X } from "lucide-react";
import { type ReactNode, useState } from "react";

/**
 * The box to write in. What gets written is drawn by `Activity`, together with
 * what the system logged — see its note on why the merge is the default.
 *
 * Odoo's chatter —our activity— is two things sharing a column — a log the system writes and a
 * thread people write — and they are usually confused because they sit
 * together. They are not the same: an event is a fact that happened, and a
 * message is somebody's account of it. The system's half never needs a reply
 * box; this half is nothing without one.
 *
 * ── A note is not a message, and the difference is who reads it ─────
 *
 * Odoo splits «log an internal note» from «send a message» and the split is
 * worth keeping: one stays inside, the other leaves. Drawing them the same and
 * hoping the writer remembers is how somebody's internal remark reaches a
 * client. So the CHOICE COMES FIRST: the buttons are what you see, and the box
 * only appears once you said which kind of thing you are writing. A box you can
 * type into before choosing is a box whose destination you find out afterwards.
 *
 * ── And who receives it, before you send it ─────────────────────────
 *
 * A message that leaves goes to somebody, and «somebody» has to be readable
 * without pressing send to find out. `recipients` is drawn next to the box for
 * the kinds that leave, and never for an internal note — whose whole definition
 * is that it reaches nobody outside.
 */

export type Message = {
  id: string;
  author: string;
  at: Date | string | number;
  body: string;
  /** An internal note: it stays inside. Drawn differently on purpose. */
  internal?: boolean;
};

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

export type MessageComposerProps = {
  /** The ways of writing this record takes. Its own list because it is the
   *  application that knows whether there is WhatsApp, and to whose number. */
  kinds?: readonly MessageKind[];
  onSend: (body: string, kind: MessageKind) => void;
  sending?: boolean;
  /** Next to the ways of writing, for whatever the application has to say about the send. */
  footer?: ReactNode;
};

export function MessageComposer({
  kinds,
  onSend,
  sending = false,
  footer,
}: MessageComposerProps) {
  const copy = useUiCopy();
  /* The default way is built in here and not in the signature: a parameter
     default is evaluated on every render, yes, but written as a module
     constant it would freeze the factory words. */
  const ways = kinds ?? [writeANote(copy)];
  const [writing, setWriting] = useState<MessageKind | undefined>(undefined);
  const [body, setBody] = useState("");
  const ready = body.trim() !== "" && !sending;

  function close() {
    setWriting(undefined);
    setBody("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* The buttons ALWAYS, chosen or not: they are the index of what can be
          written here, and hiding them while you write forces you to cancel to
          see whether there was another way. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {ways.map((kind) => (
          <Button
            key={kind.id}
            /* Chosen is `secondary`, not `primary`: the gold is the record's one action,
               and a way of writing that is merely selected is not an action. */
            role={writing?.id === kind.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => (writing?.id === kind.id ? close() : setWriting(kind))}
          >
            {kind.label}
          </Button>
        ))}
        {footer === undefined ? null : <div className="ml-auto min-w-0">{footer}</div>}
      </div>

      {/* No frame of its own: the area already has a border, and a card around it
          was a box inside the sheet. */}
      {writing === undefined ? null : (
        <div className="flex min-w-0 flex-col gap-2">
          {writing.internal === true || writing.recipients === undefined ? null : (
            <p
              className="flex min-w-0 items-center gap-1.5 text-micro text-muted"
              title={copy.activity.recipients}
            >
              <Users className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">
                {writing.recipients.length === 0
                  ? copy.activity.noRecipients
                  : writing.recipients.join(" · ")}
              </span>
            </p>
          )}
          <TextArea
            value={body}
            onChange={setBody}
            placeholder={writing.placeholder ?? copy.activity.messagePlaceholder}
            rows={3}
          />
          <div className="flex min-w-0 items-center gap-2">
            {/* Secondary: the panel sits beside the record, and the record's rail already
                holds the screen's one gold action (PRINCIPLES §2). */}
            <Button
              role="secondary"
              size="sm"
              icon={Send}
              disabled={!ready}
              onClick={() => {
                onSend(body.trim(), writing);
                close();
              }}
            >
              {sending ? copy.activity.sending : copy.activity.send}
            </Button>
            <Button role="ghost" size="sm" icon={X} onClick={close}>
              {copy.activity.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
