"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { flatten, propsOf, slot, slotOf } from "@sincpro/web-ui/foundations/slots";
import { cn, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import {
  type DialogContext,
  dialogStyles,
  type DialogWidth,
} from "@sincpro/web-ui/primitives/dialog/Dialog";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import { useKeyboard } from "react-aria";
import {
  Dialog as AriaDialog,
  Heading,
  Link,
  Modal,
  ModalOverlay,
} from "react-aria-components";

/* ==================================================================== *
 *  DRILL — a context opened from inside another one, and one level deeper.
 *
 *  The product of an invoice line, the customer of a sale order, the delivery of
 *  an order, the «Registrar pago» wizard — and from the product, its supplier.
 *  Odoo opens each one as a form dialog ON TOP of the last: three scrims
 *  darkening the page squared, three × buttons, and nobody sure any more which
 *  one closes what (the note in `Dialog`: «a dialog on top of another is the
 *  road to simulated windows»).
 *
 *  ── One dialog, a stack of contexts inside ───────────────────────────
 *
 *  Here there is ONE window, and going deeper changes what it holds:
 *
 *      ┌────────────────────────────────────────────────────────┐
 *      │ ‹  pedido S00142 › Impresora térmica 80 mm             ×│
 *      │    Distribuidora Andina S.R.L.                          │
 *      ├────────────────────────────────────────────────────────┤
 *      │    (the supplier — a `Record`, a form, a wizard…)       │
 *      ├────────────────────────────────────────────────────────┤
 *      │                              [Cancelar] [Guardar]       │
 *      └────────────────────────────────────────────────────────┘
 *
 *  The header is a trail: where this was opened from (the page's record, small,
 *  like `Dialog`'s context) and every level on the way, each one a way back;
 *  the current one is the title. The footer is the CURRENT context's — one
 *  primary at a time, because only one context is in front. One scrim, one ×.
 *
 *  Why not a navigation inside the page (the record's `Crumbs`): leaving the
 *  invoice to look at a product throws away whatever was being edited on it,
 *  and a wizard is not a page — it is a question asked ABOUT the page. The page
 *  has to stay where it was, under the scrim, and come back exactly as it was.
 *
 *  ── The ways out, and which one does what ────────────────────────────
 *
 *      ‹ / Escape     up one level — Escape on the first level closes. It is
 *                     what Odoo's stacked dialogs teach: Escape closes the top.
 *      a crumb        back to that level; the first crumb (the page) closes.
 *      × / the scrim  closes the whole drill — back to the page.
 *
 *  ── The levels below the top stay MOUNTED ────────────────────────────
 *
 *  Hidden, not unmounted: a payment half typed in the wizard survives a look at
 *  the customer's debt and back. Focus follows the level: going down it moves
 *  to the new context; coming back it returns to the control that opened the
 *  level (the «Abrir» of a relation), the way React Aria returns it to the page
 *  when the whole drill closes.
 *
 *  ── Written as a tree, held by a path ────────────────────────────────
 *
 *  The contexts are `Drill.Context` children — written by whoever composes, with
 *  the app's CURRENT state, so they are never a stale copy of what was true when
 *  they opened. Which ones are open, and in which order, is a path of ids held
 *  by `useDrill()`: `open(id)` pushes, `back()` pops, `to(id)` goes back to one,
 *  `close()` empties it. A context that is written but not on the path draws
 *  nothing — if it is not on the path, it is not open.
 *
 *  It knows nothing about records: a context is a title and whatever goes
 *  inside. A record's parts (identity, status, `SheetGroups`, pages, lines) are
 *  the `Record` view written as a context's child, without a rail.
 *
 *  On a phone it is a bottom sheet, like `Dialog` (same recipes): the «‹» sits
 *  where the eye starts and the footer where the thumb is.
 * ==================================================================== */

/** Where the drill was opened from: the page's record. The first crumb of the trail. */
export type DrillOrigin = DialogContext;

/** Which contexts are open, in order, and the ways to move between them. */
export interface DrillState {
  /** The ids of the open contexts, from the first opened to the one in front. */
  readonly path: readonly string[];
  /** One level deeper. An id already on the path goes back to it instead: a product
   *  that leads to its supplier that leads to the same product is a loop, not depth. */
  open: (id: string) => void;
  /** Up one level. On the first one, it closes. */
  back: () => void;
  /** Back to the context with this id, closing the ones in front of it. */
  to: (id: string) => void;
  /** Close every level: back to the page. */
  close: () => void;
  /** Internal: the control that opened each level, where focus returns when the level
   *  above it closes. Written by `open`, read by `Drill`. */
  readonly focusMarks: RefObject<(HTMLElement | null)[]>;
}

function focused(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

/** One level deeper: push the id — or, when it is already open, go back to it. Internal,
 *  exported for the test. */
export function openPath(path: readonly string[], id: string): readonly string[] {
  const at = path.indexOf(id);
  return at === -1 ? [...path, id] : path.slice(0, at + 1);
}

/** Back to the context with this id; an id not on the path changes nothing. */
export function toPath(path: readonly string[], id: string): readonly string[] {
  const at = path.indexOf(id);
  return at === -1 ? path : path.slice(0, at + 1);
}

/** The written contexts that are open, in the order of the path. A context on the path
 *  that is not written is skipped: there is nothing to draw for it. */
export function framesOf(children: ReactNode, path: readonly string[]): DrillContextProps[] {
  const written = flatten(children)
    .filter((node) => slotOf(node) === "context")
    .map((node) => propsOf<DrillContextProps>(node))
    .filter((props): props is DrillContextProps => props !== undefined);
  return path
    .map((id) => written.find((context) => context.id === id))
    .filter((frame): frame is DrillContextProps => frame !== undefined);
}

/** The state of a `Drill`: the path of open contexts. Pass it to `<Drill state={…}>` and
 *  call `open(id)` from wherever the context is opened — a relation's «Abrir», a
 *  `Picker`'s open button, a rail action, a line's cell. */
export function useDrill(initial: readonly string[] = []): DrillState {
  const [path, setPath] = useState<readonly string[]>(initial);
  const focusMarks = useRef<(HTMLElement | null)[]>([]);
  return {
    path,
    open: (id) => {
      if (!path.includes(id)) focusMarks.current[path.length] = focused();
      setPath(openPath(path, id));
    },
    back: () => setPath(path.slice(0, -1)),
    to: (id) => setPath(toPath(path, id)),
    close: () => setPath([]),
    focusMarks,
  };
}

export interface DrillContextProps {
  /** What `open(id)` names. Unique inside the drill. */
  id: string;
  /** The context's name: the title while it is in front, its crumb when it is behind.
   *  Short — «Línea 3», «Impresora térmica 80 mm», «Registrar pago». */
  title: string;
  /** One sentence under the title; also the dialog's description while in front. */
  subtitle?: string;
  /** This context's actions — Cancel and ONE primary. Drawn only while it is in front. */
  footer?: ReactNode;
  /** No padding of its own: for a child that is already a surface with its own margins
   *  (a `Record`). A form or a wizard keeps the padding. */
  flush?: boolean;
  children: ReactNode;
}

export interface DrillProps {
  state: DrillState;
  /** The page's record, as the first crumb: «pedido · S00142». Pressing it closes. */
  origin?: DrillOrigin;
  /** One width for every level: a window that changes width at each step jumps under the
   *  pointer. `lg` by default — a record with pages and lines needs it. */
  width?: DialogWidth;
  /** The `Drill.Context`s. Which ones are open is the state's path. */
  children: ReactNode;
}

const crumb = tv({
  extend: focusRing,
  base: "block max-w-(--container-crumb) min-w-0 cursor-pointer truncate rounded-mark text-muted transition-colors duration-(--duration-instant) hover:text-ink hover:underline hover:underline-offset-4",
});

/**
 * The inside of the window: the trail, the context in front (and the ones behind it,
 * hidden), and the footer of the one in front.
 *
 * Internal — exported only so a test can read its markup, which the modal (a portal)
 * does not produce on the server.
 */
export function DrillSurface({
  frames,
  origin,
  onBack,
  onTo,
  onClose,
  focusMarks,
}: {
  frames: readonly DrillContextProps[];
  origin?: DrillOrigin;
  onBack: () => void;
  onTo: (id: string) => void;
  onClose: () => void;
  focusMarks?: RefObject<(HTMLElement | null)[]>;
}) {
  const copy = useUiCopy();
  const depth = frames.length;
  const top = frames[depth - 1];
  const parent = depth > 1 ? frames[depth - 2] : undefined;
  const bodies = useRef(new Map<string, HTMLDivElement>());
  const was = useRef(depth);
  const subtitleId = useId();

  const { keyboardProps } = useKeyboard({
    onKeyDown: (e) => {
      if (e.key !== "Escape") {
        e.continuePropagation();
        return;
      }
      if (depth > 1) onBack();
      else onClose();
    },
  });

  /* Focus follows the level. Down: into the new context, so the keyboard does not stay on
     a control that is now hidden. Up: back to what opened the level that closed. */
  const topId = top?.id;
  useEffect(() => {
    const before = was.current;
    was.current = depth;
    if (before === depth || depth === 0 || topId === undefined) return;
    const box = bodies.current.get(topId);
    if (depth > before) {
      box?.focus();
      return;
    }
    const mark = focusMarks?.current[depth];
    (mark?.isConnected === true ? mark : box)?.focus();
  }, [depth, topId, focusMarks]);

  if (top === undefined) return null;

  const trail: { key: string; label: ReactNode; onPress: () => void }[] = [
    ...(origin === undefined
      ? []
      : [
          {
            key: "\u0000origin",
            label: (
              <>
                {origin.kind === undefined ? null : (
                  <span className="font-medium">{origin.kind} </span>
                )}
                <span className="text-ink">{origin.label}</span>
              </>
            ),
            onPress: onClose,
          },
        ]),
    ...frames.slice(0, -1).map((frame) => ({
      key: frame.id,
      label: frame.title,
      onPress: () => onTo(frame.id),
    })),
  ];

  return (
    <AriaDialog
      {...(top.subtitle === undefined ? {} : { "aria-describedby": subtitleId })}
      className="flex max-h-[inherit] min-h-0 flex-1 flex-col outline-0"
    >
      <div {...keyboardProps} className="flex max-h-[inherit] min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-start gap-2 border-b border-line px-4 py-3">
          {parent === undefined ? null : (
            <span className="-ml-1.5 shrink-0">
              <IconButton
                icon={ArrowLeft}
                label={fillCopy(copy.drill.back, { name: parent.title })}
                onClick={onBack}
              />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {trail.length === 0 ? null : (
              /* Where this was opened from, small and on top — the same place `Dialog`
                 says what it is about. Every crumb is a way back; the one in front is
                 not a crumb, it is the title. */
              <nav aria-label={copy.drill.trail} className="mb-0.5 flex min-w-0">
                <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-micro">
                  {trail.map((one, i) => (
                    <li key={one.key} className="flex min-w-0 items-center gap-1">
                      {i === 0 ? null : (
                        <ChevronRight
                          className="size-(--size-icon-sm) shrink-0 text-line-strong"
                          strokeWidth={2}
                          aria-hidden
                        />
                      )}
                      <Link
                        onPress={one.onPress}
                        className={({ isFocusVisible }) => crumb({ isFocusVisible })}
                      >
                        {one.label}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <Heading slot="title" className="truncate text-title font-semibold text-ink">
              {top.title}
            </Heading>
            {top.subtitle === undefined ? null : (
              <p id={subtitleId} className="mt-1 max-w-prose text-meta text-muted">
                {top.subtitle}
              </p>
            )}
          </div>
          <IconButton icon={X} label={copy.shell.close} onClick={onClose} />
        </header>

        {frames.map((frame) => {
          const front = frame.id === top.id;
          return (
            /* Each level scrolls on its own and the ones behind are `hidden`, not gone:
               their state — a half-typed payment, the open tab of a product — is still
               there when the level above closes. */
            <div
              key={frame.id}
              ref={(node) => {
                if (node === null) bodies.current.delete(frame.id);
                else bodies.current.set(frame.id, node);
              }}
              hidden={!front}
              tabIndex={-1}
              data-drill-context={frame.id}
              className={cn(
                "min-h-0 flex-1 overflow-y-auto outline-0",
                frame.flush !== true && "px-4 py-4",
                front && frame.footer === undefined && "max-sm:safe-bottom",
              )}
            >
              {frame.children}
            </div>
          );
        })}

        {top.footer === undefined ? null : (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-ground px-4 py-3 max-sm:safe-bottom">
            {top.footer}
          </footer>
        )}
      </div>
    </AriaDialog>
  );
}

/** One context of a drill: a title, what goes inside, and its own footer. It does not
 *  draw where it is written — the `Drill` draws it when its id is on the path. */
const DrillContextSlot = slot("context", (_props: DrillContextProps): ReactNode => null);

/**
 * ONE dialog that holds a stack of contexts opened from a record — and from each other —
 * with a trail back to the page. See the header of this file.
 *
 *     const drill = useDrill();
 *     …<RelationValue name={product} onOpen={() => drill.open("product")} />…
 *     <Drill state={drill} origin={{ kind: "pedido", label: "S00142" }}>
 *       <Drill.Context id="product" title={product} flush>
 *         <Record identity={…}>…</Record>
 *       </Drill.Context>
 *       <Drill.Context id="supplier" title={supplier} footer={…}>…</Drill.Context>
 *     </Drill>
 */
export function Drill({ state, origin, width = "lg", children }: DrillProps) {
  /* While the window fades out the path is already empty: it keeps drawing the last levels
     it had, so the content does not vanish before the window does. */
  const [lastPath, setLastPath] = useState(state.path);
  if (state.path.length > 0 && state.path !== lastPath) setLastPath(state.path);
  const path = state.path.length > 0 ? state.path : lastPath;

  const frames = framesOf(children, path);

  return (
    <ModalOverlay
      isOpen={state.path.length > 0}
      onOpenChange={(next) => {
        if (!next) state.close();
      }}
      isDismissable
      /* Escape is ours: up one level, not out of everything. See the header. */
      isKeyboardDismissDisabled
      className={dialogStyles.overlay}
    >
      <Modal className={(s) => dialogStyles.modal({ ...s, width })}>
        <DrillSurface
          frames={frames}
          {...(origin === undefined ? {} : { origin })}
          onBack={state.back}
          onTo={state.to}
          onClose={state.close}
          focusMarks={state.focusMarks}
        />
      </Modal>
    </ModalOverlay>
  );
}

Drill.Context = DrillContextSlot;
