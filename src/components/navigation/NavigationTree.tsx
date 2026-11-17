"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { Count } from "@sincpro/web-ui/primitives/tag/Count";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo } from "react";
import {
  Button as AriaButton,
  Link,
  NavigationTree as AriaNavigationTree,
  NavigationTreeItem as AriaNavigationTreeItem,
  NavigationTreeItemContent,
  RouterProvider,
} from "react-aria-components";

/* ==================================================================== *
 *  NAVIGATION TREE — the sidebar of a module.
 *
 *      ┌──────────────────────────┐
 *      │ 🛒 Ventas              ▾ │   ← a module: it opens and closes
 *      │    Cotizaciones      12  │
 *      │    Pedidos            4  │
 *      │ ▌  Facturas          31  │   ← where I am
 *      │ 🚚 Compras             ▸ │   ← closed
 *      └──────────────────────────┘
 *
 *  The top bar answers «which app» and holds a handful of menus; a module with
 *  twenty screens does not fit there, and a menu that has to be OPENED to see
 *  where you are answers the question one click too late. The sidebar shows the
 *  whole map and the current spot at once, and stays put while the view scrolls.
 *
 *  ── Why React Aria's `NavigationTree` and not a list of buttons ─────
 *
 *  It is a tree of LINKS: arrows walk the rows, left and right close and open a
 *  module, Tab leaves the tree in one step instead of crossing forty items, the
 *  current row says `aria-current="page"`, and keyboard focus lands on it when
 *  the tree is entered. Written by hand, none of that survives the first
 *  refactor.
 *
 *  ── Ids in, ids out ─────────────────────────────────────────────────
 *
 *  React Aria matches the current row by `href`. The system speaks ids —
 *  `current` and `onNavigate(id)` — because the app is the one that knows its
 *  routes, and a sidebar that invents URLs would fight the app's router. So the
 *  id IS the href, inside a router of its own that hands every navigation back
 *  as `onNavigate(id)` instead of letting the browser follow it. The anchors are
 *  drawn as `#<id>` so a ⌘-click opens this same page and not a broken URL.
 *
 *  ── On the chrome ───────────────────────────────────────────────────
 *
 *  Inside a `Sidebar` that wears the brand's colour the tree reads the surface
 *  from it: the navy of the current row becomes the chrome's link, the ink its
 *  ink. The pairs are the ones the `TopBar` already uses on the same navy, so a
 *  bar and a sidebar of one product mark «here» the same way.
 * ==================================================================== */

/** One entry of the sidebar. With `children` it is a module that opens and closes; without,
 *  it is a screen you go to. */
export interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** What is waiting there: drafts, overdue, to approve. Zero is not drawn — a «0» beside
   *  every quiet screen is a column of noise the eye has to read to learn nothing. */
  count?: number;
  children?: readonly NavItem[];
}

const row = tv({
  extend: focusRing,
  base: "group relative flex min-w-0 items-center rounded-ui-nav text-meta outline-offset-0 select-none",
  variants: {
    surface: {
      canvas: "text-ink",
      chrome: "text-chrome-ink outline-chrome-link",
    },
    isCurrent: {
      true: "font-medium forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
      false: "",
    },
  },
  compoundVariants: [
    { surface: "canvas", isCurrent: true, class: "bg-ui-nav-current text-primary" },
    { surface: "canvas", isCurrent: false, class: "hover:bg-ink/6" },
    { surface: "chrome", isCurrent: true, class: "bg-chrome-link/15 text-chrome-link" },
    { surface: "chrome", isCurrent: false, class: "hover:bg-chrome-ink/10" },
  ],
});

const link = tv({
  base: "flex h-(--size-control-sm) min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 text-current no-underline outline-0",
  variants: {
    isModule: { true: "font-medium" },
  },
});

const chevronButton = tv({
  extend: focusRing,
  base: "mr-1 inline-flex shrink-0 items-center justify-center rounded-mark p-1 transition-colors duration-(--duration-instant)",
  variants: {
    surface: {
      canvas: "text-muted hover:bg-ink/6 hover:text-ink pressed:bg-ink/10",
      chrome:
        "text-chrome-muted outline-chrome-link hover:bg-chrome-ink/10 hover:text-chrome-ink pressed:bg-chrome-ink/15",
    },
  },
});

/** The marker of the current row: a bar on the leading edge, so the spot reads in the
 *  margin before the label is read. */
const MARKER: Record<Surface, string> = {
  canvas:
    "absolute inset-y-1 start-0 w-0.5 rounded-pill bg-primary forced-colors:bg-[HighlightText]",
  chrome:
    "absolute inset-y-1 start-0 w-0.5 rounded-pill bg-chrome-link forced-colors:bg-[HighlightText]",
};

