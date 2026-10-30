"use client";

import { Flag, type FlagTone } from "@sincpro/web-ui/primitives/notice/Flag";
import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

/* ==================================================================== *
 *  THE NOTE OF A FIELD — said where it is, listed where it is read.
 *
 *  «El cliente tiene NC/2026/0012 por Bs. 1.200 sin aplicar · Aplicar» belongs
 *  to the field «Cliente», and «vence en 3 días» to «Vencimiento». Written as
 *  a band over the form they say nothing about WHERE, and they push the form
 *  down. So a note has two halves:
 *
 *      WHERE   the system's `Flag` next to the field's label (or at the start of
 *              a row): a toned mark that opens the sentence and its action.
 *      WHAT    an entry in the record's activity, in its notices above the
 *              timeline, saying what it belongs to and taking you there.
 *
 *  Cards aligned with their field in the activity column, Google-Docs style,
 *  were tried and dropped: they and the timeline fought for one column, and the
 *  timeline is what everybody reads.

 *  ── The record knows its notes (the registry) ───────────────────────
 *
 *  A record lists every note in its activity, saying WHAT it belongs to and
 *  taking you there. The notes are written deep inside the form, so each one
 *  registers itself with the record (`NoteRegistryContext`) while it
 *  is mounted. What is not mounted — a tab not open — is not listed: the
 *  activity says what is on the record's screen, not a guess.
 *
 *  ── What a screen reader hears ──────────────────────────────────────
 *
 *  The note's sentence carries an id, and the field adds it to the control's
 *  `aria-describedby`: it is read WITH the field, after the label and before
 *  anything else. The card keeps that text in the DOM in both faces (hidden
 *  with the flag), so the description never goes missing.
 * ==================================================================== */

/** A note anchored to one field: a sentence, what explains it, and what resolves it. */
export type FieldNote = {
  /** Without it, `info`. The tone has a shape as well as a colour (`Flag`). */
  tone?: FlagTone;
  /** The sentence: «Vence en 3 días». It names the mark and heads the card. */
  label: string;
  /** What explains it: «NC/2026/0012 por Bs. 1.200,00, sin aplicar». */
  detail?: ReactNode;
  /** What resolves it, if there is something to press: a `Button` with `role="ghost"`
   *  and `size="sm"` — the record's primary action is not here. */
  action?: ReactNode;
};

/* ---------------------------------------------------------------- *
 *  The registry
 * ---------------------------------------------------------------- */

/** A note as the record lists it: the note, what it belongs to, and where it is. */
export type NoteEntry = {
  id: string;
  note: FieldNote;
  /** What it belongs to: «Cliente», «Impresora térmica de tickets 80 mm». */
  owner: string;
  /** The field or row it is anchored to — what «take me there» scrolls to. */
  anchor: () => HTMLElement | null;
};

/** The notes mounted in a record. It notifies only when a note appears or goes: a note
 *  whose words changed is updated in place, so re-rendering a form (new `note` objects on
 *  every render) does not make the record render again, and again. */
export type NoteRegistry = {
  /** Adds the note, or replaces its words without telling anyone. */
  put: (entry: NoteEntry) => void;
  /** The note went away. */
  drop: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => readonly NoteEntry[];
};

