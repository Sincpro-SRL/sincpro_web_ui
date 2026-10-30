"use client";

import { useCallback, useState } from "react";

/**
 * Which BRANCHES of a set are closed.
 *
 * Grouping is the tree: a list split by customer, a table with expandable
 * group rows, a board with the same headers. The collapsed keys belong to the
 * SET, not to one presentation — switching from rows to table must not reopen
 * what the user just closed.
 *
 * **A key here is a pile's PATH**, serialized with `pathKey()`. With one level a
 * plain key was enough, because no two piles could be called the same. With N
 * levels they can: «2026-09» is one month inside «Ferretería Sur» and another inside
 * «Distribuidora Andina», and folding one must not fold the other. What tells them apart is
 * the route that leads to each, so that is what is stored.
 *
 * A hierarchical parent/child present would use the same keys. There is no
 * fourth archetype for «tree»: collapse is how N is folded, the same way
 * pagination is how N is cut.
 */

export type TreeControl = {
  collapsed: readonly string[];
  isOpen: (key: string) => boolean;
  toggle: (key: string) => void;
};

export function toggleCollapsed(collapsed: readonly string[], key: string): string[] {
  return collapsed.includes(key)
    ? collapsed.filter((one) => one !== key)
    : [...collapsed, key];
}

// One empty array for every render: a fresh `[]` would change `toggle` each time.
const NONE_COLLAPSED: readonly string[] = [];

export function useTreeControl(
  options: {
    collapsed?: readonly string[];
    onCollapsedChange?: (keys: readonly string[]) => void;
  } = {},
): TreeControl {
  const [owned, setOwned] = useState<readonly string[]>(options.collapsed ?? NONE_COLLAPSED);
  const controlled = options.onCollapsedChange !== undefined;
  const collapsed = controlled ? (options.collapsed ?? NONE_COLLAPSED) : owned;
  const setCollapsed = controlled ? options.onCollapsedChange! : setOwned;

  const toggle = useCallback(
    (key: string) => {
      setCollapsed(toggleCollapsed(collapsed, key));
    },
    [collapsed, setCollapsed],
  );

  return {
    collapsed,
    isOpen: (key) => collapsed.includes(key) !== true,
    toggle,
  };
}
