"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { useRowWash } from "@sincpro/web-ui/primitives/table/Table";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

/* ==================================================================== *
 *  ROW ACTIONS — what you do to ONE record without going into it.
 *
 *  Duplicate, download, delete. Up to now every view solved this by putting in
 *  an «actions» column with three buttons drawn on all forty rows: in a
 *  twelve-column table that is stolen width, and a hundred and twenty lit-up
 *  buttons are noise competing with the data.
 *
 *  ── Hidden until the pointer says which one ─────────────────────────
 *
 *  They are drawn only on the row the pointer is on, or on the one that has
 *  focus. This is not minimalism: a row action runs against THE row, so showing
 *  it before there is a hovered row is showing a button that does not have a
 *  subject yet.
 *
 *  They fade instead of unmounting so that the tab key can reach them —
 *  `visibility:hidden` would take them out of the focus order and there would
 *  be no way to get to them without a mouse.
 *
 *  ── Two inline, the rest in the `⋯` ─────────────────────────────────
 *
 *  The ones used all the time stay one click away; the long tail lives in the
 *  menu. Six icons in a row are not six shortcuts, they are a row you have to
 *  read.
 * ==================================================================== */

export interface RowAction {
  id: string;
  /** What is read out loud, in the `title` and in the menu. */
  label: string;
  icon: LucideIcon;
  tone?: "normal" | "action" | "danger";
  disabled?: boolean;
  onSelect: () => void;
}

export function RowActions({
  actions,
  /** How many stay visible before the rest fall into the `⋯`. */
  inline = 2,
}: {
  actions: readonly RowAction[];
  inline?: number;
}) {
  const copy = useUiCopy();
  const wash = useRowWash();
  if (actions.length === 0) return <td className={`w-0 border-b border-line ${wash}`} />;

  /* With only one left over there is no `⋯`: a menu with a single item is one
     extra click to reach the same button. */
  const inlineActions = actions.length <= inline + 1 ? actions : actions.slice(0, inline);
  const overflow = actions.slice(inlineActions.length);
  const byId = new Map(actions.map((a) => [a.id, a]));

  return (
    /* The row's hairline runs under its actions too: without it the separators stopped one
       column short and the actions read as outside the table. */
    <td
      className={`w-0 border-b border-line py-1 pr-2 pl-1 align-middle whitespace-nowrap last:rounded-r-control ${wash}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-(--duration-instant) group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"
      >
        {inlineActions.map((a) => (
          <IconButton
            key={a.id}
            icon={a.icon}
            label={a.label}
            size="sm"
            {...(a.tone === undefined ? {} : { tone: a.tone })}
            {...(a.disabled === undefined ? {} : { disabled: a.disabled })}
            onClick={a.onSelect}
          />
        ))}
        {overflow.length === 0 ? null : (
          <Menu
            label={copy.selection.more}
            icon={MoreHorizontal}
            iconOnly
            chevron={false}
            align="end"
            groups={[
              {
                options: overflow.map((a) => ({
                  id: a.id,
                  label: a.label,
                  icon: a.icon,
                  ...(a.disabled === undefined ? {} : { disabled: a.disabled }),
                })),
              },
            ]}
            onSelect={(id) => byId.get(id)?.onSelect()}
          />
        )}
      </div>
    </td>
  );
}
