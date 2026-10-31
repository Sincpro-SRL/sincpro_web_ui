"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { ReactNode } from "react";

/** Who did something to the record and when, already written: «Carla Rojas», «hace 3 días». */
export type RecordStamp = { by: ReactNode; at: ReactNode };

/**
 * The last line of the paper: who created the record and who touched it last.
 *
 * Context: «¿quién cambió esto?» is the first question in front of a number that looks wrong,
 * and the activity's timeline answers it only for what was logged. Small and at the end: it is
 * consulted, not read.
 */
export function RecordAudit({
  created,
  updated,
}: {
  created?: RecordStamp;
  updated?: RecordStamp;
}) {
  const copy = useUiCopy();
  const stamp = (template: string, one: RecordStamp) => {
    const [before, middle, after] = splitStamp(template);
    return (
      <span>
        {before}
        <span className="text-ink">{one.by}</span>
        {middle}
        <span className="tabular-nums">{one.at}</span>
        {after}
      </span>
    );
  };
  if (created === undefined && updated === undefined) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-micro text-muted">
      {created === undefined ? null : stamp(copy.record.created, created)}
      {updated === undefined ? null : stamp(copy.record.updated, updated)}
    </p>
  );
}

/** «Creado por {by} · {at}» cut around its two holes, so `by` and `at` can be nodes. */
function splitStamp(template: string): [string, string, string] {
  const marked = fillCopy(template, { by: "\u0000", at: "\u0001" });
  const [before = "", rest = ""] = marked.split("\u0000");
  const [middle = "", after = ""] = rest.split("\u0001");
  return [before, middle, after];
}
