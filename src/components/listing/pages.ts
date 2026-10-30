"use client";

import { useEffect, useState } from "react";

/**
 * How many records a list shows until someone asks for another size.
 *
 * 80 is the product default: enough to scan a catalog without paging every
 * twenty-five rows, still small enough that a table stays a table. 25 / 80 / 100
 * are the presets; any other positive integer is valid and is kept.
 */
export const DEFAULT_PAGE_SIZE = 80;
export const PAGE_SIZES = [25, 80, 100] as const;

/** What `Pagination` needs, already computed from a set in memory. */
export interface PaginationBridge {
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface Pages<Row> {
  pageItems: Row[];
  bridge: PaginationBridge;
}

function clampSize(next: number): number {
  if (!Number.isFinite(next)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.floor(next));
}

/**
 * Cut an in-memory set into pages.
 *
 * `pageSize` is controlled when `onPageSizeChange` is passed — that is how a
 * view context keeps the size across filters. Without it the hook owns the
 * size, defaulting to 80.
 *
 * The current page is clamped in the calculation, not in an effect: if a
 * filter leaves fewer pages than the current one, the next read already
 * lands on the last page that exists.
 */
export function usePagination<Row>(
  items: readonly Row[],
  options: {
    pageSize?: number;
    onPageSizeChange?: (next: number) => void;
  } = {},
): Pages<Row> {
  const controlled = options.pageSize !== undefined && options.onPageSizeChange !== undefined;
  const [ownedSize, setOwnedSize] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const pageSize = clampSize(
    controlled ? (options.pageSize ?? DEFAULT_PAGE_SIZE) : ownedSize,
  );
  const setPageSize = controlled ? options.onPageSizeChange! : setOwnedSize;

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return {
    pageItems: items.slice(from > 0 ? from - 1 : 0, to),
    bridge: {
      from,
      to,
      total,
      pageSize,
      onPageSizeChange: (next) => {
        setPageSize(clampSize(next));
        setPage(1);
      },
      /* Se mueve desde `current` y no desde `page`, que es el que puede haber
         quedado alto: si estabas en la 3 y un filtro dejó dos páginas, `page`
         sigue en 3 mientras se muestra la 2, y `p - 1` volvía a 2 — o sea que
         «anterior» no hacía nada hasta el segundo clic. */
      ...(current > 1 ? { onPrev: () => setPage(current - 1) } : {}),
      ...(current < pages ? { onNext: () => setPage(current + 1) } : {}),
    },
  };
}

/** What a server answered about a page: the records, where the next one starts, how many
 *  match in total. `exact: false` on the count means *at least* that many — a server that
 *  stops counting at a ceiling so its cost does not grow with the table. */
export interface ServerPage<Row> {
  items: readonly Row[];
  cursor: string | null;
  count: { value: number; exact: boolean } | null;
}

/** What a cursor-paged list needs from whoever fetches it. */
export interface CursorSource<Row> {
  /** The page at this cursor. `undefined` asks for the first one. */
  fetch: (cursor: string | undefined, pageSize: number) => Promise<ServerPage<Row>>;
  /** Anything that changes WHICH records are being paged — a filter, an ordering. Pagination
   *  starts over when this changes, because page 3 of another reading is not page 3. */
  resetKey?: unknown;
}

/**
 * Cut a *server-side* set into pages, by cursor.
 *
 * `usePagination` slices an array that is already in hand; this one never holds the whole set.
 * Same `bridge`, so `Pagination` draws it identically — the difference is invisible to a view.
 *
 * **Going back is a walk, not a jump.** A keyset cursor names the last row seen, so it points
 * forward and nothing points back. Rather than fake it with an offset — which would reintroduce
 * exactly the incoherence the cursor exists to avoid — the cursors already walked are kept, and
 * `onPrev` re-fetches with the one before. That is one request, not a re-walk from the start.
 *
 * **Changing the size starts over**, and that is not a limitation: a cursor belongs to the page
 * size it was minted under, so keeping it would land somewhere nobody asked for.
 */
export function useCursorPagination<Row>(
  source: CursorSource<Row>,
  options: {
    pageSize?: number;
    onPageSizeChange?: (next: number) => void;
  } = {},
): Pages<Row> & { loading: boolean; error: unknown } {
  const controlled = options.pageSize !== undefined && options.onPageSizeChange !== undefined;
  const [ownedSize, setOwnedSize] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = clampSize(controlled ? options.pageSize! : ownedSize);

  /* The cursor that opened each page walked so far. `[undefined]` is the first page, which
     opens with no cursor — so `walked.length` is the page number. */
  const [walked, setWalked] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState<ServerPage<Row> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const at = walked[walked.length - 1];

  /* Starting over is keyed on what changes the reading — the filter, the ordering, the size.
     Without this an `onPrev` after a filter change would re-fetch a cursor minted for the
     previous reading, and the server would refuse it. */
  useEffect(() => {
    setWalked([undefined]);
  }, [source.resetKey, pageSize]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    source
      .fetch(at, pageSize)
      .then((answer) => {
        if (!current) return;
        setPage(answer);
        setError(null);
      })
      .catch((failure) => current && setError(failure))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, pageSize, source.resetKey]);

  const items = page?.items ?? [];
  const total = page?.count?.value ?? items.length;
  const from = items.length === 0 ? 0 : (walked.length - 1) * pageSize + 1;
  const to = from === 0 ? 0 : from + items.length - 1;

  return {
    pageItems: [...items],
    loading,
    error,
    bridge: {
      from,
      to,
      total,
      pageSize,
      onPageSizeChange: (next) => {
        const size = clampSize(next);
        if (controlled) options.onPageSizeChange!(size);
        else setOwnedSize(size);
        setWalked([undefined]);
      },
      ...(walked.length > 1 ? { onPrev: () => setWalked((so) => so.slice(0, -1)) } : {}),
      ...(page?.cursor != null
        ? { onNext: () => setWalked((so) => [...so, page.cursor ?? undefined]) }
        : {}),
    },
  };
}
