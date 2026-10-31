import type { Tone } from "@sincpro/web-ui/foundations/types";

/* The solid ribbon per tone. The text is the surface colour: on the light theme white on the
   tone (≥ 5.7:1 for all five), on the dark one the dark surface on the lighter tone. */
const RIBBON: Record<Tone, string> = {
  neutral: "bg-muted text-surface",
  info: "bg-info text-surface",
  good: "bg-good text-surface",
  warn: "bg-warn text-surface",
  bad: "bg-bad text-surface",
  accent: "bg-accent text-on-accent",
};

/**
 * The band across the paper's corner: «PAGADA», «ARCHIVADA», «CANCELADA».
 *
 * Context: a state that changes what the record IS — not where it is in its flow, which the
 * status bar says — has to be seen before any field is read: an archived customer looks
 * exactly like an active one otherwise. Odoo's `web_ribbon`. It is a word, never colour
 * alone, and it is `role="status"` so it is also heard. The paper clips it.
 */
export function RecordRibbon({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span
      role="status"
      className={`pointer-events-none absolute top-5 -right-12 z-10 w-44 rotate-45 py-1 text-center text-micro font-semibold tracking-wide uppercase shadow-float ${RIBBON[tone]}`}
    >
      {label}
    </span>
  );
}
