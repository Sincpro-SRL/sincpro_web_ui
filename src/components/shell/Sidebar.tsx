"use client";

import { type BrandLogo, BrandMark } from "@sincpro/web-ui/components/shell/brandMark";
import { useSidebarDrawer } from "@sincpro/web-ui/components/shell/sidebarDrawer";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* ==================================================================== *
 *  SIDEBAR — the whole chrome of a back office, in one column.
 *
 *      ┌──────────────────────┐
 *      │ ◆ Colegio            │   ← the product
 *      │ (AG) Ana Gutiérrez   │   ← who I am
 *      │      Tesorería       │
 *      ├──────────────────────┤
 *      │ ▾ Socios             │   ← the navigation (a `NavigationTree`):
 *      │     Padrón       12  │     it scrolls on its own
 *      │ ▌   Cuotas        4  │
 *      │ ▸ Cursos             │
 *      ├──────────────────────┤
 *      │ 🔑 Cambiar clave      │   ← the account: pinned to the bottom
 *      │ ↗  Ver el sitio      │
 *      │ ⎋  Salir             │
 *      └──────────────────────┘
 *
 *  When an application has no bar on top, the three answers the `TopBar` gives
 *  — which product, where I can go, who I am and how I leave — have to live
 *  here, each where the eye looks for it: the product at the top-left, the
 *  map in the middle, the way out at the bottom. It goes in `AppFrame`'s
 *  `sidebar` with no `menu`: the frame makes it as tall as the window, and on
 *  a phone opens this same column as a drawer.
 *
 *  The navigation is a slot and not data: it is a `NavigationTree` (modules,
 *  screens, counts, the current one marked), and an application with a map of
 *  its own puts that instead. The account's actions ARE data — three or four
 *  verbs drawn the same way in every product.
 *
 *  ── In the brand's colour: the chrome surface ───────────────────────
 *
 *  With no bar on top the sidebar IS the application's chrome, and a product
 *  whose chrome is its navy wants it there (`AppFrame sidebarSurface="chrome"`).
 *  It reads the surface from its frame, as everything hung in the `TopBar`
 *  does, and hands it down: the tree, the counts and the avatar inside follow
 *  without being told. Still ONE dark band per screen — the sidebar takes the
 *  bar's place, it does not add a second one beside it.
 * ==================================================================== */

export type SidebarAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** A link instead of an action — «Ver el sitio». It is followed, not reported. */
  href?: string;
  /** The link opens in another tab; a screen reader is told so. */
  external?: boolean;
};

export type SidebarProps = {
  /** The product, at the top: its name and its mark — an icon, or its logo: the URL of an
   *  image, or an inline `<svg>` that paints with the tokens and so follows theme and surface. */
  brand?: { label: string; icon?: LucideIcon; logo?: BrandLogo };
  /** Who is signed in. */
  user?: { name: string; detail?: string; avatar?: string };
  /** The navigation: a `NavigationTree`. It scrolls; the top and the bottom stay. */
  children: ReactNode;
  /** The account, pinned to the bottom: change the password, view the site, sign out. */
  actions?: readonly SidebarAction[];
  /** An action without `href` was chosen. */
  onAction?: (id: string) => void;
  /** Anything else at the very bottom: a `ThemeSwitcher`, the version. */
  footer?: ReactNode;
  /** `chrome` wears the brand's colour. By default the frame's `sidebarSurface`. */
  surface?: Surface;
};

/* Each surface's colours in one place: the column is ONE surface, and a row drawn with the
   other palette is the bug the surface context exists to prevent. The hairlines are ink at a
   low alpha on the chrome: `chrome-edge` is the chrome itself on light, an invisible line. */
const SKIN = {
  canvas: {
    root: "",
    ink: "text-ink",
    muted: "text-muted",
    mark: "text-primary",
    line: "border-line",
    row: "text-ink hover:bg-ink/6 focus-visible:outline-primary",
  },
  chrome: {
    root: "bg-chrome",
    ink: "text-chrome-ink",
    muted: "text-chrome-muted",
    mark: "text-chrome-link",
    line: "border-chrome-ink/12",
    row: "text-chrome-ink hover:bg-chrome-ink/10 focus-visible:outline-chrome-link",
  },
} as const;

