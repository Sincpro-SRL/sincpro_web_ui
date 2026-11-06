"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useId,
  useRef,
} from "react";

/**
 * A STRIP OF TABS. The same across the whole system.
 *
 * Context: this lived inside the record's header and was called
 * `Aspects`, so the activity —which needs exactly the same— could not
 * use it: a context does not import from another context. The result was a second-hand
 * strip of tabs, with the active one marked differently, on the same
 * screen as the good one.
 *
 * It is a primitive because it does not know what it is separating: a record's
 * faces, the two sources of a history, or whatever comes.
 *
 * ── Why the active one is a folder TAB ──────────────────────────────
 *
 * And not an underline. An underline says «this is chosen»; a tab that sticks out
 * of the border and covers the line says «this is OPEN and what is below is its
 * content», which is the real relationship. The difference matters when there are three and
 * the content below does not change shape when switching from one to another.
 *
 * ── The counter muted at zero ───────────────────────────────────────
 *
 * A zero is drawn, and muted. Hiding it forces you to open the tab to
 * find out it is empty; painting it like the others makes it look as if it has
 * something. «There are none» is information and it is said.
 *
 * ── The counter and the NOTIFICATION are two things ─────────────────
 *
 * The counter says HOW MANY things are behind, and is neutral: «pagos 0» is an
 * answer as valid as «pagos 5». The notification says that something in there
 * ASKS you to look —it failed, changed, arrived— and that is why it has colour and why a
 * zero is not drawn: there is nothing to ask.
 *
 * Confusing them looks like this: a tab with «3» beside it and nobody knows whether it is three
 * things or three problems. They are two marks because they are two questions.
 */

/**
 * SOMETHING IN THIS TAB ASKS FOR ATTENTION.
 *
 * It is not a count: a count says how many things there are and this says there is something to
 * look at. That is why it has colour, why it is not drawn at zero, and why it can
 * live alongside the counter — «pagos 4 ⬤» is four things, one of them
 * rejected.
 */
export type TabNotice = {
  /**
   * What asks for attention, in the product's voice: «3 sin leer», «la
   * factura no se pudo enviar».
   *
   * Required, and for the same reason as in `StatusDot`: a coloured dot without
   * its word beside it forces learning a legend that is written nowhere,
   * and tells nothing to someone who cannot tell red from green. Here
   * the mark speeds up scanning and the word informs — it is read on hover
   * and a screen reader reads it.
   */
  label: string;
  /** How many things ask for it. Without this it is a dot, which is what is used when
   *  something new arrived and counting it adds nothing. A `0` draws nothing: there is
   *  nothing to ask. */
  count?: number;
  /** Of what kind: `bad` something failed, `warn` something warns, `accent` or `info` something
   *  arrived. Without this, `bad` — which is the case this exists for. */
  tone?: Tone;
};

export type TabItem = {
  id: string;
  label: string;
  /** The tab's mark. With three or more, the icon is what is recognised without
   *  reading — and in a narrow strip it is the only thing that survives truncation. */
  icon?: LucideIcon;
  /** How many things are behind. `undefined` = not counted; `0` is drawn
   *  muted, which is different from not counting. */
  count?: number;
  /** That something in here asks you to look. Apart from the counter: see `TabNotice`. */
  notice?: TabNotice;
};

/* The notification's colour. Static and in a table because Tailwind cannot
   compose a class with a variable piece: `bg-${tone}/12` does not exist in the
   stylesheet. */
const NOTICE_TONE: Record<Tone, string> = {
  neutral: "bg-ink/8 text-muted",
  info: "bg-info/12 text-info",
  good: "bg-good/12 text-good",
  warn: "bg-warn/14 text-warn",
  bad: "bg-bad/12 text-bad",
  accent: "bg-accent/14 text-accent",
};

const NOTICE_DOT: Record<Tone, string> = {
  neutral: "bg-muted",
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  accent: "bg-accent",
};

/**
 * The strip only: what each tab opens is drawn by whoever uses it (`Record`, `Activity`).
 *
 * Built on React Aria's `Tabs`, so the strip is a real tab list for the keyboard: the
 * arrows move between tabs and select them, Home/End jump to the ends, and only the open
 * tab is in the Tab order. The hand-written version had the roles and none of the keys.
 */
/* Set by `TabsScope`: the strip and its page share an id, so each tab can say which panel
   it controls and the panel which tab names it. */
const Scope = createContext<string | null>(null);

const tabIdOf = (base: string, id: string) => `${base}-tab-${id}`;
const panelIdOf = (base: string, id: string) => `${base}-panel-${id}`;

