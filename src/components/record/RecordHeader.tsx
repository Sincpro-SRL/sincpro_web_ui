"use client";

import {
  ActionDock,
  type RecordDockProps,
} from "@sincpro/web-ui/components/record/ActionDock";
import { Breadcrumb, type Crumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import {
  DirtyActions,
  DirtyBar,
  type DirtyState,
  SavedMark,
  useJustSaved,
} from "@sincpro/web-ui/components/record/DirtyActions";
import { isPrimary, ThumbBar, thumbPlan } from "@sincpro/web-ui/components/record/ThumbBar";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { useFormStyle } from "@sincpro/web-ui/foundations/form";
import { stickyTop, useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { useViewStyle, type ViewStyle } from "@sincpro/web-ui/foundations/viewStyle";
import { Line } from "@sincpro/web-ui/primitives/block/Line";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  THE SHAPE OF A RECORD — the rail and the sheet.
 *
 *  Two bands, and the split is the one that makes the header legible:
 *
 *      RAIL   a control bar, LIGHT by default (`canvas`, a hairline below). What
 *             is NOT about this record but about my position in front of it:
 *             where I am, which of eighty I am on, what I can do to it, what
 *             state it is in.
 *      SHEET  white. The record: its name, what describes it, what hangs off
 *             it, and its faces.
 *
 *  One dark band per screen, and it is the application bar (docs/PRINCIPLES.md
 *  §1): a dark rail under a dark bar reads as two headers and the record loses
 *  its top. `Record.Rail surface="chrome"` stays as an explicit option for a
 *  record that owns the screen's only dark band (a dialog, an embedded panel
 *  with no application bar) — it sets a `SurfaceProvider`, so everything on the
 *  rail (buttons, breadcrumb, status bar, pager) follows without being told.
 *
 *      ┌─ rail (canvas) ───────────────────────────────────────────┐
 *      │ Facturas › FAC/2026/0118 › …               12 / 80  ‹  ›  │
 *      │ [Registrar pago][Enviar][⋯]   borrador▸publicada▸pagada   │
 *      ├─ sheet (white) ───────────────────────────────────────────┤
 *      │ FACTURA DE CLIENTE             [1 pago] [2 entregas]      │
 *      │ FAC/2026/0118                 [vencida]                   │
 *      │ Ferretería Sur · NIT 1023456027 · Bs 12.480,00            │
 *      │ líneas │ otra información │ pagos │ entregas ²            │
 *      └───────────────────────────────────────────────────────────┘
 *
 *  The smart buttons go in the SHEET and next to the title, not in the rail:
 *  they belong to the record —what hangs off THIS— and not to my position in
 *  front of it. In the rail they also fattened the band, because a two-line box
 *  next to one-line controls imposes its height on the whole row.
 * ==================================================================== */

/* It comes from `system/types.ts`: it was defined here AND in `button/`, both
   copies saying the same thing — the day a third surface appeared, one would
   get updated and the other would not, and nothing would catch it. */
export type { Surface };

export function RecordHeader({
  crumbs,
  pager,
  actions,
  status,
  kicker,
  icon: Icon,
  title,
  subtitle,
  tag,
  figure,
  railSurface = "canvas",
  smart,
  aspects,
  dirty,
  activity,
  activityLayout = "auto",
  width = "reading",
  ribbon,
  blocking,
  indicator,
  paper: onPaper,
  dock,
  look,
  children,
}: {
  crumbs?: readonly Crumb[];
  pager?: ReactNode;
  /** The action buttons. At most three visible + a `Menu` with `iconOnly`, and
   *  the rule for choosing which three: the ones that PRODUCE something new,
   *  never the navigation ones. They take the rail's surface from context: write
   *  them without `surface`, light by default, dark on `Record.Rail surface="chrome"`. */
  actions?: ReactNode;
  /** Everything around the record: its notices, conversation and history — an
   *  `Activity`. Never inside the sheet: it is about the record, not part of the form. */
  activity?: ReactNode;
  /**
   * Where the activity goes, as the record's width allows (THE PAGE, below).
   *
   *     auto    a column at the RIGHT of the sheet, joined to it, when the page is
   *             `--container-beside` wide, and a card BELOW the sheet when it is not.
   *             **The default.**
   *     below   always below the sheet, at its width.
   *
   * It is said by the RECORD and not guessed from the child: the flex direction is set by
   * this container, and a parent that inspects what it was handed to decide how to lay
   * itself out breaks the next time someone wraps the panel in something else.
   */
  activityLayout?: "auto" | "below";
  /** How wide the page column gets. `reading` (the default) stops the sheet at
   *  `--container-sheet`, centred, and lines the rail up with it; `full` takes the whole page
   *  — a record whose body is a wide table. */
  width?: "reading" | "full";
  /** The band across the paper's corner (`RecordRibbon`): what the record IS now. */
  ribbon?: ReactNode;
  /** `StatusBar` (where is it at?), the activity's `Timeline` (what happened to get
   *  here?), or both: they are different questions and many records only have one. */
  status?: ReactNode;
  /** The category, small and above the name: «factura de cliente». It makes a
   *  name like `NF-02/2026/00137` mean something without deducing it from the
   *  format. */
  kicker?: string;
  icon?: LucideIcon;
  title: ReactNode;
  /** The metadata that only DESCRIBES. In mono: the machine wrote it. */
  subtitle?: ReactNode;
  tag?: { label: string; tone?: Tone };
  /** The record's key figure, as large as the title, on the right. See `RecordIdentity`. */
  figure?: { label: string; value: ReactNode };
  /** The rail's band. `canvas` (the default) is a light control bar with a hairline below;
   *  `chrome` is the dark band, an explicit choice for a record that owns the screen's
   *  only dark band (no dark application bar above it). */
  railSurface?: Surface;
  /** The counters that TAKE you somewhere else. They go in the sheet and next
   *  to the title — they belong to the record, not to my position in front of
   *  it. */
  smart?: ReactNode;
  aspects?: ReactNode;
  /** There are unsaved changes. Its presence REPLACES the action buttons with
   *  save/discard, and it is not an aesthetic decision: running «Registrar pago» on
   *  an edited and unsaved invoice runs with the old values, and whoever pressed
   *  it has no way to know. As long as there are changes, the only thing that
   *  can be done is confirm them or throw them away. */
  dirty?: DirtyState;
  /** What is WRONG with the record — `RecordBlocking`. Always visible, outside the sheet:
   *  between the rail and the paper, never among the fields (see `RecordNotices`). */
  blocking?: ReactNode;
  /** The rest of the record's notices, as one indicator — `RecordNoticeIndicator`. In the
   *  rail next to the counters; without a rail, first in the record, next to them. */
  indicator?: ReactNode;
  /** Whether the record sits on paper — a fact of WHERE it is mounted (`Record`'s
   *  `placement`). Only in comfortable: compact (the peek) is always one surface. Omitted, it
   *  is guessed from the rail: crumbs, pager or actions mean a page. */
  paper?: boolean;
  /**
   * The record's actions FLOATING (`ActionDock`): in place of `actions` and of
   * Save / Discard on the rail, one pill that, at the top, sits over the paper and stays in
   * view as the record scrolls; at the bottom, the settings bar's place. The rail keeps where
   * I am, which of eighty, and the state.
   */
  dock?: RecordDockProps;
  /** How the record is drawn — `traditional` or `modern`. Absent, the
   *  `ViewStyleProvider`'s. See `style.tsx`. */
  look?: ViewStyle;
  /** The record body. It sits IN the paper with the title, so groups, tabs
   *  and the page are one white sheet on the ground — Odoo's `<sheet>`. */
  children?: ReactNode;
}) {
  const d = useDensity();
  /* The «settings» and «sections» form styles (`FormStyleProvider`): Save and Discard float
     at the bottom (`DirtyBar`) instead of taking the rail and the thumb bar, and the record has
     no white sheet of its own — its sections are the cards, on the ground. */
  const floating = useFormStyle() !== "dense";
  /* «Guardado» is said where Save was; a record whose rail exists only while it has changes
     keeps it for that moment, or the answer would leave with the question. */
  const saved = useJustSaved(dirty);
  /* THE STYLE decides where the dock's actions go when the dock does not say: the rail's
     buttons in `traditional`, the floating pill at the bottom in `modern`. The same `DockAction`s
     draw both. Floating, the pill holds the actions AND Save / Discard: the rail keeps the
     rest. */
  const modern = useViewStyle(look) === "modern";
  const dockWhere =
    dock === undefined ? undefined : (dock.placement ?? (modern ? "bottom" : "rail"));
  const docked = dockWhere === "top" || dockWhere === "bottom";
  const railDirty = floating || docked ? undefined : dirty;
  const railActions_ = docked ? undefined : dock !== undefined ? (
    <ActionDock {...dock} look="bare" placement="inline" />
  ) : (
    actions
  );
  /* Save is gone the moment it has saved, and the focus that was on it fell to the page —
     a keyboard was left at the top of the document. It comes back to the record's name:
     where reading the record starts, and announced together with «Guardado». */
  const nameRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!saved) return;
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (lost) nameRef.current?.focus({ preventScroll: true });
  }, [saved]);
  const hasRail =
    (saved && !floating && !docked) ||
    crumbs !== undefined ||
    pager !== undefined ||
    railActions_ !== undefined ||
    status !== undefined ||
    railDirty !== undefined;

  /* In compact the rail goes away ENTIRELY, and it is not for room: in a
     preview, the breadcrumbs and the pager belong to the surface that opened it
     —the list behind is still there— and the actions are already in the
     drawer's header. A rail inside another rail is two bars saying where I am.

     The state does survive: it moves to the sheet, below the title. It is the
     only thing in the rail that belongs to the RECORD and not to my position in
     front of it. */
  const withRail = hasRail && d === "comfortable";

  /* The activity column at the RIGHT of the sheet when the page is wide (THE PAGE). */
  const beside = activity !== undefined && activityLayout === "auto";
  /* The thumb bar's content (see THE THUMB BAR in `ThumbBar`): dirty first, else the primary. */
  const {
    rail: railActions,
    primaries,
    mode: thumb,
  } = thumbPlan({ withRail, actions: railActions_, dirty: railDirty });

  /* In compact the TITLE is not drawn either, for the same reason as in
     `Listing`: the surface header already says it. Drawing it here showed it
     twice in the same 480 px drawer — and the name of a customer in this product
     reaches 50 characters, so the repetition eats two whole lines.

     What does NOT go away: the `tag`, the state, the counters and the aspects.
     They are what the drawer header does not say and the only way to see what
     hangs off it without pinning the panel. */
  const withIdentity = d === "comfortable";
  /* The paper is Odoo's `<sheet>`: white on the ground, hairline, not a
     shadow. It exists on the PAGE, where the chrome rail is a real band
     (crumbs, pager, actions). A drawer is compact so `withRail` is already
     false. A dialog is comfortable but has no crumbs or actions — and it IS
     already a card. Status alone is not a page.

     And `dirty` does not decide it. Whether the record sits on paper is a fact of WHERE it
     is mounted, and that does not change while someone types; `dirty` does, with the first
     letter. Deciding by it swapped the whole tree under the paper at that letter — the field
     being written was unmounted and lost the focus. Save and Discard still appear: in the
     rail, which is a sibling and moves nothing.

     Crumbs, pager and actions are only the GUESS for when the mount is not said: they can
     arrive late (loaded, allowed) and the guess flips with them. `paper`, when given, is the
     answer — the rail's contents no longer decide it. */
  const paper =
    onPaper === undefined
      ? withRail &&
        (crumbs !== undefined ||
          pager !== undefined ||
          actions !== undefined ||
          dock !== undefined)
      : onPaper && d === "comfortable";

  /* ONE column for the rail and the page: the rail used to span the screen while the sheet
     stopped at 72rem, so on a wide desk the buttons sat 250 px left of the paper they act on
     and the record read as two things. */
  const column =
    width === "full"
      ? ""
      : beside
        ? "mx-auto w-full max-w-(--container-record)"
        : "mx-auto w-full max-w-(--container-sheet)";

  /* THE DOCK AT THE TOP. At rest it is the RAIL's: in its second row, where the actions were,
     with the state at the other end — a band of its own between the rail and the paper was a
     fourth band before the record, and read as empty space. When the rail scrolls away, the pill
     FLOATS: it detaches and stays at the top of the page, under whatever already sticks.
     Floating it is one more layer of the sticky stack —a table header sticks under it, not
     behind it— over a veil of the ground, so what scrolls passes under the pill instead of
     peeking between it and the header. Without a rail (a dialog, compact) it floats from the
     start, in the flow. */
  const dockTop = dockWhere === "top";
  const inRail = dockTop && withRail;
  const anchor = useRef<HTMLDivElement>(null);
  const [detached, setDetached] = useState(false);
  useEffect(() => {
    const node = anchor.current;
    if (!inRail || node === null || typeof IntersectionObserver === "undefined") {
      setDetached(false);
      return;
    }
    /* Detached once the rail's pill is wholly ABOVE the view — not below it, at the bottom of a
       short window, where it is about to be scrolled to. */
    const observer = new IntersectionObserver(([entry]) => {
      if (entry === undefined) return;
      const top = entry.rootBounds?.top ?? 0;
      setDetached(!entry.isIntersecting && entry.boundingClientRect.bottom <= top);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [inRail]);
  const floats = dockTop && (!inRail || detached);
  const dockLayer = useStickyLayer<HTMLDivElement>();
  const justify = dock?.align === "end" ? "justify-end" : "justify-center";
  const dockPill =
    dock === undefined ? null : (
      <ActionDock
        {...dock}
        {...(dirty === undefined ? {} : { dirty })}
        saved={saved}
        placement="inline"
      />
    );
  const topDock = !dockTop ? null : inRail ? (
    /* Takes no room: it only holds the pill while the rail's is out of sight. */
    <div
      style={stickyTop}
      className={`pointer-events-none sticky z-20 h-0 ${paper ? column : ""}`}
    >
      <div
        ref={dockLayer.ref}
        className={`absolute inset-x-0 top-0 flex ${justify} pt-2 pb-3 ${
          detached
            ? "bg-linear-to-b from-ground from-75% to-transparent transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) starting:-translate-y-1 starting:opacity-0"
            : ""
        }`}
      >
        {detached ? dockPill : null}
      </div>
    </div>
  ) : (
    <div
      ref={dockLayer.ref}
      style={dockLayer.self}
      className={`pointer-events-none sticky z-20 -mt-1 flex bg-linear-to-b from-ground from-75% to-transparent pb-3 ${paper ? column : ""} ${justify}`}
    >
      {dockPill}
    </div>
  );

  const identity = (
    <div
      className={`flex flex-col ${byDensity(d, "gap-2.5 px-4 pt-3.5", "gap-2 px-0 pt-0")}`}
    >
      {/* The counters live in the RAIL. Here they only show up when the rail
            is not there —in a drawer, in a dialog— and then they go FIRST: the
            first thing to be read has to be what that surface's header does NOT
            say, and the title already said it. */}
      {withRail || (smart === undefined && indicator === undefined) ? null : (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {smart}
          {indicator}
        </div>
      )}

      {/* It wraps: when the name and the figure do not fit side by side (a phone),
          the figure goes below. Without wrapping, the figure kept its width and the
          name — the entry point of the screen — was cut to «FAC…». */}
      <div className="flex min-w-0 flex-wrap items-start gap-x-5 gap-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon === undefined || d === "compact" ? null : (
            <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-box bg-ink/5 text-muted">
              <Icon className="size-(--size-icon-lg)" strokeWidth={1.75} />
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            {kicker === undefined || !withIdentity ? null : (
              <span className="text-micro font-medium text-muted">{kicker}</span>
            )}
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {!withIdentity ? null : (
                /* `display`, not `title`: the record's name is the entry point of the
                   screen. At the title size (19 px over a 13 px body, 1.46:1) nothing on
                   the sheet stood out and the eye had nowhere to start. */
                <h1
                  ref={nameRef}
                  tabIndex={-1}
                  className="min-w-0 truncate text-display font-semibold text-ink outline-0"
                >
                  {title}
                </h1>
              )}
              {tag === undefined ? null : <Tag tone={tag.tone}>{tag.label}</Tag>}
            </div>
            {subtitle === undefined || !withIdentity ? null : (
              <p className="mt-0.5 truncate text-lead text-ink">{subtitle}</p>
            )}
          </div>
        </div>
        {figure === undefined || !withIdentity ? null : (
          <div className="ml-auto flex shrink-0 flex-col items-end">
            <span className="text-micro font-medium text-muted">{figure.label}</span>
            <span className="text-display font-semibold tabular-nums text-ink">
              {figure.value}
            </span>
          </div>
        )}
      </div>

      {/* The state, when the rail is not there: it belongs to the record and
            it has to keep being visible. */}
      {withRail || status === undefined ? null : (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{status}</div>
      )}

      {aspects === undefined ? null : (
        /* The line is the sheet's mouth. In comfortable it walks to the
             edges; the current tab sits on it and opens into the page below. */
        <div className={`border-b border-line-strong ${byDensity(d, "-mx-4 px-4", "")}`}>
          {aspects}
        </div>
      )}
    </div>
  );

  return (
    <>
      {withRail ? (
        <SurfaceProvider value={railSurface}>
          {/* The record's width, measured for the rail: below `handheld` its primary
              and its dirty actions move to the thumb bar. Named, so nothing inside the
              rail that asks an unnamed `@container` finds this one. */}
          <div className="@container/record">
            <div
              className={
                modern
                  ? /* Modern: the rail is the page's heading on the ground, not a white strip. */
                    "bg-ground px-3 pt-4 pb-1"
                  : `px-3 py-2.5 ${
                      railSurface === "chrome"
                        ? "bg-chrome"
                        : "border-b border-line bg-surface"
                    }`
              }
            >
              <div className={`flex flex-col gap-2 ${paper ? column : ""}`}>
                {modern ? (
                  <>
                    {/* THE MODERN RAIL — two lines, by weight. Row 1: WHERE I AM, the trail at the
                    title's size, and which of eighty. Row 2, a step down: what hangs off the
                    record and where it is at — the counters and the state as steps —, and the
                    pill when it rests here. The actions float (`Record.Dock`). */}
                    <Line
                      start={
                        crumbs === undefined || crumbs.length === 0 ? null : (
                          <Breadcrumb crumbs={crumbs} surface={railSurface} size="lg" />
                        )
                      }
                      end={pager}
                    />
                    {smart === undefined &&
                    indicator === undefined &&
                    status === undefined &&
                    !inRail &&
                    railActions_ === undefined &&
                    railDirty === undefined ? null : (
                      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                        {railDirty !== undefined ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <DirtyActions {...railDirty} />
                          </div>
                        ) : railActions_ === undefined ? null : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {railActions_}
                            <SavedMark saved={saved} />
                          </div>
                        )}
                        {smart === undefined && indicator === undefined ? null : (
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {smart}
                            {indicator}
                          </div>
                        )}
                        {inRail ? (
                          <div
                            ref={anchor}
                            className={`flex flex-1 items-center ${dock?.align === "end" ? "justify-end" : "justify-center"}`}
                            {...(detached ? { inert: true, "aria-hidden": true } : {})}
                          >
                            {dockPill}
                          </div>
                        ) : null}
                        {status === undefined ? null : (
                          <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
                            {status}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Row 1 — WHERE I AM: where I come from, what hangs off this, and
              which of eighty I am on. The counters go in the center because they
              are the bridge between the two: they hang off the record but they
              take you somewhere else.

              And the centre is centred against the LINE, not against what is left: the
              two sides ask for `--container-trail` and grow evenly, so a
              fifty-character name on the left no longer pushes the
              counters against the edge. What does not fit in its half is clipped
              inside its half; what does not fit in the line drops to the next
              row. See `primitives/block/Line.tsx`. */}
                    <Line
                      start={
                        crumbs === undefined || crumbs.length === 0 ? null : (
                          <Breadcrumb crumbs={crumbs} surface={railSurface} />
                        )
                      }
                      center={
                        /* The notices' indicator rides with the counters: both are about the
                     record and both open something; neither is my position in front of
                     it. The line wraps on a phone, so it is never pushed out of reach. */
                        smart === undefined && indicator === undefined ? undefined : (
                          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
                            {smart}
                            {indicator}
                          </div>
                        )
                      }
                      /* With the dock in the rail the pager goes down to its second row, beside
                     the state: row 2 has room on the right, and row 1 —crumbs and seven
                     counters— pushed it to a line of its own. */
                      end={inRail ? undefined : pager}
                    />

                    {!inRail &&
                    railActions_ === undefined &&
                    status === undefined &&
                    railDirty === undefined &&
                    (!saved || floating || docked) ? null : (
                      /* Row 2 — WHAT I CAN DO and WHERE IT IS AT: actions stuck to the
               left edge, the history and the state stuck to the right one. No
               `flex-wrap`: wrapping split the row in two and the state ended up
               below the actions, which is another hierarchy. */
                      <div
                        className={`flex min-w-0 gap-x-4 ${inRail ? "items-center" : "items-start"}`}
                      >
                        {/* The dock sits in the MIDDLE of the row, over the record it acts on —
                        the place it read best in —, the state at the end: a spacer as wide as
                        the state's half keeps the pill centred against the row. */}
                        {inRail && dock?.align !== "end" ? (
                          <div aria-hidden className="min-w-0 flex-1 basis-0" />
                        ) : null}
                        {/* The actions are NEVER clipped: they are the only thing in this
                  row that produces something, and a button cut in half is a
                  button that does not get pressed. What gives way is the state. */}
                        {inRail ? (
                          /* The dock at rest. While it floats this copy is out of sight, and out
                         of reach too — one toolbar at a time for a keyboard and a reader. */
                          <div
                            ref={anchor}
                            className={`flex shrink-0 items-center ${dock?.align === "end" ? "ml-auto" : ""}`}
                            {...(detached ? { inert: true, "aria-hidden": true } : {})}
                          >
                            {dockPill}
                          </div>
                        ) : railDirty !== undefined ? (
                          <div className="flex shrink-0 items-center gap-1.5 @max-handheld/record:hidden">
                            <DirtyActions {...railDirty} />
                          </div>
                        ) : railActions_ === undefined ? (
                          floating || docked ? null : (
                            <SavedMark saved={saved} />
                          )
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {primaries.length === 0
                              ? railActions_
                              : railActions.map((node) =>
                                  isPrimary(node) ? (
                                    <span
                                      key={node.key}
                                      data-thumb-moves=""
                                      className="contents @max-handheld/record:hidden"
                                    >
                                      {node}
                                    </span>
                                  ) : (
                                    node
                                  ),
                                )}
                            {/* After the actions, not before: the primary stays where the hand
                            left it, and «Guardado» is read as the answer to it. */}
                            {floating ? null : <SavedMark saved={saved} />}
                          </div>
                        )}
                        {status === undefined && !(inRail && pager !== undefined) ? (
                          inRail && dock?.align !== "end" ? (
                            <div aria-hidden className="min-w-0 flex-1 basis-0" />
                          ) : null
                        ) : (
                          <div
                            /* Centred, the state's side never shrinks below what it holds: a
                           pill grown by «Guardado» pushes the spacer, not over the state. */
                            className={`flex items-center justify-end gap-x-3 ${
                              inRail && dock?.align !== "end"
                                ? "flex-1 basis-0"
                                : "ml-auto min-w-0"
                            }`}
                          >
                            {status === undefined ? null : (
                              <div className="flex min-w-0 flex-col items-end gap-1.5">
                                {status}
                              </div>
                            )}
                            {inRail ? pager : null}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </SurfaceProvider>
      ) : null}

      {paper ? (
        /* ==================================================================== *
         *  THE PAGE — [sheet | Actividad], on the ground.
         *
         *  Two columns, joined, placed together and centred: the sheet
         *  (≤ --container-sheet, 72rem) and, at its RIGHT, the record's ACTIVITY
         *  (--container-activity, 22rem) — no strip of ground between them, so the page
         *  reads left to right as one paper: the record, then what it has. The pair is at
         *  most --container-record (94rem) wide; on a 1680 px desk both fit whole.
         *
         *  A note of a field or a row is not drawn in the column: its mark (`Flag`) stays
         *  by its label or at its row — WHERE — and the activity lists it with the record's
         *  notices above the timeline — WHAT —, taking you to it on press. Cards aligned in
         *  the column were tried and dropped: they and the history fought for one column,
         *  and the history is what everybody reads.
         *
         *  As the page narrows: below --container-beside (76rem) the activity goes BELOW
         *  the sheet as a card at the sheet's width.
         *
         *  Folded, the column is a slim strip with its counts; the pair re-centres and the
         *  sheet keeps its width. A container query, not the window: with four panels open
         *  each is 380 px on a 1,600 screen.
         *
         *  The sheet clips with `overflow-clip`, not `overflow-hidden`: hidden would make it
         *  a scroll container and the line table header would stick inside it, not under
         *  the application bar.
         * ==================================================================== */
        <div className="bg-ground px-3 pt-3 pb-3">
          {topDock}
          <div className="@container/page" {...(floats ? { style: dockLayer.below } : {})}>
            <div
              className={`flex min-w-0 flex-col gap-3 ${column} ${
                beside
                  ? `@beside/page:flex-row @beside/page:items-stretch @beside/page:justify-center ${
                      floating ? "@beside/page:gap-4" : "@beside/page:gap-0"
                    }`
                  : ""
              }`}
            >
              <div
                className={`flex min-w-0 flex-1 flex-col gap-3 ${
                  beside && width === "reading"
                    ? "mx-auto w-full max-w-(--container-sheet) @beside/page:mx-0"
                    : ""
                }`}
              >
                {/* What is wrong sits OUTSIDE the sheet, between the rail and the
                    paper, at the paper's width: always seen, never read as a field. */}
                {blocking}
                <div
                  className={`relative flex min-w-0 flex-col overflow-clip ${
                    floating ? "" : "rounded-box border border-line bg-surface"
                  } ${beside && !floating ? "@beside/page:rounded-r-none" : ""}`}
                >
                  {ribbon}
                  {identity}
                  {children}
                </div>
                {activity !== undefined && activityLayout === "below" ? activity : null}
              </div>
              {beside ? (
                /* After the sheet: the record first, what is around it second — in the
                   reading order and on screen. */
                <div className="mx-auto w-full max-w-(--container-sheet) min-w-0 @beside/page:mx-0 @beside/page:flex @beside/page:w-auto @beside/page:max-w-none @beside/page:shrink-0">
                  {activity}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        /* No paper (a modal, a drawer): one surface, no ground beside
           it — the band first, the record, and the activity below. */
        <div className="relative flex min-w-0 flex-1 flex-col overflow-clip bg-surface">
          {topDock}
          {ribbon}
          {blocking === undefined ? null : (
            <div className={byDensity(d, "px-4 pt-3.5", "pb-2")}>{blocking}</div>
          )}
          {identity}
          {children}
          {activity === undefined ? null : (
            <div className={byDensity(d, "px-4 pb-4", "pb-2")}>{activity}</div>
          )}
        </div>
      )}

      {thumb === null ? null : (
        <ThumbBar mode={thumb} dirty={railDirty} primaries={primaries} />
      )}
      {floating && !docked ? <DirtyBar dirty={dirty} saved={saved} /> : null}
      {dock === undefined || dockWhere !== "bottom" ? null : (
        <ActionDock
          {...dock}
          {...(dirty === undefined ? {} : { dirty })}
          saved={saved}
          placement="bottom"
        />
      )}
    </>
  );
}
