"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { DateValue } from "@sincpro/web-ui/primitives/value/DateValue";
import { UserChip, type UserChipProps } from "@sincpro/web-ui/primitives/value/Person";
import { isValidElement, type ReactNode } from "react";

/**
 * Who did something to the record and when.
 *
 * `by` is the person: a name (drawn as the system's `UserChip`, the same face and name a
 * «Vendedor» field shows), the chip's props (to give it a photo, a contact card or «Abrir»),
 * or a node the application already drew. Optional: an import, a sync or a backend that does
 * not keep the author still knows WHEN — the line then says only that, never «por —».
 *
 * `at` is the moment: a `Date`, an ISO string or a timestamp is written by the system as the
 * locale's date and time (DD/MM/YYYY HH:mm in Spanish), so every record says it the same
 * way; anything else is shown as the application wrote it.
 */
export type RecordStamp = {
  by?: ReactNode | UserChipProps;
  at: ReactNode | Date;
};

/**
 * The last line of the paper: who created the record and who touched it last.
 *
 * Context: «¿quién cambió esto?» is the first question in front of a number that looks wrong,
 * and the activity's timeline answers it only for what was logged. Small and at the end: it is
 * consulted, not read — so it is the quietest thing on the paper, below the facts, behind a
 * rule.
 *
 * It was one run-on sentence («Creado por Josefa Muñoz · 02/09/2026») with the person as bare
 * text and the date in whatever shape the app sent. It is now the record's own grammar: a
 * muted label and its value, the person as the chip every other person-field uses and the date
 * as `DateValue` — so the footer reads like the form above it, not like a log line.
 *
 * Its side padding follows the density: the compact body (a dialog, a card) has none, and a
 * footer with `px-4` stood out of the column of fields it closes.
 */
export function RecordAudit({
  created,
  updated,
}: {
  created?: RecordStamp;
  updated?: RecordStamp;
}) {
  const copy = useUiCopy();
  const d = useDensity();
  if (created === undefined && updated === undefined) return null;
  return (
    <dl
      className={`flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-line ${byDensity(
        d,
        "px-4 py-2.5",
        "py-2",
      )}`}
    >
      {created === undefined ? null : <Stamp label={copy.record.created} stamp={created} />}
      {updated === undefined ? null : <Stamp label={copy.record.updated} stamp={updated} />}
    </dl>
  );
}

function Stamp({ label, stamp }: { label: string; stamp: RecordStamp }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt className="shrink-0 text-micro text-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <Author by={stamp.by} />
        <Moment at={stamp.at} />
      </dd>
    </div>
  );
}

/** Blank, or the dash an application wrote for «nobody» (`by ?? "—"`, from when `by` was
 *  required): a chip would draw it as a face with «—» for initials. */
const NOBODY = /^[\s\-–—]*$/;

function Author({ by }: { by: RecordStamp["by"] }) {
  if (by === undefined || by === null || typeof by === "boolean") return null;
  if (typeof by === "string") {
    return NOBODY.test(by) ? null : <UserChip name={by} size="sm" />;
  }
  if (isChipProps(by)) return <UserChip size="sm" {...by} />;
  return <span className="min-w-0 text-meta text-ink">{by}</span>;
}

/** The chip's props are a plain object with a name; a React element also is an object, and
 *  a node the application drew is passed through untouched. */
function isChipProps(by: unknown): by is UserChipProps {
  return (
    typeof by === "object" &&
    by !== null &&
    !isValidElement(by) &&
    !Array.isArray(by) &&
    typeof (by as { name?: unknown }).name === "string"
  );
}

/** A date-only string (`2026-09-02`) is a day: its hour would be an invented midnight. */
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** What a backend sends for a moment: `2026-09-02`, `2026-09-02T11:40:00Z`, `2026-09-02 11:40`. */
const ISO =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function Moment({ at }: { at: RecordStamp["at"] }) {
  if (at instanceof Date || typeof at === "number") {
    return <DateValue when={at} format="exact" />;
  }
  if (typeof at === "string" && ISO.test(at)) {
    return (
      <DateValue
        when={DAY_ONLY.test(at) ? at : at.replace(" ", "T")}
        format={DAY_ONLY.test(at) ? "date" : "exact"}
      />
    );
  }
  return <span className="text-meta whitespace-nowrap tabular-nums text-muted">{at}</span>;
}
