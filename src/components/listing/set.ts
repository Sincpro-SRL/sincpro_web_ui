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
 * Las maneras de mirar un conjunto. **Vive acá y no en el arquetipo** porque
 * son dos los que preguntan lo mismo —una lista y un marco— y la definición
 * tiene que ser una sola.
 *
 * Era dos: `ListPresent` en `archetype/ListView.tsx` y esta copia. Mientras las
 * dos decían `rows | table | board` nadie lo notaba; agregar `sheet` a una dejó
 * cuatro vistas sin compilar, que es exactamente lo que pasa cuando la misma
 * idea está escrita dos veces.
 *
 *     rows / board   no hay columnas: nombre, fichas y meta.
 *     table          las columnas las DECLARA el código.
 *     sheet          las columnas salen del ARCHIVO — puede haber cuarenta y un
 *                    millón de filas, así que va virtualizada.
 *     report         columnas de período y filas en JERARQUÍA que termina en
 *                    totales. No se ordena: el orden ES el informe.
 *     pivot          dos EJES a la vez. Una fila es un montón y una columna
 *                    también; lo que se lee está en el cruce. Tampoco se
 *                    ordena: el orden de cada eje es el de sus claves.
 */
export type ListPresent = "rows" | "table" | "board" | "sheet" | "report" | "pivot";

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
