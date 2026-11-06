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
 * THE LEVELS, as state somebody edits.
 *
 * The vocabulary —what a level is, what a heap is, how it is identified— lives in
 * `system/grouping.ts`, because BOTH layers speak it: the list builds the tree and
 * the table draws it, and a primitive cannot import from a context. Here
 * only the CONTROL stays, which belongs to the list as do the columns' and the
 * folding's.
 */

/* ---------------------------------------------------------------- *
 *  The levels, as editable state
 * ---------------------------------------------------------------- */

/** The levels set, and the four things done to them. The order IS the
 *  hierarchy: moving a level changes what is split first. */
export type GroupingControl = {
  levels: readonly GroupLevel[];
  /**
   * Sets a level. A date field can be set with SEVERAL grains —«by
   * month and inside it by day»— so what is not duplicated is the field+grain pair,
   * not the field. Grouping twice by exactly the same splits into heaps of
   * one, and that is always a typo.
   */
  add: (field: string, grain?: GroupGrain) => void;
  remove: (field: string, grain?: GroupGrain) => void;
  /** Tick and untick in one gesture, which is what a checkbox does. */
  toggle: (field: string, grain?: GroupGrain) => void;
  has: (field: string, grain?: GroupGrain) => boolean;
  /** Moves a level `delta` places. It stays at the edges instead of wrapping
   *  around: reaching the first and coming back to the last is not what anyone expects of
   *  an «up» arrow. */
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
      /* It is normalised ALWAYS and not only when adding dates: it is the only way
         for ticking «día» and then «mes» to give «mes › día» without whoever ticks
         having to know in which order to do it. */
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
          ? /* No grain and no exact match: the WHOLE field is taken out, with
               all its grains. It is what the × of a date field set
               by month and by day means. */
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
