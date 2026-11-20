"use client";

import { catalogOver } from "@sincpro/web-ui/foundations/catalog";
import {
  type UiCopy,
  type UiCopyOverride,
  uiCopyStore,
} from "@sincpro/web-ui/foundations/uiCopy";
import type { ReactNode } from "react";

/**
 * Chrome copy for the design system — its React half.
 *
 * The words (`UiCopy`, `ENGLISH_COPY`) and their store (`installCopy`, `currentCopy`,
 * `mergeCopy`) are `uiCopy.ts`, without `"use client"`, so a formatter or a server component
 * reads them; they are re-exported here so every path that read them here keeps reading
 * them. What needs React — a branch in another language, the words of a branch — is this
 * module, over the same store: a provider never writes the global (see `catalog.tsx`).
 */

/* The mechanism is `catalog.tsx`, the same one an application uses for its own words. */
const ui = catalogOver(uiCopyStore);

/** Changes the words for its branch, on top of what encloses it. It never writes the
 *  global: a corner in another language does not change the rest of the screen. */
export const UiCopyProvider: (props: {
  copy?: UiCopyOverride;
  children: ReactNode;
}) => ReactNode = ui.Provider;

export const useUiCopy: () => UiCopy = ui.useCopy;

export type { UiCopy, UiCopyOverride };
export {
  currentCopy,
  currentCopyLocale,
  ENGLISH_COPY,
  fillCopy,
  installCopy,
  mergeCopy,
} from "@sincpro/web-ui/foundations/uiCopy";
