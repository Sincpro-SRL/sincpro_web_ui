"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Menu, type MenuGroup } from "@sincpro/web-ui/primitives/menu/Menu";
import type { SortState } from "@sincpro/web-ui/primitives/table/Table";
import { ArrowDownUp, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

/**
 * ORDENAR, cuando no hay encabezados donde hacer clic.
 *
 * Context: ordenar era una capacidad de `DataTable` y de nadie más. Se hacía
 * clic en el encabezado de la columna, que es la forma correcta **cuando hay
 * encabezados**. En filas, en tablero y en la planilla no los hay, así que
 * cambiar de presentación no perdía sólo el orden puesto: perdía la posibilidad
 * de ordenar. Es exactamente el mismo drift que tenía la agrupación.
 *
 * El orden es del CONJUNTO y no de la presentación, igual que los niveles y que
 * lo plegado. Por eso el control vive en la barra y no adentro de la tabla, y
 * por eso la tabla sigue teniendo además sus encabezados: son dos puertas a lo
 * mismo, y la de los encabezados es más rápida cuando existe.
 *
 * ── Por qué es un `Menu` y el agrupador no ──────────────────────────
 *
 * Porque ordenar SÍ es elegir una opción: un campo y una dirección. No hay orden
 * ni jerarquía que expresar —ordenar por dos campos a la vez es un desempate,
 * que es otra pregunta y la hace el motor— así que una lista de tildes alcanza y
 * no hace falta un editor.
 */

export type SortField<T = unknown> = {
  field: string;
  label: string;
  /**
   * Por qué valor se ordena, cuando ordena el NAVEGADOR.
   *
   * Ausente = ya viene ordenado de donde salió. Es la misma división que tiene
   * el agrupado con `piles`: un conjunto que el servidor pagina no se puede
   * ordenar acá —ordenar doce filas de ciento ochenta y siete da un orden
   * falso— así que ahí el orden viaja en la lectura y esto sólo lo refleja.
   */
  value?: (item: T) => string | number | null | undefined;
  /** Qué quiere decir «ascendente» para este campo. Sin esto, «A → Z».
   *  Una fecha asciende de vieja a nueva y un importe de chico a grande, y
   *  decirlo evita el clic de prueba. */
  ascLabel?: string;
  descLabel?: string;
};

export type SortMenuProps = {
  /** Por qué campos se puede ordenar. Sin ninguno, el control no se dibuja. */
  fields: readonly SortField<never>[];
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  surface?: Surface;
};

/**
 * Las filas, ordenadas acá.
 *
 * Sólo cuando el campo activo declara `value`; si no, se devuelven tal cual —
 * ordenar una página de un conjunto que se pagina afuera produce un orden que es
 * mentira, porque ordena las doce que llegaron y no las ciento ochenta y siete.
 *
 * Los faltantes van SIEMPRE al final, suba o baje el orden. Es lo que hace
 * cualquier planilla, y la razón es que un vacío no es «el más chico»: es la
 * ausencia de respuesta, y ponerlo primero al invertir el orden llena la primera
 * pantalla con las filas que menos dicen.
 */
export function sortItems<T>(
  items: readonly T[],
  fields: readonly SortField<T>[],
  sort: SortState | null | undefined,
): readonly T[] {
  if (sort === null || sort === undefined) return items;
  const field = fields.find((one) => one.field === sort.key);
  if (field?.value === undefined) return items;
  const read = field.value;
  const sign = sort.direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const left = read(a);
    const right = read(b);
    const leftMissing = left === null || left === undefined || left === "";
    const rightMissing = right === null || right === undefined || right === "";
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * sign;
    return String(left).localeCompare(String(right)) * sign;
  });
}

export function SortMenu({ fields, sort, onSortChange, surface }: SortMenuProps) {
  const copy = useUiCopy();
  if (fields.length === 0) return null;

  const current = fields.find((one) => one.field === sort?.key);

  const groups: MenuGroup[] = [
    {
      label: copy.sorting.by,
      options: fields.map((one) => ({
        id: one.field,
        label: one.label,
        checked: one.field === sort?.key,
      })),
    },
    /* La dirección sólo cuando hay algo ordenado: «descendente» sin campo no
       ordena nada, y una opción que no hace nada es una opción que se prueba. */
    ...(current === undefined
      ? []
      : [
          {
            options: [
              {
                id: "__asc__",
                label: current.ascLabel ?? copy.sorting.asc,
                icon: ArrowUpNarrowWide,
                checked: sort?.direction === "asc",
              },
              {
                id: "__desc__",
                label: current.descLabel ?? copy.sorting.desc,
                icon: ArrowDownWideNarrow,
                checked: sort?.direction === "desc",
              },
            ],
          },
          { options: [{ id: "__none__", label: copy.sorting.clear }] },
        ]),
  ];

  return (
    <Menu
      label={current === undefined ? copy.sorting.label : current.label}
      icon={
        sort === null || sort === undefined
          ? ArrowDownUp
          : sort.direction === "asc"
            ? ArrowUpNarrowWide
            : ArrowDownWideNarrow
      }
      groups={groups}
      active={sort !== null && sort !== undefined}
      size="sm"
      width="sm"
      closeOnSelect={false}
      {...(surface === undefined ? {} : { surface })}
      onSelect={(id) => {
        if (id === "__none__") return onSortChange(null);
        if (id === "__asc__") {
          return onSortChange(sort === null ? null : { ...sort, direction: "asc" });
        }
        if (id === "__desc__") {
          return onSortChange(sort === null ? null : { ...sort, direction: "desc" });
        }
        /* Volver a elegir el campo que ya está puesto DA VUELTA la dirección, que
           es lo que hace el clic en un encabezado. Sin eso, invertir el orden son
           dos gestos en un menú y uno en la tabla — la misma capacidad costando
           distinto según la presentación. */
        if (sort?.key === id) {
          return onSortChange({
            key: id,
            direction: sort.direction === "asc" ? "desc" : "asc",
          });
        }
        onSortChange({ key: id, direction: "asc" });
      }}
    />
  );
}
