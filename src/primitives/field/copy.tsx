"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { CopyButton } from "@sincpro/web-ui/primitives/value/Copyable";
import { createContext, type ReactNode, type RefObject, useContext } from "react";

/* ==================================================================== *
 *  THE COPY BUTTON OF A FIELD — what is on screen, to the clipboard.
 *
 *  Context: half of what a record shows is there to be pasted somewhere else —
 *  the customer's name into an email, a NIT into the tax portal, a reference
 *  into the bank's site. Selecting it by hand fails on exactly those: a
 *  many2one is a link that OPENS when pressed, a date is three segments, a
 *  number field holds its value in an input. So every `Field` and `DataField`
 *  carries a small copy button next to its label, in read mode and in edit
 *  mode alike, revealed by the pointer or the focus (always shown on a touch
 *  screen, where there is no hover).
 *
 *  ── It copies what is SEEN ──────────────────────────────────────────
 *
 *  The field does not know its control's value — the control does — so the
 *  button reads the value area at the moment of the press: the text drawn,
 *  plus what the inputs hold (the name a picker shows, a formatted amount),
 *  skipping placeholders (an empty date's «dd/mm/aaaa»), what is hidden, and
 *  the named icon buttons inside (a chip's «remove», a summary's «i»). What
 *  the person sees is what they paste.
 *
 *  ── On by default, never imposed ────────────────────────────────────
 *
 *  This system gives possibilities; it does not enclose. `copy="…"` copies
 *  something else (the NIT alone, an id the screen does not draw), `copy={false}`
 *  removes the button from one field, and `FieldCopyProvider value={false}`
 *  from a whole form — a login, a wizard where copying means nothing.
 * ==================================================================== */

const FieldCopyContext = createContext(true);

/** Turns the fields' copy buttons on or off for everything inside. On by default. */
export function FieldCopyProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <FieldCopyContext.Provider value={value}>{children}</FieldCopyContext.Provider>;
}

export function useFieldCopy(): boolean {
  return useContext(FieldCopyContext);
}

/** What skipping means: not seen, or not the value. */
const SKIP =
  '[hidden], [aria-hidden="true"], [data-placeholder], .sr-only, button[aria-label], [data-copy-skip], select';

/** The text a value area shows, inputs included, placeholders and named buttons left out. */
export function shownText(root: HTMLElement): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement) || node.matches(SKIP)) return;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      if (node.type !== "hidden") parts.push(` ${node.value} `);
      return;
    }
    for (const child of node.childNodes) walk(child);
  };
  walk(root);
  return parts.join("").replace(/\s+/g, " ").trim();
}

/** The button by a field's label. `scope` is the field's value area. */
export function FieldCopy({
  label,
  scope,
  value,
}: {
  label: string;
  scope: RefObject<HTMLElement | null>;
  /** What to copy instead of what is seen. */
  value?: string;
}) {
  const ui = useUiCopy();
  return (
    <span
      data-copy-skip=""
      className="inline-flex shrink-0 opacity-0 transition-opacity duration-(--duration-instant) group-hover/field:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"
    >
      <CopyButton
        label={fillCopy(ui.copyable.field, { label })}
        value={() => value ?? (scope.current === null ? "" : shownText(scope.current))}
      />
    </span>
  );
}
