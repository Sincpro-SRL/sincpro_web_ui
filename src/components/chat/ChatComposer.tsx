"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { TextArea } from "@sincpro/web-ui/primitives/field/Field";
import { Send } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

/* ==================================================================== *
 *  THE COMPOSER — where the next message is written.
 *
 *  Context: in a chat, Enter sends and Shift+Enter starts a new line — that is
 *  the habit of every messenger, and a composer that makes Enter a line break
 *  makes people hunt for the send button. The IME's composition (a Japanese or
 *  a dictated word still being chosen) is NOT a send: Enter confirms the
 *  candidate, so it is ignored while `isComposing`.
 *
 *  Empty or blank text does not send. The text is cleared only after `onSend`
 *  is called, so a failed send can be retried by the application without the
 *  person retyping it — the application decides what a failure keeps.
 * ==================================================================== */

export type ChatComposerProps = {
  /** The text, trimmed, when it is sent. */
  onSend: (text: string) => void;
  /** The conversation is closed, or the application is not connected. */
  disabled?: boolean;
  /** The accessible name of the box. «Mensaje» by default. */
  label?: string;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  disabled = false,
  label,
  placeholder,
}: ChatComposerProps) {
  const copy = useUiCopy();
  const [text, setText] = useState("");
  const body = text.trim();
  const blocked = disabled || body === "";

  function send() {
    if (blocked) return;
    onSend(body);
    setText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <div
      onKeyDown={onKeyDown}
      /* A container, so the send button follows the width of the COMPOSER, not of the
         screen: in a narrow side panel on a desk it is as tight as on a phone. */
      className="@container flex items-end gap-3 border-t border-line bg-surface px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <TextArea
          value={text}
          onChange={setText}
          rows={2}
          disabled={disabled}
          aria-label={label ?? copy.chat.composer}
          placeholder={placeholder ?? copy.chat.placeholder}
        />
      </div>
      <Button role="secondary" icon={Send} disabled={blocked} onClick={send}>
        {/* Below 20rem the word goes and the icon stays: the box keeps the room to write.
            The word is still the button's name for a screen reader. */}
        <span className="sr-only @xs:not-sr-only">{copy.chat.send}</span>
      </Button>
    </div>
  );
}
