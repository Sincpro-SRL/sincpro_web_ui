"use client";

import type { ColumnControl } from "@sincpro/web-ui/components/listing/columns";
import { specsFromColumns } from "@sincpro/web-ui/components/listing/columnSpecs";
import { FieldPath, type PathPick } from "@sincpro/web-ui/components/search/FieldPath";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { Columns3, Plus } from "lucide-react";

/**
 * The Odoo columns submenu: required fields stay checked and cannot be
 * unchecked; optional fields toggle. It stays open while toggling so hiding
 * three columns is three clicks, not three open-close round trips.
 *
 * Drawn only when the set declared optional columns. A menu of required-only
 * fields would be a list of things you cannot do.
 *
 * `addPath` adds «Agregar columna» next to it: a `FieldPath` that walks the relations, so a
 * column can be a field of a related record («Cliente > País»). web-ui hands the chosen path
 * back; turning it into a column — and asking the server for it — is the framework's.
 */

export function ColumnsMenu({
  control,
  surface,
  addPath,
}: {
  control: ColumnControl;
  surface?: Surface;
  addPath?: PathPick;
}) {
  const copy = useUiCopy();
  if (!control.hasOptional && addPath === undefined) return null;
  const picker =
    addPath === undefined ? null : (
      <FieldPath
        look="button"
        icon={Plus}
        model={addPath.model}
        {...(addPath.loadModel === undefined ? {} : { loadModel: addPath.loadModel })}
        {...(addPath.filter === undefined ? {} : { filter: addPath.filter })}
        {...(addPath.followRelations === undefined
          ? {}
          : { followRelations: addPath.followRelations })}
        value={[]}
        label={copy.fieldPath.addColumn}
        placeholder={copy.fieldPath.addColumn}
        onChange={addPath.onPick}
      />
    );
  if (!control.hasOptional) return picker;

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

  const menu = (
    <Menu
      label={copy.frame.columns}
      icon={Columns3}
      groups={groups}
      onSelect={control.toggle}
      closeOnSelect={false}
      /* Marked when the person changed the columns — not when the view's own defaults hide an
         optional one: at rest every such list read as «something is set here». */
      active={control.changed}
      {...(surface === undefined ? {} : { surface })}
      size="sm"
    />
  );
  return picker === null ? (
    menu
  ) : (
    <span className="flex items-center gap-1.5">
      {menu}
      {picker}
    </span>
  );
}

/* `specsFromColumns` is plain (`columnSpecs.ts`), without the directive; re-exported so every
   path that read it here keeps reading it. */
export { specsFromColumns };