type Skin = (typeof SKIN)[Surface];

const ROW =
  "flex h-(--size-control-sm) w-full min-w-0 cursor-pointer items-center gap-2 rounded-control px-2 text-meta no-underline transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:-outline-offset-2";

function Brand({ brand, skin }: { brand: NonNullable<SidebarProps["brand"]>; skin: Skin }) {
  const Icon = brand.icon;
  return (
    <div className="flex min-w-0 items-center gap-2 px-4 pt-4 pb-2">
      {brand.logo === undefined ? (
        Icon === undefined ? null : (
          <Icon
            className={`size-(--size-icon-lg) shrink-0 ${skin.mark}`}
            strokeWidth={1.75}
            aria-hidden
          />
        )
      ) : (
        <BrandMark logo={brand.logo} className="size-(--size-control-md) shrink-0" />
      )}
      <span className={`min-w-0 truncate text-lead font-semibold ${skin.ink}`}>
        {brand.label}
      </span>
    </div>
  );
}

function User({ user, skin }: { user: NonNullable<SidebarProps["user"]>; skin: Skin }) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-4 py-2">
      <Avatar
        name={user.name}
        size="md"
        {...(user.avatar === undefined ? {} : { src: user.avatar })}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={`truncate text-meta ${skin.ink}`}>{user.name}</span>
        {user.detail === undefined ? null : (
          <span className={`truncate text-micro ${skin.muted}`}>{user.detail}</span>
        )}
      </span>
    </div>
  );
}

function Action({
  action,
  skin,
  onAction,
}: {
  action: SidebarAction;
  skin: Skin;
  onAction?: (id: string) => void;
}) {
  const copy = useUiCopy();
  const drawer = useSidebarDrawer();
  const Icon = action.icon;
  const content = (
    <>
      {Icon === undefined ? null : (
        <Icon
          className={`size-(--size-icon-md) shrink-0 ${skin.muted}`}
          strokeWidth={2}
          aria-hidden
        />
      )}
      <span className="min-w-0 truncate">{action.label}</span>
    </>
  );
  if (action.href !== undefined) {
    return (
      <a
        href={action.href}
        className={`${ROW} ${skin.row}`}
        {...(action.external === true ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {content}
        {action.external === true ? (
          <span className="sr-only">{` (${copy.field.newTab})`}</span>
        ) : null}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={`${ROW} ${skin.row}`}
      onClick={() => {
        onAction?.(action.id);
        drawer?.close();
      }}
    >
      {content}
    </button>
  );
}

export function Sidebar({
  brand,
  user,
  children,
  actions,
  onAction,
  footer,
  surface,
}: SidebarProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const skin = SKIN[sup];
  const head = brand !== undefined || user !== undefined;
  const foot = (actions !== undefined && actions.length > 0) || footer !== undefined;
  return (
    <SurfaceProvider value={sup}>
      <div data-surface={sup} className={`flex h-full min-h-0 min-w-0 flex-col ${skin.root}`}>
        {head ? (
          <div className={`shrink-0 border-b pb-2 ${skin.line}`}>
            {brand === undefined ? null : <Brand brand={brand} skin={skin} />}
            {user === undefined ? null : <User user={user} skin={skin} />}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {foot ? (
          <div className={`flex shrink-0 flex-col gap-2 border-t p-2 ${skin.line}`}>
            {actions === undefined || actions.length === 0 ? null : (
              <ul aria-label={copy.shell.account} className="flex flex-col gap-px">
                {actions.map((action) => (
                  <li key={action.id}>
                    <Action
                      action={action}
                      skin={skin}
                      {...(onAction === undefined ? {} : { onAction })}
                    />
                  </li>
                ))}
              </ul>
            )}
            {footer}
          </div>
        ) : null}
      </div>
    </SurfaceProvider>
  );
}
