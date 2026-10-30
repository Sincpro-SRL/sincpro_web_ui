"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Line } from "@sincpro/web-ui/primitives/block/Line";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** THE BAR — two rows, two questions.
 *
 *      ┌──────────┬──────────────────────────────┬──────────────┐
 *      │ crumbs   │ 🔍 search…  ⚙3               │ 1–8 of 187 ‹ › │
 *      ├──────────┼──────────────────────────────┼──────────────┤
 *      │ [New]    │ Facturas · 180 · 7 · 8       │ [columns] [▤][▦] │
 *      └──────────┴──────────────────────────────┴──────────────┘
 *        WHERE / HOW MUCH I SEE                    HOW I LOOK
 *
 *  Pagination answers how much of the filtered set is on screen, so it stays
 *  with the search. Columns and the presentation switcher answer how the set
 *  is looked at, so they sit with the actions — not next to the page range.
 *  Putting the four of them on the search line is how the field and «1–80»
 *  painted over each other the moment the window shrank.
 *
 *  ── Why it is two lines tall ────────────────────────────────────────
 *
 *  Because the three things that go on the left do not fit in one: a
 *  comfortable button is 34 px tall, a list title may have to wrap onto two
 *  lines, and below it goes a sentence saying what the list is made of. Forcing
 *  it into a single line means shrinking the button —the defect we already
 *  fixed— or truncating the title, which is worse: a list that cannot be named
 *  in full is indistinguishable from the one next to it.
 *
 *  ── The selection transforms the bar, it does not add one ───────────
 *
 *  When rows get selected, the identity zone turns into «3 elegidas ✕» plus the
 *  actions that apply. **In the same place and without pushing anything.** A
 *  bar that appears shifts the list downwards right when somebody is ticking
 *  checkboxes, and the row they were about to tick is no longer where it was.
 *
 *  The actions on the left do NOT go away: «Nuevo» stays available with three
 *  rows selected, because selecting is not entering a mode.
 *
 *  ── Inside a record it is ONE line (`inline`) ────────────────────────
 *
 *      ┌───────────────────────────────────────────────────────────────┐
 *      │ 🔍 search the lines…               12 records  [sort][cols][▤▦] │
 *      └───────────────────────────────────────────────────────────────┘
 *        WHAT I LOOK FOR (fills)          HOW MANY    HOW I LOOK
 *
 *  A collection that is a FIELD of a record — the lines of an order, the
 *  contacts of a customer, the journal items of an invoice — is not a screen.
 *  Everything the two rows above answer is already answered by the record
 *  around it: where I am (the record's crumbs), what this is (the tab it sits
 *  in), what I can do (the record's actions). Drawn with the page bar, it
 *  spent two rows and a rule on the one question left —the search, alone and
 *  centred on the first row; «Ordenar» and the switcher alone on the second—
 *  and pushed the rows, which are what the tab is for, below the fold.
 *
 *  So it is a single line, and the order is the order of the questions: the
 *  search FILLS from the left (it is the only thing with variable content),
 *  then how many there are, then how they are looked at, then what starts a
 *  new one. No band, no padding, no hairline: it sits on the record's paper,
 *  aligned with the fields above it, and a light band inside a white sheet is
 *  a rectangle inside a rectangle.
 *
 *  On a phone the line breaks by itself, with no threshold written anywhere:
 *  the search asks for `--container-name` before it gives up its place, so
 *  when the controls do not fit next to it they drop to a second line, pushed
 *  to the right, and the search keeps the whole first one.
 *
 *  The count is a live region: typing in the search changes it, and somebody
 *  who cannot see the rows thin out hears how many are left. With
 *  `pagination` the page range replaces it — it already says how many. */
export function ListingBar({
  actions,
  title,
  description,
  counters,
  selection,
  search,
  pagination,
  views,
  crumbs,
  surface,
  inline = false,
  count,
}: {
  /** What starts something new. It stays visible even when there is a selection. */
  actions?: ReactNode;
  title?: string;
  /** One sentence: what this list is made of, or what can be done with it. It
   *  goes below the title and that is why it can be a real sentence. */
  description?: string;
  /** The totals per category. The ones in the pagination say how many there
   *  are; these say what they are made of, which is another question. */
  counters?: readonly { label: string; value: number | string }[];
  /** When there are selected rows. It replaces the identity, in the same place. */
  selection?: { count: number; onClear?: () => void; actions?: ReactNode };
  search?: ReactNode;
  pagination?: ReactNode;
  /** Columns menu and presentation switcher. They sit on the actions row, on
   *  the right: they are how I look at the set, not how many of it I see. */
  views?: ReactNode;
  /** Where I come from. It goes above the row and only on the chrome. */
  crumbs?: ReactNode;
  /** `chrome` paints the whole band navy and everything inside inherits it:
   *  the search box, the pagination and the switcher. See `system/surface.tsx`. */
  surface?: Surface;
  /** One line, for a collection inside a record: search, count, views, actions. The
   *  title, the description, the counters and the crumbs are not drawn — the record
   *  around it already says them. Always on the canvas. See the header. */
  inline?: boolean;
  /** How many records there are, said on the inline line when there is no
   *  `pagination` to say it. Ignored by the two-row bar: its identity has counters. */
  count?: number;
}) {
  const selecting = selection !== undefined && selection.count > 0;
  const d = useDensity();
  const copy = useUiCopy();
  const activeSurface = useSurface(inline ? "canvas" : surface);
  const isChrome = activeSurface === "chrome";

  /* In compact the title and the description are NOT drawn, and it is not for
     lack of room: in a preview or on a phone, the surface header already says
     what I am looking at. Repeating it here burns the only line there is for
     the search box — which is what is actually needed. */
  const withIdentity = d === "comfortable";

  /* Two rows, and the split is the same one as in a record:
       1 · WHERE I AM and HOW MANY THERE ARE — crumbs, search, page range.
       2 · WHAT I CAN DO and HOW I LOOK — actions, identity, columns / views.

     Views used to sit next to the pagination. On a narrow window the search
     field and «1–80 / 211» painted over each other; columns and the switcher
     were the extra weight on a line that only needed how MANY. */
  const center = selecting ? (
    <div className="flex min-w-0 items-center gap-x-2">
      {/* The count follows the bar's surface: the canvas tint on the dark chrome was ink on
          navy — the one thing the person just did, unreadable. */}
      <span
        className={`inline-flex h-(--size-control-md) shrink-0 items-center gap-1.5 rounded-control pr-1 pl-2.5 text-meta font-medium ${
          isChrome ? "bg-chrome-ink/14 text-chrome-ink" : "bg-ink/8 text-ink"
        }`}
      >
        <span className="tabular-nums">{selection?.count.toLocaleString(copy.locale)}</span>
        {copy.selection.chosen}
        <button
          type="button"
          onClick={selection?.onClear}
          aria-label={copy.selection.clear}
          title={copy.selection.clear}
          className={`inline-flex size-5 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) ${
            isChrome ? "hover:bg-chrome-ink/20" : "hover:bg-primary/20"
          }`}
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      </span>
      {/* The bulk actions do NOT exist outside the selection: they appear here,
          in the center, and they go away when it gets deselected. */}
      {selection?.actions === undefined ? null : (
        <div className="flex min-w-0 items-center gap-1.5">{selection.actions}</div>
      )}
    </div>
  ) : search === undefined ? null : (
    /* Selecting replaces the search box: what gets selected is over what is
       ALREADY filtered, so searching there would change the set underneath the
       selection. */
    <div className="w-full min-w-0">{search}</div>
  );

  if (inline) {
    const howMany =
      pagination ??
      (count === undefined ? null : (
        <span role="status" className="shrink-0 text-meta text-muted tabular-nums">
          {count === 1
            ? copy.list.countOne
            : fillCopy(copy.list.count, { count: count.toLocaleString(copy.locale) })}
        </span>
      ));
    return (
      <SurfaceProvider value="canvas">
        <div
          className={`flex min-w-0 flex-wrap items-center gap-y-1.5 ${byDensity(d, "gap-x-3", "gap-x-2")}`}
        >
          {/* `basis` is what the search asks for before the line breaks; `flex-1` is what
              makes it fill once it has its line. `overflow-x-clip` for the reason given
              on the two-row bar below: the filter panel hangs out of this box. */}
          {center === null ? null : (
            <div className="flex min-w-0 flex-1 basis-(--container-name) items-center overflow-x-clip overflow-y-visible">
              {center}
            </div>
          )}
          {howMany}
          {views === undefined ? null : (
            <div className="ml-auto flex shrink-0 items-center gap-2">{views}</div>
          )}
          {actions === undefined ? null : (
            <div
              className={`flex shrink-0 items-center gap-1.5 ${views === undefined ? "ml-auto" : ""}`}
            >
              {actions}
            </div>
          )}
        </div>
      </SurfaceProvider>
    );
  }

  /* El campo de búsqueda va en el CENTRO de la línea, y centrado contra la
     línea: pide `--container-search` y los dos lados se reparten lo que sobra
     en mitades iguales. Antes tomaba el resto, así que un rastro largo a la
     izquierda lo corría —y dos listas seguidas dibujaban su buscador en dos
     lugares distintos—. Ver `primitives/block/Line.tsx`. */
  const topRow = (
    <Line
      asks="var(--container-crumb)"
      centerAsks={center === null ? "auto" : "var(--container-search)"}
      gap={byDensity(d, "gap-x-4 gap-y-2", "gap-x-2 gap-y-1.5")}
      align="items-start"
      start={crumbs}
      /* `overflow-x-clip` y NO `overflow-hidden`: lo que hay que recortar es el
         ancho —que el campo no pinte encima de «1–80»—, y `hidden` en un eje
         fuerza `auto` en el otro, así que también recortaba hacia ABAJO. El
         panel de filtros del `SearchBar` cuelga con `absolute top-full`, o sea
         justo afuera de esta caja: apretar el embudo abría un panel que nadie
         veía. `clip` es el único valor que deja `visible` en el otro eje. */
      center={
        center === null ? null : (
          <div className="flex w-full min-w-0 items-center overflow-x-clip overflow-y-visible">
            {center}
          </div>
        )
      }
      end={pagination}
    />
  );

  const bottomRow =
    actions === undefined && !withIdentity && views === undefined ? null : (
      /* On a narrow list (a phone, a drawer) the name and its counters take the whole first
         line and the action and the controls go below: squeezed between them, the
         description wrapped one word per line. */
      <div
        className={`flex min-w-0 flex-wrap items-center gap-y-2 ${byDensity(d, "gap-x-4", "gap-x-2")}`}
      >
        {actions === undefined ? null : (
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        )}

        {!withIdentity ? null : (
          <div className="flex min-w-0 flex-1 flex-col @max-2xl:order-first @max-2xl:basis-full">
            {title === undefined ? null : (
              /* No `truncate`: the title may wrap onto two lines. A list that
                 cannot be named in full is indistinguishable from the one next
                 to it. */
              /* `title` and semibold: the name of the list is the entry point of the
                 screen. At `lead` it was smaller than the metrics under it, so the
                 largest thing on a list page was a number (measured: 1.46:1 over the
                 body, below the ~1.5 an eye needs to find where to start). */
              <h2
                className={`text-title leading-tight font-semibold ${isChrome ? "text-chrome-ink" : "text-ink"}`}
              >
                {title}
              </h2>
            )}
            {description === undefined && counters === undefined ? null : (
              <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                {counters?.map((c) => (
                  <span key={c.label} className="flex items-baseline gap-1">
                    <span
                      className={`text-meta font-medium tabular-nums ${isChrome ? "text-chrome-ink" : "text-ink"}`}
                    >
                      {typeof c.value === "number"
                        ? c.value.toLocaleString(copy.locale)
                        : c.value}
                    </span>
                    <span
                      className={`text-micro ${isChrome ? "text-chrome-muted" : "text-muted"}`}
                    >
                      {c.label}
                    </span>
                  </span>
                ))}
                {description === undefined ? null : (
                  <span
                    className={`min-w-0 text-micro ${isChrome ? "text-chrome-muted" : "text-muted"}`}
                  >
                    {description}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {views === undefined ? null : (
          <div className="ml-auto flex shrink-0 items-center gap-2">{views}</div>
        )}
      </div>
    );

  const bar = (
    <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-2", "gap-1.5")}`}>
      {/* On the light bar the two rows are two questions — where I am / what I can do — and a
          hairline between them says so; without it the crumbs, the search and the actions
          read as one crowded line under the sidebar. */}
      {!isChrome && bottomRow !== null ? (
        <div className="border-b border-line pb-2">{topRow}</div>
      ) : (
        topRow
      )}
      {bottomRow}
    </div>
  );

  /* On the canvas the bar is a light control band: white, a hairline below, the same
     padding as the dark one — a list inside an application whose bar is already dark keeps
     ONE dark band per screen. Without its own band the bar sat flush on the page and its
     controls had nothing to belong to. */
  if (!isChrome) {
    return (
      <SurfaceProvider value="canvas">
        <div
          className={`flex min-w-0 flex-col border-b border-line bg-surface ${byDensity(d, "px-3.5 py-2.5", "px-2.5 py-2")}`}
        >
          {bar}
        </div>
      </SurfaceProvider>
    );
  }

  /* On the chrome the bar IS the band: the background reaches the edges and
     everything inside inherits the surface, so there is no way to forget to
     pass it — which is how the status bar ended up with the canvas palette on
     top of the navy. */
  return (
    <SurfaceProvider value="chrome">
      <div
        className={`flex min-w-0 flex-col bg-chrome ${byDensity(d, "px-3.5 py-2.5", "px-2.5 py-2")}`}
      >
        {bar}
      </div>
    </SurfaceProvider>
  );
}

export type ListIdentity = {
  title?: string;
  description?: string;
  counters?: readonly { label: string; value: number | string }[];
};
