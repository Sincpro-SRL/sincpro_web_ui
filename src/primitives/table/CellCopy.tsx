"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { shownText } from "@sincpro/web-ui/primitives/field/copy";
import { CopyButton } from "@sincpro/web-ui/primitives/value/Copyable";
import { type ReactNode, useRef } from "react";

/**
 * A cell's value with its copy button — the table's version of a field's (see
 * `primitives/field/copy.tsx`): the number of an invoice, a customer's name, an amount, copied
 * without opening the row or selecting by hand.
 *
 * Context: the button appears where the pointer or the focus is (on a touch screen it is
 * always there) and always takes its room, so nothing in the row moves when it shows. In a
 * numeric cell it goes BEFORE the figure, so the figures stay aligned on the right edge —
 * which is what makes a column of amounts comparable. It copies what the cell shows
 * («Bs. 4.132,50», not `4132.5`) unless the column says what to copy.
 */
export function CellCopy({
  children,
  header,
  numeric = false,
  value,
}: {
  children: ReactNode;
  /** The column's name, for the button's: «Copiar «Cliente»». */
  header: string;
  numeric?: boolean;
  /** What to copy instead of what is seen. */
  value?: string;
}) {
  const ui = useUiCopy();
  const shown = useRef<HTMLSpanElement>(null);
  const button = (
    <span
      data-copy-skip=""
      className="inline-flex shrink-0 opacity-0 transition-opacity duration-(--duration-instant) group-hover/cell:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"
    >
      <CopyButton
        label={fillCopy(ui.copyable.field, { label: header })}
        value={() => value ?? (shown.current === null ? "" : shownText(shown.current))}
      />
    </span>
  );
  return (
    <span
      className={`group/cell flex w-full min-w-0 items-center gap-1 ${numeric ? "justify-end" : ""}`}
    >
      {numeric ? button : null}
      <span ref={shown} className="min-w-0">
        {children}
      </span>
      {numeric ? null : button}
    </span>
  );
}
