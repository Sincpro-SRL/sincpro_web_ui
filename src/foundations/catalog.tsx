"use client";

import {
  type CopyOverride,
  type CopyStore,
  copyStore,
  fillCopy,
  mergeCopyOver,
} from "@sincpro/web-ui/foundations/copyStore";
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

/* The words without React — the override, the merge, the template, the store — live in
   `copyStore.ts`, without the directive, so a server component reads them too. Re-exported so
   every path that read them here keeps reading them. */
export type { CopyOverride };
export { fillCopy, mergeCopyOver };

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
  return catalogOver(copyStore(english));
}

/** The React half over a store that already exists: web-ui's own words are built in a module
 *  without the directive (`uiCopy.ts`), and their `Provider` reads the same installed ones.
 *  Not public. */
export function catalogOver<C extends object>(store: CopyStore<C>): CopyCatalog<C> {
  /* `null` and not English: a context keeps the value it was created with, so with the
     factory words inside it a component without a provider would ignore `install`. */
  const Context = createContext<C | null>(null);
  const useCopy = () => useContext(Context) ?? store.current();

  function Provider({ copy, children }: { copy?: CopyOverride<C>; children: ReactNode }) {
    const enclosing = useCopy();
    const merged = useMemo(() => mergeCopyOver(enclosing, copy), [enclosing, copy]);
    return <Context.Provider value={merged}>{children}</Context.Provider>;
  }

  return { ...store, Provider, useCopy };
}
