"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

/* ==================================================================== *
 *  A COPY CATALOG — the words of a package, in one language at a time.
 *
 *  Context: web-ui had its words, the composer its own, web-framework a third table, and an
 *  application's own components none — each with its own `install*Copy`, its own merge
 *  written section by section (five places to touch for one new section) and, in web-ui,
 *  a provider that wrote the GLOBAL table while drawing: a corner of the screen in another
 *  language switched the language of everything outside it. This is the mechanism once,
 *  for whoever has words to say:
 *
 *      const appCopy = createCopy({ invoice: { post: "Post" } });
 *      appCopy.install({ invoice: { post: "Publicar" } });        // the session's language
 *      const copy = appCopy.useCopy();                              // in a component
 *      <appCopy.Provider copy={{ invoice: { post: "Confirmar" } }}> // one corner
 *
 *  ── Three rules ─────────────────────────────────────────────────────
 *
 *  - **An override names only what changes.** It is merged DEEP over what is under it:
 *    renaming one join word does not empty the other two.
 *  - **`install` is the one global**, for the session's language and for what is not a
 *    component (a formatter, a sentence built in a function). A `Provider` changes its
 *    branch and nothing else — it never writes the global.
 *  - **A `Provider` builds on what encloses it**, not on English: a corner that renames one
 *    word inside a Spanish application stays Spanish.
 * ==================================================================== */

/** What changes, at any depth. A word is replaced; a section is merged. */
export type CopyOverride<C> = {
  [K in keyof C]?: C[K] extends string
    ? string
    : C[K] extends readonly unknown[]
      ? C[K]
      : C[K] extends object
        ? CopyOverride<C[K]>
        : C[K];
};

const isSection = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `base` with `over` on top: sections merge, everything else is replaced. */
export function mergeCopyOver<C extends object>(
  base: C,
  over: CopyOverride<C> | undefined,
): C {
  if (over === undefined) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(over)) {
    if (value === undefined) continue;
    const under = out[key];
    out[key] = isSection(under) && isSection(value) ? mergeCopyOver(under, value) : value;
  }
  return out as C;
}

export type CopyCatalog<C extends object> = {
  /** The factory words: what is there before anything is installed. */
  english: C;
  /** Sets the session's words — English with `over` on top — and returns them. */
  install: (over?: CopyOverride<C>) => C;
  /** The installed words: for what is not a component. */
  current: () => C;
  /** English with `over` on top, without installing it. */
  merge: (over?: CopyOverride<C>) => C;
  /** Changes the words for its branch, on top of what encloses it. */
  Provider: (props: { copy?: CopyOverride<C>; children: ReactNode }) => ReactNode;
  /** The words of this branch: the nearest `Provider`'s, or the installed ones. */
  useCopy: () => C;
};

export function createCopy<C extends object>(english: C): CopyCatalog<C> {
  let installed = english;
  /* `null` and not English: a context keeps the value it was created with, so with the
     factory words inside it a component without a provider would ignore `install`. */
  const Context = createContext<C | null>(null);
  const current = () => installed;
  const useCopy = () => useContext(Context) ?? installed;

  function Provider({ copy, children }: { copy?: CopyOverride<C>; children: ReactNode }) {
    const enclosing = useCopy();
    const merged = useMemo(() => mergeCopyOver(enclosing, copy), [enclosing, copy]);
    return <Context.Provider value={merged}>{children}</Context.Provider>;
  }

  return {
    english,
    install: (over) => {
      installed = mergeCopyOver(english, over);
      return installed;
    },
    current,
    merge: (over) => mergeCopyOver(english, over),
    Provider,
    useCopy,
  };
}

/** `{name}` → value. A missing key stays visible in the template. */
export function fillCopy(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}
