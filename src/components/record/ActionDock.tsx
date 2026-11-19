"use client";

import {
  DirtyActions,
  type DirtyState,
  SavedMark,
} from "@sincpro/web-ui/components/record/DirtyActions";
import {
  type DockAction,
  dockOption,
  dockPlan,
  moreGroups,
} from "@sincpro/web-ui/components/record/dock";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { stickyTop } from "@sincpro/web-ui/foundations/sticky";
import { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { MoreHorizontal } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/* ==================================================================== *
 *  THE ACTION DOCK — the record's actions, floating. (experimental)
 *
 *  Context: the «settings» form style floats Save and Discard in a dark pill at the bottom,
 *  and it read as an identity of its own. This tries the same pill for ALL of a record's
 *  actions: at rest it sits over the paper, and as the record scrolls it stays in view —
 *  the rail, with the actions on it, scrolled away with the first swipe.
 *
 *      ┌──────────────── ground ─────────────────┐
 *      │      ( Enviar  Imprimir ▾  ⋯  [Registrar pago] )      ← the dock
 *      │ ┌─ paper ─────────────────────────────┐ │
 *      │ │ FAC/2026/0115                         │
 *
 *  What it holds is DECIDED from the actions (see `dockPlan`): the primary, gold and last;
 *  `visible` secondary ones; the rest in «Más ⋯», sub-actions as submenus, the destructive
 *  ones apart. While there are changes it holds «N cambios · Descartar · Guardar» instead —
 *  the same precedence as the rail: with unsaved changes the only thing to do is keep or
 *  drop them —, and «Guardado» for a moment after.
 *
 *  ── Its shape ─────────────────────────────────────────────────────────
 *
 *  The settings bar's: a pill holding pills (`--ui-button-radius` is the pill's), the dark
 *  band (`chrome`) with its hairline, the floating shadow. `look="canvas"` tries it light, a
 *  card on the page. The secondary actions are quiet (`ghost`): in a pill, three bordered
 *  boxes beside the gold one are four things shouting.
 * ==================================================================== */

/** Where the dock floats. `top` and `bottom` stick to that edge of what scrolls; `inline`
 *  draws only the pill — its host places it (`Record.Dock` does). */
export type DockPlacement = "top" | "bottom" | "inline";

/** The pill's band: the dark one (the settings bar's), a light card — or `bare`: no pill at
 *  all, the actions as the rail's buttons (the record's `classic` style draws them so). */
export type DockLook = "chrome" | "canvas" | "bare";

export interface ActionDockProps {
  actions: readonly DockAction[];
  /** How many secondary actions are seen beside the primary; the rest wait in «Más». */
  visible?: number;
  /** Unsaved changes: the dock holds Discard and Save instead of the actions. */
  dirty?: DirtyState;
  /** It has just saved: «Guardado» for a moment (`useJustSaved`). */
  saved?: boolean;
  placement?: DockPlacement;
  /** Centred over what it acts on, or at its end. */
  align?: "center" | "end";
  look?: DockLook;
  /** The toolbar's accessible name: «Acciones de la factura». */
  label?: string;
  /** What the pill says before its actions — «3 elegidas ✕» over a list's chosen rows. Drawn
   *  on the pill's band: write it with `useSurface()` colours. */
  lead?: ReactNode;
}

const PILL = { "--ui-button-radius": "var(--radius-pill)" } as CSSProperties;

/** Where a record's actions go: as the rail's buttons, or floating — resting in the rail and
 *  detaching on scroll (`top`), or at the bottom of the screen (`bottom`). Absent, the record's
 *  style decides: `classic` → `rail`, `clean` → `bottom`. */
export type RecordDockPlacement = "rail" | "top" | "bottom";

/** What `Record.Dock` takes: the dock's, with the record's placements. */
export type RecordDockProps = Omit<ActionDockProps, "dirty" | "saved" | "placement"> & {
  placement?: RecordDockPlacement;
};

/** The same actions with no pill: the rail's buttons — the primary first and gold, the
 *  secondary ones bordered, «⋯» with the rest. What the `classic` style draws. */
function Bare({
  actions,
  visible,
  dirty,
  saved,
  label,
}: Required<Pick<ActionDockProps, "actions" | "visible">> &
  Pick<ActionDockProps, "dirty" | "saved" | "label">) {
  const copy = useUiCopy();
  const surface = useSurface();
  const plan = dockPlan(actions, visible);
  const more = moreGroups(plan);
  if (dirty !== undefined) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <DirtyActions {...dirty} />
      </div>
    );
  }
  return (
    <div
      role="toolbar"
      aria-label={label ?? copy.dock.label}
      data-ui="dock.bare"
      className="flex shrink-0 items-center gap-1.5"
    >
      {plan.primary === undefined ? null : (
        <Button
          role="primary"
          size="sm"
          surface={surface}
          {...(plan.primary.icon === undefined ? {} : { icon: plan.primary.icon })}
          {...(plan.primary.disabled === undefined
            ? {}
            : { disabled: plan.primary.disabled })}
          {...(plan.primary.onSelect === undefined ? {} : { onClick: plan.primary.onSelect })}
        >
          {plan.primary.label}
        </Button>
      )}
      {plan.shown.map((action) =>
        action.items === undefined ? (
          <Button
            key={action.id}
            role="secondary"
            size="sm"
            surface={surface}
            {...(action.icon === undefined ? {} : { icon: action.icon })}
            {...(action.disabled === undefined ? {} : { disabled: action.disabled })}
            {...(action.onSelect === undefined ? {} : { onClick: action.onSelect })}
          >
            {action.label}
          </Button>
        ) : (
          <Menu
            key={action.id}
            role="secondary"
            size="sm"
            surface={surface === "chrome" ? "chrome" : "canvas"}
            label={action.label}
            {...(action.icon === undefined ? {} : { icon: action.icon })}
            groups={[{ options: action.items.map(dockOption) }]}
          />
        ),
      )}
      {more.length === 0 ? null : (
        <Menu
          label={copy.dock.more}
          icon={MoreHorizontal}
          iconOnly
          chevron={false}
          size="sm"
          surface={surface === "chrome" ? "chrome" : "canvas"}
          groups={more}
        />
      )}
      <SavedMark saved={saved === true} />
    </div>
  );
}

