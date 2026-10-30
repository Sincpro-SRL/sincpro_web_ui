"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { cn, focusRing } from "@sincpro/web-ui/foundations/variants";
import { Button, ButtonLink, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { CellStack, Thumb } from "@sincpro/web-ui/primitives/cell/CellStack";
import { FieldIdsContext } from "@sincpro/web-ui/primitives/field/context";
import { type FormMode, useFormMode } from "@sincpro/web-ui/primitives/field/mode";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Info } from "lucide-react";
import { type ReactNode, useContext } from "react";
import { Link } from "react-aria-components";

/* ==================================================================== *
 *  RELATION — a many2one as a VALUE: the record this one points to.
 *
 *  «Distribuidora Andina S.R.L.» in the customer field of an invoice is not a
 *  string, it is another record. Drawn as text it is a dead end: to see the
 *  customer's NIT, its debt or its phone the person goes back to the menu and
 *  searches it by name. Here the name is a LINK to the record, with what tells
 *  it apart below (the NIT) and its picture on the left — the same hierarchy
 *  as `CellStack` — and, when there is one, a SUMMARY that floats next to it.
 *
 *  ── Why the summary opens from an info button, and not on hover ─────
 *
 *  A tooltip (`TooltipTrigger`) is for a few words that are never interactive:
 *  React Aria makes it a `role="tooltip"` that the keyboard cannot enter. The
 *  summary holds facts AND an «Abrir» action, so it is a dialog in a popover
 *  (`DialogTrigger`, through `PopoverTrigger`): focus goes into it, Escape and a
 *  click outside close it, focus comes back. A hover card would open on the
 *  pointer's way across a table, never on touch, and could not be reached with
 *  Tab without a second, invisible mechanism. One visible affordance — the `i`
 *  next to the name — opens it the same way for the mouse, the keyboard and the
 *  finger, and leaves the name free to do the one thing a link does: go.
 *
 *  ── The read face of a field; the `Picker` is the edit face ─────────
 *
 *  In a form, the same many2one is CHOSEN with `Picker` while editing and SHOWN
 *  with this while reading. Pass the picker as `editor`: in edit mode the field
 *  draws it, in read mode it draws the relation. One element inside the
 *  `Field`, two faces, and no second chooser.
 * ==================================================================== */

/** What the floating summary of the related record says. */
export type RelationSummary = {
  /** The title of the card. The relation's name when absent. */
  title?: string;
  /** The state of the related record — «al día», «con deuda». */
  tag?: { label: string; tone?: Tone };
  /** Two to four facts that answer the usual question about it: the debt, the credit
   *  limit, the city, the phone. More is a record, not a summary. */
  facts?: readonly { label: string; value: ReactNode }[];
};

type RelationMedia = { src?: string; alt?: string; icon?: LucideIcon };

export type RelationCardProps = {
  name: string;
  secondary?: ReactNode;
  media?: RelationMedia;
  summary?: RelationSummary;
  /** «Abrir»: go to the related record. */
  onOpen?: () => void;
  /** The record's address, when it has one: «Abrir» becomes a real link. */
  href?: string;
};

/**
 * The summary of a related record: picture, title, its tag, a handful of facts and «Abrir».
 *
 * Context: it answers the question a person has about the customer of an invoice without
 * leaving the invoice — «does it owe us?», «what is its NIT?» — and, when the answer is
 * «I need more», one press takes them to the record. It is what floats from a
 * `RelationValue`, and it is exported on its own for a side panel.
 */
