"use client";

import { grainName } from "@sincpro/web-ui/foundations/calendar";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type {
  GroupableField,
  GroupGrain,
  GroupLevel,
} from "@sincpro/web-ui/foundations/grouping";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { Plus } from "lucide-react";

/**
 * The levels of ONE axis, chosen on the screen: a tag per level with its ×, and «+» to add
 * a field (a date with each of its grains).
 *
 * Context: the pivot had it written inline, and the chart asks the same question twice
 * (its axis and its series). Two copies would drift; this is the one both draw.
 */

export const levelId = (level: GroupLevel): string => `${level.field}:${level.grain ?? ""}`;

const fromId = (id: string): GroupLevel => {
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

export function AxisLevels({
  name,
  levels,
  onChange,
  fields,
  used,
  labelOf: outerLabel,
}: {
  name: string;
  levels: readonly GroupLevel[];
  /** `null`: the levels come from somewhere else (the search bar) and are only shown. */
  onChange: ((next: readonly GroupLevel[]) => void) | null;
  fields: readonly GroupableField[];
  /** Levels already on another axis: offered, but not choosable twice. */
  used: readonly GroupLevel[];
  /** How a level not among `fields` is named — the spec's own `labelOf`. */
  labelOf?: (level: GroupLevel) => string;
}) {
  const words = useUiCopy().pivot;
  const labelOf = namer(fields, outerLabel);
  const taken = new Set([...levels, ...used].map(levelId));
  const options = fields.flatMap((field) =>
    (field.grains ?? [undefined]).map((grain) => {
      const level: GroupLevel =
        grain === undefined ? { field: field.field } : { field: field.field, grain };
      return {
        id: levelId(level),
        label: labelOf(level),
        disabled: taken.has(levelId(level)),
      };
    }),
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-micro font-medium text-muted">{name}</span>
      <Tags
        label={name}
        items={levels.map((level) => ({
          id: levelId(level),
          label: labelOf(level),
          ...(onChange === null
            ? {}
            : {
                onRemove: () =>
                  onChange(levels.filter((one) => levelId(one) !== levelId(level))),
                removeLabel: fillCopy(words.removeLevel, { level: labelOf(level) }),
              }),
        }))}
      />
      {onChange === null ? (
        <span className="text-micro text-muted italic">{words.fromSearch}</span>
      ) : options.length === 0 ? null : (
        <Menu
          label={fillCopy(words.addLevel, { axis: name })}
          icon={Plus}
          iconOnly
          chevron={false}
          variant="text"
          groups={[{ options }]}
          onSelect={(id) => onChange([...levels, fromId(id)])}
        />
      )}
    </div>
  );
}
