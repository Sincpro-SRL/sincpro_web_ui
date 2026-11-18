"use client";

import {
  type Box,
  type GuideSide,
  placeCard,
  type Size,
} from "@sincpro/web-ui/components/guide/place";
import {
  boxOf,
  findTarget,
  type GuideTarget,
  scrollable,
} from "@sincpro/web-ui/components/guide/target";
import { useSidebarDrawer } from "@sincpro/web-ui/components/shell/sidebarDrawer";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

/* ==================================================================== *
 *  GUIDE — a tour that says, on the screen itself, what each thing is.
 *
 *      ┌──────────────────────────────────────────────────────────┐
 *      │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ ┌──────────────┐ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← the veil, cut out
 *      │░░░ │ ⌕ Buscar… ⌘K │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   around the target
 *      │░░░ └──────────────┘ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ ┌──────────────────────────────┐ ░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ │ 2 de 5                       │ ░░░░░░░░░░░░░░░░░░░░░░│ ← the card, beside it
 *      │░░░ │ Buscar                       │ ░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ │ Cualquier socio o cuota…     │ ░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ │ Saltar        Atrás Siguiente│ ░░░░░░░░░░░░░░░░░░░░░░│
 *      │░░░ └──────────────────────────────┘ ░░░░░░░░░░░░░░░░░░░░░░│
 *      └──────────────────────────────────────────────────────────┘
 *
 *  Context: a feature nobody can see is a feature nobody uses — quipu's people asked for «a
 *  global search» while ⌘K already opened one. A tour walks a new person through the screen
 *  and names each thing where it is. Every application would otherwise write its own, with
 *  its own card, its own veil and its own bugs on a phone; this is the one.
 *
 *  ── What it points at is what the system already names ─────────────
 *
 *  A step's `target` is a web-ui part (`{ part: "sidebar.search" }`), one item of a
 *  collection (`{ part: "navigation.item", key }`), anything the application marks with a
 *  `GuideSpot`, a selector or a function. No component grows a prop to be pointed at.
 *
 *  ── It never breaks on what is not there ─────────────────────────────
 *
 *  A step waits a moment for its target (after the application's `before()` — a navigation,
 *  a tab to open), and if it never appears the step is skipped in the direction of travel.
 *  A tour written for a screen that changed loses a stop; it does not trap the person.
 *
 *  ── On a phone the sidebar is a drawer ──────────────────────────────
 *
 *  The same sidebar is laid out twice there: hidden beside the view, shown in the drawer. Of
 *  every match the one on screen wins; a target that only exists hidden inside the frame's
 *  sidebar opens the drawer (rendered inside an `AppFrame`), and the next step outside it
 *  closes it again — so does closing the tour.
 *
 *  ── A modal dialog ──────────────────────────────────────────────────
 *
 *  While it explains, the page waits: the veil takes the pointer, the page behind is inert to
 *  a screen reader, the focus stays in the card — on «Siguiente», so Enter walks the tour.
 *  → and ← move too, Escape leaves (`dismiss`), and every new step is announced. The veil
 *  follows the target frame by frame — a drawer sliding in, a list that loads late — so the
 *  cut-out is never somewhere the thing used to be.
 * ==================================================================== */

export type GuideStep = {
  id: string;
  /** What it points at. Without it the card is centred: a welcome, a goodbye. */
  target?: GuideTarget;
  title: string;
  /** What it explains: text, a list, an image, a button that tries the thing. */
  body: ReactNode;
  /** The side of the target the card prefers; it flips when there is no room. `bottom` by
   *  default. */
  placement?: GuideSide;
  /** Runs before the step looks for its target: navigate, open a tab, expand a section. The
   *  tour waits for it, then for the target to appear. */
  before?: () => void | Promise<void>;
};

/** `finish`: the last step's button. `skip`: «Saltar el recorrido». `dismiss`: Escape. */
export type GuideCloseReason = "finish" | "skip" | "dismiss";

