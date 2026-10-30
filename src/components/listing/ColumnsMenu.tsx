"use client";

import type { ColumnControl, ColumnSpec } from "@sincpro/web-ui/components/listing/columns";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { Columns3 } from "lucide-react";

/**
 * The Odoo columns submenu: required fields stay checked and cannot be
 * unchecked; optional fields toggle. It stays open while toggling so hiding
 * three columns is three clicks, not three open-close round trips.
 *
 * Drawn only when the set declared optional columns. A menu of required-only
 * fields would be a list of things you cannot do.
 */

export function ColumnsMenu({
  control,
  surface,
}: {
  control: ColumnControl;
  surface?: Surface;
}) {
  const copy = useUiCopy();
  if (!control.hasOptional) return null;

  const requiredOptions = control.required.map((column) => ({
    id: column.id,
    label: column.label,
    checked: true,
    disabled: true,
    hint: copy.frame.required,
  }));

  const optionalOptions = control.optional.map((column) => ({
    id: column.id,
    label: column.label,
    checked: control.isVisible(column.id),
  }));

  const groups =
    requiredOptions.length === 0
      ? [{ label: copy.frame.show, options: optionalOptions }]
      : [
          { label: copy.frame.required, options: requiredOptions },
          { label: copy.frame.optional, options: optionalOptions },
        ];

  const hiddenOptional = control.optional.some((column) => !control.isVisible(column.id));

  return (
    <Menu
      label={copy.frame.columns}
      icon={Columns3}
      groups={groups}
      onSelect={control.toggle}
      closeOnSelect={false}
      active={hiddenOptional}
      {...(surface === undefined ? {} : { surface })}
      size="sm"
    />
  );
}

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
