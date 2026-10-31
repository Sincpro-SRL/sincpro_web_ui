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
import { Button, Dialog, Missing, Peek } from "@sincpro/web-ui";
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
import { type CSSProperties, useEffect, useMemo, useState } from "react";

/**
 * Context: the composer is NOT a dependency of web-ui — it is a devDependency of its Storybook
 * only, so the templates can show web-ui inside the workspace the product actually uses. This
 * file is the adapter an app (or `@sincpro/web-framework`'s `<SincproApp>`) writes once:
 *
 * - `webUiSkin` — the composer's pieces drawn with web-ui (the same as web-framework's).
 * - `SC_TOKENS` — the composer's `--sc-*` colours read from web-ui's tokens, so frames, tabs
 *   and windows take the theme (light and dark) of the rest of the screen.
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

export const SC_TOKENS = {
  "--sc-ground": "var(--color-ground)",
  "--sc-surface": "var(--color-surface)",
  "--sc-line": "var(--color-line)",
  "--sc-line-strong": "var(--color-line-strong)",
  "--sc-ink": "var(--color-ink)",
  "--sc-muted": "var(--color-muted)",
  "--sc-accent": "var(--color-primary)",
  "--sc-danger": "var(--color-danger)",
  "--sc-on-danger": "var(--color-surface)",
  "--sc-scrim": "var(--color-scrim)",
  "--sc-shadow": "var(--shadow-window)",
  "--sc-radius": "var(--radius-panel)",
  "--sc-radius-control": "var(--radius-control)",
  "--sc-text": "var(--text-meta)",
  "--sc-text-small": "var(--text-micro)",
} as CSSProperties;

export function Workspace({
  views,
  start,
}: {
  views: readonly ViewSpec[];
  start: ResourceRef;
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
  return (
    <div style={SC_TOKENS} className="flex h-dvh min-h-0 flex-col bg-ground">
      <Composer workspace={workspace} registry={registry} skin={webUiSkin} />
    </div>
  );
}
