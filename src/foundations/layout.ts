/**
 * Context: `--container-handheld` (40rem, `tokens.css`) in pixels. A container query cannot
 * swap a `<table>` for a list, so the two components that must decide in code — `ListView`
 * (which presentations to offer) and `EditableTable` (grid or stacked cards) — ask a
 * `ResizeObserver` for pixels and compare against this one figure. It used to be written
 * twice, `HANDHELD` in one and `NARROW_LIST` in the other, and the day one moved the two
 * would have disagreed about what a phone is. Keep it equal to the token.
 */
export const HANDHELD_WIDTH = 640;
