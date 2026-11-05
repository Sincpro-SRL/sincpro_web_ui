"use client";

import { AxisLevels, levelLabeler } from "@sincpro/web-ui/components/listing/AxisLevels";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type {
  GroupableField,
  GroupLevel,
  PileOf,
} from "@sincpro/web-ui/foundations/grouping";
import { type PivotFold, pivotFrom, type PivotKey } from "@sincpro/web-ui/foundations/pivot";
import { downloadPivot } from "@sincpro/web-ui/foundations/pivotSheet";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { PivotTable } from "@sincpro/web-ui/primitives/table/PivotTable";
import { ArrowLeftRight, Download, Sigma } from "lucide-react";
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

  const labelOf = levelLabeler(fields);
  const shownMeasures = measures.filter((one) => chosen.has(one.id));
  const pivot = useMemo(
    () => pivotFrom(items, { rows, columns, of, measures: shownMeasures, labelOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, rows, columns, of, shownMeasures.map((one) => one.id).join("|")],
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
        <AxisLevels
          name={words.rowsAxis}
          levels={rows}
          onChange={following ? null : setOwnRows}
          fields={fields}
          used={columns}
        />
        <AxisLevels
          name={words.columnsAxis}
          levels={columns}
          onChange={setColumns}
          fields={fields}
          used={rows}
        />
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
