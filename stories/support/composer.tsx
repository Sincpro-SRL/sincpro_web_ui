import {
  Composer,
  type ComposerSkin,
  installComposerCopy,
  type ResourceRef,
  SPANISH_COMPOSER_COPY,
  useWorkspace,
  type ViewSpec,
} from "@sincpro/web-composer";
import { createRegistry, EMPTY, openPanel, push, Zone } from "@sincpro/web-composer/domain";
import {
  AppFrame,
  Button,
  Dialog,
  Missing,
  Peek,
  type Pointer,
  POINTER_ATTRIBUTE,
  ToastProvider,
} from "@sincpro/web-ui";
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
  panels,
  pointer,
}: {
  views: readonly ViewSpec[];
  start: ResourceRef;
  /** The application's bar. A function receives `go`, to start the workspace on another view
   *  from a menu — the way a menu leaves: no crumb behind (`workspace.start`). */
  menu?: ReactNode | ((go: (ref: ResourceRef) => void) => ReactNode);
  /** The module's map beside the workspace (`AppFrame sidebar`); only with a `menu`. */
  sidebar?: ReactNode;
  /** Below this width the workspace is a phone (composer's default: 640). */
  phoneBelow?: number;
  /** Panels already open beside the page — a screen of several sets at once (the bank
   *  reconciliation: the statement as the page, the entry and the items on the right). Panels
   *  docked on the same side stack top to bottom. */
  panels?: readonly { ref: ResourceRef; zone?: "left" | "right" | "bottom" }[];
  /** What the person presses with, said by the application — a till is a touch monitor with a
   *  mouse plugged in. Written on `<html>`, so the modals the workspace portals follow it too. */
  pointer?: Pointer;
}) {
  useEffect(() => {
    if (pointer === undefined || pointer === "auto") return;
    const root = document.documentElement;
    root.setAttribute(POINTER_ATTRIBUTE, pointer);
    return () => root.removeAttribute(POINTER_ATTRIBUTE);
  }, [pointer]);
  useState(() => {
    installComposerCopy(SPANISH_COMPOSER_COPY);
    return null;
  });
  const [initial] = useState(() =>
    panels === undefined
      ? undefined
      : panels.reduce(
          (w, panel) =>
            openPanel(
              w,
              panel.ref,
              panel.zone === "left"
                ? Zone.Left
                : panel.zone === "bottom"
                  ? Zone.Bottom
                  : Zone.Right,
            ),
          push(EMPTY, start),
        ),
  );
  const workspace = useWorkspace(initial === undefined ? undefined : { initial });
  const registry = useMemo(() => createRegistry(views), [views]);
  useEffect(() => {
    if (initial !== undefined) return;
    workspace.push(start);
    // The first screen only: a re-render must not push it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);
  const bar = typeof menu === "function" ? menu((ref) => workspace.start(ref)) : menu;
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
      {bar === undefined ? (
        <div className="flex h-dvh min-h-0 flex-col bg-ground">{composer}</div>
      ) : (
        /* `scroll="view"`: the workspace scrolls inside its own boxes, so the frame is the
           window and the sticky stack starts from zero inside the view. */
        <AppFrame scroll="view" menu={bar} {...(sidebar === undefined ? {} : { sidebar })}>
          <div className="flex min-h-0 flex-1 flex-col">{composer}</div>
        </AppFrame>
      )}
    </ToastProvider>
  );
}
