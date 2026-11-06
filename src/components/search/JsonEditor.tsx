"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { useTheme } from "@sincpro/web-ui/foundations/theme";
import { Button } from "@sincpro/web-ui/primitives/button/index";
import CodeMirror, { EditorView, Prec } from "@uiw/react-codemirror";
import { Wand2 } from "lucide-react";
import { useId } from "react";

/* ====================================================================== *
 *  A JSON WRITTEN BY HAND, IN A REAL EDITOR.
 *
 *  CodeMirror and not a `<textarea>` with colours on top: the latter got as far
 *  as fifty lines go —painting the quotes— and fell short on
 *  everything else, which is what makes writing a filter by hand usable:
 *  line numbers to know where the error is, folding so you do not get lost
 *  in an `all` of six conditions, and the underline on the exact character
 *  where the JSON breaks instead of a sign saying something is wrong.
 *
 *  The `linter` below is the JSON package's own: it marks the error
 *  as you type. The outer notice —`error`— still exists because it
 *  says something else: that the JSON is well written but is not a filter.
 * ====================================================================== */

/** A JSON laid out, or the same text if it cannot be read yet.
 *
 *      in   '{"all":[{"field":"a","operator":"=","value":1}]}'
 *      out  the same, indented by two spaces and one field per line
 *
 *  Separated from the component so it can be tested without drawing anything, which is the only thing
 *  with logic in here. */
export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/* The built-in `light`/`dark` themes pick the SYNTAX colours; this layer paints the box from
   the system's tokens, so the editor sits on the same surface as the fields around it in
   either theme instead of on a hard-coded one. */
const SURFACE_THEME = EditorView.theme({
  "&": { backgroundColor: "var(--color-surface)", color: "var(--color-ink)" },
  ".cm-gutters": {
    backgroundColor: "var(--color-ground)",
    color: "var(--color-muted)",
    borderRightStyle: "solid",
    borderRightWidth: "thin",
    borderRightColor: "var(--color-line)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--color-ink) 5%, transparent)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-ink)" },
});

export function JsonEditor({
  value,
  onChange,
  error,
  height = "16rem",
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  /** What is wrong with what was written beyond the syntax — that it is valid JSON but not a
   *  filter, for example. Syntax errors are marked by the editor, at their exact place. */
  error?: string | null;
  height?: string;
  /** What this editor is called. Without this it says only that it is a code editor,
   *  which is the only thing that can be said without knowing what is written inside. */
  label?: string;
}) {
  const copy = useUiCopy();
  const labelId = useId();
  const surface = useSurface();
  const { resolved } = useTheme();
  /* The chrome is dark in both themes; the canvas follows the theme. */
  const dark = surface === "chrome" || resolved === "dark";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between">
        <p id={labelId} className="text-micro text-muted">
          {label ?? copy.builder.editor}
        </p>
        <Button
          role="ghost"
          size="sm"
          disabled={value.trim() === ""}
          onClick={() => onChange(formatJson(value))}
        >
          <Wand2 className="size-3" /> {copy.builder.format}
        </Button>
      </div>

      <div
        className={`overflow-hidden rounded-control border ${
          error == null ? "border-ink/15" : "border-danger"
        }`}
      >
        <CodeMirror
          value={value}
          onChange={onChange}
          height={height}
          theme={dark ? "dark" : "light"}
          extensions={[
            /* The editable area is CodeMirror's own element: named here or nowhere. Marked
               tabbable too: it is already reached with Tab, but its scroller (`tabindex=-1`)
               is a scrollable region, and an accessibility check (axe,
               `scrollable-region-focusable`) only counts content it can see is focusable. */
            EditorView.contentAttributes.of({ "aria-labelledby": labelId, tabindex: "0" }),
            json(),
            linter(jsonParseLinter()),
            lintGutter(),
            ...(surface === "chrome" ? [] : [Prec.highest(SURFACE_THEME)]),
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: false,
            /* Highlighting the pair of braces is what makes a nested filter legible: without it,
               in an `any` inside an `all` you have to count brackets with your finger. */
            bracketMatching: true,
            closeBrackets: true,
          }}
        />
      </div>

      {error == null ? null : <p className="text-micro text-danger">{error}</p>}
    </div>
  );
}
