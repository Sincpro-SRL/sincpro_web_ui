"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { PopoverTrigger } from "@sincpro/web-ui/primitives/overlay/PopoverTrigger";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";

/* ==================================================================== *
 *  WHO — the person as a datum, not as a string of text.
 *
 *  «andres.g@sincpro.com.bo» in a cell is a correct and unreadable datum: twelve
 *  rows of emails get read letter by letter. An initial in a circle is
 *  recognized without reading, which is what is needed when the question is «who
 *  does this belong to?» and not «what is their email?».
 *
 *  ── The color comes out of the name and nobody picks it ──────────────
 *
 *  A hash of the name against the tone palette. It is deterministic —the same
 *  person always has the same color, on every screen— and that is why the color
 *  gets to mean something. If the consumer picked it, the same person would be
 *  green in one list and blue in another, and recognition without reading is lost
 *  entirely.
 *
 *  The color here is NOT a state: it is identity. That is why it uses the tone
 *  palette but never `bad` nor `warn` — a person is not «in error».
 * ==================================================================== */

const PALETTE = [
  "bg-info/15 text-info",
  "bg-good/15 text-good",
  "bg-accent/25 text-ink",
  "bg-primary/12 text-primary",
  "bg-ink/10 text-ink",
] as const;

/** The initials: two, and from the first two WORDS. «Ana María Gutiérrez» gives
 *  `AG` and not `AM` — the surname distinguishes more than the middle name. */
function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  return `${first}${last ?? ""}`.toUpperCase();
}

/* The same five identities on the dark chrome. The canvas palette there composed its tints
   over the navy and left ink letters on a dark disc — 1.61:1, unreadable (measured on the
   application bar). Same index, so a person keeps their color across the two surfaces. */
const CHROME_PALETTE = [
  "bg-chrome-link/20 text-chrome-link",
  "bg-chrome-good/20 text-chrome-good",
  "bg-chrome-accent/12 text-chrome-accent",
  "bg-chrome-link/14 text-chrome-ink",
  "bg-chrome-ink/14 text-chrome-ink",
] as const;

function toneOf(name: string, surface: "canvas" | "chrome" = "canvas"): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 100000;
  const palette = surface === "chrome" ? CHROME_PALETTE : PALETTE;
  return palette[h % palette.length]!;
}

/* The text doesn't go below `micro`: two initials at 10 px can't be read, and an
   unreadable initial is a colored circle — which is exactly what we don't want.
   What changes between sizes is the circle. */
const SIZE = {
  sm: "size-5 text-micro",
  md: "size-6 text-micro",
  lg: "size-8 text-meta",
  /* The head of a contact card: the face is what the card is about. */
  xl: "size-12 text-body",
} as const;

/* Two initials, so the overlap stays short of the second letter. The ring is
   1px: a 2px ring of the surface color reads as a gap between people, which
   is the thing a stack is not. */
const OVERLAP: Record<AvatarSize, string> = {
  sm: "-ml-1.5",
  md: "-ml-2",
  lg: "-ml-2.5",
  xl: "-ml-3.5",
};

export type AvatarSize = keyof typeof SIZE;

export function Avatar({
  name,
  size = "md",
  /** The photo, if there is one. Without it the initials go, which is the normal
   *  case here. */
  src,
}: {
  name: string;
  size?: AvatarSize;
  src?: string;
}) {
  const surface = useSurface();
  if (src !== undefined) {
    return (
      /* The photo lies over the initials, drawn invisible: an image has no text baseline, so
         a chip with a photo sat on the image's bottom edge in a row aligned by baseline (a
         `DataField`), higher than the label next to it. The hidden initials give the photo
         the same baseline the initials disc has. */
      <span
        title={name}
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill ${SIZE[size]}`}
      >
        <span aria-hidden className="invisible">
          {initials(name)}
        </span>
        <img src={src} alt={name} className="absolute inset-0 size-full object-cover" />
      </span>
    );
  }

  return (
    <span
      title={name}
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-pill font-medium select-none ${SIZE[size]} ${toneOf(name, surface)}`}
    >
      {initials(name)}
    </span>
  );
}

/** The ways to reach a person. Each one that is present becomes a row of the contact card. */
export type PersonContact = {
  email?: string;
  /** As people write it — «+591 7 123-4567». The `tel:` link keeps only the digits and `+`. */
  phone?: string;
  /** The WhatsApp number with its country code, written any way; `wa.me` gets the digits. */
  whatsapp?: string;
};

