/**
 * Which columns of a set are on screen, as plain rules: the spec (required or optional,
 * hidden at first), the default set, a toggle, the set reconciled. `useColumnControl`
 * (`columns.ts`) keeps them in state; these live apart and without `"use client"`, so a server
 * component — the page that reads the person's columns from a cookie — computes the same set.
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

/** A table's columns as specs: `header` is the label, `optional` falls back to the table's. */
export function specsFromColumns(
  columns: readonly {
    id: string;
    header: string;
    optional?: boolean;
    defaultHidden?: boolean;
  }[],
  fallbackOptional: boolean,
): ColumnSpec[] {
  return columns.map((column) => ({
    id: column.id,
    label: column.header,
    optional: column.optional ?? fallbackOptional,
    ...(column.defaultHidden === true ? { defaultHidden: true } : {}),
  }));
}