/** The colour of what is «here» — the current row's icon, a folded module that holds it —
 *  and of what is not. */
const HERE: Record<Surface, { here: string; rest: string }> = {
  canvas: { here: "text-primary", rest: "text-muted" },
  chrome: { here: "text-chrome-link", rest: "text-chrome-muted" },
};

/** The ids of every module on the way to `id`, so the row you are on is never folded away. */
function pathTo(items: readonly NavItem[], id: string | undefined): string[] {
  if (id === undefined) return [];
  for (const item of items) {
    if (item.id === id) return [];
    if (item.children === undefined) continue;
    const below = pathTo(item.children, id);
    if (below.length > 0 || item.children.some((c) => c.id === id))
      return [item.id, ...below];
  }
  return [];
}

/**
 * The sidebar of an ERP module: modules that open and close, the screens inside them with
 * an icon and what is waiting there, and the row you are on marked.
 *
 * Context: the modules on the way to `current` start open even when `defaultExpanded` does
 * not name them. A sidebar that loads with the current screen folded away answers «where am
 * I» with a closed module, and that is the whole question it exists for.
 */
export function NavigationTree({
  items,
  current,
  onNavigate,
  defaultExpanded = [],
  label,
}: {
  items: readonly NavItem[];
  /** The id of the screen on view. */
  current?: string;
  /** A screen was chosen — by click, Enter, or the keyboard. Modules only open and close. */
  onNavigate?: (id: string) => void;
  /** The modules that start open. The path to `current` is always added. */
  defaultExpanded?: readonly string[];
  /** The accessible name of the tree. By default, the copy table's name for a module's menus. */
  label?: string;
}) {
  const copy = useUiCopy();
  const surface = useSurface();
  const expanded = useMemo(
    () => [...new Set([...defaultExpanded, ...pathTo(items, current)])],
    // The initial state only: React Aria owns the expansion after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const render = (item: NavItem, level: number): ReactNode => {
    const children = item.children ?? [];
    const module = children.length > 0;
    const Icon = item.icon;
    /* The first step in puts a screen's label on the vertical of its module's label —
       past the module's icon column — so a module and its screens read as one list of
       words. Every step deeper is the system's nesting step. */
    const indent: CSSProperties | undefined =
      level > 1
        ? {
            paddingInlineStart: `calc(var(--spacing) * 4 + var(--size-icon-md) + var(--spacing-indent) * ${level - 2})`,
          }
        : undefined;
    return (
      <AriaNavigationTreeItem
        data-ui="navigation.item"
        key={item.id}
        id={item.id}
        textValue={item.label}
        {...(module ? {} : { href: item.id })}
        className={({ isCurrent, isFocusVisible }) =>
          row({ surface, isCurrent, isFocusVisible })
        }
      >
        <NavigationTreeItemContent>
          {({ isCurrent, isCurrentAncestor, isExpanded }) => (
            <>
              {isCurrent ? <span aria-hidden className={MARKER[surface]} /> : null}
              <Link className={link({ isModule: module })} style={indent}>
                {Icon === undefined ? null : (
                  <Icon
                    className={`size-(--size-icon-md) shrink-0 ${
                      isCurrent || (isCurrentAncestor && !isExpanded)
                        ? HERE[surface].here
                        : HERE[surface].rest
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
                <span
                  className={`min-w-0 flex-1 truncate ${
                    isCurrentAncestor && !isExpanded ? HERE[surface].here : ""
                  }`}
                >
                  {item.label}
                </span>
                {item.count === undefined ? null : (
                  <Count value={item.count} current={isCurrent} />
                )}
              </Link>
              {module ? (
                <AriaButton
                  slot="chevron"
                  className={({ isFocusVisible }) =>
                    chevronButton({ surface, isFocusVisible })
                  }
                >
                  <ChevronRight
                    className={`size-(--size-icon-sm) transition-transform duration-(--duration-quick) ease-(--ease-out) ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                </AriaButton>
              ) : null}
            </>
          )}
        </NavigationTreeItemContent>
        {children.map((child) => render(child, level + 1))}
      </AriaNavigationTreeItem>
    );
  };

  return (
    <AriaLocale>
      <RouterProvider navigate={(id) => onNavigate?.(id)} useHref={(id) => `#${id}`}>
        <AriaNavigationTree
          data-ui="navigation"
          aria-label={label ?? copy.shell.menus}
          selectedRoute={current ?? null}
          defaultExpandedKeys={expanded}
          className="flex w-full min-w-0 flex-col gap-px p-2 outline-0"
        >
          {items.map((item) => render(item, 1))}
        </AriaNavigationTree>
      </RouterProvider>
    </AriaLocale>
  );
}
