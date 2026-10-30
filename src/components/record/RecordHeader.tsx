"use client";

import { Breadcrumb, type Crumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import {
  DirtyActions,
  type DirtyState,
} from "@sincpro/web-ui/components/record/DirtyActions";
import { isPrimary, ThumbBar, thumbPlan } from "@sincpro/web-ui/components/record/ThumbBar";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { Line } from "@sincpro/web-ui/primitives/block/Line";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
  blocking,
  indicator,
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
  /** The record body. It sits IN the paper with the title, so groups, tabs
   *  and the page are one white sheet on the ground — Odoo's `<sheet>`. */
  children?: ReactNode;
}) {
  const d = useDensity();
  const hasRail =
    crumbs !== undefined ||
    pager !== undefined ||
    actions !== undefined ||
    status !== undefined ||
    dirty !== undefined;

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
  } = thumbPlan({ withRail, actions, dirty });

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
     already a card. Status alone is not a page. */
  const paper =
    withRail &&
    (crumbs !== undefined ||
      pager !== undefined ||
      actions !== undefined ||
      dirty !== undefined);

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
                <h1 className="min-w-0 truncate text-display font-semibold text-ink">
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
              className={`flex flex-col gap-2 px-3.5 py-2.5 ${
                railSurface === "chrome" ? "bg-chrome" : "border-b border-line bg-surface"
              }`}
            >
              {/* Row 1 — WHERE I AM: where I come from, what hangs off this, and
              which of eighty I am on. The counters go in the center because they
              are the bridge between the two: they hang off the record but they
              take you somewhere else.

              Y el centro se centra contra la LÍNEA, no contra lo que sobra: los
              dos lados piden `--container-trail` y crecen parejo, así que un
              nombre de cincuenta caracteres a la izquierda ya no empuja los
              contadores contra el borde. Lo que no entra en su mitad se recorta
              adentro de su mitad; lo que no entra en la línea baja al renglón
              siguiente. Ver `primitives/block/Line.tsx`. */}
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
                end={pager}
              />

              {actions === undefined && status === undefined && dirty === undefined ? null : (
                /* Row 2 — WHAT I CAN DO and WHERE IT IS AT: actions stuck to the
               left edge, the history and the state stuck to the right one. No
               `flex-wrap`: wrapping split the row in two and the state ended up
               below the actions, which is another hierarchy. */
                <div className="flex min-w-0 items-start gap-x-4">
                  {/* The actions are NEVER clipped: they are the only thing in this
                  row that produces something, and a button cut in half is a
                  button that does not get pressed. What gives way is the state. */}
                  {dirty !== undefined ? (
                    <div className="flex shrink-0 items-center gap-1.5 @max-handheld/record:hidden">
                      <DirtyActions {...dirty} />
                    </div>
                  ) : actions === undefined ? null : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {primaries.length === 0
                        ? actions
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
                    </div>
                  )}
                  {status === undefined ? null : (
                    <div className="ml-auto flex min-w-0 flex-col items-end gap-1.5">
                      {status}
                    </div>
                  )}
                </div>
              )}
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
          <div className="@container/page">
            <div
              className={`mx-auto flex min-w-0 flex-col gap-3 ${
                beside
                  ? "max-w-(--container-record) @beside/page:flex-row @beside/page:items-stretch @beside/page:justify-center @beside/page:gap-0"
                  : "max-w-(--container-sheet)"
              }`}
            >
              <div
                className={`flex min-w-0 flex-1 flex-col gap-3 ${
                  beside ? "mx-auto w-full max-w-(--container-sheet) @beside/page:mx-0" : ""
                }`}
              >
                {/* What is wrong sits OUTSIDE the sheet, between the rail and the
                    paper, at the paper's width: always seen, never read as a field. */}
                {blocking}
                <div
                  className={`flex min-w-0 flex-col overflow-clip rounded-box border border-line bg-surface ${
                    beside ? "@beside/page:rounded-r-none" : ""
                  }`}
                >
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
        /* No paper (a dialog, a drawer, a `Drill` context): one surface, no ground beside
           it — the band first, the record, and the activity below. */
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
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

      {thumb === null ? null : <ThumbBar mode={thumb} dirty={dirty} primaries={primaries} />}
    </>
  );
}
