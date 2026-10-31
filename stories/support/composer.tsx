import {
  Composer,
  type ComposerSkin,
  installComposerCopy,
  type ResourceRef,
  SPANISH_COMPOSER_COPY,
  useWorkspace,
  type ViewSpec,
} from "@sincpro/web-composer";
import { createRegistry } from "@sincpro/web-composer/domain";
import { AppFrame, Button, Dialog, Missing, Peek, ToastProvider } from "@sincpro/web-ui";
import {
  AppWindow,
  ArrowLeft,
  Ellipsis,
  Eye,
  Maximize2,
  Minimize2,
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Search,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

/**
 * Context: the composer is NOT a dependency of web-ui — it is a devDependency of its Storybook
 * only, so the templates can show web-ui inside the workspace the product actually uses. This
 * file is the adapter an app (or `@sincpro/web-framework`'s `<SincproApp>`) writes once:
 *
 * - `webUiSkin` — the composer's pieces drawn with web-ui (the same as web-framework's).
 * - (the composer's `--sc-*` colours come from web-ui's `tokens.css` itself: nothing to wire.)
 * - `Workspace` — a composer over a registry, started on a reference.
 */

export const webUiSkin: ComposerSkin = {
  icons: {
    more: Ellipsis,
    expand: SquareArrowOutUpRight,
    minimize: Minus,
    maximize: Maximize2,
    restore: Minimize2,
    close: X,
    left: PanelLeft,
    right: PanelRight,
    bottom: PanelBottom,
    window: AppWindow,
    back: ArrowLeft,
    search: Search,
    peek: Eye,
  },
  Peek: ({ title, onClose, actions, children }) => (
    <Peek open title={title} onClose={onClose} actions={actions}>
      {children}
    </Peek>
  ),
  Confirm: ({ open, title, detail, keep, discard, onAnswer }) => (
    <Dialog
      open={open}
      title={title}
      onClose={() => onAnswer(false)}
      footer={
        <>
          <Button size="sm" role="secondary" onClick={() => onAnswer(true)}>
            {discard}
          </Button>
          <Button size="sm" role="primary" onClick={() => onAnswer(false)}>
            {keep}
          </Button>
        </>
      }
    >
      <p className="text-ink">{detail}</p>
    </Dialog>
  ),
  Notice: ({ heading, detail, bad }) => (
    <Missing heading={heading} detail={detail} tone={bad ? "bad" : "warn"} />
  ),
};

/**
 * A composer over a registry, started on a reference — inside the application's frame when a
 * `menu` (the `TopBar`) is given, alone and full height otherwise. Toasts are mounted here:
 * every template's views may say «Pago registrado · Deshacer».
 */
export function Workspace({
  views,
  start,
  menu,
  sidebar,
  phoneBelow,
}: {
  views: readonly ViewSpec[];
  start: ResourceRef;
  menu?: ReactNode;
  /** The module's map beside the workspace (`AppFrame sidebar`); only with a `menu`. */
  sidebar?: ReactNode;
  /** Below this width the workspace is a phone (composer's default: 640). */
  phoneBelow?: number;
}) {
  useState(() => {
    installComposerCopy(SPANISH_COMPOSER_COPY);
    return null;
  });
  const workspace = useWorkspace();
  const registry = useMemo(() => createRegistry(views), [views]);
  useEffect(() => {
    workspace.push(start);
    // The first screen only: a re-render must not push it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);
  /* `agentTools`: the browser's agent (WebMCP) can see where the person is, open and search,
     through the same api a view uses. Feature-detected: without WebMCP nothing happens. */
  const composer = (
    <Composer
      workspace={workspace}
      registry={registry}
      skin={webUiSkin}
      agentTools
      {...(phoneBelow === undefined ? {} : { phoneBelow })}
    />
  );
  return (
    <ToastProvider>
      {menu === undefined ? (
        <div className="flex h-dvh min-h-0 flex-col bg-ground">{composer}</div>
      ) : (
        <AppFrame menu={menu} {...(sidebar === undefined ? {} : { sidebar })}>
          <div className="flex min-h-0 flex-1 flex-col">{composer}</div>
        </AppFrame>
      )}
    </ToastProvider>
  );
}
