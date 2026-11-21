"use client";

import { useNow } from "@sincpro/web-ui/foundations/clock";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Thumb } from "@sincpro/web-ui/primitives/cell/CellStack";
import { Avatar } from "@sincpro/web-ui/primitives/value/Avatar";
import { Elapsed, type ElapsedProps } from "@sincpro/web-ui/primitives/value/Elapsed";
import { elapsedMillis, elapsedTone } from "@sincpro/web-ui/primitives/value/elapsedTime";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One record as a card — the board presentation of a list, a product on a till's grid.
 *
 * Context: the board drew this card inline, and a list that wanted its own card wrote its
 * own `div` — which looked the same and could not be opened: the default card was a button
 * with `onOpen`, the custom one was not. A card is the record's door in the board the way a
 * row is in the table, so it is a component and it is always pressable when there is
 * somewhere to go.
 *
 * Its hierarchy is the row's: the state first (what it is), the name as the entry point,
 * the facts below in the quiet size.
 *
 * ── Three shapes, for three ways of looking ─────────────────────────
 *
 *     card     a board's card: the name in up to two lines (a figure beside it never cuts
 *              it), what it is about, N facts, its controls at the foot
 *     compact  two lines, for a pipeline of sixty: name and figure, then one line of facts
 *     tile     a product on a grid: the picture on top, the name, the price — the whole tile
 *              is pressed, as a till's or a shop's is
 *
 * It was one box of 16px padding and 12px corners inside a lane that was another box: two
 * borders and two roundings around every card, and the figure on the name's line cut the
 * name to «Certificación ISO 9…». The padding now follows the density, the corners are the
 * control's (`--ui-record-card-radius`), and the name wraps before it is cut.
 */

export type RecordCardLayout = "card" | "compact" | "tile";

/** One fact of the record: «Cierre · 30/11», «Probabilidad · 60 %». */
export type RecordCardField = { label: string; value: ReactNode };

/* The stripe on a card's edge in its tone: what it says about the record, before reading it. */
const STRIPE: Record<Exclude<Tone, "neutral">, string> = {
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  accent: "bg-accent",
};

function Stripe({ tone }: { tone: Tone | undefined }) {
  if (tone === undefined || tone === "neutral") return null;
  return (
    <span
      aria-hidden
      data-ui="record-card.stripe"
      data-tone={tone}
      className={`pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-ui-record-card ${STRIPE[tone]}`}
    />
  );
}

/* The live stripe of a waiting record — its own component so only the card that waits
   re-renders with the clock, not every card of the board. */
function WaitingStripe({ elapsed }: { elapsed: Omit<ElapsedProps, "now"> }) {
  const now = useNow();
  if (now === null) return null;
  return <Stripe tone={elapsedTone(elapsedMillis(elapsed.since, now), elapsed)} />;
}

