/**
 * The `aria-label` a control puts on itself: none inside a `Field` — the field's label names
 * it — and outside one the control's own, or as a last resort its placeholder (what a browser
 * reads for a bare `<input placeholder>` anyway, so a control outside a form is never
 * nameless).
 *
 * Context: a control inside a `Field` used to keep its `aria-label` too. With both, React Aria
 * names the control by the label AND itself («Cliente Cliente», «Cantidad cantidad»), so the
 * name was read twice. The field wins: an `aria-label` is for a control that has no label
 * on screen — a table cell, a search box — and inside a field it is ignored.
 */
export function controlName(
  labelledBy: string | undefined,
  ariaLabel: string | undefined,
  fallback?: string,
): string | undefined {
  return labelledBy === undefined ? (ariaLabel ?? fallback) : undefined;
}
