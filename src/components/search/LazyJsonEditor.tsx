"use client";

import type { JsonEditor } from "@sincpro/web-ui/components/search/JsonEditor";
import { type ComponentProps, lazy, Suspense } from "react";

/* CodeMirror (≈420 KB minified) is its own chunk: fetched the first time a builder is
   OPENED, never by a screen that only has a search bar. The builders are dialogs nobody
   opens on most visits, and they were paying for the editor on every one. */
const Editor = lazy(() =>
  import("@sincpro/web-ui/components/search/JsonEditor").then((module) => ({
    default: module.JsonEditor,
  })),
);

/** `JsonEditor`, loaded when it is drawn. Until it arrives, a box of the editor's size holds
 *  the place so the dialog does not jump. */
export function LazyJsonEditor(props: ComponentProps<typeof JsonEditor>) {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="h-64 w-full min-w-0 animate-reveal-late rounded-control border border-line-strong bg-ground"
        />
      }
    >
      <Editor {...props} />
    </Suspense>
  );
}
