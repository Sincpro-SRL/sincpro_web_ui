"use client";

import { PAGE_SIZES } from "@sincpro/web-ui/components/listing/pages";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";

/* ---------------------------------------------------------------- *
 *  THE FOOTER AND ITS PAGINATION
 * ---------------------------------------------------------------- */

/** How many of how many, and how I move to the next page.
 *
 *  **It lives ONCE and it is mounted in two places.** The normal destination is
 *  the search bar: you search, you narrow down and you paginate on the same
 *  line, without looking down to the footer to discover there are another
 *  hundred and sixty. The footer (`ListingFooter`) existed only for the lists
 *  that do NOT have a search box — there is no narrowing line there to put it on.
 *
 *  Two implementations of one pagination diverge at the first fix, so this is
 *  the only one and both places receive it.
 *
 *  ── The range, not the page number ──────────────────────────────────
 *
 *  «1–25 de 187» answers three questions —where I am, how much I see, how much
 *  there is— and «page 1 of 8» answers a single one, in units that depend on a
 *  page size the user did not choose.
 *
 *  ── Why the page size is visible ────────────────────────────────────
 *
 *  Because it is the difference between scrolling eight times and scrolling
 *  once. In a tool where somebody compares a hundred and eighty invoices,
 *  leaving it fixed at 25 forces paginating over something that is not a
 *  product decision. */
export function Pagination({
  from,
  to,
  total,
  pageSize,
  pageSizes = PAGE_SIZES,
  onPageSizeChange,
  onPrev,
  onNext,
  surface,
}: {
  from: number;
  to: number;
  total: number;
  pageSize?: number;
  pageSizes?: readonly number[];
  onPageSizeChange?: (next: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** By default it inherits it from the surface that wraps it. */
  surface?: Surface;
}) {
  const d = useDensity();
  const copy = useUiCopy();
  const activeSurface = useSurface(surface);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const listId = useId();

  const faint = bySurface(activeSurface, "text-muted", "text-chrome-muted");
  const strong = bySurface(activeSurface, "text-ink", "text-chrome-ink");

  const arrow = `inline-flex size-(--size-control-sm) items-center justify-center rounded-pill transition-colors duration-(--duration-instant) disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${bySurface(
    activeSurface,
    "text-muted not-disabled:hover:bg-ink/6 not-disabled:hover:text-ink",
    "text-chrome-muted not-disabled:hover:bg-chrome-ink/12 not-disabled:hover:text-chrome-ink",
  )}`;

  const canEdit =
    pageSize !== undefined && onPageSizeChange !== undefined && d === "comfortable";
  const sizes =
    pageSize !== undefined && !pageSizes.includes(pageSize)
      ? [...pageSizes, pageSize]
      : pageSizes;

  function commitSize(raw: string) {
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 1) {
      setEditing(false);
      return;
    }
    onPageSizeChange?.(Math.floor(next));
    setEditing(false);
  }

  return (
    <div className={`flex shrink-0 items-center ${byDensity(d, "gap-1", "gap-0.5")}`}>
      {/* The range IS the control: you touch it and you choose how many fit.
          Presets (25 / 80 / 100) sit in the datalist; typing 1000 is valid and
          the custom size is kept on the next open. */}
      {editing && canEdit ? (
        <>
          <input
            autoFocus
            type="number"
            min={1}
            step={1}
            list={listId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commitSize(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSize(draft);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label={copy.pager.size}
            className={`h-(--size-control-sm) w-24 rounded-control border px-1.5 text-micro tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              activeSurface,
              "border-line-strong bg-surface text-ink",
              "border-chrome-ink/45 bg-chrome-ink/8 text-chrome-ink",
            )}`}
          />
          <datalist id={listId}>
            {sizes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </>
      ) : (
        <span className={`text-micro tabular-nums whitespace-nowrap ${faint}`}>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setDraft(String(pageSize));
                setEditing(true);
              }}
              title={fillCopy(copy.pager.sizeHint, { size: pageSize ?? 0 })}
              className={`rounded-control underline decoration-dotted underline-offset-4 transition-colors duration-(--duration-instant) ${strong} ${bySurface(
                activeSurface,
                "decoration-line-strong hover:decoration-primary",
                "decoration-chrome-ink/40 hover:decoration-chrome-link",
              )} focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary`}
            >
              {from.toLocaleString(copy.locale)}–{to.toLocaleString(copy.locale)}
            </button>
          ) : (
            <span className={strong}>
              {from.toLocaleString(copy.locale)}–{to.toLocaleString(copy.locale)}
            </span>
          )}
          <span className="mx-1">/</span>
          {total.toLocaleString(copy.locale)}
        </span>
      )}

      {/* They turn off at the ends, they do not disappear: a control that hides
          shifts the others, and whoever was going to press «previous» ends up
          pressing «next». */}
      <span className="flex items-center">
        <button
          type="button"
          onClick={onPrev}
          disabled={from <= 1}
          aria-label={copy.pager.prev}
          title={copy.pager.prev}
          className={arrow}
        >
          <ChevronLeft className="size-(--size-icon-md)" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={to >= total}
          aria-label={copy.pager.next}
          title={copy.pager.next}
          className={arrow}
        >
          <ChevronRight className="size-(--size-icon-md)" strokeWidth={2} />
        </button>
      </span>
    </div>
  );
}

/* `ListingFooter` lived here and was deleted. It existed for the lists without
   a search box, and none were left: the `ListingBar` always has its line, so
   the pagination always finds somewhere to go.

   It gets deleted instead of kept «just in case». A piece with no consumers is
   not maintained, not tested and not looked at — and the day somebody uses it
   they are going to find the version from six months ago. */

/* `ListingEmpty` lived here and was deleted: it was `return <Empty …/>` and
   nothing else, and on top of that it lost the `align` prop. A wrapper that
   adds nothing is one more name to learn and one more piece to maintain.
   Whoever needs a list's empty state uses `Empty`, which is the one with the
   story. */
