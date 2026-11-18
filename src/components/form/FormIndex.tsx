"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/* ==================================================================== *
 *  THE INDEX OF A FORM — its sections, beside them («settings» style).
 *
 *  A form of six cards is three screens long, and its sections are the answer to «where
 *  is…»: the index names them at the sheet's left, marks the one being read as the form
 *  scrolls, and brings one into view on press — a settings page's left column.
 *
 *  Context: the sections say themselves. Each titled `FormSection` registers its title here
 *  as it mounts (`useFormIndexEntry`) and leaves as it unmounts, so a section that shows up
 *  with a state, or a record that draws its own, is in the index with nothing declared twice.
 *  The order is the DOCUMENT's, not the order they mounted in: a section that appears later
 *  above the others is listed where it is drawn.
 *
 *  With fewer than two sections there is nothing to find: no index. Below the sheet width
 *  that holds it beside the cards (`@3xl/form`), it is not drawn either — on a phone the
 *  cards are the index, one under the other.
 * ==================================================================== */

type Entry = { id: string; title: string };

type Registry = {
  register: (entry: Entry) => () => void;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => readonly Entry[];
};

function createRegistry(): Registry {
  let entries: readonly Entry[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  return {
    register(entry) {
      entries = [...entries.filter((one) => one.id !== entry.id), entry];
      emit();
      return () => {
        entries = entries.filter((one) => one.id !== entry.id);
        emit();
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => entries,
  };
}

const NONE: readonly Entry[] = [];
const IndexContext = createContext<Registry | null>(null);

/** Where a form's sections register: the sheet of a «settings» form. */
export function FormIndexScope({ children }: { children: ReactNode }) {
  const [registry] = useState(createRegistry);
  return <IndexContext value={registry}>{children}</IndexContext>;
}

/** A section's place in the index: the id to give its element, or `undefined` when it is not
 *  listed — no title, or no index around it. */
export function useFormIndexEntry(title: string | undefined): string | undefined {
  const registry = useContext(IndexContext);
  const id = useId();
  useEffect(() => {
    if (registry === null || title === undefined) return;
    return registry.register({ id, title });
  }, [registry, id, title]);
  return registry === null || title === undefined ? undefined : id;
}

function inDocumentOrder(entries: readonly Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const first = document.getElementById(a.id);
    const second = document.getElementById(b.id);
    if (first === null || second === null) return 0;
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

/** The index itself: the sections' titles, the current one marked, each bringing its
 *  section into view. Drawn by `Sheet` in the «settings» style. */
export function FormIndex() {
  const copy = useUiCopy();
  const registry = useContext(IndexContext);
  const entries = useSyncExternalStore(
    registry?.subscribe ?? (() => () => undefined),
    registry?.snapshot ?? (() => NONE),
    () => NONE,
  );
  const ordered = useMemo(() => inDocumentOrder(entries), [entries]);
  const [current, setCurrent] = useState<string | undefined>(undefined);

  /* The section being read is the first one crossing the top two fifths of the screen:
     the one whose title just went by is still the one being read until the next arrives. */
  useEffect(() => {
    if (ordered.length < 2 || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          if (change.isIntersecting) seen.add(change.target.id);
          else seen.delete(change.target.id);
        }
        const first = ordered.find((entry) => seen.has(entry.id));
        if (first !== undefined) setCurrent(first.id);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const entry of ordered) {
      const element = document.getElementById(entry.id);
      if (element !== null) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ordered]);

  if (ordered.length < 2) return null;
  const marked = current ?? ordered[0]?.id;
  return (
    <nav
      aria-label={copy.field.sections}
      data-ui="form.index"
      className="hidden w-(--container-form-index) shrink-0 @3xl/form:block"
    >
      <ul className="sticky top-3 flex flex-col gap-0.5">
        {ordered.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              {...(entry.id === marked ? { "aria-current": "location" as const } : {})}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(entry.id)?.scrollIntoView({ block: "start" });
                setCurrent(entry.id);
              }}
              className="block truncate rounded-ui-nav px-2.5 py-1.5 text-meta text-muted transition-colors duration-(--duration-instant) outline-0 hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary aria-[current]:bg-ui-nav-current aria-[current]:font-medium aria-[current]:text-ink"
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
