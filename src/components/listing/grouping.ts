"use client";

import {
  type GroupGrain,
  type GroupLevel,
  levelKey,
  moveLevel,
  normalizeLevels,
} from "@sincpro/web-ui/foundations/grouping";
import { useCallback, useState } from "react";

/**
 * LOS NIVELES, como estado que alguien edita.
 *
 * El vocabulario —qué es un nivel, qué es un montón, cómo se identifica— vive en
 * `system/grouping.ts`, porque lo hablan las DOS capas: la lista arma el árbol y
 * la tabla lo dibuja, y una primitiva no puede importar de un contexto. Acá
 * queda sólo el CONTROL, que es de la lista como lo son el de columnas y el de
 * plegado.
 */

/* ---------------------------------------------------------------- *
 *  Los niveles, como estado editable
 * ---------------------------------------------------------------- */

/** Los niveles puestos, y las cuatro cosas que se les hacen. El orden ES la
 *  jerarquía: mover un nivel de lugar cambia por qué se parte primero. */
export type GroupingControl = {
  levels: readonly GroupLevel[];
  /**
   * Pone un nivel. Un campo de fecha puede estar puesto con VARIOS granos —«por
   * mes y adentro por día»— así que lo que no se duplica es el par campo+grano,
   * no el campo. Agrupar dos veces por exactamente lo mismo parte en montones de
   * uno, y eso siempre es un error de tipeo.
   */
  add: (field: string, grain?: GroupGrain) => void;
  remove: (field: string, grain?: GroupGrain) => void;
  /** Tildar y destildar en un gesto, que es lo que hace una casilla. */
  toggle: (field: string, grain?: GroupGrain) => void;
  has: (field: string, grain?: GroupGrain) => boolean;
  /** Mueve un nivel `delta` lugares. Se queda en los bordes en vez de dar la
   *  vuelta: llegar al primero y volver al último no es lo que nadie espera de
   *  una flecha «subir». */
  move: (field: string, delta: number) => void;
  clear: () => void;
};

// One empty array for every render: a fresh `[]` would change the callbacks below each time.
const NO_LEVELS: readonly GroupLevel[] = [];

export function useGroupingControl(
  options: {
    levels?: readonly GroupLevel[];
    onLevelsChange?: (levels: readonly GroupLevel[]) => void;
  } = {},
): GroupingControl {
  const [owned, setOwned] = useState<readonly GroupLevel[]>(options.levels ?? NO_LEVELS);
  const controlled = options.onLevelsChange !== undefined;
  const levels = controlled ? (options.levels ?? NO_LEVELS) : owned;
  const setLevels = controlled ? options.onLevelsChange! : setOwned;

  const keyOf = (field: string, grain?: GroupGrain): string =>
    levelKey(grain === undefined ? { field } : { field, grain });

  const has = useCallback(
    (field: string, grain?: GroupGrain) =>
      levels.some((one) => levelKey(one) === keyOf(field, grain)),
    [levels],
  );

  const add = useCallback(
    (field: string, grain?: GroupGrain) => {
      if (levels.some((one) => levelKey(one) === keyOf(field, grain))) return;
      /* Se normaliza SIEMPRE y no sólo al agregar fechas: es la única forma de
         que tildar «día» y después «mes» dé «mes › día» sin que quien tilda
         tenga que saber en qué orden hacerlo. */
      setLevels(
        normalizeLevels([...levels, grain === undefined ? { field } : { field, grain }]),
      );
    },
    [levels, setLevels],
  );

  const remove = useCallback(
    (field: string, grain?: GroupGrain) => {
      setLevels(
        grain === undefined && !levels.some((one) => levelKey(one) === field)
          ? /* Sin grano y sin coincidencia exacta: se saca el campo ENTERO, con
               todos sus granos. Es lo que quiere decir la × de un campo de
               fecha que está puesto por mes y por día. */
            levels.filter((one) => one.field !== field)
          : levels.filter((one) => levelKey(one) !== keyOf(field, grain)),
      );
    },
    [levels, setLevels],
  );

  return {
    levels,
    has,
    add,
    remove,
    toggle: useCallback(
      (field: string, grain?: GroupGrain) => {
        if (levels.some((one) => levelKey(one) === keyOf(field, grain))) remove(field, grain);
        else add(field, grain);
      },
      [levels, add, remove],
    ),
    move: useCallback(
      (field, delta) => {
        setLevels(moveLevel(levels, field, delta));
      },
      [levels, setLevels],
    ),
    clear: useCallback(() => {
      setLevels([]);
    }, [setLevels]),
  };
}
