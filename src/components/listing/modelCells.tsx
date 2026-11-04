"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  emailHref,
  telHref,
  urlHref,
  urlLabel,
} from "@sincpro/web-ui/primitives/field/contact";
import { formatDuration } from "@sincpro/web-ui/primitives/field/duration";
import { DateValue } from "@sincpro/web-ui/primitives/value/DateValue";
import { Numeric } from "@sincpro/web-ui/primitives/value/Value";
import { Check } from "lucide-react";

/* ====================================================================== *
 *  A MODEL FIELD, DRAWN BY ITS TYPE.
 *
 *  Context: the columns `columnsFromModel` adds were plain text unless numeric,
 *  so an email column was a string to select and paste, a `float_time` read
 *  «8.5» where a person says «8:30» and a boolean read «true». The model
 *  already says what each field IS; this draws it the way the record's own
 *  controls draw it in read mode — a `mailto:`, a `tel:`, the website in a new
 *  tab, the duration in hours and minutes, the date as `DateValue`.
 *
 *  Display only: the links come from the pure `contact.ts` / `duration.ts`
 *  helpers, never from the input controls, so a cell never mounts a field.
 *  `urlHref` keeps a «javascript:…» from ever becoming a link.
 * ====================================================================== */

/** How a model field is drawn. `text` is today's behaviour, for any type not known here. */
export type ModelCellKind =
  | "text"
  | "number"
  | "email"
  | "url"
  | "phone"
  | "duration"
  | "boolean"
  | "date"
  | "datetime";

const LINK =
  "block truncate rounded-mark text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

function Plain({ text }: { text: string }) {
  return (
    <span className="block truncate text-muted" title={text}>
      {text}
    </span>
  );
}

/** A link in a cell, or the plain text when the value does not make one. */
function Link({
  text,
  href,
  label,
  external = false,
}: {
  text: string;
  href: string | null;
  label?: string;
  external?: boolean;
}) {
  const copy = useUiCopy();
  if (href === null) return <Plain text={text} />;
  return (
    <a
      href={href}
      title={text}
      className={LINK}
      /* The row opens its record on a click; writing to its email must not ALSO open it. */
      onClick={(event) => event.stopPropagation()}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label ?? text}
      {external ? <span className="sr-only"> ({copy.field.newTab})</span> : null}
    </a>
  );
}

/** A yes/no in words: a check alone is not read by everyone the same way, and «no» needs
 *  no icon — an empty mark next to every false row would only add noise to the column. */
function YesNo({ value }: { value: boolean }) {
  const copy = useUiCopy();
  if (!value) return <span className="text-muted">{copy.table.no}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <Check aria-hidden className="size-(--size-icon-sm) text-good" strokeWidth={2.5} />
      {copy.table.yes}
    </span>
  );
}

/** One cell of a model column. `value` is what `readModelValue` read — never `null` here. */
export function ModelCell({
  kind,
  value,
}: {
  kind: ModelCellKind;
  value: string | number | boolean;
}) {
  const text = String(value);
  switch (kind) {
    case "number":
      /* A figure in the locale's digits and right aligned, so a column of amounts lines up
         — never «1234.5» as text. */
      return typeof value === "number" ? (
        <Numeric value={value} format="decimal" />
      ) : (
        <Plain text={text} />
      );
    case "email":
      return <Link text={text} href={emailHref(text)} />;
    case "phone":
      return <Link text={text} href={telHref(text)} />;
    case "url":
      return <Link text={text} href={urlHref(text)} label={urlLabel(text)} external />;
    case "duration":
      return typeof value === "number" ? (
        /* Right aligned like `Numeric`: a column of hours lines up by the colon. */
        <span className="block text-right text-body tabular-nums whitespace-nowrap text-ink">
          {formatDuration(value)}
        </span>
      ) : (
        <Plain text={text} />
      );
    case "boolean":
      return typeof value === "boolean" ? <YesNo value={value} /> : <Plain text={text} />;
    case "date":
    case "datetime":
      return typeof value === "boolean" ? (
        <Plain text={text} />
      ) : (
        <DateValue when={value} format={kind === "date" ? "date" : "relative"} />
      );
    default:
      return <Plain text={text} />;
  }
}
