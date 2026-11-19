import type { MenuGroup, MenuOption } from "@sincpro/web-ui/primitives/menu/Menu";
import type { LucideIcon } from "lucide-react";

/* ==================================================================== *
 *  THE DOCK'S PLAN — which actions are seen, and which wait in «Más».
 *
 *  Context: a record's actions were written as buttons, by hand, on every screen —
 *  «three at most and a `⋯`», a rule each screen applied its own way. As DATA the rule is
 *  applied once:
 *
 *      the primary        always seen, and LAST: the gold sits at the same end of the pill
 *                         whether it says «Registrar pago» or «Guardar»
 *      the next `visible` seen, in the order written; one with sub-actions is a menu
 *                         button — «Imprimir ▾»
 *      the rest           in «Más ⋯», sub-actions as submenus — «Imprimir ▸ Factura»
 *      the destructive    never beside the primary: last in «Más», apart
 *      `tucked`           in «Más» even with room — what is rarely done
 *
 *  A «Más» that would hold ONE action is not drawn: that action is drawn instead. A menu
 *  of one is a click to find what could have been seen.
 * ==================================================================== */

/** One action of a dock. */
export interface DockAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** THE action the screen exists for: gold, always seen. One per dock — a second one is
   *  read as a secondary. */
  primary?: boolean;
  /** It destroys or undoes: drawn last in «Más», apart, never beside the primary. */
  danger?: boolean;
  /** In «Más» even with room: what is rarely done. */
  tucked?: boolean;
  onSelect?: () => void;
  /** Sub-actions: «Imprimir ▸ Factura · Remito». Seen, the action is a menu button; in
   *  «Más», a submenu. Its own `onSelect` is not run — a row that opens does not also do. */
  items?: readonly DockAction[];
  /** The keys that run it, as people read them — «Ctrl+P». A hint in the menu. */
  shortcut?: string;
  /** The line under it, in the menu. */
  hint?: string;
  disabled?: boolean;
}

export interface DockPlan {
  primary: DockAction | undefined;
  /** The secondary actions seen, in order. */
  shown: DockAction[];
  /** «Más»: the rest, and the destructive ones apart. */
  more: DockAction[];
  danger: DockAction[];
}

/**
 * What a dock shows for these actions, with room for `visible` secondary ones.
 *
 *      in   [Registrar pago*, Enviar, Imprimir▸, Duplicar, Anular!], visible 2
 *      out  shown [Enviar, Imprimir]  more [Duplicar]  danger [Anular]  primary Registrar pago
 */
export function dockPlan(actions: readonly DockAction[], visible = 2): DockPlan {
  const primary = actions.find((one) => one.primary === true);
  const rest = actions.filter((one) => one !== primary);
  const danger = rest.filter((one) => one.danger === true);
  const candidates = rest.filter((one) => one.danger !== true && one.tucked !== true);
  const shown = candidates.slice(0, Math.max(0, visible));
  const more = rest.filter((one) => one.danger !== true && !shown.includes(one));
  /* One action alone in «Más» is drawn instead of the menu — unless it was tucked on purpose
     or something destructive shares the menu with it. */
  if (more.length === 1 && danger.length === 0 && more[0]!.tucked !== true) {
    return { primary, shown: [...shown, more[0]!], more: [], danger };
  }
  return { primary, shown, more, danger };
}

/** How a combination is drawn — the platform's way («⌥D», «Alt+D»); as written without one. */
export type KeysLabel = (keys: string) => string;

/** An action as a menu row — its sub-actions as a submenu, its shortcut drawn for this
 *  keyboard. */
export function dockOption(
  action: DockAction,
  label: KeysLabel = (keys) => keys,
): MenuOption {
  return {
    id: action.id,
    label: action.label,
    ...(action.icon === undefined ? {} : { icon: action.icon }),
    ...(action.hint === undefined ? {} : { hint: action.hint }),
    ...(action.shortcut === undefined ? {} : { shortcut: label(action.shortcut) }),
    ...(action.disabled === undefined ? {} : { disabled: action.disabled }),
    ...(action.danger === true ? { danger: true } : {}),
    ...(action.onSelect === undefined ? {} : { onSelect: action.onSelect }),
    ...(action.items === undefined
      ? {}
      : { items: action.items.map((one) => dockOption(one, label)) }),
  };
}

/** «Más» as menu groups: the rest, then the destructive ones apart. */
export function moreGroups(plan: DockPlan, label?: KeysLabel): MenuGroup[] {
  const option = (one: DockAction) => dockOption(one, label);
  return [
    ...(plan.more.length === 0 ? [] : [{ options: plan.more.map(option) }]),
    ...(plan.danger.length === 0 ? [] : [{ options: plan.danger.map(option) }]),
  ];
}

/**
 * The combinations a dock answers: every action with a `shortcut` — sub-actions and what waits
 * in «Más» included, a shortcut is how one reaches what is not in sight. None while there are
 * changes: the actions are not there, and Save answers Mod+S itself (`DirtyActions`).
 */
export function dockShortcuts(
  actions: readonly DockAction[],
  dirty = false,
): { keys: string; run: () => void; enabled: boolean }[] {
  if (dirty) return [];
  const all = (list: readonly DockAction[]): DockAction[] =>
    list.flatMap((one) => [one, ...(one.items === undefined ? [] : all(one.items))]);
  return all(actions).flatMap((one) =>
    one.shortcut === undefined || one.onSelect === undefined
      ? []
      : [{ keys: one.shortcut, run: one.onSelect, enabled: one.disabled !== true }],
  );
}
