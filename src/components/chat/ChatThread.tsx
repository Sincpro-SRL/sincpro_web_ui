"use client";

import {
  type ChatMessage,
  dayLabel,
  groupByDay,
  startsRun,
} from "@sincpro/web-ui/components/chat/model";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { type UIEvent, useLayoutEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  THE THREAD — a conversation read from the first message to the last.
 *
 *  Context: the chat of a CRM or a help desk is read like WhatsApp or Telegram:
 *  the newest message is at the bottom, the older ones are above, and the
 *  reading starts where it ended. So the thread OPENS at the bottom, STAYS
 *  there while new messages arrive IF the person is already there, and does
 *  not drag them down when they are reading something above.
 *
 *  ── Reading up is never interrupted ─────────────────────────────────
 *
 *  Scrolled up, a new message does not move the view; a button «Ir al último
 *  mensaje» brings them back. Scrolled to the bottom, the thread follows.
 *
 *  ── Older messages are asked for, not poured in ─────────────────────
 *
 *  `onLoadOlder` draws a button at the top. The application fetches the
 *  earlier page and prepends it; the thread keeps the reading where it was by
 *  the application's own paging, not by a scroll guess here.
 *
 *  ── Days and runs ───────────────────────────────────────────────────
 *
 *  A separator names each day («Hoy», «Ayer», the date written out). Messages
 *  from the same author in a row share one name above them: the eye reads
 *  the run as one voice.
 * ==================================================================== */

/** How close to the bottom still counts as «at the bottom», in pixels. */
const AT_BOTTOM = 48;

export type ChatThreadProps = {
  messages: readonly ChatMessage[];
  /** Present = the top draws «Cargar mensajes anteriores». */
  onLoadOlder?: () => void;
  /** The application is fetching the earlier page right now. */
  loadingOlder?: boolean;
  /** The accessible name of the log. «Conversación» by default. */
  label?: string;
  /** The «now» the day names are relative to. */
  now?: Date;
};

export function ChatThread({
  messages,
  onLoadOlder,
  loadingOlder = false,
  label,
  now,
}: ChatThreadProps) {
  const copy = useUiCopy();
  const scroller = useRef<HTMLDivElement>(null);
  /* A ref, not state: the scroll handler writes it on every frame and nothing
     draws from it, so it must not cause a render. */
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const clock = now ?? new Date();

  /* Runs after the messages change and before the paint: the thread moves to the
     newest message in the same frame, so nobody sees it open at the top. */
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el === null || !pinned.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinned.current = distance < AT_BOTTOM;
    setShowJump(!pinned.current);
  }

  function toLatest() {
    const el = scroller.current;
    if (el === null) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    pinned.current = true;
    setShowJump(false);
  }

  const groups = groupByDay(messages);
  const words = { today: copy.chat.today, yesterday: copy.chat.yesterday };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        role="log"
        /* A scrollable region is reachable by keyboard (axe): the arrows scroll it. */
        tabIndex={0}
        aria-label={label ?? copy.chat.thread}
        aria-live="polite"
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-5 py-4"
      >
        {onLoadOlder === undefined ? null : (
          <div className="flex justify-center pb-3">
            <Button role="ghost" size="sm" disabled={loadingOlder} onClick={onLoadOlder}>
              {loadingOlder ? copy.chat.loadingOlder : copy.chat.loadOlder}
            </Button>
          </div>
        )}
        {messages.length === 0 ? <Empty sentence={copy.chat.empty} /> : null}
        {groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-1">
            <div className="my-3 flex justify-center">
              <span className="rounded-control border border-line bg-surface px-3 py-0.5 text-micro font-medium text-muted">
                {dayLabel(group.day, clock, words, copy.locale)}
              </span>
            </div>
            {group.messages.map((message, index) => (
              <Bubble
                key={message.id}
                message={message}
                first={startsRun(group.messages, index)}
                locale={copy.locale}
              />
            ))}
          </section>
        ))}
      </div>
      {showJump ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="pointer-events-auto">
            <Button role="secondary" size="sm" onClick={toLatest}>
              {copy.chat.jumpLatest}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bubble({
  message,
  first,
  locale,
}: {
  message: ChatMessage;
  /** The first of a run: its author's name is drawn above it. */
  first: boolean;
  locale: string;
}) {
  const copy = useUiCopy();
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    message.at,
  );
  return (
    <div
      className={`flex ${message.mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : ""}`}
    >
      <div
        className={`max-w-prose rounded-control border px-3 py-2 ${
          message.mine ? "border-primary/30 bg-primary/10" : "border-line bg-surface"
        } ${message.pending === true ? "opacity-70" : ""}`}
      >
        {first && !message.mine ? (
          <p className="text-meta font-medium text-muted">{message.author}</p>
        ) : null}
        <p className="text-body break-words whitespace-pre-wrap text-ink">{message.body}</p>
        <p className="mt-1 text-micro text-muted">
          <time dateTime={message.at.toISOString()}>{time}</time>
          {message.pending === true ? ` · ${copy.chat.sending}` : null}
        </p>
      </div>
    </div>
  );
}
