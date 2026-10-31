"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import {
  FieldLayoutProvider,
  type SheetLayout,
} from "@sincpro/web-ui/primitives/field/layout";
import { type FieldNote, NoteCard, NoteFlag } from "@sincpro/web-ui/primitives/field/note";
import { Hint } from "@sincpro/web-ui/primitives/hint/Hint";
import type { LucideIcon } from "lucide-react";
import { Children, type ReactNode, useId } from "react";

export type { SheetLayout };

/* ==================================================================== *
 *  THE SHEET — the form's canvas, not a pile of fields.
 *
 *  Odoo's `<sheet>` is the white region under the title: groups of fields,
 *  then a notebook, then whatever hangs off the record. Two decisions live
 *  here and nowhere else:
 *
 *      layout   stacked (label above) or horizontal (label | value).
 *               The sheet sets it once; each field can override.
 *      groups   titled columns side by side: Group 1 | Group 2 | Group 3.
 *               A FormSection is a named block that stacks; a SheetGroup is
 *               a column of a row of groups.
 *
 *  ── Two ways to show a field ────────────────────────────────────────
 *
 *  stacked      the iOS grouped look. Four facts in a header. Default.
 *  horizontal   Odoo's form: every value starts on the same vertical, so
 *               twenty fields read as a column, not a bounce.
 *
 *  Header facts do not use that column. A form aligns twenty values; four
 *  numbers in the header belong next to their names.
 *
 *  ── The record has two shapes ───────────────────────────────────────
 *
 *  Global facts + tabs     the sheet fields sit ABOVE the notebook. They
 *                          describe the record on every page.
 *  Tabs only               no global fields; the notebook is the body.
 *                          A record does this by writing no `Record.Facts`.
 * ==================================================================== */

export type SheetField = {
  label: string;
  value: ReactNode;
  /** Help on the label, as a `?`. Hover or click. */
  hint?: string;
  mono?: boolean;
  /** A note that belongs to this fact — the same as `Field`'s: a flag by the label, and an
   *  entry in the record's activity. */
  note?: FieldNote;
};

function Facts({
  fields,
  columns,
  layout,
}: {
  fields: readonly SheetField[];
  columns: 1 | 2 | 3 | 4;
  layout: SheetLayout;
}) {
  const d = useDensity();
  const idBase = useId();
  const horizontal = layout === "horizontal";
  /* Horizontal facts are a run of pairs, not a grid stretched across the
     paper. A two-column grid put «Total Bs 12.480» on the left and «Vence
     15 nov» on the right, with the middle of the card empty. */
  const asGrid = !horizontal && columns > 1 && d === "comfortable";
  const grid =
    columns === 4
      ? "grid-cols-2 @lg:grid-cols-4"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <dl
      className={
        horizontal
          ? "flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1.5"
          : asGrid
            ? `@container grid min-w-0 ${grid} ${byDensity(d, "gap-x-8 gap-y-2.5", "gap-x-6 gap-y-2")}`
            : `flex min-w-0 flex-col ${byDensity(d, "gap-2.5", "gap-2")}`
      }
    >
      {fields.map((field, at) => {
        const noteId = field.note === undefined ? undefined : `${idBase}-${at}-note`;
        const empty = field.value === undefined || field.value === null || field.value === "";
        const card =
          field.note === undefined || noteId === undefined ? null : (
            <NoteCard note={field.note} id={noteId} owner={field.label} />
          );
        /* The note's card goes INSIDE the value: a `<dl>` holds only its terms and values.
           With a note the value is a flex box, so the absolute card keeps the value's top
           as its static position while being read after it. */
        const value = (
          <dd
            {...(noteId === undefined ? {} : { "aria-describedby": noteId })}
            className={`min-w-0 text-meta ${card === null ? "" : "flex"} ${
              empty ? "text-muted italic" : "text-ink"
            } ${field.mono === true ? "font-mono tabular-nums" : ""}`}
          >
            {empty ? "—" : field.value}
            {card}
          </dd>
        );
        const name = (
          <dt
            className={`flex items-center gap-1 text-micro text-muted ${
              horizontal ? "shrink-0" : "min-w-0"
            }`}
          >
            <span>{field.label}</span>
            {field.hint === undefined ? null : <Hint>{field.hint}</Hint>}
            {field.note === undefined ? null : <NoteFlag note={field.note} />}
          </dt>
        );
        if (horizontal) {
          /* A header fact is a pair: the number sits next to its name. The
             8rem label column is for a form, where twenty values have to
             start on the same vertical. Here it left «Filas» half a column
             away from 400. */
          return (
            <div key={field.label} className="flex min-w-0 items-baseline gap-2">
              {name}
              {value}
            </div>
          );
        }
        return (
          <div key={field.label} className="flex min-w-0 flex-col gap-0.5">
            {name}
            {value}
          </div>
        );
      })}
    </dl>
  );
}

