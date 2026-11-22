"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import { AlertTriangle, Check, Copy, type LucideIcon, PackageX } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Context: the ways a view says there is no content yet, and they are
 * different because each one is fixed by a different person.
 *
 *     Skeleton  the content is coming. The silhouette stays so the eye
 *               knows where the rows will land.
 *     Empty     there is nothing yet, or the filter left nothing. It is NORMAL.
 *     Failed    something broke. It carries the backend's sentence whole and
 *               verbatim.
 *     Missing   nobody knows how to resolve this. It is a wiring error.
 *
 * A generic «something went wrong» for all four forces you to open the console.
 * A loading sentence drawn with `Empty` is the same mistake: it answers
 * «there is nothing» while the data is still on its way.
 */

/** Quiet stand-in for a list that has not arrived.
 *
 *  The bars are the row: a name on the left, a figure on the right. That is
 *  the scan of a list, held in place so the page does not jump when the rows
 *  land. There is no shimmer. A pulse already means «this state is alive»
 *  (`StatusDot`); a second one would spend motion on a wait. The sentence is
 *  for the screen reader — the bars are not the message. */
const SKELETON_NAME = ["w-48", "w-36", "w-56", "w-40", "w-44", "w-32"] as const;

/** The silhouette's shape: the one of what is coming. */
export type SkeletonShape = "rows" | "table" | "tiles" | "board";

const BAR = "rounded-control bg-ink/8";
const BAR_QUIET = "rounded-control bg-ink/5";

function SkeletonRows({ rows }: { rows: number }) {
  const d = useDensity();
  return Array.from({ length: rows }, (_, i) => (
    <div
      key={i}
      aria-hidden
      className={`flex items-center ${byDensity(d, "gap-3 px-2 py-2", "gap-2 px-1.5 py-1")}`}
    >
      <span className={`h-3.5 ${BAR} ${SKELETON_NAME[i % SKELETON_NAME.length]}`} />
      <span className={`ml-auto h-3 w-14 ${BAR_QUIET}`} />
    </div>
  ));
}

/* A header and four columns: a name, two short facts, a figure on the right — the scan of a
   table, so the columns land where the bars were. */
