"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Hint } from "@sincpro/web-ui/primitives/hint/Hint";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import type { ReactNode } from "react";

/* ==================================================================== *
 *  LA COMPOSICIÓN DE UN FORMULARIO: la sección y el pie.
 *
 *  Vive en `contexts/form` y no junto a los controles porque no es un control:
 *  es lo que los ACOMODA. `TextInput` no sabe que existe un formulario —se usa
 *  igual adentro de una celda, de un filtro o de un diálogo— y una sección no
 *  sabe qué campos le van a poner adentro. Son dos capas y por eso son dos
 *  carpetas: `primitives/field` es CON QUÉ se escribe, esto es CÓMO se arma.
 * ==================================================================== */

/** A group of fields with its name and its status.
 *
 *  The `status` is the only thing worth copying from the old console: every
 *  section said `Required` or `(Incomplete)` in its header, so you could see
 *  **what was missing without opening any of them**. Our version forced you to
 *  go into every aspect to discover it was empty. */
export function FormSection({
  title,
  hint,
  status,
  actions,
  columns = 1,
  children,
}: {
  /** Absent when the surface already named the form — a dialog title is the
   *  section, and repeating «parámetros» under it is a second chrome. */
  title?: string;
  hint?: string;
  /** Context: the tones are the system's and not two names of their own. `falta`
   *  and `listo` were a third scale of meaning that only existed here, and it
   *  forced you to translate it in order to paint the same pill. */
  status?: { label: string; tone?: Tone };
  /** The buttons of THIS section: "add a rule", "copy from the last order". They
   *  go in the header and not at the end: what goes at the end closes the whole
   *  form, and mixing them makes you doubt what saves what. */
  actions?: ReactNode;
  /** How many columns of fields. In compact it goes back to a single one without
   *  asking: two columns in 480 px are two half columns. Three is the ceiling —
   *  at the fourth, the label and the value no longer fit on the same line. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
}) {
  const d = useDensity();
  const asGrid = columns > 1 && d === "comfortable";
  const grid = columns === 3 ? "grid-cols-3" : "grid-cols-2";
  const withHeader =
    title !== undefined ||
    status !== undefined ||
    hint !== undefined ||
    actions !== undefined;
  return (
    <section className={`flex min-w-0 flex-col ${byDensity(d, "gap-3", "gap-2")}`}>
      {withHeader ? (
        <header className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          {title === undefined && hint === undefined ? null : (
            <h3 className="flex min-w-0 items-center gap-1 text-meta font-medium text-ink">
              {title === undefined ? null : <span className="min-w-0 truncate">{title}</span>}
              {hint === undefined ? null : <Hint>{hint}</Hint>}
            </h3>
          )}
          {status === undefined ? null : <Tag tone={status.tone}>{status.label}</Tag>}
          {actions === undefined ? null : (
            <span className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</span>
          )}
        </header>
      ) : null}
      <div
        className={`min-w-0 ${
          asGrid
            ? `grid ${grid} gap-x-8 ${byDensity(d, "gap-y-3.5", "gap-y-2.5")}`
            : `flex flex-col ${byDensity(d, "gap-3.5", "gap-2.5")}`
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/** What closes a form. One primary, on the right.
 *
 *  Cancel sits just to the left of that primary: the two answers to «what do
 *  I do with what I wrote». Destroy sits on the far left. Stuck to the
 *  primary, a stray click or an Enter lands on the thing that cannot be
 *  undone. The sentence, when there is one, stays with the destroy side —
 *  it is the warning, not a third button.
 *
 *  Context: on a phone (below `sm`, the 40rem of `--container-handheld`) the bar sticks
 *  to the bottom of whatever scrolls the form —the window, or a bottom sheet's body— so
 *  the primary stays under the thumb while the fields go by, instead of waiting at the
 *  end of a form three screens long. Sticky and not fixed: it is the last thing in the
 *  form, so at the end it settles in its own place and covers nothing. On a desk it is
 *  exactly the static bar it always was. */
export function FormActions({
  primary,
  secondary,
  danger,
  aside,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  /** Destroy. Far from the primary. Red belongs here, not on cancel. */
  danger?: ReactNode;
  /** What has to be said before pressing: "this cannot be undone". */
  aside?: ReactNode;
}) {
  return (
    <div
      data-form-actions=""
      className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-surface max-sm:safe-bottom"
    >
      {danger}
      {aside === undefined ? null : (
        <span className="min-w-0 text-micro text-muted">{aside}</span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {secondary}
        {primary}
      </span>
    </div>
  );
}