export function Sheet({
  fields,
  columns = 2,
  layout = "stacked",
  head,
  children,
}: {
  fields?: readonly SheetField[];
  columns?: 1 | 2 | 3 | 4;
  /** How fields inside this sheet (and its groups) place the label. */
  layout?: SheetLayout;
  /** The top of the paper: groups, then the notebook sitting on its mouth.
   *  It shares a short gap with `fields`, so the tabs belong to the sheet
   *  and not to the page below. */
  head?: ReactNode;
  children?: ReactNode;
}) {
  const d = useDensity();
  const facts = fields !== undefined && fields.length > 0;
  if (!facts && head === undefined && children === undefined) return null;

  const top =
    facts || head !== undefined ? (
      <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-4", "gap-3")}`}>
        {facts ? <Facts fields={fields} columns={columns} layout={layout} /> : null}
        {head}
      </div>
    ) : null;

  return (
    <FieldLayoutProvider value={layout}>
      <div
        className={`flex min-w-0 flex-col ${byDensity(d, "gap-(--spacing-block)", "gap-2.5")}`}
      >
        {top}
        {children}
      </div>
    </FieldLayoutProvider>
  );
}

/** A row of columns on the paper. The paper is the sheet; a group is not a
 *  second box. A vertical hairline separates columns — that is what still
 *  groups them when a column has no title. */
export function SheetGroups({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const d = useDensity();
  const stacked = d === "compact";
  // Below `handheld` the columns stack the way compact density does: two 180 px
  // columns on a phone left each label beside a control with no width at all. The
  // container is a wrapper because a grid cannot query its own width.
  const grid = stacked
    ? "grid-cols-1"
    : columns === 4
      ? "grid-cols-2 @lg:grid-cols-4 @max-handheld:grid-cols-1"
      : columns === 3
        ? "grid-cols-3 @max-handheld:grid-cols-1"
        : "grid-cols-2 @max-handheld:grid-cols-1";
  const items = Children.toArray(children);
  return (
    <div className="@container min-w-0">
      <div className={`grid min-w-0 ${grid}`}>
        {items.map((child, i) => {
          const first = i === 0;
          const last = i === items.length - 1;
          const edge = stacked
            ? `${first ? "" : "border-t border-line pt-3"} ${last ? "" : "pb-3"}`
            : `${first ? "" : "border-l border-line pl-6 @max-handheld:border-l-0 @max-handheld:border-t @max-handheld:pl-0 @max-handheld:pt-3"} ${
                last ? "" : "pr-6 @max-handheld:pr-0 @max-handheld:pb-3"
              }`;
          return (
            <div key={i} className={`min-w-0 ${edge}`}>
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One column of a `SheetGroups` row.
 *
 *  The title is OPTIONAL. With one, it is a name above the fields — the same
 *  name in read and in edit, so the paper does not rearrange. Without one,
 *  the column is still a group: the hairline between columns is the edge.
 *
 *  It is not a tray and not a card. Nested boxes on the sheet made untitled
 *  groups look empty and made edit mode look like a dashboard. */
export function SheetGroup({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title?: string;
  hint?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const d = useDensity();
  const withHeader = title !== undefined;
  return (
    <section className={`flex min-w-0 flex-col ${byDensity(d, "gap-2.5", "gap-2")}`}>
      {withHeader ? (
        /* A group title is ABOVE its labels, not one of them: at the labels' size and weight
           «Cliente» the group read like «Cliente» the field. One step up in size and weight,
           and a hairline that says where the group starts. */
        <header className="flex min-w-0 items-center gap-2 border-b border-line pb-1.5">
          {Icon === undefined ? null : (
            <Icon
              className="size-(--size-icon-sm) shrink-0 text-muted"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
          <h3 className="min-w-0 truncate text-body font-semibold text-ink">{title}</h3>
          {hint === undefined ? null : <Hint>{hint}</Hint>}
        </header>
      ) : hint === undefined ? null : (
        <Hint>{hint}</Hint>
      )}
      <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-2.5", "gap-2")}`}>
        {children}
      </div>
    </section>
  );
}
