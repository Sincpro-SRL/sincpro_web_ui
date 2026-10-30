import { type ReactNode, useEffect, useState } from "react";

import { contrast, ratioLabel, readVar, type Usage, verdict } from "./contrast";

/* ==================================================================== *
 *  THE GALLERY PARTS — and why they are not kit pieces.
 *
 *  Nothing in this file is used in the product: they are scaffolding to LOOK
 *  at the product. They live in `gallery/` and not in `kit/` for the same rule
 *  that separates the kit from the domain — a component that only makes sense
 *  in the documentation does not belong to the kit, even if it looks like it.
 * ==================================================================== */

/* ---------------------------------------------------------------- *
 *  STRUCTURE
 * ---------------------------------------------------------------- */

export function Section({
  id,
  title,
  rule,
  children,
}: {
  id: string;
  title: string;
  /** The rule that governs this family. It is not a description: it is what you
   *  have to be able to quote when someone asks why you cannot do something
   *  else. */
  rule?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 flex min-w-0 flex-col gap-3.5">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-mono text-micro tracking-[0.14em] text-ink uppercase">{title}</h2>
        {rule === undefined ? null : (
          <p className="max-w-[68ch] text-meta text-muted">{rule}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-3">{children}</div>;
}

/** A swatch with its label underneath. The label goes in mono because it is the
 *  name of the token —a machine wrote it— and the note in proportional because
 *  it is a sentence. It is the same family rule that governs the product. */
export function Swatch({
  name,
  note,
  width,
  children,
}: {
  name: string;
  note?: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col items-start gap-2" style={{ width }}>
      {children}
      <figcaption className="flex flex-col gap-0.5">
        <span className="font-mono text-micro text-ink">{name}</span>
        {note === undefined ? null : <span className="text-micro text-muted">{note}</span>}
      </figcaption>
    </figure>
  );
}

/** The frame where a piece is tried out. White over the background, with an
 *  edge — the same border-based elevation the product uses, so that what you
 *  see here looks the same over there. */
export function Tester({
  children,
  dark = false,
  width,
}: {
  children: ReactNode;
  /** On the chrome. What gets tried out here is what lives in the header, the
   *  rail or the activity bar, and on white it cannot be judged. */
  dark?: boolean;
  width?: number;
}) {
  return (
    <div
      style={{ width }}
      className={`flex min-w-0 flex-wrap items-center gap-3 rounded-box border p-3.5 ${
        dark ? "border-chrome-raised bg-chrome" : "border-line bg-surface"
      }`}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  THE COLOR SWATCHES — with the number, always
 * ---------------------------------------------------------------- */

export interface TokenColor {
  /** The name of the CSS variable, without `var()`. */
  token: string;
  note: string;
  /** What it is measured against. Without this a contrast means nothing: the
   *  same gold gives 2,43:1 on the canvas and 7,39:1 on the chrome. */
  against?: string;
  /** It is a background and what gets measured is the text that goes ON TOP. */
  asBackground?: string;
  /** What the color is for. It decides the threshold: a separator line at
   *  1,26:1 is not a defect, it is the decision. See `Usage` in `contrast.ts`. */
  usage?: Usage;
}

export function ColorSwatch({
  token,
  note,
  against,
  asBackground,
  usage = "text",
}: TokenColor) {
  const [measure, setMeasure] = useState<{ ratio: number; against: string } | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const own = readVar(token);
    setValue(own);
    const other = asBackground ?? against;
    if (own === "" || other === undefined) return;
    const otherValue = readVar(other);
    if (otherValue === "") return;
    setMeasure({ ratio: contrast(own, otherValue), against: other });
  }, [token, against, asBackground]);

  const v = measure === null ? null : verdict(measure.ratio, usage);

  return (
    <figure className="m-0 w-[196px] overflow-hidden rounded-box border border-line bg-surface">
      <div className="h-[68px] w-full" style={{ background: `var(${token})` }} />
      <figcaption className="flex flex-col gap-1 px-2.5 py-2">
        <span className="font-mono text-micro text-ink">{token.replace("--color-", "")}</span>
        <span className="font-mono text-micro text-muted uppercase">{value || "—"}</span>
        <span className="text-micro text-muted">{note}</span>
        {measure === null ? null : (
          <span className="flex items-baseline gap-1.5">
            <span className="font-mono text-micro tabular-nums text-ink">
              {ratioLabel(measure.ratio)}
            </span>
            <span
              className={`text-micro ${
                v === "no pasa"
                  ? "text-bad"
                  : v === "AA grande"
                    ? "text-warn"
                    : v === "no aplica"
                      ? "text-muted"
                      : "text-good"
              }`}
            >
              {v}
            </span>
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- *
 *  THE DATA SHEET OF A COMPONENT
 * ---------------------------------------------------------------- */

export function Piece({
  name,
  role,
  file,
  uses,
  children,
}: {
  name: string;
  /** What this piece answers. A single sentence, in the present tense. */
  role: string;
  file: string;
  /** In how many product files it is used today. **Zero is a defect**: either
   *  there is a screen that should be using it and does not, or the piece is
   *  redundant. */
  uses?: number;
  children: ReactNode;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-box border border-line bg-surface p-4">
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="text-lead font-medium text-ink">{name}</h3>
        <span className="font-mono text-micro text-muted">{file}</span>
        {uses === undefined ? null : (
          <span
            className={`ml-auto rounded-pill px-2 py-0.5 text-micro ${
              uses === 0 ? "bg-bad/10 text-bad" : "bg-ink/5 text-muted"
            }`}
          >
            {uses === 0 ? "sin consumidores" : `${uses} usos`}
          </span>
        )}
      </header>
      <p className="max-w-[70ch] text-meta text-muted">{role}</p>
      <div className="flex flex-wrap items-center gap-3 pt-1">{children}</div>
    </article>
  );
}
