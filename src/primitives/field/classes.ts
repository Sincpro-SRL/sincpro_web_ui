/* Without `"use client"`: `Field.tsx` carries it (a control reads its field from context), and
   a React Server Components bundler turns every export of a client module into a client
   reference — the class string a server component asked for came back as a reference. */

/** The shared look of everything that is written into or chosen from.
 *
 *  It exists as a function and not as a loose class so that a new control cannot
 *  be born with another height, another radius or another focus. That was the
 *  original defect: every file wrote its own `<input className="…">`. */
export function controlClasses(invalid = false): string {
  return `h-(--size-control-md) w-full min-w-0 rounded-ui-control border bg-ui-control px-2.5 text-meta text-ink transition-colors duration-(--duration-instant) placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-ground disabled:text-muted ${
    invalid
      ? "border-danger focus-visible:border-danger focus-visible:outline-danger"
      : "border-ui-control-border focus-visible:border-primary focus-visible:outline-primary"
  }`;
}