export type GuideProps = {
  steps: readonly GuideStep[];
  open: boolean;
  /** The tour wants to close; the application sets `open` to false — and remembers, if it
   *  wants to, that this person has seen it. */
  onClose: (reason: GuideCloseReason, index: number) => void;
  /** A step is on screen: to save how far someone got, to measure. */
  onStepChange?: (index: number, step: GuideStep) => void;
  /** Where it starts each time it opens — to resume a tour left halfway. */
  startAt?: number;
  /** The tour's name, for a screen reader: «Recorrido del portal». */
  label?: string;
};

/** How long a step waits for its target to appear before it is skipped: a list that loads,
 *  a screen the step's `before()` navigated to. Long enough for those, short enough that a
 *  stop that is not there is not a wait. */
const WAIT_FOR_TARGET = 1500;

const SPOT_PADDING = 0.375; // rem — the cut-out's air around the target (`p-1.5`)
const CARD_GAP = 0.75; // rem — between the cut-out and the card
const WINDOW_MARGIN = 1; // rem — the card never comes closer to the window's edge

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const prefersLessMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Scrolled into view only when it is not already whole in it: a tour that scrolls a page
 *  that was fine moves the very thing it is about to explain. */
function bringIntoView(element: Element) {
  const box = boxOf(element);
  const whole =
    box !== null &&
    box.top >= 0 &&
    box.left >= 0 &&
    box.top + box.height <= window.innerHeight &&
    box.left + box.width <= window.innerWidth;
  if (whole) return;
  scrollable(element).scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: prefersLessMotion() ? "auto" : "smooth",
  });
}

type Layout = { target: Box | null; card: Size | null; view: Size };

const same = (a: Layout, b: Layout) => JSON.stringify(a) === JSON.stringify(b);

const rounded = (box: Box | null): Box | null =>
  box === null
    ? null
    : {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };

/**
 * The target's box, the card's size and the window's, measured every frame while the tour is
 * open — and set only when they change.
 *
 * Context: the things a target does while a tour points at it have no single event: a page
 * scrolled into place, a drawer sliding in (a transform), a font loading, a list re-rendering
 * the node. One `getBoundingClientRect` per frame follows all of them, and costs nothing next
 * to a frame. A node React replaced is found again by the same target.
 */
