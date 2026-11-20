/* ==================================================================== *
 *  A CATALOG'S WORDS, WITHOUT REACT — installed, merged, filled.
 *
 *  Context: `createCopy` (`catalog.tsx`) is the mechanism every package speaks, and half of
 *  it is a React context — so it carries `"use client"`. The other half is what a formatter,
 *  a sentence built in a function or a server component reads: the installed words, a merge,
 *  a template filled. Behind the directive that half was a client reference on the server,
 *  and `dateLabel()` threw instead of naming a month. So it lives here, without the
 *  directive, and the catalog's `Provider` is built over the same store
 *  (`catalogOver`): one global, read the same from a component and from a function.
 *
 *  On the server the store is the server's: an application installs its language there too
 *  (the module of its root layout), as it does in the browser.
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

/** `{name}` → value. A missing key stays visible in the template. */
export function fillCopy(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/** A catalog's words outside React. Not public: `createCopy` hands them out with its
 *  `Provider`, and web-ui's own are `installCopy` / `currentCopy` / `mergeCopy`. */
export type CopyStore<C extends object> = {
  /** The factory words: what is there before anything is installed. */
  english: C;
  /** Sets the session's words — English with `over` on top — and returns them. */
  install: (over?: CopyOverride<C>) => C;
  /** The installed words: for what is not a component. */
  current: () => C;
  /** English with `over` on top, without installing it. */
  merge: (over?: CopyOverride<C>) => C;
};

export function copyStore<C extends object>(english: C): CopyStore<C> {
  let installed = english;
  return {
    english,
    install: (over) => {
      installed = mergeCopyOver(english, over);
      return installed;
    },
    current: () => installed,
    merge: (over) => mergeCopyOver(english, over),
  };
}
