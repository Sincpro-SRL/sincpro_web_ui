"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  buttonClasses,
  type ButtonRole,
  type ButtonSize,
} from "@sincpro/web-ui/primitives/button/Button";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Autocomplete,
  Button as AriaButton,
  Header,
  Input,
  type Key,
  Keyboard,
  Menu as AriaMenu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  SearchField,
  Separator,
  SubmenuTrigger,
  useFilter,
} from "react-aria-components";

/* ==================================================================== *
 *  MENU — the piece half the interface hangs from.
 *
 *  Filters, "group by", favorites, the actions `⋯` and the "Create" button are
 *  the SAME control with different content. Writing it five times produces five
 *  different keyboards, and what happens in practice is that none of the five
 *  handles the arrow keys.
 *
 *  ── Driven by DATA and not by children ──────────────────────────────
 *
 *  Two concrete reasons, and neither one is about style:
 *
 *  1. The "Create" menu is built from the operations registry. With children,
 *     the list would be written twice —once in the registry and once in the
 *     JSX— and they would drift apart at the first addition.
 *  2. The keyboard and ARIA are solved ONCE. With children, every consumer has
 *     to wire `role`, `aria-activedescendant` and the arrow keys; and it
 *     doesn't.
 *
 *  ── Behaviour is React Aria's ─────────────────────────────────────────
 *
 *  The first version placed itself by hand (`fixed`, measured against the window,
 *  in a portal) and listened to the keyboard on `document`. It opened cut off at
 *  the edge of the window and never learned typeahead. Now `MenuTrigger`, `Menu`
 *  and the system's `Popover` do it: the panel flips and shifts to stay on screen,
 *  the arrows, Home/End and typing the first letter move the focus, Escape closes
 *  and gives the focus back to the trigger. What stays here is the look and the
 *  data-driven API — consumers did not change.
 *
 *  ── Submenus: an option that carries `items` ────────────────────────
 *
 *  «Imprimir ▸ Factura / Remito / Etiquetas», «Mover a ▸ almacén». Flattened
 *  into one level, that is either nine rows of «Imprimir factura», «Imprimir
 *  remito»… pushing the rest of the verbs off the panel, or a dialog opened to
 *  ask one question. An option with `items` is drawn with a trailing chevron and
 *  opens its children beside it, in the same `Popover` and with the same rows.
 *  React Aria's `SubmenuTrigger` does the rest: hover or → opens it, ← or
 *  Escape closes it and returns the focus to the parent row, and the pointer
 *  can cross diagonally to the submenu without closing it. Picking a child
 *  runs the same `onSelect` as a root option — the ids of the whole tree share
 *  one namespace, so they must be unique across levels.
 * ==================================================================== */

export interface MenuOption {
  id: string;
  label: string;
  /** The line below. It exists because a thirty-entry menu without hints forces
   *  you to open each one to discover what it does. */
  hint?: string;
  icon?: LucideIcon;
  /** For the menus that CHOOSE (group by, favorites) instead of executing. */
  checked?: boolean;
  /** A hairline ABOVE this option. It separates the three rows of a date —months,
   *  quarters, years— which are one group because they combine, but read as
   *  three because they answer at three different zooms. */
  divider?: boolean;
  /** Cómo se SACA esta opción cuando se dibuja como ficha, si sacarla no es lo mismo que
   *  volver a elegirla. El filtro a medida es el caso: elegirlo abre el constructor, y eso
   *  no es lo que tiene que pasar al tocar su ×. */
  onRemove?: () => void;
  disabled?: boolean;
  /** Visual mark at the end of the label. A string is drawn as a pill
   *  —"maqueta", "nuevo"—; anything else is drawn as is, which is how a status
   *  `Tag` or an already formatted counter comes in. */
  badge?: ReactNode;
  /** What THIS option does. It exists on top of the menu's `onSelect` because a
   *  menu built from a registry —twenty-five operations, each one with its own
   *  action— has no reasonable `switch` on the other side. */
  onSelect?: () => void;
  /** The keys that run this option without opening the menu, as the user reads them
   *  —«Ctrl+P», «⌘D»—. Drawn at the end of the row and linked to it for a screen reader.
   *  It is a HINT: binding the keys is the application's job, because the menu does not
   *  exist until it is opened. In an ERP the frequent verbs have a shortcut, and the menu
   *  is where people learn it. */
  shortcut?: string;
  /** The option opens a SUBMENU with these options instead of running. Its own `onSelect`
   *  and `checked` are ignored — a row that opens something does not also do something.
   *  Children may carry `items` too, but a third level is usually a dialog in disguise. */
  items?: readonly MenuOption[];
}