function SkeletonTable({ rows }: { rows: number }) {
  const d = useDensity();
  const cell = byDensity(d, "px-3 py-2.5", "px-2 py-1.5");
  return (
    <div aria-hidden className="flex flex-col">
      <div className={`flex items-center gap-6 border-b border-line ${cell}`}>
        <span className={`h-2.5 w-20 ${BAR_QUIET}`} />
        <span className={`h-2.5 w-16 ${BAR_QUIET}`} />
        <span className={`h-2.5 w-14 ${BAR_QUIET}`} />
        <span className={`ml-auto h-2.5 w-14 ${BAR_QUIET}`} />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex items-center gap-6 border-b border-line/60 ${cell}`}>
          <span className={`h-3.5 ${BAR} ${SKELETON_NAME[i % SKELETON_NAME.length]}`} />
          <span className={`h-3 w-16 ${BAR_QUIET}`} />
          <span className={`h-3 w-12 ${BAR_QUIET}`} />
          <span className={`ml-auto h-3 w-16 ${BAR}`} />
        </div>
      ))}
    </div>
  );
}

/* Cards of the grid's width: the picture's box at the tile's proportion, a name, a figure. */
function SkeletonTiles({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="grid grid-cols-(--grid-tiles-md) gap-3 p-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-ui-record-card border border-line p-2"
        >
          <span className={`aspect-(--aspect-tile) w-full ${BAR_QUIET}`} />
          <span className={`h-3.5 w-3/4 ${BAR}`} />
          <span className={`h-3 w-1/3 ${BAR_QUIET}`} />
        </div>
      ))}
    </div>
  );
}

/* Three lanes with a few cards each — not the real count, the board's shape. */
function SkeletonBoard() {
  const cards = [3, 2, 1];
  return (
    <div aria-hidden className="flex items-start gap-3 overflow-hidden p-3">
      {cards.map((n, lane) => (
        <div
          key={lane}
          className="flex w-(--container-lane) shrink-0 flex-col gap-2 rounded-box bg-ink/3 p-2"
        >
          <span className={`h-3 w-24 ${BAR}`} />
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-ui-record-card border border-line bg-surface p-3"
            >
              <span
                className={`h-3.5 ${BAR} ${SKELETON_NAME[(lane + i) % SKELETON_NAME.length]}`}
              />
              <span className={`h-3 w-20 ${BAR_QUIET}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Quiet stand-in for what has not arrived, in ITS shape.
 *
 *  Context: the bars are the content's scan held in place — a list's name and figure, a
 *  table's columns, a grid's cards, a board's lanes — so the page does not jump when the data
 *  lands. Rows for a grid of products was a jump from lines to boxes; each presentation now
 *  waits in its own shape (`List` picks it). There is no shimmer: a pulse already means «this
 *  state is alive» (`StatusDot`), a second one would spend motion on a wait. The sentence is for
 *  the screen reader — the bars are not the message. */
export function Skeleton({
  rows = 6,
  label,
  shape = "rows",
}: {
  /** How many silhouettes — rows, or cards in a grid. Six is a screen, not a guess at the
   *  real count. */
  rows?: number;
  /** What a screen reader hears. The bars stay silent. */
  label: string;
  shape?: SkeletonShape;
}) {
  return (
    /* It appears late (`animate-reveal-late`): a read faster than 200ms never shows it. */
    <div
      aria-busy="true"
      data-ui="skeleton"
      data-shape={shape}
      className="flex animate-reveal-late flex-col"
    >
      <span className="sr-only">{label}</span>
      {shape === "table" ? (
        <SkeletonTable rows={rows} />
      ) : shape === "tiles" ? (
        <SkeletonTiles rows={rows} />
      ) : shape === "board" ? (
        <SkeletonBoard />
      ) : (
        <SkeletonRows rows={rows} />
      )}
    </div>
  );
}

export type EmptyProps = {
  sentence: string;
  action?: ReactNode;
  /** Centered for an empty list; left-aligned inside a block, where centering it
   *  detaches it from everything else. */
  align?: "center" | "start";
  /** A heading over the sentence, for an empty that IS the page — «Todavía no tenés pedidos» —
   *  rather than a quiet line inside a panel. */
  title?: string;
  /** A mark in a soft disc above the title: what the place holds (a cart, an invoice). */
  icon?: LucideIcon;
  /** The application's own art, in place of the icon: a shop's drawing, a brand's mascot. It
   *  is decoration — the title and the sentence carry the meaning — so it is hidden from a
   *  screen reader. */
  illustration?: ReactNode;
};

/**
 * Nothing here yet — or the filter left nothing. It is NORMAL, and it says what to do.
 *
 * Context: two sizes from the same piece. Bare — a sentence and maybe a button — it is the
 * quiet line inside a panel (an empty chart, no attachments), as it always was. With a `title`
 * and an `icon` or an `illustration` it is the empty that IS the screen — a shop's empty cart,
 * a portal's «no orders yet», a module the company has not used — where a lone grey sentence
 * in the middle of a white page reads as broken. The picture is never the message: it is
 * hidden from a screen reader, and the title says what the drawing shows.
 */
export function Empty({
  sentence,
  action,
  align = "center",
  title,
  icon: Icon,
  illustration,
}: EmptyProps) {
  const centered = align === "center";
  const visual =
    illustration !== undefined ? (
      <div
        aria-hidden
        data-ui="empty.visual"
        className="flex max-w-48 justify-center text-muted"
      >
        {illustration}
      </div>
    ) : Icon === undefined ? null : (
      <span
        aria-hidden
        data-ui="empty.visual"
        className="flex size-14 items-center justify-center rounded-pill bg-ink/5 text-muted"
      >
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
    );
  /* The bare form keeps its old shape: a sentence and its action on one wrapping line. */
  if (title === undefined && visual === null) {
    return (
      <div
        data-ui="empty"
        className={`flex flex-wrap gap-3 px-4 py-10 ${
          centered ? "flex-col items-center text-center" : "items-center"
        }`}
      >
        <p className="max-w-short text-body text-muted">{sentence}</p>
        {action}
      </div>
    );
  }
  return (
    <div
      data-ui="empty"
      data-size="page"
      className={`flex flex-col gap-3 px-4 py-12 ${centered ? "items-center text-center" : "items-start"}`}
    >
      {visual}
      <div className={`flex max-w-short flex-col gap-1 ${centered ? "items-center" : ""}`}>
        {title === undefined ? null : (
          <p data-ui="empty.title" className="text-lead font-semibold text-ink">
            {title}
          </p>
        )}
        <p className="text-body text-muted">{sentence}</p>
      </div>
      {action === undefined ? null : (
        <div className={`flex flex-wrap gap-2 pt-1 ${centered ? "justify-center" : ""}`}>
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * The sentence the backend wrote, whole and verbatim.
 *
 * Context: a hairline around a quiet red wash — it is not an alarm, it is an
 * explanation. A bar on the left alone reads as a cut. Trimming the message or
 * replacing it with one of our own is what forces you to go to the console to
 * find out what happened.
 */
/**
 * The text a person pastes into a ticket or a chat when something broke: what
 * the screen said, the technical detail if there is one, when it happened and
 * where. Pure, so the same report reads the same in every error.
 */
export function errorReport(report: {
  heading: string;
  sentence?: string;
  detail?: string;
  at: Date;
  page?: string;
}): string {
  /* An empty heading (a callout without a title) is left out, not written as a blank line. */
  const lines = report.heading === "" ? [] : [report.heading];
  if (report.sentence) lines.push(report.sentence);
  if (report.detail) lines.push(report.detail);
  lines.push(report.at.toISOString());
  if (report.page) lines.push(report.page);
  return lines.join("\n");
}

/* The page is read when the button is pressed, not when the error is drawn: a
   report copied later still says where the person was. */
export function currentPage(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.href;
}

/* A visible, labelled button, not the icon-only `CopyButton`: on an error the
   person has to SEE that there is something to copy, and «Copiar el error» says
   what it copies. Its feedback is said in words too, and a failed copy is said
   as a failure — never a check mark over a clipboard that did not get the text. */
export function useErrorCopy(report: () => string): {
  said: string;
  state: "idle" | "done" | "failed";
  run: () => Promise<void>;
} {
  const copy = useUiCopy();
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function run() {
    if (timer.current !== null) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(report());
      setState("done");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const said =
    state === "done"
      ? copy.copyable.done
      : state === "failed"
        ? copy.copyable.failed
        : copy.copyable.report;
  return { said, state, run };
}

export function ErrorCopy({ report }: { report: () => string }) {
  const { said, state, run } = useErrorCopy(report);
  return (
    <Button
      role={state === "failed" ? "danger" : "secondary"}
      size="sm"
      icon={state === "done" ? Check : Copy}
      onClick={() => void run()}
    >
      {said}
    </Button>
  );
}

export function Failed({
  heading,
  sentence,
  action,
  detail,
}: {
  heading: string;
  sentence: string;
  action?: ReactNode;
  /** The technical text (an HTTP status, a server message, an id). Drawn in mono
   *  so it reads as data, and included in what «Copiar el error» copies. */
  detail?: string;
}) {
  return (
    <div className="rounded-control border border-bad/40 bg-bad/5 px-4 py-3">
      <p className="text-body font-medium text-bad">{heading}</p>
      <p className="mt-1.5 max-w-prose text-lead leading-relaxed text-ink">{sentence}</p>
      {detail === undefined ? null : (
        <p className="mt-2 max-w-prose font-mono text-micro break-words text-muted select-text">
          {detail}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {action === undefined ? null : <div>{action}</div>}
        <ErrorCopy
          report={() =>
            errorReport({ heading, sentence, detail, at: new Date(), page: currentPage() })
          }
        />
      </div>
    </div>
  );
}

/**
 * Nobody knows how to draw this. It carries the full identifier because that is
 * the only thing that makes it fixable.
 */
export function Missing({
  heading,
  detail,
  icon: Icon = PackageX,
  tone = "warn",
}: {
  heading: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "warn" | "bad";
}) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon
        className={`size-(--size-icon-lg) ${tone === "bad" ? "text-bad" : "text-warn"}`}
        strokeWidth={1.75}
      />
      <p className="text-meta font-medium text-ink">{heading}</p>
      {detail === undefined ? null : (
        <p className="max-w-short font-mono text-micro break-words text-muted select-text">
          {detail}
        </p>
      )}
      <ErrorCopy
        report={() => errorReport({ heading, detail, at: new Date(), page: currentPage() })}
      />
    </div>
  );
}

/** The icon `Missing` uses for what broke while being drawn, so that whoever
 *  composes does not have to choose it. */
export const ICONO_ROTO = AlertTriangle;