export function RelationCard({
  name,
  secondary,
  media,
  summary = {},
  onOpen,
  href,
}: RelationCardProps) {
  const copy = useUiCopy();
  const title = summary.title ?? name;
  return (
    /* React events bubble through the popover's portal to the React parents of the link —
       a table row that opens on click among them. A click inside the card stays here. */
    <div className="flex w-72 max-w-full flex-col gap-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-w-0 items-start gap-3">
        {media === undefined ? null : (
          <Thumb
            size="lg"
            {...(media.src === undefined ? {} : { src: media.src })}
            {...(media.alt === undefined ? {} : { alt: media.alt })}
            {...(media.icon === undefined ? {} : { icon: media.icon })}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lead leading-tight font-semibold text-ink">{title}</span>
          {secondary === undefined ? null : (
            <span className="truncate text-micro tabular-nums text-muted">{secondary}</span>
          )}
          {summary.tag === undefined ? null : (
            <span className="flex">
              <Tag tone={summary.tag.tone ?? "neutral"}>{summary.tag.label}</Tag>
            </span>
          )}
        </div>
      </div>

      {summary.facts === undefined || summary.facts.length === 0 ? null : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
          {summary.facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col">
              <dt className="truncate text-micro text-muted">{fact.label}</dt>
              <dd className="truncate text-meta tabular-nums text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {href !== undefined ? (
        <div className="flex justify-end border-t border-line pt-2">
          <ButtonLink
            href={href}
            role="ghost"
            size="sm"
            icon={ArrowRight}
            {...(onOpen === undefined ? {} : { onClick: onOpen })}
          >
            {copy.relation.open}
          </ButtonLink>
        </div>
      ) : onOpen !== undefined ? (
        <div className="flex justify-end border-t border-line pt-2">
          <Button role="ghost" size="sm" icon={ArrowRight} onClick={onOpen}>
            {copy.relation.open}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type RelationValueProps = {
  /** The related record's name. Empty, `null` or absent = no record: said, in muted. */
  name?: string | null;
  /** What tells it apart: a NIT, a code, a city. Small and quiet, under the name. */
  secondary?: ReactNode;
  /** Its picture or icon, on the left. */
  media?: RelationMedia;
  /** Go to the related record. The name becomes a link. */
  onOpen?: () => void;
  /** The related record's address: the name becomes a real `<a>` (middle-click, copy). */
  href?: string;
  /** Present = an info button next to the name opens the `RelationCard`. */
  summary?: RelationSummary;
  /** The control that EDITS this relation — a `Picker` — drawn instead in edit mode. */
  editor?: ReactNode;
  /** Forces the mode; by default the form's. Only matters with `editor`. */
  mode?: FormMode;
};

/**
 * A many2one as a value: the related record's name as a link, with its secondary line and
 * picture, and its summary one press away. Works in a table cell, a list row, a `Record.Facts`
 * value and a form field (read mode; pass the `Picker` as `editor` for edit mode).
 */
export function RelationValue({
  name,
  secondary,
  media,
  onOpen,
  href,
  summary,
  editor,
  mode,
}: RelationValueProps) {
  const copy = useUiCopy();
  const formMode = useFormMode(mode);
  /* Inside a `Field` the value takes the control's height, so a form that goes from
     editing to reading does not move (the same rule as `ReadValue`). */
  const inField = useContext(FieldIdsContext) !== null;

  if (editor !== undefined && formMode === "edit") return <>{editor}</>;

  const frame = (child: ReactNode) =>
    inField ? (
      <span className="flex min-h-(--size-control-md) min-w-0 items-center">{child}</span>
    ) : (
      child
    );

  if (name === undefined || name === null || name === "") {
    return frame(<span className="text-meta text-muted italic">{copy.relation.none}</span>);
  }

  const goes = href !== undefined || onOpen !== undefined;
  const primary = goes ? (
    <Link
      {...(href === undefined ? {} : { href })}
      {...(onOpen === undefined ? {} : { onPress: onOpen })}
      className={({ isFocusVisible }) =>
        cn(
          "cursor-pointer rounded-mark text-primary no-underline underline-offset-2 hover:underline",
          focusRing({ isFocusVisible }),
        )
      }
    >
      {name}
    </Link>
  ) : (
    name
  );

  return frame(
    <span className="inline-flex max-w-full min-w-0 items-center gap-1">
      <CellStack
        primary={primary}
        {...(secondary === undefined ? {} : { secondary })}
        {...(media === undefined ? {} : { media })}
      />
      {summary === undefined ? null : (
        <PopoverTrigger
          label={fillCopy(copy.relationCard.summary, { name })}
          trigger={
            <IconButton
              icon={Info}
              label={fillCopy(copy.relationCard.summary, { name })}
              size="sm"
            />
          }
        >
          {(close) => (
            <RelationCard
              name={name}
              summary={summary}
              {...(secondary === undefined ? {} : { secondary })}
              {...(media === undefined ? {} : { media })}
              {...(href === undefined ? {} : { href })}
              {...(onOpen === undefined
                ? {}
                : {
                    onOpen: () => {
                      close();
                      onOpen();
                    },
                  })}
            />
          )}
        </PopoverTrigger>
      )}
    </span>,
  );
}