/** The pill alone: the actions, or Save and Discard. */
function Pill({
  actions,
  visible,
  dirty,
  saved,
  look,
  label,
  lead,
}: Required<Pick<ActionDockProps, "actions" | "visible">> & {
  look: "chrome" | "canvas";
} & Pick<ActionDockProps, "dirty" | "saved" | "label" | "lead">) {
  const copy = useUiCopy();
  const plan = dockPlan(actions, visible);
  const more = moreGroups(plan);
  return (
    <SurfaceProvider value={look}>
      <div
        role="toolbar"
        aria-label={label ?? copy.dock.label}
        data-ui="dock.pill"
        style={PILL}
        className={`pointer-events-auto flex max-w-full min-w-0 items-center gap-1 rounded-pill p-1.5 shadow-float *:shrink-0 ${
          look === "chrome"
            ? "border border-chrome-edge bg-chrome"
            : "border border-line bg-surface"
        }`}
      >
        {dirty !== undefined ? (
          <DirtyActions {...dirty} floating />
        ) : (
          <>
            {lead}
            {plan.shown.map((action) =>
              action.items === undefined ? (
                <Button
                  key={action.id}
                  role="ghost"
                  surface={look}
                  {...(action.icon === undefined ? {} : { icon: action.icon })}
                  {...(action.disabled === undefined ? {} : { disabled: action.disabled })}
                  {...(action.onSelect === undefined ? {} : { onClick: action.onSelect })}
                >
                  {action.label}
                </Button>
              ) : (
                <Menu
                  key={action.id}
                  role="ghost"
                  surface={look}
                  label={action.label}
                  {...(action.icon === undefined ? {} : { icon: action.icon })}
                  groups={[{ options: action.items.map(dockOption) }]}
                />
              ),
            )}
            {more.length === 0 ? null : (
              <Menu
                label={copy.dock.more}
                icon={MoreHorizontal}
                iconOnly
                chevron={false}
                variant="text"
                surface={look}
                align="end"
                groups={more}
              />
            )}
            {plan.primary === undefined ? null : (
              <Button
                role="primary"
                surface={look}
                {...(plan.primary.icon === undefined ? {} : { icon: plan.primary.icon })}
                {...(plan.primary.disabled === undefined
                  ? {}
                  : { disabled: plan.primary.disabled })}
                {...(plan.primary.onSelect === undefined
                  ? {}
                  : { onClick: plan.primary.onSelect })}
              >
                {plan.primary.label}
              </Button>
            )}
            <SavedMark saved={saved === true} />
          </>
        )}
      </div>
    </SurfaceProvider>
  );
}

export function ActionDock({
  actions,
  visible = 2,
  dirty,
  saved,
  placement = "top",
  align = "center",
  look = "chrome",
  label,
  lead,
}: ActionDockProps) {
  const pill =
    look === "bare" ? (
      <Bare
        actions={actions}
        visible={visible}
        {...(dirty === undefined ? {} : { dirty })}
        {...(saved === undefined ? {} : { saved })}
        {...(label === undefined ? {} : { label })}
      />
    ) : (
      <Pill
        actions={actions}
        visible={visible}
        look={look}
        {...(lead === undefined ? {} : { lead })}
        {...(dirty === undefined ? {} : { dirty })}
        {...(saved === undefined ? {} : { saved })}
        {...(label === undefined ? {} : { label })}
      />
    );
  if (placement === "inline") return pill;
  /* Sticky to the edge of what scrolls, as the settings bar: no padding to keep in sync with
     its height, and at the end of the page it settles in its place in the flow. Only the pill
     takes the pointer — the band around it lets the page be pressed through. */
  return (
    <div
      data-ui="dock"
      data-placement={placement}
      /* At the top it sticks UNDER whatever already sticks there (the application bar, a
         list bar — `--sticky-top`), not under the window's edge. */
      {...(placement === "top" ? { style: stickyTop } : {})}
      className={`pointer-events-none sticky z-20 flex px-3 ${
        placement === "top" ? "py-2" : "bottom-0 mt-auto pt-3 safe-bottom"
      } ${align === "end" ? "justify-end" : "justify-center"}`}
    >
      {pill}
    </div>
  );
}
