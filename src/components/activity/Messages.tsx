"use client";

import { currentCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
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
 * ESCRIBIR UNA NOTA, la manera que toda lista tiene.
 *
 * Es una función y no una constante porque sus palabras salen de la copia, y una
 * constante las congelaría con las que hubiera al cargar el módulo —o sea, las
 * de fábrica— por más que después se instale otra.
 */
export function writeANote(): MessageKind {
  const copy = currentCopy();
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
  /* La manera por default se arma acá adentro y no en la firma: un default de
     parámetro se evalúa en cada render, sí, pero escrito como constante del
     módulo congelaría las palabras de fábrica. */
  const ways = kinds ?? [writeANote()];
  const [writing, setWriting] = useState<MessageKind | undefined>(undefined);
  const [body, setBody] = useState("");
  const ready = body.trim() !== "" && !sending;

  function close() {
    setWriting(undefined);
    setBody("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Los botones SIEMPRE, elegido o no: son el índice de lo que se puede
          escribir acá, y esconderlos mientras escribís obliga a cancelar para
          ver si había otra forma. */}
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

      {/* Sin marco propio: el área ya tiene borde, y una tarjeta alrededor
          era una caja adentro de la hoja. */}
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
