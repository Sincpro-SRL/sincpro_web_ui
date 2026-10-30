/* ==================================================================== *
 *  THE SHARED TYPES — and why they live in a single place.
 *
 *  `Surface` was defined TWICE, in `button/` and in `record/`. Both copies
 *  said the same thing, so the compiler never complained — and that is exactly
 *  the problem: the day a third surface appears, one of the two gets updated
 *  and the other does not, and nothing catches it until someone passes
 *  `"chrome"` to a component that no longer accepts it.
 *
 *  What goes in here has a test: **more than one component family uses it AND
 *  it belongs to none of them**. A type that only `list/` uses lives in
 *  `list/`, even if it is shared across its three files.
 * ==================================================================== */

/** Which background something is drawn on.
 *
 *  The interface has TWO surfaces and the piece does not behave the same on
 *  both: on the canvas, a ghost button uses the navigation blue (8.26:1); on
 *  the chrome that blue gives 1.4:1 and the lightened one has to be used.
 *
 *  It is a PROP and not a context on purpose — the opposite of `Density`. The
 *  color is decided per element and it has to be auditable one at a time; a
 *  global theme would resolve it by inheritance and then the decision would not
 *  be visible in the calling code. See the long note in `system/density.tsx`. */
export type Surface = "canvas" | "chrome";

/** The meaning of a state color. It is NOT a decorative palette.
 *
 *  The moment a tag uses a hue because some variety was needed, all six stop
 *  meaning anything and you have to read the word anyway — and then the color
 *  is redundant. `neutral` is the default precisely because of that: most tags
 *  in a catalog are CLASSIFICATIONS, not states. */
export type Tone = "neutral" | "info" | "good" | "warn" | "bad" | "accent";

/** The size of a control, tied to `--size-control-*`.
 *
 *  Three and not five: a fourth intermediate step gets picked out of habit and
 *  stops meaning a place. */
export type Size = "sm" | "md" | "lg";

/* ==================================================================== *
 *  THE SYSTEM'S TWO API CONVENTIONS
 *
 *  They are here and not in the README because a convention that lives in the
 *  documentation breaks in the first component written in a hurry. Here it is
 *  read by whoever is going to write the next component.
 *
 *  ── 1. How a callback is named ──────────────────────────────────────
 *
 *      onXChange   the component proposes a NEW value for `x`, and whoever
 *                  uses it decides whether to accept it. It ALWAYS goes with
 *                  the `x` prop.
 *                  → onTermsChange(terms), onSelectedChange(set), onSortChange(sort)
 *
 *      onX         something happened that is not a value change: an intent.
 *                  → onClose(), onOpen(), onPromote(), onBrowseAll()
 *
 *  The test for knowing which one: **is there a prop with that name next to
 *  it?** If `value` exists, it is `onValueChange`. If not, it is an event and
 *  goes without a suffix.
 *
 *  ── 2. Controlled, always ───────────────────────────────────────────
 *
 *  Any state the consumer might want to read, store in the URL or restore on
 *  reload is CONTROLLED: `value` + `onValueChange`, with no internal memory.
 *  That is what lets the entire workspace live in the hash.
 *
 *  The exception, and there is only one: **what dies with the component and
 *  nobody cares about afterwards.** An open menu, an expanded filter panel, the
 *  half-typed text in the search box. That does keep state inside, because
 *  exposing it would force every consumer to declare a `useState` for something
 *  they are never going to read.
 *
 *  Put another way: if it makes sense to send it to a colleague over chat so
 *  they see the same thing, it is controlled.
 * ==================================================================== */
