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
  dockShortcuts,
  moreGroups,
} from "@sincpro/web-ui/components/record/dock";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { keysLabel } from "@sincpro/web-ui/foundations/keys";
import {
  useKeyboardPlatform,
  useKeysHint,
  useShortcuts,
} from "@sincpro/web-ui/foundations/shortcut";
import { stickyTop } from "@sincpro/web-ui/foundations/sticky";
import { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button, type ButtonRole } from "@sincpro/web-ui/primitives/button/Button";
import { Menu } from "@sincpro/web-ui/primitives/menu/Menu";
import { MoreHorizontal } from "lucide-react";
import { createContext, type CSSProperties, type ReactNode, type Ref, use } from "react";

/* ==================================================================== *
 *  THE ACTION DOCK — the record's actions, floating: the modern style's.
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
 *  all, the actions as the rail's buttons (the record's `traditional` style draws them so). */
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

/** One action as a button, its shortcut in its title and in `aria-keyshortcuts`. */
function DockButton({
  action,
  role,
  size,
  surface,
}: {
  action: DockAction;
  role: ButtonRole;
  size?: "sm";
  surface: "canvas" | "chrome";
}) {
  const hint = useKeysHint(action.shortcut);
  return (
    <Button
      role={role}
      {...(size === undefined ? {} : { size })}
      surface={surface}
      {...(action.icon === undefined ? {} : { icon: action.icon })}
      {...(action.disabled === undefined ? {} : { disabled: action.disabled })}
      {...(action.onSelect === undefined ? {} : { onClick: action.onSelect })}
      {...(hint === undefined
        ? {}
        : { title: `${action.label} (${hint.label})`, "aria-keyshortcuts": hint.aria })}
    >
      {action.label}
    </Button>
  );
}

/** Where a record's actions go: as the rail's buttons, or floating — resting in the rail and
 *  detaching on scroll (`top`), or at the bottom of the screen (`bottom`). Absent, the record's
 *  style decides: `traditional` → `rail`, `modern` → `bottom`. */
export type RecordDockPlacement = "rail" | "top" | "bottom";

/** What `Record.Dock` takes: the dock's, with the record's placements. */
export type RecordDockProps = Omit<ActionDockProps, "dirty" | "saved" | "placement"> & {
  placement?: RecordDockPlacement;
};

/** The same actions with no pill: the rail's buttons — the primary first and gold, the
 *  secondary ones bordered, «⋯» with the rest. What the `traditional` style draws. */
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
  const platform = useKeyboardPlatform();
  const label_ = (keys: string) => keysLabel(keys, platform);
  const plan = dockPlan(actions, visible);
  const more = moreGroups(plan, label_);
  const tone = surface === "chrome" ? "chrome" : "canvas";
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
        <DockButton action={plan.primary} role="primary" size="sm" surface={tone} />
      )}
      {plan.shown.map((action) =>
        action.items === undefined ? (
          <DockButton
            key={action.id}
            action={action}
            role="secondary"
            size="sm"
            surface={tone}
          />
        ) : (
          <Menu
            key={action.id}
            role="secondary"
            size="sm"
            surface={surface === "chrome" ? "chrome" : "canvas"}
            label={action.label}
            {...(action.icon === undefined ? {} : { icon: action.icon })}
            groups={[{ options: action.items.map((one) => dockOption(one, label_)) }]}
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
  const platform = useKeyboardPlatform();
  const label_ = (keys: string) => keysLabel(keys, platform);
  const plan = dockPlan(actions, visible);
  const more = moreGroups(plan, label_);
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
                <DockButton key={action.id} action={action} role="ghost" surface={look} />
              ) : (
                <Menu
                  key={action.id}
                  role="ghost"
                  surface={look}
                  label={action.label}
                  {...(action.icon === undefined ? {} : { icon: action.icon })}
                  groups={[{ options: action.items.map((one) => dockOption(one, label_)) }]}
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
              <DockButton action={plan.primary} role="primary" surface={look} />
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
  /* The combinations run while the dock is on screen; while there are changes Save answers
     Mod+S itself. */
  useShortcuts(dockShortcuts(actions, dirty !== undefined));
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
  return (
    <DockBand placement={placement} align={align}>
      {pill}
    </DockBand>
  );
}

/**
 * The band a floating pill sits in. Sticky to the edge of what scrolls, as the settings bar: no
 * padding to keep in sync with its height, and at the end of the page it settles in its place in
 * the flow. Only the pill takes the pointer — the band around it lets the page be pressed through.
 * The dock draws its own; the record's place (`DockHost`) draws an empty one for a pill to come.
 */
export function DockBand({
  placement,
  align = "center",
  ref,
  children,
}: {
  placement: "top" | "bottom";
  align?: "center" | "end";
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}) {
  return (
    <div
      ref={ref}
      data-ui="dock"
      data-placement={placement}
      /* At the top it sticks UNDER whatever already sticks there (the application bar, a
         list bar — `--sticky-top`), not under the window's edge. */
      {...(placement === "top" ? { style: stickyTop } : {})}
      className={`pointer-events-none sticky z-20 flex px-3 ${
        placement === "top" ? "py-2" : "bottom-0 mt-auto pt-3 safe-bottom"
      } ${align === "end" ? "justify-end" : "justify-center"}`}
    >
      {children}
    </div>
  );
}

/* ==================================================================== *
 *  ONE PILL PER SCREEN — the record's floating place.
 *
 *  Context: a record in the modern style floats its actions at the bottom, and a collection
 *  inside it (an embedded `List`) floats what is done to its chosen rows at the bottom too:
 *  two pills in the same spot, one over the other, two «Enviar» and no way to tell whose.
 *  There is ONE place, and it is the record's: while rows of a collection are chosen their
 *  pill TAKES it — «2 elegidos ✕ · Enviar · Imprimir» where «Enviar · ⋯ · Registrar pago» was —
 *  and gives it back when the choice is cleared. With unsaved changes the record keeps it:
 *  Save / Discard is the only thing to do then, and the chosen rows' actions go to the
 *  collection's own bar.
 *
 *  The pill that takes the place is drawn by its owner, into the record's band (a portal):
 *  the record does not need to know what a collection does with its rows.
 * ==================================================================== */

export type DockHost = {
  /** The band the taking pill is drawn into; `null` until the record has drawn it. */
  target: HTMLElement | null;
  /** The record is saying Save / Discard: its place is not given away. */
  dirty: boolean;
  /** Takes the place; the returned function gives it back. */
  take: () => () => void;
};

export const DockHostContext = createContext<DockHost | null>(null);

/** The floating place of the record this is inside, if it has one. */
export function useDockHost(): DockHost | null {
  return use(DockHostContext);
}