export interface MenuGroup {
  /** The group's label, in the brand voice. Without a label, the group is just
   *  a separator — which also serves a purpose. */
  label?: string;
  /**
   * The group folds under its label, and starts folded unless something in it
   * is ticked.
   *
   * It exists for the DATE narrowings. «Fecha de pedido» is not one option, it
   * is eleven —three months, four quarters, three years— and eleven options
   * always open push the rest of the panel off the screen. A date is the only
   * field that brings its own little calendar, so it is the only one that
   * folds; the others are a list and a list does not need a door.
   */
  collapsible?: boolean;
  options: MenuOption[];
}

const WIDTH = {
  /** A menu of short verbs hanging off an icon: "duplicate", "delete". */
  sm: "min-w-44 max-w-64",
  md: "min-w-56 max-w-80",
  lg: "min-w-80 max-w-(--container-short)",
} as const;

/** A submenu opens beside its row, flush against the parent panel and pulled up by the
 *  panel's padding plus its hairline (`p-1` + 1), so its first row lines up with the row that
 *  opened it — a submenu that starts half a row lower reads as belonging to the next one. */
const SUBMENU_OFFSET = 0;
const SUBMENU_CROSS_OFFSET = -5;

/** Every option of the tree by id, children included: a submenu is a separate React Aria
 *  menu with its own `onAction`, and both have to reach the same handlers. */
export function indexOptions(
  options: readonly MenuOption[],
  into: Map<string, MenuOption> = new Map(),
): Map<string, MenuOption> {
  for (const o of options) {
    into.set(o.id, o);
    if (o.items !== undefined) indexOptions(o.items, into);
  }
  return into;
}

