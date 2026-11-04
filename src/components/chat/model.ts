/* ==================================================================== *
 *  THE CHAT MODEL — the shapes a conversation is made of, and the pure rules
 *  that turn them into a thread: which day a message belongs to, what the day
 *  is called. No React here, so the rules are tested in Node.
 * ==================================================================== */

export type ChatMessage = {
  id: string;
  /** Who wrote it, as the screen names them: «Ana Ruiz». */
  author: string;
  /** The text. Plain: a message is not a page of its own. */
  body: string;
  at: Date;
  /** Written by the person looking at the thread. Drawn on the other side. */
  mine?: boolean;
  /** Sent but not yet confirmed by the server. Said, never a silent success. */
  pending?: boolean;
};

export type DayGroup = {
  /** `YYYY-MM-DD` in local time: a stable key, and the day's identity. */
  key: string;
  day: Date;
  messages: ChatMessage[];
};

/** The local calendar day of a date, as `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Messages in the order they were written, cut into the days they were written on.
 *  The input may come unsorted (a reconnect delivers out of order); the output never is. */
export function groupByDay(messages: readonly ChatMessage[]): DayGroup[] {
  const ordered = [...messages].sort((a, b) => a.at.getTime() - b.at.getTime());
  const groups: DayGroup[] = [];
  for (const message of ordered) {
    const key = dayKey(message.at);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) {
      last.messages.push(message);
    } else {
      const day = new Date(
        message.at.getFullYear(),
        message.at.getMonth(),
        message.at.getDate(),
      );
      groups.push({ key, day, messages: [message] });
    }
  }
  return groups;
}

/** A day's name for the separator: «Hoy», «Ayer», or the date written out. */
export function dayLabel(
  day: Date,
  now: Date,
  words: { today: string; yesterday: string },
  locale: string,
): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(day) === dayKey(now)) return words.today;
  if (dayKey(day) === dayKey(yesterday)) return words.yesterday;
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(day);
}

/** Whether a message opens a new run from its author: the name is drawn only then. */
export function startsRun(messages: readonly ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const previous = messages[index - 1];
  const current = messages[index];
  if (previous === undefined || current === undefined) return true;
  return previous.author !== current.author || previous.mine !== current.mine;
}
