"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { Button } from "@sincpro/web-ui/primitives/button/Button";
import {
  controlClasses,
  type ControlProps,
  nameOf,
  ReadValue,
} from "@sincpro/web-ui/primitives/field/Field";
import {
  capturePointer,
  fitFontSize,
  type Point,
  strokeSteps,
} from "@sincpro/web-ui/primitives/field/media";
import { Eraser, PenLine, Type } from "lucide-react";
import { type PointerEvent, useEffect, useId, useRef, useState } from "react";

/** The pen, in CSS pixels: the weight of a ballpoint at the size the pad is drawn. */
const PEN = 2.25;
/** Where the line sits, from the top of the pad — the same fraction the drawn line uses
 *  (`bottom-1/4`), so a typed name rests on the line the person sees. */
const BASELINE = 0.75;
/** The gap between the pad's edge and the start of a typed name — `inset-x-4`. */
const INSET = 16;

/** The pen's colour: the INK token of the paper the canvas is on, read when it paints. The
 *  pad is a light subtree (see below), so this is the dark ink in either theme. */
function inkOf(el: Element) {
  const style = getComputedStyle(el);
  return style.getPropertyValue("--color-ink").trim() || style.color;
}

function paint(canvas: HTMLCanvasElement, strokes: readonly (readonly Point[])[]) {
  const ctx = canvas.getContext("2d");
  if (ctx === null) return;
  const dpr = canvas.clientWidth === 0 ? 1 : canvas.width / canvas.clientWidth;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ink = inkOf(canvas);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = PEN;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    ctx.beginPath();
    for (const step of strokeSteps(stroke)) {
      if (step.kind === "dot") {
        ctx.arc(step.at.x, step.at.y, PEN / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (step.kind === "move") ctx.moveTo(step.to.x, step.to.y);
      else if (step.kind === "quad") {
        ctx.quadraticCurveTo(step.control.x, step.control.y, step.to.x, step.to.y);
      } else ctx.lineTo(step.to.x, step.to.y);
    }
    ctx.stroke();
  }
}

/** A typed name, written as a signature: the system's font in italic, on the line, as big as
 *  the pad allows and smaller when the name is long. */
function typedSignature(text: string, pad: HTMLElement): string {
  const dpr = window.devicePixelRatio || 1;
  const width = pad.clientWidth || 480;
  const height = pad.clientHeight || 128;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx === null) return "";
  ctx.scale(dpr, dpr);
  const family = getComputedStyle(pad).fontFamily;
  const font = (size: number) => `italic 400 ${size}px ${family}`;
  const base = Math.round(height * 0.42);
  ctx.font = font(base);
  const size = fitFontSize(ctx.measureText(text).width, base, width - INSET * 2);
  ctx.font = font(size);
  ctx.fillStyle = inkOf(pad);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, INSET, height * BASELINE - 2);
  return canvas.toDataURL("image/png");
}

/**
 * A signature: drawn with the mouse, a pen or a finger — or typed, for whoever cannot draw.
 *
 * Context: the pad is a canvas that follows the pointer (`touch-none`, so a finger draws
 * instead of scrolling the page) and smooths each stroke through the midpoints of its
 * samples (`strokeSteps`) — no pressure, no library, and no corners. When a stroke ends the
 * pad is exported as a PNG data URL and handed to `onChange`; «Limpiar» empties it and
 * hands `null`.
 *
 * **A canvas alone shuts people out.** Whoever works with a keyboard or a screen reader, or
 * whose hand does not hold a pointer steady, cannot draw. «Escribir mi nombre» turns the pad
 * into a text box: the name typed (starting from `name`, when the form knows who signs) is
 * written into the same PNG in the system's font, in italic, on the same line — the value
 * has the same shape whichever way it was made, and the form does not have to know.
 *
 * **The pad is paper.** It is a forced-light subtree (`data-theme="light"`): the pen reads
 * `--color-ink` there, so a signature made in the dark theme is still dark ink on a
 * transparent PNG — the thing a printed contract or a PDF expects — and read mode lays it on
 * the same paper, so it is legible on either theme.
 *
 * A value that did not come from this pad (a signature already saved) is shown as it is,
 * not drawn over: «Limpiar» starts a new one. In read mode it draws the image.
 */