/** The three contact links, built from what people type. `wa.me` takes digits only — a `+`,
 *  a space or a dash breaks it — and `tel:` takes digits and the leading `+`. */
function contactRows(
  contact: PersonContact,
  copy: ReturnType<typeof useUiCopy>["person"],
): { key: string; icon: LucideIcon; label: string; value: string; href: string }[] {
  const rows = [];
  if (contact.email !== undefined && contact.email !== "") {
    rows.push({
      key: "email",
      icon: Mail,
      label: copy.email,
      value: contact.email,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.phone !== undefined && contact.phone !== "") {
    rows.push({
      key: "call",
      icon: Phone,
      label: copy.call,
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
    });
  }
  if (contact.whatsapp !== undefined && contact.whatsapp !== "") {
    rows.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: copy.whatsapp,
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`,
    });
  }
  return rows;
}

export type ContactCardProps = {
  name: string;
  /** The photo. Without it, the initials — in the same color the person has everywhere. */
  src?: string;
  /** What the person is here: «Vendedora · Sucursal La Paz». */
  role?: string;
  contact?: PersonContact;
  /** Go to the person's own record — «Ver ficha». Without it the card only reaches them. */
  onOpen?: () => void;
};

/**
 * Who a person is and how to reach them: the face, the name, the role, and one row per way
 * of contact — write, call, WhatsApp — then their record.
 *
 * Context: in an ERP the question after «who is the salesperson of this invoice?» is almost
 * always «how do I reach her?». Copying an email out of another screen to paste it into the
 * mail client is the detour this card removes. Each way of contact is a ROW and not a bare
 * icon: the address and the number are drawn, because often what the person wants is to read
 * the number aloud, not to dial it from the browser. Every row is a real link (`mailto:`,
 * `tel:`, `wa.me`), so middle-click, «copy address» and the phone's own dialer work.
 *
 * It is what opens from a `UserChip` with `contact`, and it is exported on its own for the
 * side panel of a record, where the same person is shown without a chip to open.
 */
export function ContactCard({ name, src, role, contact = {}, onOpen }: ContactCardProps) {
  const copy = useUiCopy().person;
  const rows = contactRows(contact, copy);
  return (
    /* React events bubble through the popover's portal to the React parents of the chip —
       a table row that opens on click among them. A click inside the card is not a click
       on the row. */
    <div className="flex w-64 max-w-full flex-col gap-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-w-0 items-center gap-3">
        {/* The name is written beside it: the photo's `alt` would say it twice. */}
        <span aria-hidden className="flex shrink-0">
          <Avatar name={name} size="xl" {...(src === undefined ? {} : { src })} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-lead font-semibold text-ink" title={name}>
            {name}
          </span>
          {role === undefined ? null : (
            <span className="line-clamp-2 text-meta text-muted" title={role}>
              {role}
            </span>
          )}
        </div>
      </div>

      {rows.length === 0 ? null : (
        <ul className="-mx-1 flex flex-col">
          {rows.map(({ key, icon: Icon, label, value, href }) => (
            <li key={key}>
              <a
                href={href}
                data-contact={key}
                {...(key === "whatsapp" ? { target: "_blank", rel: "noreferrer" } : {})}
                className="flex min-w-0 items-center gap-2.5 rounded-control px-1 py-1.5 no-underline outline-primary outline-offset-2 hover:bg-ink/6 focus-visible:outline-2 forced-colors:outline-[Highlight]"
              >
                <Icon
                  aria-hidden
                  className="size-(--size-icon-md) shrink-0 text-primary"
                  strokeWidth={2}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-meta font-medium text-ink">{label}</span>
                  <span className="truncate text-micro tabular-nums text-muted">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {onOpen === undefined ? null : (
        <div className="flex justify-end border-t border-line pt-2">
          <Button role="ghost" size="sm" icon={ArrowRight} onClick={onOpen}>
            {copy.open}
          </Button>
        </div>
      )}
    </div>
  );
}

/** The chip as the opener of its card. A native button that takes what `PopoverTrigger`
 *  hands its trigger — `ref`, the press handlers, `expanded` and `haspopup` — the same
 *  contract the system's buttons keep. */
function ChipButton({
  expanded,
  haspopup,
  children,
  ref,
  ...native
}: Omit<ComponentPropsWithRef<"button">, "className" | "type"> & {
  expanded?: boolean;
  haspopup?: "dialog";
}) {
  return (
    <button
      {...native}
      ref={ref}
      type="button"
      {...(haspopup === undefined ? {} : { "aria-haspopup": haspopup })}
      {...(expanded === undefined ? {} : { "aria-expanded": expanded })}
      /* The hover tint is a pseudo-element that spills past the box, not padding: padding
         moved the chip off the column of values, and negative margins to undo it made the
         chip wider than the room its parent measured — and it truncated itself. */
      className="relative isolate inline-flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-control text-left outline-primary outline-offset-4 before:absolute before:-inset-x-1 before:-inset-y-0.5 before:-z-10 before:rounded-control before:transition-colors before:duration-(--duration-instant) hover:before:bg-ink/6 focus-visible:outline-2 aria-expanded:before:bg-ink/6 forced-colors:outline-[Highlight]"
    >
      {children}
    </button>
  );
}

export type UserChipProps = {
  name: string;
  size?: AvatarSize;
  src?: string;
  /** What goes next to the name in the chip: a role, an email, «hace 2 min». */
  detail?: ReactNode;
  /** What the person is, shown in the contact card: «Vendedora · Sucursal La Paz». */
  role?: string;
  /** The ways to reach them. Present = the chip opens a contact card. */
  contact?: PersonContact;
  /** Go to the person's record. Present = the chip opens a card with «Ver ficha». */
  onOpen?: () => void;
};

/**
 * The person with their name next to them. For a cell, a list row, a field in read mode or
 * a fact of a record.
 *
 * Context: a chip is a button ONLY when it has somewhere to go. With `contact` or `onOpen` it
 * opens the `ContactCard` (press, Enter or Space — React Aria's `DialogTrigger` through
 * `PopoverTrigger`: focus goes into the card, Escape and a click outside close it, and focus
 * comes back to the chip). Without them it stays text: a button that does nothing is a lie a
 * keyboard user pays for with one more Tab stop on every row.
 *
 * It opens on PRESS and not on hover: the card holds links, and content that has to be
 * reached with the pointer or the keyboard cannot disappear when the pointer leaves the name.
 */
export function UserChip({
  name,
  size = "md",
  src,
  detail,
  role,
  contact,
  onOpen,
}: UserChipProps) {
  const face = (
    <>
      {/* The name is written beside it: the photo's `alt` would say it twice. */}
      <span aria-hidden className="flex shrink-0">
        <Avatar name={name} size={size} {...(src === undefined ? {} : { src })} />
      </span>
      <span className="min-w-0 truncate text-meta text-ink">{name}</span>
      {detail === undefined ? null : (
        <span className="min-w-0 shrink truncate text-micro text-muted">{detail}</span>
      )}
    </>
  );

  const reachable =
    onOpen !== undefined ||
    (contact !== undefined &&
      Object.values(contact).some((v) => v !== undefined && v !== ""));
  if (!reachable) {
    return <span className="inline-flex min-w-0 items-center gap-2">{face}</span>;
  }

  return (
    <PopoverTrigger label={name} trigger={<ChipButton>{face}</ChipButton>}>
      {(close) => (
        <ContactCard
          name={name}
          {...(src === undefined ? {} : { src })}
          {...(role === undefined ? {} : { role })}
          {...(contact === undefined ? {} : { contact })}
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
  );
}

/** Several people in little width: the widget of a to-many relation.
 *
 *  Context: they overlap and get cut off at `max`. Five avatars in a row are five
 *  things; five overlapped with a «+3» are ONE thing that has eight inside, which
 *  is what the cell means to say.
 *
 *  The `title` carries the whole list: whoever needs the names has them without
 *  the column paying for their width. */
export function UserStack({
  names,
  max = 4,
  size = "md",
}: {
  names: readonly string[];
  max?: number;
  size?: AvatarSize;
}) {
  const copy = useUiCopy();
  if (names.length === 0) {
    return (
      <span className="text-meta text-muted italic" title={copy.person.unassigned}>
        {copy.person.unassigned}
      </span>
    );
  }

  const visible = names.length <= max ? names : names.slice(0, max - 1);
  const rest = names.length - visible.length;

  return (
    <span className="inline-flex items-center" title={names.join(", ")}>
      {visible.map((n, i) => (
        <span key={n} className={i === 0 ? "" : OVERLAP[size]}>
          <span className="block rounded-pill ring-1 ring-surface">
            <Avatar name={n} size={size} />
          </span>
        </span>
      ))}
      {rest <= 0 ? null : (
        <span
          className={`${OVERLAP[size]} inline-flex items-center justify-center rounded-pill bg-ink/10 font-medium tabular-nums text-muted ring-1 ring-surface ${SIZE[size]}`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