export function Menu({
  label,
  groups,
  onSelect,
  surface = "canvas",
  align = "start",
  icon: Trigger,
  /** The menu as a control of a list ("filters ▾") carries the chevron; the
   *  actions `⋯` does not, because the icon already says there is more. */
  chevron = true,
  active = false,
  iconOnly = false,
  variant = "button",
  searchPlaceholder,
  emptyText,
  width = "md",
  role,
  size = "md",
  title,
  closeOnSelect = true,
}: {
  label: string;
  groups: readonly MenuGroup[];
  onSelect?: (id: string) => void;
  surface?: "canvas" | "chrome";
  align?: "start" | "end";
  icon?: LucideIcon;
  chevron?: boolean;
  /** Something is chosen inside. A filter menu that doesn't look different when
   *  it filters is how someone ends up looking at a trimmed list without
   *  knowing it. */
  active?: boolean;
  /** `text` removes the frame and the background: it is the menu of an
   *  application BAR. `button` —the default— is the menu of a control. */
  variant?: "button" | "text";
  /** With a search box, the menu filters over label and hint. It only goes in
   *  when there are enough entries for searching to gain something — a search
   *  box on top of four options is one more control between the hand and what
   *  was already visible. */
  searchPlaceholder?: string;
  emptyText?: string;
  /** `md` for a menu of verbs; `lg` when the entries carry a hint that cannot be
   *  truncated without losing its reason to exist. */
  width?: keyof typeof WIDTH;
  /** The trigger looks like a BUTTON of that role. It is for the menu that
   *  starts something —"＋ Create"—, which has to look like the main action and
   *  not like a control of the list. Without this, the trigger is the usual
   *  small one. */
  role?: ButtonRole;
  size?: ButtonSize;
  /** What explains the menu on hover. It is not drawn. */
  title?: string;
  /** Icon only. `label` becomes the accessible name and the `title`, and stops
   *  being drawn — it is the actions `⋯`, where the icon already says there is
   *  more.
   *
   *  The label does NOT become optional when hidden: a menu without an
   *  accessible name is a menu a screen reader announces as "button". */
  iconOnly?: boolean;
  /** Column and filter menus toggle several options in a row. Closing after
   *  each click turns three hides into three open-close round trips. */
  closeOnSelect?: boolean;
}) {
  const copy = useUiCopy();
  const { contains } = useFilter({ sensitivity: "base" });

  /* `text` is the menu of a BAR: no frame and no background, just the highlight
     on hover. Five bordered menus on top of an application are five buttons
     competing with the ones in the view, and the bar stops reading as an index.
     `button` is the menu of a CONTROL —"filters ▾", "group ▾"—, and there the
     frame is what says it can be pressed. */
  const triggerClass = (open: boolean) =>
    variant === "text"
      ? surface === "chrome"
        ? `border-transparent text-chrome-muted hover:bg-chrome-ink/12 hover:text-chrome-ink ${
            active || open ? "bg-chrome-ink/12 text-chrome-ink" : ""
          }`
        : `border-transparent text-muted hover:bg-ink/6 hover:text-ink ${
            active || open ? "bg-ink/6 text-ink" : ""
          }`
      : surface === "chrome"
        ? `border-chrome-muted/35 bg-chrome-raised text-chrome-ink hover:border-chrome-accent/45 ${
            active ? "border-chrome-accent/60" : ""
          }`
        : `border-line-strong bg-surface hover:border-primary/45 hover:bg-primary/5 ${
            active ? "border-primary/60 text-primary" : "text-ink"
          }`;

  const byId = indexOptions(groups.flatMap((g) => g.options));

  const menu = (
    <MenuList
      label={label}
      groups={groups}
      width={width}
      closeOnSelect={closeOnSelect}
      onAction={(key) => {
        const option = byId.get(String(key));
        option?.onSelect?.();
        onSelect?.(String(key));
      }}
      emptyText={emptyText ?? copy.menu.empty}
    />
  );

  return (
    <MenuTrigger>
      <AriaButton
        aria-label={iconOnly ? label : undefined}
        {...(role === undefined ? {} : { "data-emphasis": role })}
        className={({ isPressed, isFocusVisible }) =>
          role === undefined
            ? `inline-flex h-(--size-control-sm) shrink-0 cursor-default items-center gap-1.5 border text-micro font-medium whitespace-nowrap outline-0 transition-colors duration-(--duration-instant) ${
                isFocusVisible ? "outline-2 outline-offset-2 outline-primary" : ""
              } ${iconOnly ? "w-(--size-control-sm) justify-center rounded-pill" : "rounded-control px-2.5"} ${triggerClass(isPressed)}`
            : `${buttonClasses(role, size, surface)} gap-1.5`
        }
      >
        {/* `title` on a span: React Aria's button does not forward it. */}
        <span className="contents" title={title ?? (iconOnly ? label : undefined)}>
          {/* Without an icon, `iconOnly` used to draw an empty square. The chevron
              is the honest default: it says "there is more here". */}
          {Trigger === undefined ? (
            iconOnly ? (
              <ChevronDown className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
            ) : null
          ) : (
            <Trigger className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
          )}
          {iconOnly ? null : label}
          {chevron && !iconOnly ? (
            <ChevronDown className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
          ) : null}
        </span>
      </AriaButton>
      <Popover
        placement={align === "end" ? "bottom end" : "bottom start"}
        className={WIDTH[width]}
      >
        {searchPlaceholder === undefined ? (
          menu
        ) : (
          /* The search box stays at the top: in a menu of twenty-five entries,
             scrolling loses exactly the control that explains why only three are
             visible. It filters on label AND hint — half the entries of this
             product are told apart only by the hint. */
          <Autocomplete filter={contains}>
            <SearchField
              aria-label={searchPlaceholder}
              autoFocus
              className="border-b border-line px-2 pt-2 pb-2"
            >
              <Input
                placeholder={searchPlaceholder}
                className="h-(--size-control-sm) w-full rounded-control border border-line-strong bg-surface px-2.5 text-meta text-ink outline-0 placeholder:text-muted focus-visible:border-primary"
              />
            </SearchField>
            {menu}
          </Autocomplete>
        )}
      </Popover>
    </MenuTrigger>
  );
}

/**
 * The panel of a `Menu`: its groups and rows, and the submenus hanging from them. Internal —
 * it is not exported from the family — and separate from the trigger for two reasons: a
 * submenu is this same panel one level down, and a panel can be rendered on the server
 * without the trigger's popover, which is how the tests see the rows.
 */
