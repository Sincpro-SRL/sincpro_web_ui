/* Without `"use client"`, apart from `useTreeControl` (`tree.ts`): the closed branches of a set
   are a list of pile paths, and opening or closing one is a plain function. */

/** `key` opened if it was closed, closed if it was open. */
export function toggleCollapsed(collapsed: readonly string[], key: string): string[] {
  return collapsed.includes(key)
    ? collapsed.filter((one) => one !== key)
    : [...collapsed, key];
}
