/* ==================================================================== *
 *  TAG and STATUSDOT — saying a state without writing a sentence.
 *
 *  They go together because they answer the same question with two different
 *  space budgets, and splitting them up makes someone choose out of habit
 *  instead of by the place:
 *
 *      StatusDot   6 px. It fits in a table row, next to the name.
 *      Tag         a capsule with a word. It fits where there is a whole line.
 *
 *  ── The color rule, which is the one that gets broken ───────────────
 *
 *  **A tone is a MEANING, not a decoration.** `good` does not mean «green
 *  because it looks nice», it means «this turned out well». The moment a tag
 *  uses a tone because some variety was needed, all five tones stop meaning
 *  anything and you have to read the word anyway — and then the color is
 *  redundant.
 *
 *  That is why `neutral` exists and is the default: most tags in a catalog
 *  —«servicio», «importado», «exento de IVA»— are CLASSIFICATIONS, not states, and
 *  painting them in colors turns a list into a traffic light.
 * ==================================================================== */
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { ReactNode } from "react";
export type { Tone };

/** Each tone on its two surfaces. The state does not change meaning when
 *  crossing from the canvas to the chrome, but its value does: `good` #2F6B3C
 *  gives 1.7:1 on #1C1A17 and the lightened one has to be used. */
const TAG_TONE: Record<Tone, { canvas: string; chrome: string }> = {
  neutral: {
    canvas: "border border-line-strong bg-ink/5 text-ink",
    chrome: "border border-chrome-muted/30 bg-chrome-ink/10 text-chrome-ink",
  },
  info: {
    canvas: "border border-info/25 bg-info/10 text-info",
    chrome: "border border-chrome-link/30 bg-chrome-link/15 text-chrome-link",
  },
  good: {
    canvas: "border border-good/25 bg-good/10 text-good",
    chrome: "border border-chrome-good/30 bg-chrome-good/15 text-chrome-good",
  },
  warn: {
    canvas: "border border-warn/30 bg-warn/10 text-warn",
    chrome: "border border-chrome-warn/35 bg-chrome-warn/15 text-chrome-warn",
  },
  bad: {
    canvas: "border border-bad/25 bg-bad/10 text-bad",
    chrome: "border border-chrome-bad/35 bg-chrome-bad/15 text-chrome-bad",
  },
  accent: {
    // The gold as TEXT only exists on the chrome (7.39:1). On the canvas it
    // gives 2.43:1, so there this tag falls back to ink on a gold wash: the
    // brand is visible and the word is readable.
    canvas: "border border-accent/40 bg-accent/18 text-ink",
    chrome: "border border-chrome-accent/40 bg-chrome-accent/15 text-chrome-accent",
  },
};

/** The classes of a tone on a surface — the capsule's colors, shared with the chips of
 *  `Tags` so a classification reads the same as a value and as a removable chip. */
export function tagTone(tone: Tone, surface: "canvas" | "chrome"): string {
  return TAG_TONE[tone][surface];
}

export function Tag({
  children,
  tone = "neutral",
  surface = "canvas",
  /** Context: a one-word classification sometimes needs a sentence that does not
   *  fit. The sentence goes into the `title` and not underneath, because the
   *  line below is taken up by the row's metadata. */
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  surface?: "canvas" | "chrome";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-micro font-medium whitespace-nowrap ${TAG_TONE[tone][surface]}`}
    >
      {children}
    </span>
  );
}

const DOT_TONE: Record<Tone, { canvas: string; chrome: string }> = {
  neutral: { canvas: "bg-muted", chrome: "bg-chrome-muted" },
  info: { canvas: "bg-info", chrome: "bg-chrome-link" },
  good: { canvas: "bg-good", chrome: "bg-chrome-good" },
  warn: { canvas: "bg-warn", chrome: "bg-chrome-warn" },
  bad: { canvas: "bg-bad", chrome: "bg-chrome-bad" },
  accent: { canvas: "bg-accent", chrome: "bg-chrome-accent" },
};

/** The status dot.
 *
 *  **It never goes alone.** A colored dot without its word next to it forces
 *  you to learn a legend that is written down nowhere, and it says nothing to
 *  someone who cannot tell red from green. The dot speeds up the scanning of a
 *  column; the word is what informs. That is why `label` is mandatory and gets
 *  drawn — if it needs to be hidden, it is hidden with `aria` and not by
 *  deleting it.
 *
 *  `pulse` for what is ALIVE: a bank statement still importing. It is the only animation in
 *  the system, and it exists because «importando» and «importado» differ by one
 *  letter and that is far too little for a state that changes on its own. */
export function StatusDot({
  tone = "neutral",
  label,
  pulse = false,
  surface = "canvas",
}: {
  tone?: Tone;
  /** ReactNode and not `string`: the label is visible text, and sometimes it
   *  carries a figure or a name already formatted by whoever composes. */
  label: ReactNode;
  pulse?: boolean;
  surface?: "canvas" | "chrome";
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="relative flex size-1.5 shrink-0">
        {pulse ? (
          <span
            className={`absolute inline-flex size-full animate-ping rounded-pill opacity-70 ${DOT_TONE[tone][surface]}`}
          />
        ) : null}
        <span
          className={`relative inline-flex size-1.5 rounded-pill ${DOT_TONE[tone][surface]}`}
        />
      </span>
      <span
        className={`text-micro ${surface === "chrome" ? "text-chrome-muted" : "text-muted"}`}
      >
        {label}
      </span>
    </span>
  );
}
