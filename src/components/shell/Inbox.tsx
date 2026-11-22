"use client";

import { SystrayButton } from "@sincpro/web-ui/components/shell/TopBar";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { NOTICE_ICON } from "@sincpro/web-ui/primitives/notice/tones";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { formatRelative } from "@sincpro/web-ui/primitives/value/format";
import { Bell, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger, Heading, Pressable } from "react-aria-components";

export type InboxItem = {
  id: string;
  /** What happened, in a line: «Tu pedido 0047 salió a reparto». */
  title: string;
  /** The rest, two lines at most. */
  detail?: string;
  when: Date | string;
  /** Not seen yet: a dot, the title in bold, and said. */
  unread?: boolean;
  /** When it is a notice of a degree — a payment rejected (`bad`), a stock low (`warn`). Its
   *  icon comes with it, as in a `Callout`. */
  tone?: Extract<Tone, "info" | "warn" | "bad" | "good">;
  /** An icon of its own (a truck, a message) when it is not a notice of a degree. */
  icon?: LucideIcon;
};

export type InboxListProps = {
  items: readonly InboxItem[];
  /** Pressing one: the application opens what it is about (and marks it read). */
  onOpen?: (id: string) => void;
  /** «Marcar todo como leído» — drawn while something is unread. */
  onMarkAllRead?: () => void;
  /** «Ver todas» — the page with the whole history, when the application has one. */
  onSeeAll?: () => void;
  /** «Notificaciones» by default. */
  title?: string;
  /** The clock the times are read against; now by default (a test passes a fixed one). */
  now?: Date;
};

const ICON_TONE: Record<NonNullable<InboxItem["tone"]>, string> = {
  info: "text-info",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

/**
 * The notifications themselves, as a list: in the bar's popover (`Inbox`), or as the whole
 * page of a portal's «Notificaciones».
 *
 * Context: unread is not only a colour — the dot goes with the title in bold and with the word
 * said to a screen reader. The time is relative while it is recent («hace 5 minutos») and a
 * date after a week, the way the activity writes it. The newest first is the application's
 * order: it is passed already sorted, as a list is.
 */
export function InboxList({
  items,
  onOpen,
  onMarkAllRead,
  onSeeAll,
  title,
  now,
}: InboxListProps) {
  const copy = useUiCopy();
  const unread = items.filter((item) => item.unread === true).length;
  return (
    <div data-ui="inbox" className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <Heading slot="title" level={2} className="text-meta font-semibold text-ink">
          {title ?? copy.inbox.label}
          {unread === 0 ? null : (
            <span className="ml-1.5 font-normal text-muted tabular-nums">
              {fillCopy(copy.inbox.unreadCount, { count: unread })}
            </span>
          )}
        </Heading>
        {onMarkAllRead === undefined || unread === 0 ? null : (
          <Button role="ghost" size="sm" onClick={onMarkAllRead}>
            {copy.inbox.markAllRead}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Empty sentence={copy.inbox.empty} />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((item) => {
            const Icon =
              item.icon ?? (item.tone === undefined ? undefined : NOTICE_ICON[item.tone]);
            const fresh = item.unread === true;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-ui="inbox.item"
                  data-unread={fresh ? "" : undefined}
                  onClick={() => onOpen?.(item.id)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-(--duration-instant) hover:bg-ink/4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                    fresh ? "bg-primary/4" : ""
                  }`}
                >
                  {Icon === undefined ? null : (
                    <Icon
                      aria-hidden
                      strokeWidth={2}
                      className={`mt-0.5 size-(--size-icon-md) shrink-0 ${
                        item.tone === undefined ? "text-muted" : ICON_TONE[item.tone]
                      }`}
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`text-meta text-ink ${fresh ? "font-semibold" : "font-normal"}`}
                    >
                      {fresh ? <span className="sr-only">{copy.inbox.unread}: </span> : null}
                      {item.title}
                    </span>
                    {item.detail === undefined ? null : (
                      <span className="line-clamp-2 text-meta text-muted">{item.detail}</span>
                    )}
                    <span className="text-micro text-muted tabular-nums">
                      {formatRelative(new Date(item.when), now, copy)}
                    </span>
                  </span>
                  {fresh ? (
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-pill bg-primary"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {onSeeAll === undefined ? null : (
        <div className="border-t border-line px-1 py-1">
          <Button role="ghost" size="sm" onClick={onSeeAll}>
            {copy.inbox.seeAll}
          </Button>
        </div>
      )}
    </div>
  );
}

export type InboxProps = InboxListProps & {
  /** The bell by default. */
  icon?: LucideIcon;
};

/**
 * The notifications, from the bar: a bell with how many are unread, and the list in a
 * popover — the portal's «tu pedido salió», the ERP's «te asignaron una tarea».
 *
 * Context: the bell is a `SystrayButton` — zero is not drawn, past 99 it says «99+», and the
 * number is in its name — and the list is `InboxList` on the paper even under the navy bar.
 * Opening one closes the popover: what it is about takes the screen.
 */
export function Inbox({ icon = Bell, onOpen, ...list }: InboxProps) {
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const unread = list.items.filter((item) => item.unread === true).length;
  const label = list.title ?? copy.inbox.label;
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Pressable>
        <SystrayButton
          icon={icon}
          label={label}
          count={unread}
          active={open}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
      </Pressable>
      <Popover placement="bottom end">
        <Dialog
          aria-label={label}
          className="max-h-[inherit] w-(--container-inbox) overflow-auto outline-0"
        >
          <SurfaceProvider value="canvas">
            <InboxList
              {...list}
              onOpen={(id) => {
                setOpen(false);
                onOpen?.(id);
              }}
            />
          </SurfaceProvider>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
