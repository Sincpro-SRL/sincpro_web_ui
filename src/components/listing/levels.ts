import { grainName } from "@sincpro/web-ui/foundations/calendar";
import type {
  GroupableField,
  GroupGrain,
  GroupLevel,
} from "@sincpro/web-ui/foundations/grouping";

/* How a grouping level is identified and named — the pivot's axes and the chart's series
   (`AxisLevels`). Plain, without `"use client"`: a server component names a level the same
   way. */

/** A level as one string: its field and its grain. */
export const levelId = (level: GroupLevel): string => `${level.field}:${level.grain ?? ""}`;

/** The way back from `levelId`. Exported for `AxisLevels`; not public. */
export const fromId = (id: string): GroupLevel => {
  const [field = "", grain = ""] = id.split(":");
  return grain === "" ? { field } : { field, grain: grain as GroupGrain };
};

/** How a level is named: the field's label, and its grain when it is a date. */
export function levelLabeler(fields: readonly GroupableField[]) {
  return (level: GroupLevel): string => {
    const field = fields.find((one) => one.field === level.field)?.label ?? level.field;
    return level.grain === undefined
      ? field
      : `${field} · ${grainName(level.grain).toLowerCase()}`;
  };
}

/** `fields` name what they list; anything else is named by `fallback`, then by its id. */
export function namer(
  fields: readonly GroupableField[],
  fallback?: (level: GroupLevel) => string,
) {
  const named = levelLabeler(fields);
  return (level: GroupLevel): string =>
    fallback !== undefined && !fields.some((one) => one.field === level.field)
      ? fallback(level)
      : named(level);
}
