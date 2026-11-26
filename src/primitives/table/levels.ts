/**
 * How a level of a grouping reads: by the header of the column that answers for its field — the
 * word the person reads over that column («Estado») —, never the field's key («status»). A field
 * no column shows reads as itself. A table's pile, a list's group header and a report's group
 * line all name their level this way.
 *
 *     levelNameOf("status", [{ id: "status", header: "Estado", … }])  ->  "Estado"
 */
export function levelNameOf(
  field: string,
  columns: readonly { id: string; field?: string | undefined; header: string }[] | undefined,
): string {
  return (
    columns?.find((column) => column.id === field || column.field === field)?.header ?? field
  );
}