export function SignatureInput({
  id: ownId,
  value,
  onChange,
  name = "",
  alt,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** The signature as an image: a PNG data URL from this pad, or the URL of a saved one.
   *  `null` or `""` is unsigned. */
  value: string | null;
  onChange?: (next: string | null) => void;
  /** Who signs, to start the typed signature with. */
  name?: string;
  /** What the image is called to a screen reader. «Firma» by default. */
  alt?: string;
}) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const readMode = useFormMode(mode) === "read";
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState(name);
  const pad = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  /* The last value this pad handed out: a `value` equal to it is the pad's own work, and the
     canvas keeps drawing it; anything else came from outside and is shown as an image. */
  const emitted = useRef<string | null>(null);
  const own = useId();
  const helpId = `${own}-help`;
  const has = value !== null && value !== "";
  const stored = has && value !== emitted.current;
  const label = alt ?? copy.media.signature;

  /* The canvas is as many device pixels as it is drawn at, or the line blurs on a dense
     screen; a resize repaints the strokes, which are kept in CSS pixels. */
  useEffect(() => {
    const el = canvas.current;
    if (el === null) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      el.width = Math.max(1, Math.round(el.clientWidth * dpr));
      el.height = Math.max(1, Math.round(el.clientHeight * dpr));
      paint(el, strokes.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [typing, stored, readMode]);

  if (readMode) {
    return has ? (
      <span
        data-theme="light"
        className="inline-flex rounded-control border border-line bg-surface p-1"
      >
        <img src={value} alt={label} className="h-16 w-auto" />
      </span>
    ) : (
      <ReadValue value={null} />
    );
  }

  const emit = (next: string | null) => {
    emitted.current = next;
    onChange?.(next);
  };

  const pointOf = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    capturePointer(event);
    drawing.current = true;
    strokes.current.push([pointOf(event)]);
    paint(event.currentTarget, strokes.current);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const stroke = strokes.current[strokes.current.length - 1];
    if (stroke === undefined) return;
    /* The samples the browser merged into this event: a fast stroke between two frames is
       several points, and drawing only the last one cuts its curves into chords. */
    const native = event.nativeEvent;
    const samples =
      typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const box = event.currentTarget.getBoundingClientRect();
    if (samples.length > 0) {
      for (const one of samples)
        stroke.push({ x: one.clientX - box.left, y: one.clientY - box.top });
    } else stroke.push(pointOf(event));
    paint(event.currentTarget, strokes.current);
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    emit(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    strokes.current = [];
    if (canvas.current !== null) paint(canvas.current, []);
    if (typing) setTyped("");
    emit(null);
  }

  function writeTyped(text: string) {
    setTyped(text);
    emit(
      text.trim() === "" || pad.current === null ? null : typedSignature(text, pad.current),
    );
  }

  /* One signature, either way: switching starts the other one from scratch, and a typed name
     that is already there is written at once. */
  function switchMode() {
    strokes.current = [];
    if (typing) {
      setTyping(false);
      emit(null);
    } else {
      setTyping(true);
      writeTyped(typed);
    }
  }

  const paper = cn(
    "relative h-32 w-full overflow-clip rounded-control border bg-surface font-sans text-ink",
    invalid ? "border-danger" : "border-line-strong",
    disabled ? "bg-ground" : "",
  );

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel)}
      aria-describedby={describedBy}
      className="flex w-full min-w-0 flex-col gap-2"
    >
      <div ref={pad} data-theme="light" className={paper}>
        {stored || (typing && has) ? (
          <img
            src={value ?? ""}
            alt={label}
            className="size-full object-contain object-left"
          />
        ) : typing ? null : (
          <canvas
            ref={canvas}
            role="img"
            aria-label={copy.media.signaturePad}
            aria-describedby={helpId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={cn(
              "absolute inset-0 size-full touch-none",
              disabled ? "cursor-not-allowed" : "cursor-crosshair",
            )}
          />
        )}
        {/* The line to sign on: drawn by the page, never part of the PNG. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-1/4 border-t border-line-strong"
        />
      </div>
      {typing ? (
        <label className="flex flex-col gap-1 text-micro font-medium text-muted">
          {copy.media.typedName}
          <input
            /* The person asked for this box by pressing the button: the focus goes there. */
            autoFocus
            value={typed}
            disabled={disabled}
            autoComplete="name"
            onChange={(event) => writeTyped(event.target.value)}
            className={`${controlClasses(invalid)} font-normal`}
          />
        </label>
      ) : (
        <p id={helpId} className="text-micro text-muted">
          {copy.media.signatureHelp}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={typing ? PenLine : Type}
          disabled={disabled}
          onClick={switchMode}
        >
          {typing ? copy.media.drawInstead : copy.media.typeName}
        </Button>
        <Button role="ghost" size="sm" icon={Eraser} disabled={disabled} onClick={clear}>
          {copy.media.clear}
        </Button>
      </div>
    </div>
  );
}
