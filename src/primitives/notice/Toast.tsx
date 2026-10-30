"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { cn, focusRing } from "@sincpro/web-ui/foundations/variants";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button as AriaButton,
  Link as AriaLink,
  type QueuedToast,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from "react-aria-components";

/* ==================================================================== *
 *  TOAST — what happened while you were looking at something else.
 *
 *  It is the only notice in the system that does NOT live in the view: a
 *  payment is registered and the screen moves on, a bank statement finishes
 *  importing when whoever launched it is already on another record, and the
 *  result has to reach them anyway. Everything else —a form error, an empty
 *  state, a rejection— belongs to the place where it happened and is drawn
 *  there.
 *
 *  ── React Aria's region, our list ───────────────────────────────────
 *
 *  The region and each notice are React Aria's toast (`UNSTABLE_ToastRegion`,
 *  `UNSTABLE_Toast`): the stack is a landmark named «Notices» that F6 reaches
 *  from anywhere on the page, each notice is announced when it appears, the
 *  timers stop while the pointer or the focus is inside the region, and when
 *  the focused notice closes the focus moves to the next one — or back where it
 *  was — instead of falling to the top of the document.
 *
 *  The API stays ours on purpose: `show(spec)` with plain values, a number to
 *  `dismiss` it, a `key` that replaces in place. React Aria's queue is fed from
 *  that list and holds only the behaviour; the ORDER is the list's, which is
 *  what lets a replaced notice keep its place. The `UNSTABLE_` prefix is React
 *  Aria's word for "the API may still change" — it is confined to this file, so
 *  a rename upstream is one import to fix.
 *
 *  ── Why it does not disappear on its own when something went wrong ──
 *
 *  The good ones leave on their own after 8 seconds; the bad ones stay until
 *  somebody closes them. A failure that auto-dismisses is a failure nobody saw,
 *  and with an import that runs for minutes that means launching the same
 *  import again without knowing why the first one failed.
 *
 *  ── The clock stops with the pointer on top ─────────────────────────
 *
 *  Nobody manages to read a two-line notice AND press its «Deshacer» in 8
 *  seconds. If the pointer or the focus is in the stack, the notices stay.
 *
 *  ── It goes bottom right, and stacked ───────────────────────────────
 *
 *  At the top it competes with the application bar; in the middle, it covers the
 *  work. Bottom right is where there is nothing, and stacked means that three
 *  imports finishing at the same time do not overlap each other.
 * ==================================================================== */

export interface ToastSpec {
  /** What happened, in a sentence that stands on its own. */
  message: string;
  tone?: Tone;
  /** The long detail: the server's reason. It goes underneath and small. */
  detail?: string;
  /** Where to go, or how to undo. «Deshacer», «Ver el pago». With `href` a real
   *  link is drawn —it can be opened in another tab, copied, shared—; with
   *  `onSelect`, a button. Either closes the notice. */
  action?: { label: string; onSelect?: () => void; href?: string };
  /** How long it lives, in ms. `0` = until it is closed. By default: the bad
   *  ones stay, the rest leave after 8 s. */
  duration?: number;
  /** The notice's identity. Two notices with the same key are the SAME one: the
   *  new one replaces the old one in its place, without stacking.
   *
   *  Context: the server sends an import's progress over a channel that can
   *  repeat, and three identical stacked notices are not more information —
   *  they are the same information, three times, taking up the screen. */
  key?: string;
}

interface Toast extends ToastSpec {
  id: number;
}

interface ToastApi {
  show: (spec: ToastSpec) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (api === null) {
    throw new Error("useToast needs a <ToastProvider> above it in the tree.");
  }
  return api;
}

/** The same API, or `null` when no `ToastProvider` is above. For a component that OFFERS
 *  undo when the screen has a notice stack and still renders alone — in a story, in a test,
 *  in an app that has not mounted the provider yet. */
export function useToastIfAny(): ToastApi | null {
  return useContext(Ctx);
}

const ICON: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  good: CheckCircle2,
  warn: TriangleAlert,
  bad: XCircle,
  accent: Info,
};

const TONE: Record<Tone, string> = {
  neutral: "text-muted",
  info: "text-info",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  accent: "text-ink",
};

const LIFE = 8000;

/** The default: the bad ones do NOT leave on their own. See the note above. */
function lifeOf(toast: ToastSpec): number {
  return toast.duration ?? (toast.tone === "bad" ? 0 : LIFE);
}

