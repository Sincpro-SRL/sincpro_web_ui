"use client";

import {
  DEFAULT_PAGE_SIZE,
  type Pages,
  usePagination,
} from "@sincpro/web-ui/components/listing/pages";
import { useState } from "react";

/**
 * How a SET is looked at: which presentation, how many fit on a page.
 *
 * ListView and every catalog-like screen were inventing these two pieces of
 * state on their own. They belong together because they answer the same
 * question — «how do I look at N?» — whether N is domain records or the
 * page of a frame.
 *
 * `Present` is generic so a list (`ListPresent`) and a frame (`table` |
 * `chart`) share the hook without importing each other's unions.
 *
 * Controlled when the view context keeps them (catalog filters must not
 * reset the page size). Uncontrolled when the screen is the only owner.
 */

/**
 * The ways of looking at a set. **It lives here and not in the archetype** because
 * two of them ask the same thing —a list and a frame— and the definition
 * has to be only one.
 *
 * There were two: `ListPresent` in `archetype/ListView.tsx` and this copy. While the
 * two said `rows | table | board` nobody noticed; adding `sheet` to one left
 * four views not compiling, which is exactly what happens when the same
 * idea is written twice.
 *
 *     rows / board   no columns: name, cards and meta.
 *     table          the columns are DECLARED by the code.
 *     sheet          the columns come from the FILE — there may be forty-one
 *                    million rows, so it is virtualised.
 *     report         period columns and rows in a HIERARCHY that ends in
 *                    totals. It is not sorted: the order IS the report.
 *     pivot          two AXES at once. A row is a heap and so is a column;
 *                    what is read is at the crossing. It is not
 *                    sorted either: the order of each axis is that of its keys.
 *     chart          the same pivot, drawn: bars, lines or pie. The
 *                    first grouping is the axis and the second, the series.
 */
export type BuiltInPresent =
  | "rows"
  | "table"
  | "board"
  | "sheet"
  | "report"
  | "pivot"
  | "chart"
  | "calendar"
  | "gantt"
  | "timeline";

/** A presentation of a list: one the package draws, or the `id` of a `List.Present` the
 *  application wrote. `string & {}` keeps the built-in names in autocomplete. */
export type ListPresent = BuiltInPresent | (string & {});

export interface SetControl<Row, Present extends string = ListPresent> extends Pages<Row> {
  present: Present;
  setPresent: (next: Present) => void;
  pageSize: number;
  setPageSize: (next: number) => void;
}

export function useSetControl<Row, Present extends string = ListPresent>(
  items: readonly Row[],
  options: {
    present?: Present;
    onPresentChange?: (next: Present) => void;
    pageSize?: number;
    onPageSizeChange?: (next: number) => void;
  } = {},
): SetControl<Row, Present> {
  const initialPresent = (options.present ?? "table") as Present;
  const [ownedPresent, setOwnedPresent] = useState<Present>(initialPresent);
  const [ownedSize, setOwnedSize] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE);

  const presentControlled = options.onPresentChange !== undefined;
  const present = presentControlled
    ? ((options.present ?? "table") as Present)
    : ownedPresent;
  const setPresent = presentControlled ? options.onPresentChange! : setOwnedPresent;

  const sizeControlled = options.onPageSizeChange !== undefined;
  const pageSize = sizeControlled ? (options.pageSize ?? DEFAULT_PAGE_SIZE) : ownedSize;
  const setPageSize = sizeControlled ? options.onPageSizeChange! : setOwnedSize;

  const pages = usePagination(items, { pageSize, onPageSizeChange: setPageSize });

  return {
    ...pages,
    present,
    setPresent,
    pageSize,
    setPageSize,
  };
}
