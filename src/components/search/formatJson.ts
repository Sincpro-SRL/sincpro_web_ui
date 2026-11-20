/* Without `"use client"`, apart from `JsonEditor.tsx` (CodeMirror, in the browser): a server
   component that shows a saved filter's JSON lays it out the same way. */

/** A JSON laid out, or the same text if it cannot be read yet.
 *
 *      in   '{"all":[{"field":"a","operator":"=","value":1}]}'
 *      out  the same, indented by two spaces and one field per line
 *
 *  Separated from the editor so it can be tested without drawing anything: it is the only
 *  logic the editor has. */
export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
