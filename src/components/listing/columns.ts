"use client";

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

export type ColumnSpec = {
  id: string;
  label: string;
  /** When true, the column may leave the view. Required columns stay, and
   *  the submenu shows them checked and disabled so the split is visible. */
  optional?: boolean;
  /** Odoo `optional="hide"`: start off. Only for optional columns. */
  defaultHidden?: boolean;
};

export type ColumnControl = {
  visibleIds: readonly string[];
  isVisible: (id: string) => boolean;
  isRequired: (id: string) => boolean;
  toggle: (id: string) => void;
  optional: readonly ColumnSpec[];
  required: readonly ColumnSpec[];
  hasOptional: boolean;
};

export function isRequiredColumn(column: ColumnSpec): boolean {
  return column.optional !== true;
}

export function defaultVisibleIds(columns: readonly ColumnSpec[]): string[] {
  return columns
    .filter((column) => isRequiredColumn(column) || column.defaultHidden !== true)
    .map((column) => column.id);
}

/**
 * Required columns always stay. Unknown ids drop out. If everything optional
 * was unchecked, the first column remains — a table with zero columns is not
 * a table.
 */
export function reconcileVisible(
  columns: readonly ColumnSpec[],
  visibleIds: readonly string[],
): string[] {
  if (columns.length === 0) return [];
  const known = new Set(columns.map((column) => column.id));
  const visible = new Set(visibleIds.filter((id) => known.has(id)));
  for (const column of columns) {
    if (isRequiredColumn(column)) visible.add(column.id);
  }
  if (visible.size === 0) visible.add(columns[0]!.id);
  return columns.filter((column) => visible.has(column.id)).map((column) => column.id);
}

export function toggleColumn(
  columns: readonly ColumnSpec[],
  visibleIds: readonly string[],
  id: string,
): string[] {
  const column = columns.find((one) => one.id === id);
  if (column === undefined || isRequiredColumn(column)) {
    return reconcileVisible(columns, visibleIds);
  }
  const current = reconcileVisible(columns, visibleIds);
  const next = current.includes(id) ? current.filter((one) => one !== id) : [...current, id];
  return reconcileVisible(columns, next);
}

export function visibleColumns<T extends { id: string }>(
  columns: readonly T[],
  visibleIds: readonly string[],
): T[] {
  const wanted = new Set(visibleIds);
  return columns.filter((column) => wanted.has(column.id));
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
  };
}
