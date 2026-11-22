"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { indexOptions, type MenuGroup, MenuList } from "@sincpro/web-ui/primitives/menu/Menu";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

/* How long a finger rests before it is a «press and hold», and how far it may drift and still
   be one — the platforms' own numbers, near enough. */
const HOLD_MS = 500;
const DRIFT = 10;

export type ContextMenuProps = {
  /** What the menu is about, read when it opens: «Acciones de la factura 0047». */
  label: string;
  groups: readonly MenuGroup[];
  onSelect?: (id: string) => void;
  /** The row, the card, the event — what is right-clicked or held. As a function it is told
   *  whether its menu is open, so the row can stay marked: with the menu over the list, which
   *  row it belongs to is otherwise a guess. */
  children: ReactNode | ((state: { open: boolean }) => ReactNode);
  /** Off for now (a row being saved): the browser's own menu answers instead. */
  disabled?: boolean;
};

/**
 * The verbs of ONE thing, where the hand already is: right click on a row or a card, a finger
 * held on it, or Shift+F10 / the Menu key on it.
 *
 * Context: an ERP list's frequent verbs — open, duplicate, send, cancel — live in the record's
 * `⋯`, three moves away from the row; a board's card and a calendar's event have no room for a
 * `⋯` at all. This is the same menu (`MenuList`: the same groups, icons, shortcuts and danger
 * rows as `Menu`) opened AT the pointer. It is a shortcut, never the only way: whatever is here
 * must also be reachable by a visible control, because nobody finds a right click by looking.
 * It wraps its child without a box of its own (`display: contents`), so a table's row or a
 * grid's card keeps its layout; the keyboard opens it from the focused element inside.
 */
export function ContextMenu({
  label,
  groups,
  onSelect,
  children,
  disabled = false,
}: ContextMenuProps) {
  const copy = useUiCopy();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const byId = indexOptions(groups.flatMap((g) => g.options));

  const cancelHold = () => {
    if (hold.current !== null) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };

  const onContextMenu = (event: MouseEvent) => {
    if (disabled) return;
    event.preventDefault();
    cancelHold();
    setAt({ x: event.clientX, y: event.clientY });
  };

  /* iOS fires no `contextmenu` on a long press; Android does, and then the hold has already
     been cancelled by it. */
  const onPointerDown = (event: PointerEvent) => {
    if (disabled || event.pointerType !== "touch") return;
    const { clientX: x, clientY: y } = event;
    hold.current = { x, y, timer: window.setTimeout(() => setAt({ x, y }), HOLD_MS) };
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = hold.current;
    if (start === null) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRIFT) cancelHold();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled) return;
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const box = (event.target as HTMLElement).getBoundingClientRect();
    setAt({ x: box.left, y: box.bottom });
  };

  return (
    <div
      data-ui="context-menu"
      className="contents"
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={onKeyDown}
    >
      {typeof children === "function" ? children({ open: at !== null }) : children}
      {/* A point, not a box: the menu hangs from where the pointer was. */}
      <span
        ref={anchor}
        aria-hidden
        className="pointer-events-none fixed size-0"
        style={at === null ? undefined : { left: at.x, top: at.y }}
      />
      <Popover
        triggerRef={anchor}
        isOpen={at !== null}
        onOpenChange={(open) => {
          if (!open) setAt(null);
        }}
        placement="bottom start"
        offset={2}
        className="w-max min-w-48 max-w-(--container-short)"
      >
        <MenuList
          label={label}
          groups={groups}
          closeOnSelect
          autoFocus
          emptyText={copy.menu.empty}
          onAction={(key) => {
            const option = byId.get(String(key));
            option?.onSelect?.();
            onSelect?.(String(key));
            setAt(null);
          }}
        />
      </Popover>
    </div>
  );
}
