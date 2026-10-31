import { Avatar } from "@sincpro/web-ui/primitives/value/Avatar";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A thumbnail — the photo of a product, the logo of a customer — or, when there is none, its
 * icon on a quiet tile. One size per context so a column of them lines up.
 *
 * Context: a list of forty products where only the name tells them apart makes people read
 * every row; the picture is recognised without reading. The tile without a photo keeps the
 * same size and place, so the rows that have one and the rows that do not still align.
 */
export function Thumb({
  src,
  alt,
  icon: Icon,
  size = "md",
}: {
  /** The image. Without it, `icon` on a tile; without both, an empty tile. */
  src?: string;
  /** What the image shows, for whoever cannot see it. Required with `src`. */
  alt?: string;
  icon?: LucideIcon;
  /** `sm` for a dense row (24 px), `md` for a table (32 px), `lg` for a card (48 px). */
  size?: "sm" | "md" | "lg";
}) {
  const box = { sm: "size-6", md: "size-8", lg: "size-12" }[size];
  if (src !== undefined) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className={`${box} shrink-0 rounded-control bg-ink/5 object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-control bg-ink/5 text-muted`}
    >
      {Icon === undefined ? null : (
        <Icon
          className={size === "lg" ? "size-(--size-icon-lg)" : "size-(--size-icon-sm)"}
          strokeWidth={1.75}
        />
      )}
    </span>
  );
}

/**
 * A cell with hierarchy: what the row IS on top, what tells it apart below — a product and its
 * description, a customer and its NIT, an account and its code — with an optional picture.
 *
 * Context: a table cell used to hold one string. An ERP row is rarely one thing: a product line
 * is «Soporte mensual» AND «plan estándar · SKU SOP-01», and putting them in two columns spends
 * width on a column nobody sorts by, while squeezing them into one string loses the hierarchy.
 * Two lines, the first in ink and the second small and quiet, read as one thing with a detail —
 * the way the eye already reads a line of an invoice.
 *
 * It works in any cell: `DataTable` (a column's `cell`), `Table`/`Td`, the rows of a list, a
 * card. The second line wraps or truncates (`wrap`); the first always truncates, with the full
 * text on hover.
 */
export function CellStack({
  primary,
  secondary,
  media,
  avatar,
  wrap = false,
}: {
  /** What the row is — the name. In ink, one line. */
  primary: ReactNode;
  /** What tells it apart — a description, a code, a reference. Small and quiet. */
  secondary?: ReactNode;
  /** A picture or icon on the left: `{ src, alt }` or `{ icon }`. */
  media?: { src?: string; alt?: string; icon?: LucideIcon };
  /** A person or a company instead of `media`: its round face — the photo, or the initials in
   *  the color it has everywhere. The same contract as a list row's `avatar`. */
  avatar?: { name: string; src?: string };
  /** Let the second line wrap (a description) instead of truncating (a code). */
  wrap?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {avatar !== undefined ? (
        /* The name is written beside it: the photo's `alt` would say it twice. */
        <span aria-hidden className="flex shrink-0">
          <Avatar
            name={avatar.name}
            size="lg"
            {...(avatar.src === undefined ? {} : { src: avatar.src })}
          />
        </span>
      ) : media === undefined ? null : (
        <Thumb
          size="md"
          {...(media.src === undefined ? {} : { src: media.src })}
          {...(media.alt === undefined ? {} : { alt: media.alt })}
          {...(media.icon === undefined ? {} : { icon: media.icon })}
        />
      )}
      <span className="flex min-w-0 flex-col">
        <span
          className="truncate text-meta font-medium text-ink"
          {...(typeof primary === "string" ? { title: primary } : {})}
        >
          {primary}
        </span>
        {secondary === undefined ? null : (
          <span
            className={`text-micro text-muted ${wrap ? "line-clamp-2" : "truncate"}`}
            {...(typeof secondary === "string" ? { title: secondary } : {})}
          >
            {secondary}
          </span>
        )}
      </span>
    </span>
  );
}