const LINK =
  "self-start rounded-control text-micro font-medium text-primary transition-colors duration-(--duration-instant) hover:underline hover:underline-offset-4 cursor-pointer outline-offset-1";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((spec: ToastSpec) => {
    const id = next.current;
    next.current += 1;
    setToasts((prev) => {
      if (spec.key === undefined) return [...prev, { ...spec, id }];
      const i = prev.findIndex((t) => t.key === spec.key);
      /* Replaces IN ITS PLACE and not at the end: if the notice jumps to the
         bottom of the stack every time it updates, whoever was reading it loses
         it. */
      if (i < 0) return [...prev, { ...spec, id }];
      const n = [...prev];
      n[i] = { ...spec, id };
      return n;
    });
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastLayer toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

/** The region of a given list of notices. `ToastProvider` draws it from its own state; it is
 *  exported so it can be drawn without the context — a story that wants to see the tones
 *  together and still.
 *
 *  Context: React Aria's queue is the behaviour (timers, pause, landmark, focus) and this
 *  list is the content. Each notice in the list is mirrored into the queue once; when the
 *  queue closes one — its timer ran out, its × or its action was pressed — `onDismiss`
 *  hears it, and when the list drops one the queue closes it. */
export function ToastLayer({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}) {
  const copy = useUiCopy();
  const [queue] = useState(() => new ToastQueue<Toast>());
  const [, setVersion] = useState(0);
  const latest = useRef(onDismiss);
  /* The ids the layer is closing because the LIST dropped them: those must not be reported
     back as if the person had closed them. */
  const dropping = useRef(new Set<number>());

  useEffect(() => {
    latest.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const wanted = new Set(toasts.map((t) => t.id));
    const queued = new Set(queue.visibleToasts.map((t) => t.content.id));
    for (const queuedToast of queue.visibleToasts) {
      if (!wanted.has(queuedToast.content.id)) {
        dropping.current.add(queuedToast.content.id);
        queue.close(queuedToast.key);
      }
    }
    for (const toast of toasts) {
      if (queued.has(toast.id)) continue;
      const life = lifeOf(toast);
      queue.add(toast, {
        ...(life > 0 ? { timeout: life } : {}),
        onClose: () => {
          if (dropping.current.delete(toast.id)) return;
          latest.current(toast.id);
        },
      });
    }
    setVersion((v) => v + 1);
  }, [toasts, queue]);

  const byId = new Map(queue.visibleToasts.map((t) => [t.content.id, t]));
  /* Drawn in the LIST's order, oldest at the bottom: the newest notice appears on top of
     the stack and a replaced one stays where it was. */
  const ordered = [...toasts].reverse().flatMap((t) => {
    const queued = byId.get(t.id);
    return queued === undefined ? [] : [{ toast: t, queued }];
  });

  /* Mounted only while there is something to show. React Aria registers the region as an F6
     landmark when it mounts, and it skips the registration if the region's element does not
     exist yet — which is the case for a region mounted empty (it draws nothing until the
     first notice). Mounting it together with its first notice is what makes F6 reach it. */
  if (ordered.length === 0) return null;

  return (
    <ToastRegion
      queue={queue}
      aria-label={copy.shell.notices}
      /* `inset-x-4` with a fixed width and `ml-auto`: that way the notice rests against the
         right but never runs off the left edge on a phone. */
      className={({ isFocusVisible }) =>
        cn(
          "fixed inset-x-4 bottom-4 z-50 ml-auto flex w-(--container-toast) max-w-full flex-col gap-2 rounded-panel outline-offset-4",
          focusRing({ isFocusVisible }),
        )
      }
    >
      {ordered.map(({ toast, queued }) => (
        <ToastCard key={queued.key} toast={toast} queued={queued} queue={queue} />
      ))}
    </ToastRegion>
  );
}

function ToastCard({
  toast,
  queued,
  queue,
}: {
  toast: Toast;
  queued: QueuedToast<Toast>;
  queue: ToastQueue<Toast>;
}) {
  const copy = useUiCopy();
  const tone = toast.tone ?? "neutral";
  const Icon = ICON[tone];
  const close = () => queue.close(queued.key);
  const action = toast.action;

  return (
    <AriaToast
      toast={queued}
      className={({ isFocusVisible }) =>
        cn(
          "flex min-w-0 items-start gap-2.5 rounded-panel border border-line bg-surface px-3.5 py-3 shadow-float outline-offset-2",
          focusRing({ isFocusVisible }),
        )
      }
    >
      <Icon
        className={`mt-px size-(--size-icon-md) shrink-0 ${TONE[tone]}`}
        strokeWidth={2}
        aria-hidden
      />

      <ToastContent className="flex min-w-0 flex-1 flex-col gap-1">
        <Text slot="title" className="text-meta text-ink">
          {toast.message}
        </Text>
        {toast.detail === undefined ? null : (
          <Text slot="description" className="text-micro text-muted">
            {toast.detail}
          </Text>
        )}
      </ToastContent>

      {action === undefined ? null : action.href !== undefined ? (
        <AriaLink
          href={action.href}
          onPress={close}
          className={({ isFocusVisible }) => cn(LINK, "mt-px", focusRing({ isFocusVisible }))}
        >
          {action.label}
        </AriaLink>
      ) : (
        <AriaButton
          onPress={() => {
            action.onSelect?.();
            close();
          }}
          className={({ isFocusVisible }) => cn(LINK, "mt-px", focusRing({ isFocusVisible }))}
        >
          {action.label}
        </AriaButton>
      )}

      <AriaButton
        slot="close"
        aria-label={copy.shell.closeNotice}
        className={({ isFocusVisible }) =>
          cn(
            "-mt-0.5 -mr-1 inline-flex size-6 shrink-0 cursor-default items-center justify-center rounded-pill text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink pressed:bg-ink/10",
            focusRing({ isFocusVisible }),
          )
        }
      >
        <X className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
      </AriaButton>
    </AriaToast>
  );
}
