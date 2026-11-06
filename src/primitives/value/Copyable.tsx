"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * A VALUE THAT GETS COPIED.
 *
 * Context: half the values in this product exist to be pasted somewhere
 * else —a tax ID, an invoice CUF, a bank reference, a 26-character
 * authorisation code—. Selecting them by hand fails precisely with the ones
 * where it matters most not to make a mistake: they are long, monospaced and get cut off.
 *
 * ── It confirms, and that is why the state lives here ───────────────
 *
 * Copying has no visible effect: the clipboard is off the screen. A
 * button that does not answer gets pressed three times «just in case». That is why the icon
 * turns into a tick for two seconds — the minimum to believe it without staying
 * to watch.
 *
 * ── And it can fail ─────────────────────────────────────────────────
 *
 * `navigator.clipboard` does not exist outside a secure context, and in some
 * browsers it demands a permission that can be denied. That is handled: if it fails, the
 * button says so instead of pretending it copied. A false confirmation is worse than
 * none, because someone pastes what they had before and never finds out.
 */

export type CopyableProps = {
  /** What is copied. Always text: the clipboard has no types. */
  value: string;
  /** How it looks, if it is not the value as is. A fingerprint is shown cut off and
   *  copied whole, which is precisely why the two things are different
   *  props. */
  children?: ReactNode;
  /** The value is a machine's: id, hash, key. Without this, normal typography. */
  mono?: boolean;
  /** Only the button, without the value beside it. For a cell or a header where
   *  the value is already drawn. */
  bare?: boolean;
};

/** How long the tick lasts. Two seconds: enough to see it without the button
 *  staying in a state that is no longer true. */
const CONFIRMED_FOR = 2000;

/**
 * The button alone, for a value that is only known when it is pressed — what a field shows
 * at that moment (`Field`'s copy button reads it from the screen). `Copyable` is this
 * button next to its value.
 */
export function CopyButton({
  value,
  label,
}: {
  /** The text, or how to get it at the moment of the press. */
  value: string | (() => string);
  /** Its name at rest. Defaults to the copy table's «Copiar». */
  label?: string;
}) {
  const copy = useUiCopy();
  const [state, setState] = useState<"idle" | "done" | "failed" | "empty">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Cleared on unmount: without this, copying and closing the panel before the two
     seconds leaves a `setState` pointing at a component that no longer exists. */
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function run() {
    if (timer.current !== null) clearTimeout(timer.current);
    const text = typeof value === "function" ? value() : value;
    if (text.trim() === "") {
      /* Nothing on screen to copy: said, not a check mark over an empty clipboard. */
      setState("empty");
      timer.current = setTimeout(() => setState("idle"), CONFIRMED_FOR);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      /* Without a clipboard —insecure context, permission denied— it SAYS so. Pretending
         it copied makes someone paste what they had before without knowing. */
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), CONFIRMED_FOR);
  }

  const said =
    state === "done"
      ? copy.copyable.done
      : state === "failed"
        ? copy.copyable.failed
        : state === "empty"
          ? copy.copyable.empty
          : (label ?? copy.copyable.label);

  return (
    <button
      type="button"
      onClick={(e) => {
        /* Inside a row that opens or a link: copying is not opening. */
        e.stopPropagation();
        void run();
      }}
      aria-label={said}
      title={said}
      className={`inline-flex shrink-0 items-center justify-center rounded-control p-0.5 transition-colors duration-(--duration-instant) ${
        state === "done"
          ? "text-good"
          : state === "failed" || state === "empty"
            ? "text-bad"
            : "text-muted hover:bg-ink/6 hover:text-ink"
      }`}
    >
      {state === "done" ? (
        <Check className="size-(--size-icon-sm)" strokeWidth={2.5} />
      ) : (
        <Copy className="size-(--size-icon-sm)" strokeWidth={2} />
      )}
    </button>
  );
}

export function Copyable({ value, children, mono = false, bare = false }: CopyableProps) {
  const button = <CopyButton value={value} />;
  if (bare) return button;

  return (
    /* The button appears with the pointer and ALWAYS takes up space: if it appeared out of
       nowhere, the value would shift on hover, and text that moves
       when you go to select it is worse than having no button. */
    <span className="group/copy inline-flex min-w-0 items-center gap-1">
      <span className={`min-w-0 truncate ${mono ? "font-mono" : ""}`}>
        {children ?? value}
      </span>
      <span className="opacity-0 transition-opacity duration-(--duration-instant) group-hover/copy:opacity-100 focus-within:opacity-100">
        {button}
      </span>
    </span>
  );
}