export function RecordCard({
  title,
  subtitle,
  tags,
  meta,
  figure,
  media,
  footer,
  onOpen,
  layout = "card",
  fields,
  badge,
  selected = false,
  disabled = false,
  tone,
  elapsed,
}: {
  title: ReactNode;
  /** Who or what it is about, under the title: the customer of an opportunity. */
  subtitle?: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode;
  figure?: ReactNode;
  /** The picture of the record. A product's is a square (`Thumb`); a PERSON's is round, with
   *  the initials when there is no photo — `person`, like `RelationCard`'s. `alt` names the
   *  person when the title is not plain text. In a `tile` it is the cover. */
  media?: { src?: string; alt?: string; icon?: LucideIcon; person?: true };
  /** The card's last line, its controls: priority, kanban state, next activity, the owner's
   *  avatar — each its own button, pressable without opening the card. */
  footer?: ReactNode;
  onOpen?: () => void;
  layout?: RecordCardLayout;
  /** N facts as label and value — as many as the record needs to be told apart on a board.
   *  More than four and it is a form: open the record. */
  fields?: readonly RecordCardField[];
  /** A count on the corner: how many of this product are already in the ticket. */
  badge?: ReactNode;
  /** It is chosen — the ticket's line being edited, the order being bumped. */
  selected?: boolean;
  /** It cannot be chosen now — out of stock. Shown (it exists) but quiet and not pressed; say
   *  why in `meta` («Sin stock»). */
  disabled?: boolean;
  /** What the record's state says before it is read: a stripe on its edge in that tone —
   *  blocked, overdue. `elapsed` with thresholds paints it by itself. */
  tone?: Tone;
  /** How long it has been waiting, live — a kitchen's ticket, a case under an SLA. With
   *  `warnAfter` / `badAfter` (minutes) the time and the card's edge turn amber, then red. */
  elapsed?: Omit<ElapsedProps, "now">;
}) {
  const density = useDensity();
  const pressable = onOpen !== undefined && !disabled;

  /* The card is a box, and the TITLE is the button that opens it, stretched over the whole
     card (`after:inset-0`). It used to be a `<button>` around everything: a priority star or a
     kanban state inside it would be a control inside a control, which is invalid and which a
     screen reader announces as one thing. The footer's controls sit above the stretch. */
  const titleText = (
    <span
      data-ui="record-card.title"
      className={`min-w-0 ${layout === "compact" ? "truncate" : "line-clamp-2"}`}
    >
      {title}
    </span>
  );
  const titleSize = layout === "card" ? "text-lead" : "text-body";
  const name = pressable ? (
    <button
      type="button"
      onClick={onOpen}
      {...(selected ? { "aria-current": true } : {})}
      className={`flex min-w-0 flex-1 text-left ${titleSize} font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-ui-record-card focus-visible:after:outline-2 focus-visible:after:outline-primary`}
    >
      {titleText}
    </button>
  ) : (
    <p className={`flex min-w-0 flex-1 ${titleSize} font-medium text-ink`}>{titleText}</p>
  );

  const shell = `relative flex w-full min-w-0 flex-col rounded-ui-record-card border bg-ui-card text-left ${
    selected
      ? "border-primary ring-1 ring-primary"
      : `border-ui-card-border ${
          pressable
            ? "transition-colors duration-(--duration-instant) focus-within:border-line-strong hover:border-line-strong"
            : ""
        }`
  }`;

  const stripe =
    tone !== undefined ? (
      <Stripe tone={tone} />
    ) : elapsed === undefined ? null : (
      <WaitingStripe elapsed={elapsed} />
    );

  const corner =
    badge === undefined ? null : (
      <span
        data-ui="record-card.badge"
        className="pointer-events-none absolute -top-2 -right-2 z-20 inline-flex h-6 min-w-6 items-center justify-center rounded-pill bg-primary px-1.5 text-meta font-semibold text-surface tabular-nums shadow-raised"
      >
        {badge}
      </span>
    );

  const timer =
    elapsed === undefined ? null : (
      <Elapsed
        since={elapsed.since}
        {...(elapsed.warnAfter === undefined ? {} : { warnAfter: elapsed.warnAfter })}
        {...(elapsed.badAfter === undefined ? {} : { badAfter: elapsed.badAfter })}
      />
    );

  const factList =
    fields === undefined || fields.length === 0 ? null : (
      <dl data-ui="record-card.fields" className="flex min-w-0 flex-col gap-0.5 text-meta">
        {fields.map((one) => (
          <div key={one.label} className="flex min-w-0 items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted">{one.label}</dt>
            <dd className="min-w-0 truncate text-right text-ink tabular-nums">{one.value}</dd>
          </div>
        ))}
      </dl>
    );

  const sub =
    subtitle === undefined ? null : (
      /* Above the stretched title, at its own width: the subtitle may be a link to ANOTHER
         record (the customer), which must open that one and not the card. */
      <p className="relative z-10 w-fit max-w-full min-w-0 truncate text-meta text-muted">
        {subtitle}
      </p>
    );

  const quiet =
    meta === undefined ? null : (
      <p className="min-w-0 truncate text-micro tabular-nums text-muted">{meta}</p>
    );

  const foot =
    footer === undefined ? null : (
      <div
        data-ui="record-card.footer"
        className="relative z-10 flex min-w-0 items-center gap-1.5"
      >
        {footer}
      </div>
    );

  if (layout === "tile") {
    /* The tile is pressed whole and its picture is the first thing read: on a till the hand
       goes to the photo, not to the name. Without a picture, the icon on a tinted square
       keeps the grid even. */
    const Icon = media?.icon;
    return (
      <div
        data-ui="record-card"
        data-layout="tile"
        {...(selected ? { "data-selected": "" } : {})}
        {...(disabled ? { "data-disabled": "" } : {})}
        className={shell}
      >
        {stripe}
        {corner}
        {/* Unavailable dims the PICTURE, not the words: a faded name and «Agotado» at 60 %
            fell under 4.5:1, and the reason it cannot be chosen is what must be read. */}
        <div
          data-ui="record-card.media"
          className={`flex aspect-tile w-full items-center justify-center overflow-hidden rounded-t-ui-record-card bg-ink/5 text-muted ${disabled ? "opacity-40 grayscale" : ""}`}
        >
          {media?.src !== undefined ? (
            <img
              src={media.src}
              alt={media.alt ?? ""}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : Icon === undefined ? null : (
            <Icon aria-hidden className="size-8" strokeWidth={1.5} />
          )}
        </div>
        <div
          className={`flex min-w-0 flex-1 flex-col ${byDensity(density, "gap-1 p-3", "gap-0.5 p-2")}`}
        >
          {tags === undefined ? null : <div className="flex flex-wrap gap-1">{tags}</div>}
          {name}
          {sub}
          <div className="mt-auto flex min-w-0 items-baseline justify-between gap-2 pt-1">
            {figure === undefined ? null : (
              <p
                data-ui="record-card.figure"
                className="shrink-0 text-lead font-semibold tabular-nums text-ink"
              >
                {figure}
              </p>
            )}
            {quiet}
          </div>
          {timer}
          {foot}
        </div>
      </div>
    );
  }

  const picture =
    media === undefined ? null : media.person === true ? (
      /* The name is written right beside it: the photo's `alt` would say it twice. */
      <span aria-hidden className="flex shrink-0">
        <Avatar
          name={media.alt ?? (typeof title === "string" ? title : "")}
          size={layout === "compact" ? "md" : "lg"}
          {...(media.src === undefined ? {} : { src: media.src })}
        />
      </span>
    ) : (
      <Thumb
        size={layout === "compact" ? "md" : "lg"}
        {...(media.src === undefined ? {} : { src: media.src })}
        {...(media.alt === undefined ? {} : { alt: media.alt })}
        {...(media.icon === undefined ? {} : { icon: media.icon })}
      />
    );

  const head = (
    <div className="flex min-w-0 items-start justify-between gap-3">
      {name}
      {figure === undefined && timer === null ? null : (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {timer}
          {figure === undefined ? null : (
            <p
              data-ui="record-card.figure"
              className={`font-semibold tabular-nums text-ink ${layout === "compact" ? "text-body" : "text-lead"}`}
            >
              {figure}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      data-ui="record-card"
      data-layout={layout}
      {...(selected ? { "data-selected": "" } : {})}
      {...(disabled ? { "data-disabled": "" } : {})}
      className={`${shell} ${
        layout === "compact"
          ? byDensity(density, "gap-0.5 px-3 py-2", "gap-0.5 px-2 py-1.5")
          : byDensity(density, "gap-1.5 p-3", "gap-1 p-2.5")
      }`}
    >
      {stripe}
      {corner}
      {layout === "compact" || tags === undefined ? null : (
        /* In a row of their own and at their own width: as a flex child of the card a tag
           stretched to the card's width. */
        <div className="flex flex-wrap gap-1">{tags}</div>
      )}
      <div className="flex min-w-0 items-start gap-3">
        {picture}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {head}
          {sub}
        </div>
      </div>
      {layout === "compact" ? null : factList}
      {quiet}
      {foot}
    </div>
  );
}
