"use client";

import { type ReactNode, useEffect, useState } from "react";

const SIZE = {
  /* A receipt's corner, an invoice's footer. */
  sm: "size-28",
  /* A payment on a till's screen, a portal's «pagar con QR». */
  md: "size-44",
  /* A customer display, a kiosk: read from a step away. */
  lg: "size-64",
} as const;

/** The four modules of white around the code that a scanner needs to find it. */
const QUIET = 4;

export type QrCodeProps = {
  /** What the code carries: a payment's string, an invoice's URL, a record's link. */
  value: string;
  /** What it is, said: «QR para pagar Bs 46,00». It is the image's name — a code is not
   *  readable by a person, so the words are the only way to know what it does. */
  label: string;
  size?: keyof typeof SIZE;
  /** How much of it may be covered or worn and still read: `M` (15 %) by default; `H` (30 %)
   *  for a printed code that will be folded or scratched. */
  level?: "L" | "M" | "Q" | "H";
  /** A line under it: the amount, «Vence en 10 min». */
  caption?: ReactNode;
};

/** One path for every dark module, in the code's own units. */
function modulesPath(data: readonly (readonly boolean[])[]): string {
  let d = "";
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
    });
  });
  return d;
}

/**
 * A QR code — a payment by QR at a till or a portal, an invoice's verification link, a record
 * to open on a phone.
 *
 * Context: QR is how much of Bolivia pays, so a till, a kiosk and an invoice draw one. The
 * encoder (`uqr`, no dependencies) is reached with `import()` when a code is drawn: a screen
 * without one never fetches it. The code is drawn here, as one SVG path in the system's two
 * QR colours — black on white in BOTH themes, because a scanner reads dark on light — with its
 * quiet zone, so it scans on a dark page. Until the encoder arrives (and on the server) a
 * silent square holds its place. It is an image named by `label`: the words say what it does.
 */
export function QrCode({ value, label, size = "md", level = "M", caption }: QrCodeProps) {
  const [code, setCode] = useState<{
    value: string;
    level: string;
    path: string;
    side: number;
  } | null>(null);
  useEffect(() => {
    let live = true;
    void import("uqr").then(({ encode }) => {
      if (!live) return;
      const { data, size: side } = encode(value, { ecc: level, border: 0 });
      setCode({ value, level, path: modulesPath(data), side });
    });
    return () => {
      live = false;
    };
  }, [value, level]);
  const ready = code !== null && code.value === value && code.level === level;
  const box = code === null ? 0 : code.side + QUIET * 2;
  return (
    <figure data-ui="qr" data-size={size} className="inline-flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={label}
        className={`overflow-hidden rounded-control ${SIZE[size]} ${ready ? "bg-qr-paper" : "animate-reveal-late bg-ink/5"}`}
      >
        {ready ? (
          <svg
            viewBox={`0 0 ${box} ${box}`}
            className="size-full"
            shapeRendering="crispEdges"
            aria-hidden
          >
            <path d={code.path} className="fill-qr-ink" />
          </svg>
        ) : null}
      </div>
      {caption === undefined ? null : (
        <figcaption className="text-meta text-ink tabular-nums">{caption}</figcaption>
      )}
    </figure>
  );
}