export function createNoteRegistry(): NoteRegistry {
  const entries = new Map<string, NoteEntry>();
  const listeners = new Set<() => void>();
  let list: readonly NoteEntry[] = [];
  const changed = () => {
    list = [...entries.values()];
    for (const listener of listeners) listener();
  };
  return {
    put: (entry) => {
      const known = entries.get(entry.id);
      if (known === undefined) {
        entries.set(entry.id, entry);
        changed();
        return;
      }
      /* In place: the snapshot keeps its identity, so `useSyncExternalStore` sees no change
         — a new array here re-rendered the record, which re-rendered the field, which put
         again, for ever. */
      Object.assign(known, entry);
    },
    drop: (id) => {
      if (entries.delete(id)) changed();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => list,
  };
}

/** The registry of the record around — `Record` provides it. */
export const NoteRegistryContext = createContext<NoteRegistry | null>(null);

const NONE: readonly NoteEntry[] = [];
const noop = () => () => {};

/** The notes mounted in the record around, in the order they were mounted. */
export function useNoteEntries(): readonly NoteEntry[] {
  const registry = useContext(NoteRegistryContext);
  const snapshot = registry?.snapshot ?? (() => NONE);
  /* The same snapshot on the server: nothing registers there (no effects run), so it is
     empty unless someone filled the registry by hand. */
  return useSyncExternalStore(registry?.subscribe ?? noop, snapshot, snapshot);
}

/** What a card belongs to when nobody said: the row it sits in, by the first words of its
 *  first cell — «Impresora térmica de tickets 80 mm» —, or nothing. The card's own words
 *  (it sits in that cell) are skipped. */
function ownerFromRow(card: HTMLElement): string {
  const cell = card.closest("tr")?.querySelector("td");
  if (cell === null || cell === undefined) return "";
  const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node !== null; node = walk.nextNode()) {
    if (node.parentElement?.closest("[data-field-note]") !== null) continue;
    const text = node.textContent?.trim() ?? "";
    if (text !== "") return text.slice(0, 60);
  }
  return "";
}

/** The field or row a card is anchored to: the row, the fact (a `<dd>`'s group), or the
 *  field box the card is the last child of. */
function anchorOf(card: HTMLElement | null): HTMLElement | null {
  if (card === null) return null;
  const row = card.closest("tr");
  if (row !== null) return row;
  const parent = card.parentElement;
  return parent?.tagName === "DD" ? parent.parentElement : parent;
}

/* ---------------------------------------------------------------- *
 *  The two faces
 * ---------------------------------------------------------------- */

/** What a note leaves in its field: its sentence, hidden, for the field's
 *  `aria-describedby`, and its entry in the record's activity — where it is listed with
 *  what it belongs to and taken back to on press. Nothing is drawn: the mark by the label
 *  (`NoteFlag`) says WHERE, the activity says WHAT. */
export function NoteCard({
  note,
  id,
  owner,
}: {
  note: FieldNote;
  id: string;
  /** What it belongs to — the field's label. A row's card reads it from its row. */
  owner?: string;
}) {
  const registry = useContext(NoteRegistryContext);
  const ref = useRef<HTMLDivElement>(null);

  /* Before paint, so the record's activity knows on its first frame whether there is
     anything to align — its default view depends on it. On EVERY render: the words are
     kept current, silently (a new `note` object each render must not re-render the
     record); only appearing and going away are news. */
  useLayoutEffect(() => {
    if (registry === null) return;
    const card = ref.current;
    registry.put({
      id,
      note,
      owner: owner ?? (card === null ? "" : ownerFromRow(card)),
      anchor: () => anchorOf(ref.current),
    });
  });
  useLayoutEffect(() => {
    if (registry === null) return;
    return () => registry.drop(id);
  }, [registry, id]);

  return (
    <div ref={ref} data-field-note="" hidden>
      <span id={id}>
        {note.label}
        {note.detail === undefined ? null : <> — {note.detail}</>}
      </span>
    </div>
  );
}

/** The mark next to the label: WHERE the note is. It opens the note on press. */
export function NoteFlag({ note }: { note: FieldNote }) {
  return (
    <span className="inline-flex shrink-0">
      <Flag tone={note.tone ?? "info"} label={note.label}>
        {note.detail === undefined && note.action === undefined ? undefined : (
          <span className="flex flex-col gap-2">
            {note.detail === undefined ? null : <span>{note.detail}</span>}
            {note.action === undefined ? null : <span className="flex">{note.action}</span>}
          </span>
        )}
      </Flag>
    </span>
  );
}

/** Joins ids for `aria-describedby`, dropping the absent ones. */
export function describedByOf(...ids: readonly (string | undefined | null)[]) {
  return ids.filter((x): x is string => x !== undefined && x !== null).join(" ") || undefined;
}
