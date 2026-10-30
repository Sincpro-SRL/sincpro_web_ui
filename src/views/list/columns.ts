import type { ListPresent } from "@sincpro/web-ui/components/listing/set";
import type { DataColumn } from "@sincpro/web-ui/primitives/table/DataTable";
import type { ListGroup } from "@sincpro/web-ui/views/list/types";

/** Las columnas que una tabla agrupada tiene que MOSTRAR, en orden.
 *
 *  No son por las que agrupa —eso lo hacen los niveles, con la clave del motor—
 *  sino las que no pueden quedar escondidas: un montón «Septiembre» con la
 *  columna «registrado» apagada es un corte cuyo criterio no está en la
 *  pantalla.
 *
 *  **El nombre de una columna y el de un campo no son el mismo, y suponerlo fue
 *  lo que rompió la tabla.** Una columna puede llamarse `registered` y contestar
 *  por el `registered_at` del modelo — que es justo lo que declara
 *  `DataColumn.field`. Lee las columnas en orden —la que SE LLAMA como el campo,
 *  después la que lo declara— y `columnOf` gana si la vista sabe más. */
export function groupedColumnIds<T extends object>(
  group: ListGroup<T>,
  columns: readonly DataColumn<T>[] | undefined,
): string[] {
  return group.levels
    .map((level) => group.columnOf?.(level) ?? columnAnswering(level.field, columns))
    .filter((id): id is string => id !== undefined);
}

/** The presentations that need width: a grid of columns. */
export const WIDE_PRESENTS: readonly ListPresent[] = ["table", "sheet", "report", "pivot"];

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
