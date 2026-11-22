"use client";

import {
  type ColumnSpec,
  defaultVisibleIds,
  isRequiredColumn,
  reconcileVisible,
  toggleColumn,
  visibleColumns,
} from "@sincpro/web-ui/components/listing/columnSpecs";
import { useCallback, useState } from "react";

/**
 * Which FIELDS of a set are on screen.
 *
 * Odoo lists split columns in two: fields without `optional` cannot leave the
 * view; fields with `optional="show"|"hide"` appear in the columns submenu
 * and can be added or removed. ListView and FrameView were inventing that
 * menu each on their own — FrameView let every column hide, ListView had no
 * menu at all — so the same question («may I hide this?») had two answers.
 *
 * This hook is the third knob of a SET, next to `useSetControl` (how I look)
 * and `useSelection` (which rows). Presentation can change; the visible
 * field set stays.
 */

export type ColumnControl = {
  visibleIds: readonly string[];
  isVisible: (id: string) => boolean;
  isRequired: (id: string) => boolean;
  toggle: (id: string) => void;
  optional: readonly ColumnSpec[];
  required: readonly ColumnSpec[];
  hasOptional: boolean;
  /** The visible set is not the view's default: the person added or took a column away. What
   *  the columns menu marks itself for — a column the view hides by default is not a choice. */
  changed: boolean;
};

/* The spec and the rules over it — `defaultVisibleIds`, `reconcileVisible`, `toggleColumn`,
   `visibleColumns` — are plain (`columnSpecs.ts`), without the directive, so a server
   component reads them; re-exported so every path that read them here keeps reading them. */
export type { ColumnSpec };
export {
  defaultVisibleIds,
  isRequiredColumn,
  reconcileVisible,
  toggleColumn,
  visibleColumns,
};

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function useColumnControl(
  columns: readonly ColumnSpec[],
  options: {
    visibleIds?: readonly string[];
    onVisibleIdsChange?: (ids: readonly string[]) => void;
  } = {},
): ColumnControl {
  const signature = columns.map((column) => column.id).join("\0");
  const [owned, setOwned] = useState(() => defaultVisibleIds(columns));
  const [seen, setSeen] = useState(signature);

  const controlled = options.onVisibleIdsChange !== undefined;
  if (signature !== seen) {
    setSeen(signature);
    if (!controlled) setOwned(defaultVisibleIds(columns));
  }

  const raw = controlled ? (options.visibleIds ?? defaultVisibleIds(columns)) : owned;
  const visibleIds = reconcileVisible(columns, raw);
  const setVisible = controlled ? options.onVisibleIdsChange! : setOwned;

  const toggle = useCallback(
    (id: string) => {
      setVisible(toggleColumn(columns, visibleIds, id));
    },
    [columns, visibleIds, setVisible],
  );

  const optional = columns.filter((column) => column.optional === true);
  const required = columns.filter((column) => isRequiredColumn(column));

  return {
    visibleIds,
    isVisible: (id) => visibleIds.includes(id),
    isRequired: (id) => {
      const column = columns.find((one) => one.id === id);
      return column === undefined ? true : isRequiredColumn(column);
    },
    toggle,
    optional,
    required,
    hasOptional: optional.length > 0,
    changed: !sameSet(visibleIds, defaultVisibleIds(columns)),
  };
}
