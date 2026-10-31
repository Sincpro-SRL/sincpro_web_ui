"use client";

import { grainName } from "@sincpro/web-ui/foundations/calendar";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type {
  GroupableField,
  GroupGrain,
  GroupLevel,
  PileOf,
} from "@sincpro/web-ui/foundations/grouping";
import { type PivotFold, pivotFrom, type PivotKey } from "@sincpro/web-ui/foundations/pivot";
import { downloadPivot } from "@sincpro/web-ui/foundations/pivotSheet";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { PivotTable } from "@sincpro/web-ui/primitives/table/PivotTable";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { ArrowLeftRight, Download, Plus, Sigma } from "lucide-react";
import { useMemo, useState } from "react";

export type PivotExplorerProps<T> = {
  items: readonly T[];
  /** Which pile a record falls in, at a level — the same contract that groups a list. */
  of: PileOf<T>;
  /** What can be split by: a field, and its grains when it is a date. */
  fields: readonly GroupableField[];
  /** Every measure that can be shown; `defaultMeasures` says which start on. */
  measures: readonly PivotFold<T>[];
  defaultMeasures?: readonly string[];
  /** The rows' levels, CONTROLLED from outside — the search bar's grouping. While given, the
   *  rows follow it and are not edited here. */
  rows?: readonly GroupLevel[];
  defaultRows?: readonly GroupLevel[];
  defaultColumns?: readonly GroupLevel[];
  /** A cell was pressed: open the records that fell there. */
  onCell?: (row: PivotKey, column: PivotKey) => void;
  height?: number | string;
  /** The file's name when downloaded. */
  fileName?: string;
};

const levelId = (level: GroupLevel) => `${level.field}:${level.grain ?? ""}`;
const fromId = (id: string): GroupLevel => {
  const [field = "", grain = ""] = id.split(":");
  return grain === "" ? { field } : { field, grain: grain as GroupGrain };
};

/**
 * A pivot people actually pivot: what goes down the rows, what goes across the columns, which
 * measures — chosen on the grid, not fixed in code.
 *
 * Context: the fold (`pivotFrom`) was already a real pivot — N levels each way, margins folded
 * from the base — but its axes and measures were written once by whoever composed it. Here
 * they are the person's: «+» adds a field (a date with its grain) to an axis, a level's ×
 * drops it, ⇄ swaps the axes, the measures are ticked, and the grid downloads as it is seen.
 * Inside a list the rows FOLLOW the search bar's grouping and the records are the ones the
 * search left: the pivot answers the same question the list is asking.
 */
export function PivotExplorer<T>({
  items,
  of,
  fields,
  measures,
  defaultMeasures,
  rows: outerRows,
  defaultRows = [],
  defaultColumns = [],
  onCell,
  height,
  fileName,
}: PivotExplorerProps<T>) {
  const copy = useUiCopy();
  const words = copy.pivot;
  const [ownRows, setOwnRows] = useState<readonly GroupLevel[]>(defaultRows);
  const [columns, setColumns] = useState<readonly GroupLevel[]>(defaultColumns);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(
    () => new Set(defaultMeasures ?? measures.slice(0, 1).map((one) => one.id)),
  );
  const rows = outerRows ?? ownRows;
  const following = outerRows !== undefined;

  const labelOf = (level: GroupLevel) => {
    const field = fields.find((one) => one.field === level.field)?.label ?? level.field;
    return level.grain === undefined
      ? field
      : `${field} · ${grainName(level.grain).toLowerCase()}`;
  };
  const shownMeasures = measures.filter((one) => chosen.has(one.id));
  const pivot = useMemo(
    () => pivotFrom(items, { rows, columns, of, measures: shownMeasures, labelOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, rows, columns, of, shownMeasures.map((one) => one.id).join("|")],
  );

  /* What can be added to an axis: every field (each grain of a date) not on either axis. */
  const used = new Set([...rows, ...columns].map(levelId));
  const options = fields.flatMap((field) =>
    (field.grains ?? [undefined]).map((grain) => {
      const level: GroupLevel =
        grain === undefined ? { field: field.field } : { field: field.field, grain };
      return {
        id: levelId(level),
        label: labelOf(level),
        disabled: used.has(levelId(level)),
      };
    }),
  );

  const axis = (
    name: string,
    levels: readonly GroupLevel[],
    set: ((next: readonly GroupLevel[]) => void) | null,
  ) => (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-micro font-medium text-muted">{name}</span>
      <Tags
        label={name}
        items={levels.map((level) => ({
          id: levelId(level),
          label: labelOf(level),
          ...(set === null
            ? {}
            : {
                onRemove: () => set(levels.filter((one) => levelId(one) !== levelId(level))),
                removeLabel: fillCopy(words.removeLevel, { level: labelOf(level) }),
              }),
        }))}
      />
      {set === null ? (
        <span className="text-micro text-muted italic">{words.fromSearch}</span>
      ) : (
        <Menu
          label={fillCopy(words.addLevel, { axis: name })}
          icon={Plus}
          iconOnly
          chevron={false}
          variant="text"
          groups={[{ options }]}
          onSelect={(id) => set([...levels, fromId(id)])}
        />
      )}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
        <Menu
          label={words.measures}
          icon={Sigma}
          groups={[
            {
              options: measures.map((one) => ({
                id: one.id,
                label: one.header,
                checked: chosen.has(one.id),
              })),
            },
          ]}
          onSelect={(id) =>
            setChosen((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
        {axis(words.rowsAxis, rows, following ? null : setOwnRows)}
        {axis(words.columnsAxis, columns, setColumns)}
        <div className="ml-auto flex items-center gap-1">
          {following ? null : (
            <IconButton
              icon={ArrowLeftRight}
              label={words.swap}
              onClick={() => {
                setOwnRows(columns);
                setColumns(rows);
              }}
            />
          )}
          <Button
            role="ghost"
            size="sm"
            icon={Download}
            onClick={() =>
              downloadPivot(pivot, fileName === undefined ? {} : { name: fileName })
            }
          >
            {words.download}
          </Button>
        </div>
      </div>
      <PivotTable
        pivot={pivot}
        {...(onCell === undefined ? {} : { onCell })}
        {...(height === undefined ? {} : { height })}
      />
    </div>
  );
}
