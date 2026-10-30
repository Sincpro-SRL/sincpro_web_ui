"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import { Menu, type MenuGroup } from "@sincpro/web-ui/primitives/menu/Menu";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import { Grid3x3, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

/* ==================================================================== *
 *  TOP BAR — the application bar. Where I am, what I can open, who I am.
 *
 *  It is what was missing between «a screen» and «a product». Without it every
 *  view has to explain itself: which app it belongs to, what else is next to it,
 *  which user I am looking as. With it, that is answered once at the top and no
 *  view repeats it.
 *
 *  The layout is Odoo's, and not out of imitation: it is the only one that puts
 *  the three groups where the eye already looks for them.
 *
 *      ┌────┬──────────┬───────────────────────┬─────────────┬────────┐
 *      │ ⊞  │ Ventas   │ Pedidos  Productos    │  ⚑3  ⏱     │ AG ▾   │
 *      └────┴──────────┴───────────────────────┴─────────────┴────────┘
 *        1       2                3                   4          5
 *
 *      1  the app switcher — EVERYTHING that exists
 *      2  which one I am in
 *      3  the menus OF THAT app, and only that one's
 *      4  what happened while I was not looking
 *      5  who I am and how I leave
 *
 *  ── Why the app's menus and not all of them ─────────────────────────
 *
 *  It is the decision that makes an application of twenty-five screens feel
 *  like six. Putting all twenty-five up there is an index, not a bar: someone
 *  who came to look at sales orders has no reason to see «Conciliación
 *  bancaria» every time they move the pointer.
 *
 *  ── The bar is CHROME and declares it inward ────────────────────────
 *
 *  Everything hung here inherits the surface, so there is no way to forget to
 *  pass it — which is exactly how a status bar ended up painting the canvas
 *  palette on top of the navy.
 * ==================================================================== */

export interface AppEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  /** One line: what this app is for. It shows in the switcher. */
  hint?: string;
}

export interface TopMenu {
  id: string;
  label: string;
  groups: readonly MenuGroup[];
}

