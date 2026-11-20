/* Without `"use client"`, apart from the paging hooks (`pages.ts`): a server component that
   fetches a list's first page asks for the same number of rows the list will show. */

/**
 * How many records a list shows until someone asks for another size.
 *
 * 80 is the product default: enough to scan a catalog without paging every
 * twenty-five rows, still small enough that a table stays a table. 25 / 80 / 100
 * are the presets; any other positive integer is valid and is kept.
 */
export const DEFAULT_PAGE_SIZE = 80;
export const PAGE_SIZES = [25, 80, 100] as const;
