"use client";

import {
  fromId,
  levelId,
  levelLabeler,
  namer,
} from "@sincpro/web-ui/components/listing/levels";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { GroupableField, GroupLevel } from "@sincpro/web-ui/foundations/grouping";
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

/* `levelId`, `levelLabeler` and `namer` are plain (`levels.ts`), without the directive, so a
   server component names a level the same way; re-exported so every path that read them here
   keeps reading them. */
export { levelId, levelLabeler, namer };

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
