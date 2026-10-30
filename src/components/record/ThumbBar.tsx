"use client";

import {
  DirtyActions,
  type DirtyState,
} from "@sincpro/web-ui/components/record/DirtyActions";
import { flatten } from "@sincpro/web-ui/foundations/slots";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/* ==================================================================== *
 *  THE THUMB BAR — the record held in one hand.
 *
 *  On a desk the record's actions live in the rail, at the top, next to where
 *  the eye starts. On a phone the top is the farthest place from the thumb,
 *  and the rail scrolls away with the first swipe: the action the screen
 *  exists for —«Registrar pago», «Publicar», «Guardar»— ends up two gestures
 *  away. So when the RECORD is narrow (below `--container-handheld`, 40rem),
 *  that one action moves to a bar stuck to the bottom of the screen:
 *
 *      ┌─ rail ───────────────────────────┐
 *      │ Facturas › FAC/2026/0118    ‹ ›  │
 *      │ [Imprimir]        borrador▸…     │   the rest stays here, or in `⋯`
 *      ├──────────────────────────────────┤
 *      │ …the sheet scrolls…              │
 *      ├─ thumb bar ──────────────────────┤
 *      │ [        Registrar pago        ] │   sticky to the bottom edge
 *      └──────────────────────────────────┘
 *
 *  What goes in it is decided, not composed:
 *
 *   1. With `dirty`, the bar holds «sin guardar», Discard and Save — the same
 *      precedence the rail already has: while there are unsaved changes the
 *      only things that can be done are confirm or throw them away.
 *   2. Otherwise, the action written with `role="primary"` and NOTHING else.
 *      There is at most one per view (`make smoke`); the secondary ones stay in
 *      the rail and its `⋯` menu. A bar of three buttons on a phone is three
 *      buttons a thumb has to choose between, and the gold stops saying which.
 *
 *  ── Why the record's width and not the window's ──────────────────────
 *
 *  Same reason as everything else here: a record in a 380 px panel is as
 *  narrow as one on a phone. The query is a NAMED container (`record`) on the
 *  rail and on the bar — never on the paper: an unnamed container around the
 *  sheet would change what `Sheet`, `SectionGrid` and the chatter measure
 *  against, and the desk layout with it.
 *
 *  ── Why CSS, and why the primary is in the DOM twice ─────────────────
 *
 *  The rail copy is hidden and the bar shown by the same container query, so
 *  there is no frame where both or neither are visible, it works on the server,
 *  and there is no resize listener. `display: none` takes the hidden copy out of
 *  the accessibility tree and out of the Tab order, so at any width exactly ONE
 *  primary exists for a person, a screen reader and the smoke count.
 *
 *  ── Why sticky and not fixed ─────────────────────────────────────────
 *
 *  Sticky to the bottom, as the LAST thing in the record, is its own reserved
 *  space: while the record scrolls the bar floats over it, and at the end it
 *  settles in its place in the flow, under the last line — nothing is ever left
 *  covered, with no padding to keep in sync with the bar's height. A `fixed` bar
 *  would need that padding, and would stay on screen after the record ends.
 *  `safe-bottom` keeps the buttons clear of a phone's home indicator.
 * ==================================================================== */

export function isPrimary(
  node: ReactNode,
): node is ReactElement<{ role?: string; surface?: Surface; size?: string }> {
  return isValidElement(node) && (node.props as { role?: unknown }).role === "primary";
}

export type ThumbMode = "dirty" | "primary";

/** What the rail shows and what the thumb bar takes over, decided from the actions and
 *  the dirty state (see THE THUMB BAR above): dirty first, else the primary. `rail` is the
 *  list of action nodes the rail draws; `primaries` the ones that move to the bar. */
export function thumbPlan({
  withRail,
  actions,
  dirty,
}: {
  withRail: boolean;
  actions: ReactNode;
  dirty: DirtyState | undefined;
}): {
  rail: ReactNode[];
  primaries: ReactElement<{ role?: string; surface?: Surface; size?: string }>[];
  mode: ThumbMode | null;
} {
  const rail = withRail && actions !== undefined ? flatten(actions) : [];
  const primaries = rail.filter(isPrimary);
  const mode: ThumbMode | null = !withRail
    ? null
    : dirty !== undefined
      ? "dirty"
      : primaries.length > 0
        ? "primary"
        : null;
  return { rail, primaries, mode };
}

/** The bar itself. Last in the record, so sticky-to-the-bottom is also its reserved space.
 *  On a wide record it is `display: none` and its wrapper measures nothing. */
export function ThumbBar({
  mode,
  dirty,
  primaries,
}: {
  mode: ThumbMode;
  dirty: DirtyState | undefined;
  primaries: readonly ReactElement<{ role?: string; surface?: Surface; size?: string }>[];
}) {
  return (
    <div className="@container/record sticky bottom-0 z-20 mt-auto">
      <SurfaceProvider value="canvas">
        <div
          data-thumb-bar={mode}
          className={`hidden min-w-0 items-center gap-2 border-t border-line-strong bg-surface px-4 pt-3 safe-bottom @max-handheld/record:flex ${
            mode === "primary" ? "*:flex-1" : "justify-end *:first:mr-auto"
          }`}
        >
          {mode === "dirty" && dirty !== undefined ? (
            <DirtyActions {...dirty} />
          ) : (
            /* On the bar's light surface whatever the rail's was, and `lg`: it is a
               single action alone in its row — what `lg` is for. */
            primaries.map((node) =>
              cloneElement(node, { key: node.key, surface: "canvas", size: "lg" }),
            )
          )}
        </div>
      </SurfaceProvider>
    </div>
  );
}
