"use client";

import type { Message } from "@sincpro/web-ui/components/activity/Messages";
import { usePagination } from "@sincpro/web-ui/components/listing/pages";
import { Pagination } from "@sincpro/web-ui/components/listing/Pagination";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { SegmentedControl } from "@sincpro/web-ui/primitives/choice/SegmentedControl";
import { type NoteEntry, useNoteEntries } from "@sincpro/web-ui/primitives/field/note";
import { Callout, type CalloutProps } from "@sincpro/web-ui/primitives/notice/Callout";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { DateValue } from "@sincpro/web-ui/primitives/value/Fecha";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import type { LucideIcon } from "lucide-react";
import {
  Activity as ActivityIcon,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CornerDownRight,
  History,
  Info,
  Lock,
  MessageSquare,
  OctagonAlert,
  PanelRightClose,
  PanelRightOpen,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Fragment, type ReactNode, useId, useState } from "react";

/* ==================================================================== *
 *  ACTIVITY — everything AROUND a record, in one column.
 *
 *  Odoo calls it the chatter. Here it is the record's activity: not the
 *  record's data but its situation — two questions, answered one above the
 *  other and never mixed, BOTH always in sight:
 *
 *      Avisos           what is true NOW: the record's notices (`Record.Notice`),
 *                       each with its action, and the notes of its fields and
 *                       rows, each saying what it belongs to and taking you there.
 *                       A notice has no date — it is a state. Compact: the first
 *                       three, and the rest one press away, so a record with ten
 *                       notices never pushes its history out of sight.
 *      Línea de tiempo  what HAPPENED, in order: the messages, the internal notes
 *                       and the system's events interleaved by time, newest first,
 *                       separated by day («Hoy», «Ayer», «13 de octubre») — the
 *                       record's history read top to bottom, Odoo's chatter. It is
 *                       what everybody reads, so it is never behind a switch.
 *                       Filters narrow it to one kind (messages, notes, events);
 *                       the box to write in heads it.
 *
 *  Grouping the history by KIND (all messages, then all events) broke the one
 *  thing a history is for: knowing what came before what — that the price was
 *  changed AFTER the customer complained. So it is one stream, by time.
 *
 *  What is WRONG with the record (`tone="bad"`) is not here: it stays visible
 *  between the rail and the sheet, where nobody can fold it away.
 *
 *  ── At the right of the sheet, or below it ──────────────────────────
 *
 *  `layout="auto"` (the default) asks the record's page (`@container/page`,
 *  which `Record` declares) whether it is `--container-beside` wide: then the
 *  panel is a `--container-activity` column at the RIGHT of the sheet, joined
 *  to it. Narrower, it is a card below the sheet, at the sheet's width, with the
 *  same two parts. `below` always puts it below.
 *  Standalone —outside a record— there is no such container: the card.
 *
 *  ── Open by default, and folded it still says something ─────────────
 *
 *  On a big screen you see directly what the record has. Folded it is a strip
 *  that says how many notices, messages and entries there are — nothing hides
 *  silently. Remembering it between records is the app's (`open`).
 * ==================================================================== */

/**
 * Algo que el sistema anotó.
 *
 * Deliberadamente NO es el evento del producto: lo que una historia necesita
 * para dibujar uno es qué pasó, cuándo, quién, y —cuando las hay— las tres cosas
 * que uno termina yendo a buscar a otro lado.
 *
 *     by       QUIÉN. Ausente = lo hizo el sistema, que también es una respuesta.
 *     moved    DE QUÉ A QUÉ. «borrador → confirmado» se lee de una.
 *     error    QUÉ falló, entero y textual: quien mira esta pantalla muchas
 *              veces no tiene acceso a los logs.
 */
export type ActivityEvent = {
  id: string;
  /** Qué pasó, en una oración y en pasado. */
  label: ReactNode;
  at: Date | string | number;
  tone?: Tone;
  /** Quién lo hizo. Ausente = el sistema. */
  by?: string;
  /** El cambio de estado, cuando lo hubo. `from` ausente = nació así. */
  moved?: { from?: string; to: string };
  /** Lo que hay que saber además del título, cuando el título no alcanza. */
  detail?: ReactNode;
  /** Lo que falló, textual. Se muestra la PRIMERA línea y el resto se abre. */
  error?: string;
  /** El ícono del punto, cuando el rayo no dice lo suficiente. */
  icon?: LucideIcon;
};