function useLayout(
  active: boolean,
  element: Element | null,
  target: GuideTarget | undefined,
  card: RefObject<HTMLElement | null>,
): Layout {
  const [layout, setLayout] = useState<Layout>({
    target: null,
    card: null,
    view: { width: 0, height: 0 },
  });
  /* Read, not depended on: steps written inline give a new `target` object every render, and
     restarting the loop on each would measure for ever. */
  const latestTarget = useRef(target);
  latestTarget.current = target;
  useEffect(() => {
    if (!active) return;
    let current = element;
    let frame = 0;
    const tick = () => {
      const target = latestTarget.current;
      if (current !== null && !current.isConnected && target !== undefined) {
        current = findTarget(target).shown;
      }
      const node = card.current;
      const next: Layout = {
        target: current === null ? null : rounded(boxOf(current)),
        card: node === null ? null : { width: node.offsetWidth, height: node.offsetHeight },
        view: { width: window.innerWidth, height: window.innerHeight },
      };
      setLayout((previous) => (same(previous, next) ? previous : next));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [active, element, card]);
  return layout;
}

type Request = { index: number; dir: 1 | -1 };
type Shown = { index: number; element: Element | null };

export function Guide({
  steps,
  open,
  onClose,
  onStepChange,
  startAt = 0,
  label,
}: GuideProps) {
  const copy = useUiCopy();
  const drawer = useSidebarDrawer();
  const titleId = useId();
  const bodyId = useId();
  const card = useRef<HTMLElement | null>(null);

  const [request, setRequest] = useState<Request | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  /* Bumped when the tour opens the drawer: the tour's own overlay mounts again ABOVE it, or
     the drawer — the newest modal — would make the card inert. */
  const [layer, setLayer] = useState(0);

  /* The latest props, read by the async step without restarting it: an application that
     writes its `steps` inline gives a new array every render. */
  const latest = useRef({ steps, onClose, onStepChange, drawer });
  latest.current = { steps, onClose, onStepChange, drawer };
  const openedDrawer = useRef(false);
  const returnTo = useRef<HTMLElement | null>(null);

  /* Open: from `startAt`, remembering where the focus was. Closed: the drawer the tour opened
     closes, and the focus goes back — a tour that went through the drawer remounted its
     overlay, and the overlay's own memory of «where the focus was» went with it. */
  useEffect(() => {
    if (!open) return;
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = Math.min(
      Math.max(startAt, 0),
      Math.max(latest.current.steps.length - 1, 0),
    );
    setRequest({ index: first, dir: 1 });
    return () => {
      setRequest(null);
      setShown(null);
      if (openedDrawer.current) latest.current.drawer?.close();
      openedDrawer.current = false;
      const back = returnTo.current;
      requestAnimationFrame(() => {
        const lost =
          document.activeElement === null || document.activeElement === document.body;
        if (lost && back?.isConnected === true) back.focus();
      });
    };
  }, [open, startAt]);

  const close = (reason: GuideCloseReason) =>
    latest.current.onClose(reason, shown?.index ?? request?.index ?? 0);

  /* One step: run its `before`, wait for its target, open or close the drawer for it, bring
     it into view — and only then show it, so the card never names one thing while the veil
     cuts out another. */
  useEffect(() => {
    if (!open || request === null) return;
    let cancelled = false;
    const { steps: all } = latest.current;
    const step = all[request.index];
    if (step === undefined) return;

    const drawerElement = () => {
      const id = latest.current.drawer?.id;
      return id === undefined ? null : document.getElementById(id);
    };

    const seek = async (target: GuideTarget): Promise<Element | null> => {
      const started = performance.now();
      let openedHere = false;
      while (!cancelled) {
        const { shown: found, hidden } = findTarget(target);
        const sheet = latest.current.drawer;
        if (found !== null) {
          const inDrawer = drawerElement()?.contains(found) === true;
          if (!inDrawer && openedDrawer.current && sheet?.isOpen === true) {
            sheet.close();
            openedDrawer.current = false;
          }
          if (openedHere) setLayer((n) => n + 1);
          return found;
        }
        const inSidebar = hidden?.closest('[data-ui="frame.sidebar"]') != null;
        if (inSidebar && sheet !== null && !sheet.isOpen && !openedHere) {
          sheet.open();
          openedDrawer.current = true;
          openedHere = true;
        }
        if (performance.now() - started > WAIT_FOR_TARGET) return null;
        await nextFrame();
      }
      return null;
    };

    /* The step's target is not there: on to the next one in the direction of travel. Past
       the last, the tour is done; before the first, nothing earlier is on screen, so it
       stays where the person is. */
    const skip = () => {
      const next = request.index + request.dir;
      if (next >= 0 && next < all.length) {
        setRequest({ index: next, dir: request.dir });
      } else if (request.dir === 1) {
        latest.current.onClose("finish", request.index);
      } else if (shown !== null) {
        setRequest({ index: shown.index, dir: 1 });
      }
    };

    void (async () => {
      try {
        await step.before?.();
      } catch {
        if (!cancelled) skip();
        return;
      }
      if (cancelled) return;
      const element = step.target === undefined ? null : await seek(step.target);
      if (cancelled) return;
      if (step.target !== undefined && element === null) {
        skip();
        return;
      }
      if (element !== null) bringIntoView(element);
      setShown({ index: request.index, element });
      latest.current.onStepChange?.(request.index, step);
    })();
    return () => {
      cancelled = true;
    };
    // `shown` is read for a skip backwards only; the step must not restart when it lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request]);

  /* The focus on the button that walks the tour, on every step: Enter, Enter, Enter. */
  useEffect(() => {
    if (shown === null) return;
    const frame = requestAnimationFrame(() =>
      card.current?.querySelector<HTMLElement>('[data-emphasis="primary"]')?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [shown, layer]);

  const step = shown === null ? undefined : steps[shown.index];
  const layout = useLayout(
    open && shown !== null,
    shown?.element ?? null,
    step?.target,
    card,
  );

  if (!open || shown === null || step === undefined) return null;

  const index = shown.index;
  const first = index === 0;
  const last = index === steps.length - 1;
  const go = (dir: 1 | -1) => setRequest({ index: index + dir, dir });
  const progress = fillCopy(copy.guide.progress, {
    current: String(index + 1),
    total: String(steps.length),
  });

  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const pad = SPOT_PADDING * rem;
  const spot =
    layout.target === null
      ? null
      : {
          top: layout.target.top - pad,
          left: layout.target.left - pad,
          width: layout.target.width + 2 * pad,
          height: layout.target.height + 2 * pad,
        };
  const place =
    layout.card === null
      ? null
      : placeCard({
          target: spot,
          card: layout.card,
          view: layout.view,
          prefer: step.placement ?? "bottom",
          gap: CARD_GAP * rem,
          margin: WINDOW_MARGIN * rem,
        });

  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) {
      event.preventDefault();
      if (last) close("finish");
      else go(1);
    } else if (event.key === backward && !first) {
      event.preventDefault();
      go(-1);
    }
  };

  return (
    <ModalOverlay
      key={layer}
      isOpen
      isDismissable={false}
      onOpenChange={(next) => {
        if (!next) close("dismiss");
      }}
      className="fixed inset-0 z-60 print:hidden"
      data-ui="guide"
    >
      {spot === null ? (
        <div
          aria-hidden
          data-ui="guide.veil"
          className="absolute inset-0 bg-ui-guide-scrim"
        />
      ) : (
        /* The veil IS the cut-out's shadow: one box around the target throws a spread as
           wide as the window, so the hole is exact, rounded, and glides from one target to
           the next. */
        <div
          aria-hidden
          data-ui="guide.spot"
          className="pointer-events-none fixed rounded-box text-ui-guide-scrim shadow-guide-veil outline-2 outline-surface transition-[top,left,width,height] duration-(--duration-panel) ease-(--ease-out)"
          style={spot}
        />
      )}
      <Modal
        className="fixed w-(--container-guide) outline-0 transition-[top,left] duration-(--duration-panel) ease-(--ease-out)"
        style={
          place === null
            ? { top: 0, left: 0, visibility: "hidden" }
            : { top: place.top, left: place.left }
        }
      >
        <Dialog
          ref={(node) => {
            card.current = node;
          }}
          aria-label={label ?? copy.guide.label}
          aria-describedby={`${titleId} ${bodyId}`}
          data-ui="guide.card"
          data-side={place?.side}
          className="rounded-ui-guide border border-line-strong bg-ui-guide p-4 text-ink shadow-window outline-0"
        >
          <SurfaceProvider value="canvas">
            {/* The arrows walk the tour from anywhere in the card. */}
            <div role="presentation" onKeyDown={onKeyDown} className="flex flex-col gap-2">
              <p data-ui="guide.progress" className="text-micro tabular-nums text-muted">
                {progress}
              </p>
              <h2 id={titleId} data-ui="guide.title" className="text-lead font-semibold">
                {step.title}
              </h2>
              <div id={bodyId} data-ui="guide.body" className="text-meta">
                {step.body}
              </div>
              <div data-ui="guide.actions" className="flex items-center gap-2 pt-2">
                {last ? null : (
                  <Button role="ghost" size="sm" onClick={() => close("skip")}>
                    {copy.guide.skip}
                  </Button>
                )}
                <span className="ms-auto flex items-center gap-2">
                  {first ? null : (
                    <Button size="sm" onClick={() => go(-1)}>
                      {copy.guide.back}
                    </Button>
                  )}
                  <Button
                    role="primary"
                    size="sm"
                    onClick={() => (last ? close("finish") : go(1))}
                  >
                    {last ? copy.guide.finish : copy.guide.next}
                  </Button>
                </span>
              </div>
              {/* Each new step is heard: the focus stays on «Siguiente», so without this a
                screen reader would only hear the button again. */}
              <p className="sr-only" aria-live="polite">
                {fillCopy(copy.guide.step, { progress, title: step.title })}
              </p>
            </div>
          </SurfaceProvider>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