export function MenuList({
  label,
  groups,
  onAction,
  closeOnSelect,
  emptyText,
  width = "md",
}: {
  label: string;
  groups: readonly MenuGroup[];
  onAction: (key: Key) => void;
  closeOnSelect: boolean;
  emptyText: string;
  width?: keyof typeof WIDTH;
}) {
  /* Per panel: a submenu without icons does not inherit its parent's mark column. */
  const hasMarks = groups.some((g) =>
    g.options.some((o) => o.checked !== undefined || o.icon !== undefined),
  );
  const hasHints = groups.some((g) => g.options.some((o) => o.hint !== undefined));

  const row = (o: MenuOption) => {
    const Icon = o.icon;
    const opens = o.items !== undefined;
    const checked = !opens && o.checked === true;
    return (
      <MenuItem
        key={o.id}
        id={o.id}
        textValue={o.hint === undefined ? o.label : `${o.label} ${o.hint}`}
        isDisabled={o.disabled}
        className={`flex w-full cursor-default rounded-control ${
          hasHints ? "items-start py-1.5" : "items-center py-1"
        } gap-2 px-2 text-left outline-0 transition-colors duration-(--duration-instant) data-focused:bg-primary/8 data-open:bg-primary/8 disabled:opacity-45`}
      >
        {/* The mark column exists only when some option carries an icon
            or a checked state, and then for every row, so toggling one
            does not shift the text. */}
        {hasMarks ? (
          <span
            className={`${hasHints ? "mt-0.5" : ""} flex size-(--size-icon-sm) shrink-0 items-center justify-center`}
          >
            {checked ? (
              <Check
                className="size-(--size-icon-sm) text-primary"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : Icon !== undefined ? (
              <Icon
                className="size-(--size-icon-sm) text-muted"
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`truncate text-meta ${checked ? "font-medium text-ink" : "text-ink"}`}
            >
              {o.label}
            </span>
            {o.badge === undefined ? null : typeof o.badge === "string" ? (
              <span className="inline-flex shrink-0 items-center rounded-pill border border-warn/30 bg-warn/10 px-2 py-0.5 text-micro text-warn">
                {o.badge}
              </span>
            ) : (
              <span className="ml-auto shrink-0">{o.badge}</span>
            )}
          </span>
          {o.hint === undefined ? null : (
            <span className="mt-0.5 block truncate text-micro text-muted">{o.hint}</span>
          )}
        </span>
        {/* React Aria links the `Keyboard` slot to the row (aria-describedby), so the
            shortcut is heard as well as seen. Mono and muted: it is a reference, not a
            label competing with the verb. */}
        {o.shortcut === undefined ? null : (
          <Keyboard className="shrink-0 self-center pl-3 font-mono text-micro text-muted">
            {o.shortcut}
          </Keyboard>
        )}
        {/* The chevron is what tells a row that OPENS from one that RUNS — without it,
            a click on «Imprimir» that prints nothing reads as broken. */}
        {opens ? (
          <ChevronRight
            className="size-(--size-icon-sm) shrink-0 self-center text-muted"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
      </MenuItem>
    );
  };

  return (
    <AriaMenu
      aria-label={label}
      shouldCloseOnSelect={closeOnSelect}
      onAction={onAction}
      renderEmptyState={() => (
        <p className="px-3 py-3 text-meta text-muted italic">{emptyText}</p>
      )}
      className="max-h-[inherit] overflow-y-auto p-1 outline-0"
    >
      {groups.map((g, gi) => (
        <MenuSection
          key={g.label ?? gi}
          className="[&:not(:first-child)]:mt-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line [&:not(:first-child)]:pt-1"
        >
          {g.label === undefined ? null : (
            /* Same skeleton as the row: the label sits on the text column. */
            <Header className="flex items-center gap-2 px-2 pt-1 pb-0.5 text-micro font-medium text-muted">
              {hasMarks ? (
                <span className="size-(--size-icon-sm) shrink-0" aria-hidden />
              ) : null}
              {g.label}
            </Header>
          )}
          {g.options.flatMap((o) => {
            const item =
              o.items === undefined ? (
                row(o)
              ) : (
                <SubmenuTrigger key={o.id}>
                  {row(o)}
                  <Popover
                    offset={SUBMENU_OFFSET}
                    crossOffset={SUBMENU_CROSS_OFFSET}
                    className={WIDTH[width]}
                  >
                    <MenuList
                      label={o.label}
                      groups={[{ options: [...o.items] }]}
                      onAction={onAction}
                      closeOnSelect={closeOnSelect}
                      emptyText={emptyText}
                      width={width}
                    />
                  </Popover>
                </SubmenuTrigger>
              );
            return o.divider === true
              ? [
                  <Separator
                    key={`${o.id}-divider`}
                    className="my-1 h-px border-0 bg-line"
                  />,
                  item,
                ]
              : [item];
          })}
        </MenuSection>
      ))}
    </AriaMenu>
  );
}