export function TopBar({
  app,
  apps,
  currentApp,
  onAppSelect,
  menus,
  onMenuSelect,
  systray,
  user,
  onUserSelect,
  userGroups,
}: {
  /** The product's name, when there is ONE product. It is drawn like the
   *  current app of the switcher —same icon, same weight— but without the
   *  switcher: nothing to switch to. */
  app?: { label: string; icon?: LucideIcon };
  /** Everything that exists. Without this there is no switcher — a product with
   *  a single app does not need one, and drawing it empty promises something
   *  that is not there. */
  apps?: readonly AppEntry[];
  currentApp?: string;
  onAppSelect?: (id: string) => void;
  /** The menus OF the current app. */
  menus?: readonly TopMenu[];
  onMenuSelect?: (menuId: string, optionId: string) => void;
  /** What happened while I was not looking: activity, alerts. Icons with a count. */
  systray?: ReactNode;
  user?: { name: string; detail?: string };
  userGroups?: readonly MenuGroup[];
  onUserSelect?: (id: string) => void;
}) {
  const copy = useUiCopy();
  const actual = apps?.find((a) => a.id === currentApp);
  const brand = app ?? actual;

  return (
    <SurfaceProvider value="chrome">
      <header className="flex h-(--size-appbar) min-w-0 items-center gap-1 border-b border-chrome-edge bg-chrome px-2">
        {apps === undefined || apps.length === 0 ? null : (
          <AppSwitcher
            apps={apps}
            current={currentApp}
            {...(onAppSelect === undefined ? {} : { onSelect: onAppSelect })}
          />
        )}

        {/* The PRODUCT name when there is a single one (`app`), or the current
            app when there are several (`actual`). Never both: they are the same
            answer to «where am I», said twice. */}
        {brand === undefined ? null : (
          <span className="flex shrink-0 items-center gap-2 pr-2 pl-1">
            {brand.icon === undefined ? null : (
              <brand.icon
                className="size-(--size-icon-md) text-chrome-link"
                strokeWidth={2}
                aria-hidden
              />
            )}
            <span className="text-lead font-medium text-chrome-ink">{brand.label}</span>
          </span>
        )}

        {/* The app's menus. They are the first thing to be clipped on their right:
            what gives way first is what can be reopened from the switcher. */}
        {menus === undefined ? null : (
          <nav
            className="flex min-w-0 items-center gap-0.5 overflow-hidden"
            aria-label={copy.shell.menus}
          >
            {menus.map((m) => (
              <Menu
                key={m.id}
                label={m.label}
                groups={m.groups}
                surface="chrome"
                variant="text"
                chevron={false}
                onSelect={(id) => onMenuSelect?.(m.id, id)}
              />
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {systray}
          {user === undefined ? null : (
            <UserMenu
              name={user.name}
              {...(user.detail === undefined ? {} : { detail: user.detail })}
              groups={userGroups ?? []}
              {...(onUserSelect === undefined ? {} : { onSelect: onUserSelect })}
            />
          )}
        </div>
      </header>
    </SurfaceProvider>
  );
}

/** The app switcher: a grid, not a list.
 *
 *  Context: there are six or eight, each with an icon, and they are picked by
 *  recognition rather than by reading. A vertical list forces you to read all
 *  six to find the one you already know; the grid shows them at once and the
 *  position gets learned. */
export function AppSwitcher({
  apps,
  current,
  onSelect,
}: {
  apps: readonly AppEntry[];
  current?: string;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const copy = useUiCopy();

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={copy.shell.modules}
        title={copy.shell.modules}
        className={`inline-flex size-(--size-control-md) items-center justify-center rounded-pill transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-link ${
          open
            ? "bg-chrome-ink/12 text-chrome-ink"
            : "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink"
        }`}
      >
        <Grid3x3 className="size-(--size-icon-md)" strokeWidth={2} />
      </button>

      {!open ? null : (
        <>
          {/* The layer that closes on an outside click. A `div` and not a
              `button`: it is not an action, it is the gesture of leaving. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            role="menu"
            className="absolute top-full left-0 z-50 mt-1 grid w-(--container-apps) grid-cols-3 gap-1 rounded-panel border border-line bg-surface p-2 shadow-float"
          >
            {apps.map((a) => {
              const here = a.id === current;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  title={a.hint}
                  onClick={() => {
                    onSelect?.(a.id);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-box px-2 py-3 text-center transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                    here ? "bg-primary/8 text-primary" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  <a.icon className="size-(--size-icon-lg)" strokeWidth={1.75} aria-hidden />
                  <span className="text-micro leading-tight">{a.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** A systray icon with its count.
 *
 *  Zero is NOT drawn: a bell with a «0» next to it forces you to read a number
 *  to discover there is nothing. With no count you can already see there is
 *  nothing. */
export function SystrayButton({
  icon: Icon,
  label,
  count = 0,
  tone = "info",
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  tone?: "info" | "warn" | "bad";
  onClick?: () => void;
  active?: boolean;
}) {
  const PUNTO = {
    info: "bg-chrome-link text-chrome",
    warn: "bg-chrome-warn text-chrome",
    bad: "bg-chrome-bad text-chrome",
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      title={count > 0 ? `${label} (${count})` : label}
      aria-label={count > 0 ? `${label}: ${count}` : label}
      className={`relative inline-flex size-(--size-control-md) items-center justify-center rounded-pill transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-link ${
        active
          ? "bg-chrome-ink/12 text-chrome-ink"
          : "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink"
      }`}
    >
      <Icon className="size-(--size-icon-md)" strokeWidth={2} aria-hidden />
      {count <= 0 ? null : (
        <span
          aria-hidden
          className={`absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-pill px-1 text-micro leading-none font-semibold tabular-nums ${PUNTO[tone]}`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** Who I am and how I leave. The name is drawn when there is width; when narrow
 *  only the avatar stays, which is what gets recognised without reading. */
export function UserMenu({
  name,
  detail,
  groups,
  onSelect,
}: {
  name: string;
  detail?: string;
  groups: readonly MenuGroup[];
  onSelect?: (id: string) => void;
}) {
  const copy = useUiCopy();
  return (
    <span className="flex shrink-0 items-center gap-2 pl-1">
      <Avatar name={name} size="md" />
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="truncate text-meta text-chrome-ink">{name}</span>
        {detail === undefined ? null : (
          <span className="truncate text-micro text-chrome-muted">{detail}</span>
        )}
      </span>
      <Menu
        label={copy.shell.account}
        groups={groups}
        surface="chrome"
        variant="text"
        align="end"
        iconOnly
        {...(onSelect === undefined ? {} : { onSelect })}
      />
    </span>
  );
}
