import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";
import type { ListGroup } from "@sincpro/web-ui/views/list/types";

/** The columns a grouped table has to SHOW, in order.
 *
 *  They are not the ones it groups by —the levels do that, with the engine's key—
 *  but the ones that cannot stay hidden: a «Septiembre» bucket with the
 *  «registrado» column turned off is a cut whose criterion is not on
 *  screen.
 *
 *  **A column's name and a field's name are not the same, and assuming so was
 *  what broke the table.** A column may be called `registered` and answer
 *  for the model's `registered_at` — which is exactly what
 *  `DataColumn.field` declares. It reads the columns in order —the one that IS CALLED like the field,
 *  then the one that declares it— and `columnOf` wins if the view knows more. */
export function groupedColumnIds<T extends object>(
  group: ListGroup<T>,
  columns: readonly DataColumn<T>[] | undefined,
): string[] {
  return group.levels
    .map((level) => group.columnOf?.(level) ?? columnAnswering(level.field, columns))
    .filter((id): id is string => id !== undefined);
}

/** The presentations that need width: a grid of columns. */
export const WIDE_PRESENTS: readonly ListPresent[] = [
  "table",
  "sheet",
  "report",
  "pivot",
  "gantt",
  "timeline",
];

/** The id of the column that answers for a model field, when there is one. */
function columnAnswering<T extends object>(
  field: string,
  columns: readonly DataColumn<T>[] | undefined,
): string {
  if (columns === undefined) return field;
  return (
    columns.find((one) => one.id === field)?.id ??
    columns.find((one) => one.field === field)?.id ??
    field
  );
}