/** A notice of the record, as the panel lists it: a `Callout` without its × label. */
export type ActivityAlert = Omit<CalloutProps, "dismissLabel">;

/** `auto`: beside the sheet when the record is wide, below when not. `below`: always below. */
export type ActivityLayout = "auto" | "below";

/** What the timeline shows: everything, or one kind of entry. */
type StreamFilter = "all" | "conversation" | "notes" | "events";

type StreamEntry =
  | { kind: "message"; at: number; id: string; message: Message }
  | { kind: "event"; at: number; id: string; event: ActivityEvent };

/** The day an instant falls on, here — a `YYYY-MM-DD` key in local time. */
function dayKey(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** How a day separator reads: «Hoy», «Ayer», or the date — with the year only when it is
 *  not this one, since «13 de octubre» is all a recent history needs. */
function dayLabel(
  key: string,
  locale: string,
  words: { today: string; yesterday: string },
  now = new Date(),
): string {
  const today = dayKey(now.getTime());
  const yesterday = dayKey(now.getTime() - 86_400_000);
  if (key === today) return words.today;
  if (key === yesterday) return words.yesterday;
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(y === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export type ActivityProps = {
  /** What people wrote. Absent —not empty— while there is no service behind it:
   *  an empty thread says «nobody wrote yet», which is a different claim. */
  messages?: readonly Message[];
  /** What the system logged. */
  events?: readonly ActivityEvent[];
  /** What is true now about the record, in urgency order — `Record` passes its notices. */
  alerts?: readonly ActivityAlert[];
  /** The id of the notices section: where the rail's indicator sends the focus. */
  alertsId?: string;
  /** The box to write in, when this record takes messages. It heads the conversation:
   *  writing is the thing you came to do, reading is what you do next. */
  composer?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** The panel's name. «Actividad» by default. */
  label?: string;
  layout?: ActivityLayout;
};

/* The most urgent tone first: the alerts' count takes the tone of the first. */
const URGENCY: Record<NonNullable<ActivityAlert["tone"]>, number> = {
  bad: 0,
  warn: 1,
  info: 2,
  good: 3,
};

function mostUrgent(
  alerts: readonly { tone?: ActivityAlert["tone"] }[],
): NonNullable<ActivityAlert["tone"]> {
  return alerts.reduce<NonNullable<ActivityAlert["tone"]>>((best, one) => {
    const tone = one.tone ?? "info";
    return URGENCY[tone] < URGENCY[best] ? tone : best;
  }, "good");
}

/* The tone's shape, the same as `Callout`'s: a triangle warns, an «i» informs. */
const ALERT_ICON: Record<NonNullable<ActivityAlert["tone"]>, LucideIcon> = {
  bad: OctagonAlert,
  warn: TriangleAlert,
  info: Info,
  good: CheckCircle2,
};

/* ONE icon for every event: the bolt, which is what happened — something ran. One per
   tone turned the history into a sample book; what has to stand out is a failure, and
   that is said by the row's tint. */
const EVENT_ICON: LucideIcon = Zap;

const NODE_SKIN = {
  ok: "bg-ink/8 text-muted",
  failed: "bg-bad/12 text-bad",
} as const;

function at(when: Date | string | number): number {
  return when instanceof Date ? when.getTime() : new Date(when).getTime();
}

/* The stream's two kinds of entry share one GEOMETRY: a 1.5rem disc (the face, or the
   event's node) on the left, the text beside it, the meta line under it. Two geometries
   in one list read as two lists glued together. */

function MessageEntry({ message }: { message: Message }) {
  const copy = useUiCopy();
  const internal = message.internal === true;
  return (
    <li className="flex min-w-0 gap-2.5 px-2 py-2">
      <Avatar name={message.author} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-meta font-medium text-ink">{message.author}</span>
          <span className="text-micro text-muted">
            <DateValue when={message.at} format="relative" />
          </span>
          {internal ? (
            <span
              className="inline-flex items-center gap-1 text-micro text-muted"
              title={copy.activity.internalNote}
            >
              <Lock className="size-3" aria-hidden />
              {copy.activity.internal}
            </span>
          ) : null}
        </div>
        {/* A message is somebody speaking, so it sits in a bubble on the ground; an
            internal note is the same bubble with a warm edge — the mark that it does not
            leave the building, and the lock says it in words too. */}
        <p
          className={cn(
            "max-w-(--container-prose) rounded-box px-2.5 py-1.5 text-body whitespace-pre-line text-ink",
            internal ? "border border-warn/35 bg-warn/6" : "bg-ground",
          )}
        >
          {message.body}
        </p>
      </div>
    </li>
  );
}

/** The change of state: from what to what. The old one quiet, the new one in ink. */
const STATE_CHIP =
  "inline-flex max-w-32 min-w-0 items-center truncate rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro";

function Moved({ from, to }: { from?: string; to: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {from === undefined ? null : (
        <>
          <span className={`${STATE_CHIP} text-muted`}>{from}</span>
          <ArrowRight className="size-3 shrink-0 text-muted" strokeWidth={2.5} aria-hidden />
        </>
      )}
      <span className={`${STATE_CHIP} font-medium text-ink`}>{to}</span>
    </span>
  );
}

/** The error: the first line, and the rest one press away — kept, not dropped. */
function ErrorLine({ error }: { error: string }) {
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const lines = error.split("\n");
  const first = lines[0] ?? "";
  const more = lines.length > 1 || first.length > 120;

  return (
    <div className="min-w-0 rounded-control border border-line bg-surface px-2 py-1">
      <p
        className={`min-w-0 font-mono text-micro text-ink ${
          open ? "break-words whitespace-pre-wrap" : "truncate"
        }`}
      >
        {open ? error : first}
      </p>
      {!more ? null : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-0.5 cursor-pointer text-micro text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {open ? copy.activity.less : copy.activity.more}
        </button>
      )}
    </div>
  );
}

/**
 * UN EVENTO: a row that opens, not a line.
 *
 * Closed it says what happened —in up to two lines, never cut to «se envió …»— and
 * under it who and when, in the quiet size. That second line is what made the narrow
 * column legible: side by side, the name and the date took half the width and the
 * label was clipped to three words. A failure tints the row; the rest stays ink.
 */
function EventEntry({ event }: { event: ActivityEvent }) {
  const copy = useUiCopy();
  const failed = event.tone === "bad" || event.error !== undefined;
  const skin = failed ? "failed" : "ok";
  const Icon = event.icon ?? EVENT_ICON;
  const [open, setOpen] = useState(false);
  const more =
    event.moved !== undefined || event.detail !== undefined || event.error !== undefined;

  const row = (
    <>
      <span
        className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-pill ring-2 ring-surface ${NODE_SKIN[skin]}`}
      >
        <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-meta text-ink">{event.label}</span>
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-micro text-muted">
          <span className="truncate">{event.by ?? copy.activity.bySystem}</span>
          <span aria-hidden>·</span>
          <DateValue when={event.at} format="relative" />
        </span>
      </span>
      {more ? (
        <ChevronRight
          className={`mt-1 size-3.5 shrink-0 text-muted transition-transform duration-(--duration-instant) ${
            open ? "rotate-90" : ""
          }`}
          strokeWidth={2.5}
          aria-hidden
        />
      ) : null}
    </>
  );

  const box = `flex w-full min-w-0 items-start gap-2.5 rounded-control px-2 py-2 text-left ${
    failed ? "bg-bad/6" : ""
  }`;

  return (
    <li className="group/event relative">
      {/* THE RAIL, behind the nodes and across the gap to the next one: what makes this a
          chronology and not lines that happen to have a date. */}
      <span
        aria-hidden
        className="absolute top-8 bottom-0 left-5 w-px bg-line group-last/event:hidden"
      />
      {more ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`${box} cursor-pointer transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary ${
            failed ? "hover:bg-bad/10" : "hover:bg-ink/4"
          }`}
        >
          {row}
        </button>
      ) : (
        <div className={box}>{row}</div>
      )}
      {!open ? null : (
        <div className="mb-1 ml-10.5 flex min-w-0 flex-col gap-1.5 rounded-control bg-ground px-2.5 py-2">
          {event.moved === undefined ? null : (
            <Moved
              {...(event.moved.from === undefined ? {} : { from: event.moved.from })}
              to={event.moved.to}
            />
          )}
          {event.detail === undefined ? null : (
            <div className="min-w-0 text-micro text-muted">{event.detail}</div>
          )}
          {event.error === undefined ? null : <ErrorLine error={event.error} />}
        </div>
      )}
    </li>
  );
}

/** Takes you to the field or row a note belongs to, and lights it for a moment so the eye
 *  lands on it. The light is the system's focus colour, faded out; with reduced motion it
 *  is shown and removed without the fade. */
function goTo(entry: NoteEntry) {
  const target = entry.anchor();
  if (target === null) return;
  const still =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
  target.animate(
    [
      {
        boxShadow: "0 0 0 0.125rem var(--color-primary)",
        borderRadius: "var(--radius-control)",
      },
      { boxShadow: "0 0 0 0.125rem transparent", borderRadius: "var(--radius-control)" },
    ],
    { duration: still ? 1 : 1800, easing: "ease-out", delay: still ? 1200 : 300 },
  );
}

/** A field note or row flag in the timeline: its sentence, and WHAT it belongs to — a link
 *  that takes you there. */
function NoteLine({ entry }: { entry: NoteEntry }) {
  const copy = useUiCopy();
  const tone = entry.note.tone ?? "info";
  const Icon = ALERT_ICON[tone];
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => goTo(entry)}
        title={
          entry.owner === ""
            ? undefined
            : fillCopy(copy.activity.goTo, { owner: entry.owner })
        }
        className="flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-(--duration-instant) hover:bg-ink/4 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary"
      >
        <span className={`mt-0.5 shrink-0 ${TONE_TEXT[tone]}`}>
          <Icon className="size-(--size-icon-sm)" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-meta text-ink">{entry.note.label}</span>
          {entry.owner === "" ? null : (
            <span className="flex min-w-0 items-center gap-1 text-micro text-muted">
              <CornerDownRight className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{entry.owner}</span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

const TONE_TEXT: Record<NonNullable<ActivityAlert["tone"]>, string> = {
  bad: "text-bad",
  warn: "text-warn",
  info: "text-info",
  good: "text-good",
};

export function Activity({
  messages,
  events,
  alerts = [],
  alertsId: ownAlertsId,
  composer,
  open,
  onToggle,
  label: ownLabel,
  layout = "auto",
}: ActivityProps) {
  const copy = useUiCopy();
  const label = ownLabel ?? copy.activity.title;
  const titleId = useId();
  const autoAlertsId = useId();
  const alertsId = ownAlertsId ?? autoAlertsId;
  const auto = layout === "auto";
  /* The notes of the fields and rows of the record around — `Record` keeps them. */
  const notes = useNoteEntries();

  const byTime = <T extends { at: Date | string | number }>(items: readonly T[]) =>
    [...items].sort((x, y) => at(y.at) - at(x.at));
  const said = byTime(messages ?? []);
  const logged = byTime(events ?? []);
  const notices = alerts.length + notes.length;
  const tones = [
    ...alerts.map((a) => a.tone ?? "info"),
    ...notes.map((n) => n.note.tone ?? "info"),
  ];
  const alertTone =
    tones.length === 0 ? undefined : mostUrgent(tones.map((tone) => ({ tone })));
  const AlertIcon = ALERT_ICON[alertTone ?? "info"];
  /* ONE stream, by time: what happened before what is the whole point of a history. */
  const [filter, setFilter] = useState<StreamFilter>("all");
  const stream: StreamEntry[] = [
    ...said.map((message) => ({
      kind: "message" as const,
      at: at(message.at),
      id: `m-${message.id}`,
      message,
    })),
    ...logged.map((event) => ({
      kind: "event" as const,
      at: at(event.at),
      id: `e-${event.id}`,
      event,
    })),
  ].sort((x, y) => y.at - x.at);
  const kept = stream.filter((entry) =>
    filter === "all"
      ? true
      : filter === "events"
        ? entry.kind === "event"
        : entry.kind === "message" &&
          (filter === "notes") === (entry.message.internal === true),
  );
  const pages = usePagination(kept, { pageSize: 20 });
  const counts = {
    conversation: said.filter((m) => m.internal !== true).length,
    notes: said.filter((m) => m.internal === true).length,
    events: logged.length,
  };

  /* The notices, compact: the first three, the rest one press away. */
  const [allAlerts, setAllAlerts] = useState(false);
  const SHOWN = 3;

  /* A count with its shape and, for a screen reader, its word: «💬 1» is «Conversación 1». */
  const counted = (Icon: LucideIcon, n: number, word: string) => (
    <span className="inline-flex shrink-0 items-center gap-1 text-micro text-muted tabular-nums">
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      {n}
      <span className="sr-only">{word}</span>
    </span>
  );

  /* ── Folded: a strip that still says how much there is ──────────── */
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        /* Named by what it shows — «Actividad, 2 avisos, 1 Conversación, 5 Historial» —
           so the counts are heard too; the tooltip says what pressing it does. */
        title={fillCopy(copy.activity.open, { label })}
        aria-expanded={false}
        data-activity="folded"
        className={cn(
          "flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-box border border-line bg-surface px-3 py-2.5 text-left transition-colors duration-(--duration-instant) hover:bg-ink/3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          /* Beside the sheet it folds to a slim column JOINED to it: the toggle on top
             where the eye starts, and under it the counts, stacked — nothing hidden
             silently. The sheet's own right edge is the hairline between the two. */
          auto &&
            "@beside/page:w-auto @beside/page:flex-col @beside/page:justify-start @beside/page:gap-3 @beside/page:rounded-l-none @beside/page:border-l-0 @beside/page:px-2 @beside/page:py-3",
        )}
      >
        <span className={cn("hidden shrink-0 text-muted", auto && "@beside/page:block")}>
          <PanelRightOpen className="size-(--size-icon-md)" aria-hidden />
        </span>
        <ActivityIcon
          className={cn(
            "size-(--size-icon-md) shrink-0 text-muted",
            auto && "@beside/page:hidden",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 truncate text-meta font-medium text-ink",
            auto && "@beside/page:sr-only",
          )}
        >
          {label}
        </span>
        {alertTone === undefined ? null : (
          <Tag tone={alertTone}>
            {/* In the slim column the word goes and the tone's SHAPE stays with the number —
                never the colour alone; a screen reader still hears «2 avisos». */}
            <span
              className={cn("hidden items-center gap-1", auto && "@beside/page:inline-flex")}
            >
              <AlertIcon className="size-3" strokeWidth={2.5} aria-hidden />
              {notices}
            </span>
            <span className={cn(auto && "@beside/page:sr-only")}>
              {fillCopy(notices === 1 ? copy.record.noticeOne : copy.record.noticeMany, {
                count: notices,
              })}
            </span>
          </Tag>
        )}
        {messages === undefined
          ? null
          : counted(MessageSquare, said.length, copy.activity.conversation)}
        {events === undefined ? null : counted(History, logged.length, copy.activity.history)}
        <span className={cn("ml-auto shrink-0 text-muted", auto && "@beside/page:hidden")}>
          <ChevronDown className="size-(--size-icon-md)" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      data-activity="open"
      className={cn(
        "flex w-full min-w-0 flex-col rounded-box border border-line bg-surface",
        /* Beside the sheet: its column, joined to it — the sheet's right edge is the line. */
        auto &&
          "@beside/page:w-(--container-activity) @beside/page:rounded-l-none @beside/page:border-l-0",
      )}
    >
      <header className="flex min-w-0 items-center gap-2 border-b border-line py-1.5 pr-1.5 pl-3">
        <ActivityIcon className="size-(--size-icon-md) shrink-0 text-muted" aria-hidden />
        <h2 id={titleId} className="min-w-0 truncate text-meta font-semibold text-ink">
          {label}
        </h2>
        <span className="ml-auto flex shrink-0">
          {/* The fold says where the panel goes: up when it is below the sheet, to the
              right when it is beside it. One of the two is drawn, by the same query that
              placed the panel. */}
          <span className={cn("flex", auto && "@beside/page:hidden")}>
            <IconButton
              icon={ChevronUp}
              label={fillCopy(copy.activity.fold, { label })}
              onClick={onToggle}
            />
          </span>
          {auto ? (
            <span className="hidden @beside/page:flex">
              <IconButton
                icon={PanelRightClose}
                label={fillCopy(copy.activity.fold, { label })}
                onClick={onToggle}
              />
            </span>
          ) : null}
        </span>
      </header>

      {notices === 0 ? null : (
        /* NOW, before what happened. The rail's indicator sends the focus here, so it is
           focusable without being a tab stop. */
        <section
          id={alertsId}
          tabIndex={-1}
          aria-label={copy.activity.alerts}
          data-activity-alerts=""
          className="flex min-w-0 scroll-mt-(--size-appbar) flex-col gap-2 border-b border-line px-3 py-3 outline-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          <h3 className="flex items-center gap-2 px-1 text-micro font-medium text-muted">
            {copy.activity.alerts}
            <Tag tone={alertTone ?? "info"}>{notices}</Tag>
          </h3>
          {(() => {
            const rows: { key: string; node: ReactNode }[] = [
              ...alerts.map(({ children, ...alert }, i) => ({
                key: `a${i}`,
                node: (
                  <Callout {...alert} dismissLabel={copy.shell.closeNotice}>
                    {children}
                  </Callout>
                ),
              })),
              ...notes.map((entry) => ({
                key: entry.id,
                node: (
                  <ul className="-mx-1 flex min-w-0 flex-col">
                    <NoteLine entry={entry} />
                  </ul>
                ),
              })),
            ];
            const shown = allAlerts ? rows : rows.slice(0, SHOWN);
            return (
              <>
                {shown.map((row) => (
                  <Fragment key={row.key}>{row.node}</Fragment>
                ))}
                {rows.length <= SHOWN ? null : (
                  <button
                    type="button"
                    aria-expanded={allAlerts}
                    onClick={() => setAllAlerts(!allAlerts)}
                    className="self-start rounded-control px-1 text-micro font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {allAlerts
                      ? copy.activity.fewerAlerts
                      : fillCopy(copy.activity.moreAlerts, { count: rows.length - SHOWN })}
                  </button>
                )}
              </>
            );
          })()}
        </section>
      )}

      {/* WHAT HAPPENED — always in sight: it is what everybody comes to read. */}
      <section
        aria-label={copy.activity.viewTimeline}
        className="flex min-w-0 flex-col gap-3 px-3 py-3"
      >
        <h3 className="px-1 text-micro font-medium text-muted">
          {copy.activity.viewTimeline}
        </h3>
        {/* Writing heads the history: it is the thing you came to do; reading is next. */}
        {composer}
        {stream.length === 0 ? null : (
          <SegmentedControl
            size="sm"
            aria-label={copy.activity.filters}
            value={filter}
            onChange={(next) => setFilter(next as StreamFilter)}
            options={[
              { value: "all", label: copy.activity.filterAll },
              ...(messages === undefined
                ? []
                : [
                    {
                      value: "conversation",
                      label: `${copy.activity.filterConversation} · ${counts.conversation}`,
                    },
                    {
                      value: "notes",
                      label: `${copy.activity.filterNotes} · ${counts.notes}`,
                    },
                  ]),
              ...(events === undefined
                ? []
                : [
                    {
                      value: "events",
                      label: `${copy.activity.filterEvents} · ${counts.events}`,
                    },
                  ]),
            ]}
          />
        )}
        {stream.length === 0 ? (
          <p className="px-1 text-meta text-muted">
            {messages === undefined ? copy.activity.emptyEvents : copy.activity.emptyMessages}
          </p>
        ) : kept.length === 0 ? (
          <p className="px-1 text-meta text-muted">{copy.activity.emptyFilter}</p>
        ) : (
          <>
            <ol
              aria-label={copy.activity.viewTimeline}
              className="-mx-1 flex min-w-0 flex-col"
            >
              {pages.pageItems.map((entry, i) => {
                const day = dayKey(entry.at);
                const before = pages.pageItems[i - 1];
                const newDay = before === undefined || dayKey(before.at) !== day;
                return (
                  <Fragment key={entry.id}>
                    {newDay ? (
                      /* The day: a quiet rule with its name, so «what happened on the 13th»
                         is found by scanning, not by reading every date. */
                      <li
                        aria-hidden
                        className="flex items-center gap-2 px-1 pt-2 pb-1 text-micro font-medium text-muted first:pt-0"
                      >
                        <span className="first-letter:uppercase">
                          {dayLabel(day, copy.locale, {
                            today: copy.activity.today,
                            yesterday: copy.activity.yesterday,
                          })}
                        </span>
                        <span className="h-px flex-1 bg-line" />
                      </li>
                    ) : null}
                    {entry.kind === "message" ? (
                      <MessageEntry message={entry.message} />
                    ) : (
                      <EventEntry event={entry.event} />
                    )}
                  </Fragment>
                );
              })}
            </ol>
            {kept.length <= 20 ? null : <Pagination {...pages.bridge} />}
          </>
        )}
      </section>
    </section>
  );
}

/** Whether a standalone activity panel is open. Inside a `Record`, `Record.Activity`
 *  keeps this state itself (open by default: on a big screen you see what the record has). */
export function useActivity(initial = true) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    toggle: () => setOpen((current) => !current),
    /** Open it without closing it if it already was. */
    show: () => setOpen(true),
  };
}
