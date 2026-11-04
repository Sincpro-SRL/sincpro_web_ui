"use client";

import { dayLabel } from "@sincpro/web-ui/components/chat/model";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { type Key, ListBox, ListBoxItem } from "react-aria-components";

/* ==================================================================== *
 *  THE CONVERSATIONS — the list of chats, one row each, with the one open.
 *
 *  Context: the left column of a messenger answers three questions per row:
 *  who is it, what was the last thing said, and is there something unread.
 *  The unread count is a number in words («3 sin leer»), not only a dot: a
 *  dot in a colour is the one signal that disappears for someone who cannot
 *  see the colour.
 *
 *  It is a React Aria ListBox, so the arrows move between conversations and
 *  Enter opens one, with no code of ours for the keyboard.
 * ==================================================================== */

export type Conversation = {
  id: string;
  /** Who, or what, the conversation is with. */
  title: string;
  /** The last message, cut to one line by the row. */
  preview?: string;
  /** When the last message was written. */
  at?: Date;
  /** Messages nobody has read yet in this conversation. */
  unread?: number;
};

export type ConversationListProps = {
  conversations: readonly Conversation[];
  /** The conversation open in the thread. */
  selectedId?: string;
  onSelect: (id: string) => void;
  /** The accessible name of the list. «Conversaciones» by default. */
  label?: string;
  /** The «now» the times are relative to. */
  now?: Date;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  label,
  now,
}: ConversationListProps) {
  const copy = useUiCopy();
  const clock = now ?? new Date();
  const words = { today: copy.chat.today, yesterday: copy.chat.yesterday };

  if (conversations.length === 0) return <Empty sentence={copy.chat.empty} />;

  return (
    <ListBox
      aria-label={label ?? copy.chat.conversations}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={selectedId === undefined ? [] : [selectedId]}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const [first] = keys;
        if (first !== undefined) onSelect(String(first as Key));
      }}
      className="flex min-h-0 flex-col gap-1 overflow-y-auto p-2 outline-none"
    >
      {conversations.map((conversation) => (
        <ListBoxItem
          key={conversation.id}
          id={conversation.id}
          textValue={conversation.title}
          className={({ isSelected, isFocusVisible }) =>
            `cursor-pointer rounded-control border px-3 py-2.5 outline-none ${
              isSelected
                ? "border-primary/40 bg-primary/10"
                : "border-transparent hover:bg-ink/4"
            } ${isFocusVisible ? "outline-2 outline-offset-1 outline-primary" : ""}`
          }
        >
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
              {conversation.title}
            </span>
            {conversation.at === undefined ? null : (
              <span className="shrink-0 text-micro text-muted">
                {dayLabel(conversation.at, clock, words, copy.locale)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-meta text-muted">
              {conversation.preview ?? ""}
            </span>
            {conversation.unread === undefined || conversation.unread === 0 ? null : (
              <span className="shrink-0 rounded-control bg-ink px-2 text-micro font-semibold text-surface tabular-nums">
                {conversation.unread}
                <span className="sr-only">
                  {fillCopy(copy.chat.unread, { count: String(conversation.unread) })}
                </span>
              </span>
            )}
          </div>
        </ListBoxItem>
      ))}
    </ListBox>
  );
}