/**
 * A notebook whose strip and page are far apart — the record's tabs ride in its header and
 * the page is drawn in its paper. It only shares an id: no box, no context of anything
 * else, so it can wrap a whole record without touching what is inside.
 *
 * Context: it was React Aria's `Tabs`, and that one walks its whole subtree to collect its
 * items — wrapped around a record it collected the breadcrumbs too, and broke them.
 */
export function TabsScope({ children }: { children: ReactNode }) {
  return <Scope value={useId()}>{children}</Scope>;
}

/** The page of the open tab, inside a `TabsScope`. `id` is the tab's. */
export function TabsPanel({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const base = useContext(Scope);
  return (
    <div
      role="tabpanel"
      {...(base === null
        ? {}
        : { id: panelIdOf(base, id), "aria-labelledby": tabIdOf(base, id) })}
      /* Reachable on its own (the ARIA pattern), with the ring every focus stop has. */
      tabIndex={0}
      className={`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * The strip. Inside a `TabsScope` each tab points at its panel; alone it is a strip whose
 * page the caller draws.
 *
 * The keyboard is the ARIA tabs pattern with automatic activation: one tab stop (the open
 * tab), ← / → move AND open (wrapping), Home / End go to the ends.
 */
export function Tabs({
  tabs,
  current,
  onSelect,
  label,
}: {
  tabs: readonly TabItem[];
  current: string;
  onSelect?: (id: string) => void;
  /** The strip's accessible label. Without this, «las caras del registro». */
  label?: string;
}) {
  const copy = useUiCopy();
  const base = useContext(Scope);
  const strip = useRef<HTMLDivElement>(null);

  const go = (to: number) => {
    const next = tabs[(to + tabs.length) % tabs.length];
    if (next === undefined) return;
    onSelect?.(next.id);
    strip.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(next.id)}"]`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = tabs.findIndex((one) => one.id === current);
    const to =
      event.key === "ArrowRight"
        ? at + 1
        : event.key === "ArrowLeft"
          ? at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (to === null) return;
    event.preventDefault();
    go(to);
  };

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label={label ?? copy.record.faces}
      onKeyDown={onKeyDown}
      className="flex min-w-0 flex-wrap items-end gap-1"
    >
      {tabs.map((a) => {
        const Icon = a.icon;
        const empty = a.count === 0;
        /* A zero asks for nothing, so it is not drawn. That is the difference from the
           counter, where «0» is an answer. */
        const notice = a.notice?.count === 0 ? undefined : a.notice;
        const isSelected = a.id === current;
        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            data-tab={a.id}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            {...(base === null
              ? {}
              : { id: tabIdOf(base, a.id), "aria-controls": panelIdOf(base, a.id) })}
            onClick={() => onSelect?.(a.id)}
            className={`inline-flex shrink-0 cursor-default items-center px-3 py-2 text-meta outline-0 transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              isSelected
                ? "-mb-px rounded-t-control border border-b-0 border-line-strong bg-surface font-medium text-ink"
                : "border border-transparent text-muted hover:text-ink"
            }`}
          >
            {/* The word of the notice rides on the content's `title`: a native tooltip
                over the whole tab, for whoever points at the dot. */}
            <span
              className="inline-flex items-center gap-1.5"
              {...(notice === undefined ? {} : { title: notice.label })}
            >
              {Icon === undefined ? null : (
                <Icon
                  className={`size-(--size-icon-sm) shrink-0 ${isSelected ? "text-ink" : "text-muted"}`}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              {a.label}
              {a.count === undefined ? null : (
                <span
                  className={`rounded-pill px-1.5 text-micro tabular-nums ${
                    empty
                      ? "bg-ink/5 text-muted"
                      : isSelected
                        ? "bg-ink/8 text-ink"
                        : "bg-ink/8 text-muted"
                  }`}
                >
                  {a.count.toLocaleString(copy.locale)}
                </span>
              )}
              {/* The notification's word travels INSIDE the tab and not in an
                    `aria-label`: so a screen reader reads it on arrival, and the name
                    keeps containing what is seen — the label and the counter (WCAG 2.5.3). */}
              {notice === undefined ? null : (
                <span className="sr-only">{` · ${notice.label}`}</span>
              )}
              {notice === undefined ? null : notice.count === undefined ? (
                /* Without a number, a dot. The word is not drawn but it is there: in the
                       `title` and in the tab's accessible name. */
                <span
                  className={`size-1.5 shrink-0 rounded-pill ${NOTICE_DOT[notice.tone ?? "bad"]}`}
                  aria-hidden
                />
              ) : (
                <span
                  className={`rounded-pill px-1.5 text-micro font-medium tabular-nums ${
                    NOTICE_TONE[notice.tone ?? "bad"]
                  }`}
                  aria-hidden
                >
                  {notice.count.toLocaleString(copy.locale)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
