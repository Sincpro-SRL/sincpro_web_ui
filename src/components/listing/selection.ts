"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Choosing rows of a SET. Lives next to pagination because both are how N
 * records are controlled, not how they are drawn.
 *
 * «All» means the ones ON SCREEN: with a filter on, select-all cannot take
 * what the filter hid. Chosen ids survive filtering — the Set stores ids,
 * not positions — so you can choose, filter again, choose more, and act on
 * both batches.
 */

export interface Selection {
  chosen: ReadonlySet<string>;
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  /** `true` all, `false` none, `"some"` part — the third state is the half
   *  checkbox, and without it the header lies when three of ten are chosen. */
  allState: boolean | "some";
  clear: () => void;
}

export function useSelection(visible: readonly string[]): Selection {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  const allState = useMemo<boolean | "some">(() => {
    if (visible.length === 0) return false;
    const inside = visible.filter((id) => chosen.has(id)).length;
    if (inside === 0) return false;
    return inside === visible.length ? true : "some";
  }, [visible, chosen]);

  const toggle = useCallback((id: string) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setChosen((current) => {
      const inside = visible.filter((id) => current.has(id)).length;
      const next = new Set(current);
      if (inside === visible.length) visible.forEach((id) => next.delete(id));
      else visible.forEach((id) => next.add(id));
      return next;
    });
  }, [visible]);

  return {
    chosen,
    count: chosen.size,
    has: (id) => chosen.has(id),
    toggle,
    toggleAll,
    allState,
    clear: () => setChosen(new Set()),
  };
}
