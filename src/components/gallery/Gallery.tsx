"use client";

import {
  type GalleryImage,
  Lightbox,
  wrapIndex,
} from "@sincpro/web-ui/components/gallery/Lightbox";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";

const ASPECT = {
  square: "aspect-square",
  /* The tile's 4:3 — the same box `RecordCard layout="tile"` draws a product in. */
  tile: "aspect-(--aspect-tile)",
  wide: "aspect-video",
} as const;

/* A finger that moves this far sideways meant «next», not «open». */
const SWIPE = 40;

export type GalleryProps = {
  images: readonly GalleryImage[];
  /** The shape of the main image. The photos are never cropped inside it: `contain`. */
  aspect?: keyof typeof ASPECT;
  /** Which image is shown, when the application holds it (a variant chosen shows its photo). */
  index?: number;
  onIndexChange?: (next: number) => void;
  /** Pressing the image opens it at full size (`Lightbox`). On by default. */
  zoom?: boolean;
};

/**
 * The images of ONE thing — a product, a property, an asset, a damage reported: a big one, the
 * strip of the rest under it, and full size on a press.
 *
 * Context: a product's page lives on its photos, and a carousel that turns by itself is a
 * photo nobody chose to see. Here the person moves it: the arrows at the sides, the strip, the
 * keyboard's arrows, a finger swiping. Where they are is written («2 de 5»), never only a dot.
 * The image is never cropped (`object-contain` on the ground tone): a cropped product is a
 * different product. Controlled or not: a shop that changes the photo when a colour is chosen
 * passes `index`.
 */
export function Gallery({
  images,
  aspect = "square",
  index: indexProp,
  onIndexChange,
  zoom = true,
}: GalleryProps) {
  const copy = useUiCopy();
  const [own, setOwn] = useState(0);
  const [open, setOpen] = useState(false);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const total = images.length;
  const index = wrapIndex(indexProp ?? own, total);
  const image = images[index];

  const show = (next: number) => {
    const at = wrapIndex(next, total);
    if (indexProp === undefined) setOwn(at);
    onIndexChange?.(at);
  };
  const position = (at: number) => fillCopy(copy.gallery.position, { index: at + 1, total });

  const keys = (event: KeyboardEvent) => {
    if (total < 2) return;
    if (event.key === "ArrowRight") show(index + 1);
    else if (event.key === "ArrowLeft") show(index - 1);
    else return;
    event.preventDefault();
  };
  const down = (event: PointerEvent) => {
    swipe.current = { x: event.clientX, moved: false };
  };
  const up = (event: PointerEvent) => {
    const start = swipe.current;
    if (start === null || total < 2) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) < SWIPE) return;
    start.moved = true;
    show(index + (dx < 0 ? 1 : -1));
  };

  if (image === undefined) {
    return (
      <div
        data-ui="gallery"
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-ui-card bg-ground text-muted ${ASPECT[aspect]}`}
      >
        <ImageOff className="size-8" strokeWidth={1.5} aria-hidden />
        <p className="text-meta">{copy.gallery.empty}</p>
      </div>
    );
  }

  const picture = (
    <img
      src={image.src}
      alt={image.alt}
      draggable={false}
      className="size-full object-contain select-none"
    />
  );

  return (
    <div
      role="group"
      aria-label={copy.gallery.label}
      aria-roledescription={copy.gallery.roledescription}
      data-ui="gallery"
      className="flex min-w-0 flex-col gap-2"
      onKeyDown={keys}
    >
      <div
        data-ui="gallery.main"
        className={`relative w-full overflow-clip rounded-ui-card bg-ground touch-pan-y ${ASPECT[aspect]}`}
        onPointerDown={down}
        onPointerUp={up}
      >
        {zoom ? (
          <button
            type="button"
            aria-label={`${copy.gallery.open}: ${image.alt}`}
            className="size-full cursor-zoom-in outline-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            onClick={() => {
              /* The press that ended a swipe is not an «open». */
              if (swipe.current?.moved === true) return;
              setOpen(true);
            }}
          >
            {picture}
          </button>
        ) : (
          picture
        )}
        {total < 2 ? null : (
          <>
            {/* On a disc of the paper: an arrow drawn straight on a photo disappears on a
                white product. */}
            <span className="absolute top-1/2 left-2 -translate-y-1/2 rounded-pill bg-surface/85 shadow-raised">
              <IconButton
                icon={ChevronLeft}
                label={copy.gallery.previous}
                size="md"
                surface="canvas"
                onClick={() => show(index - 1)}
              />
            </span>
            <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded-pill bg-surface/85 shadow-raised">
              <IconButton
                icon={ChevronRight}
                label={copy.gallery.next}
                size="md"
                surface="canvas"
                onClick={() => show(index + 1)}
              />
            </span>
            <span
              aria-live="polite"
              className="absolute right-2 bottom-2 rounded-pill bg-surface/85 px-2 py-0.5 text-micro font-medium text-ink tabular-nums shadow-raised"
            >
              {index + 1} / {total}
              <span className="sr-only">{`, ${position(index)}`}</span>
            </span>
          </>
        )}
      </div>

      {total < 2 ? null : (
        <div data-ui="gallery.strip" className="flex gap-2 overflow-x-auto pb-1">
          {images.map((one, at) => (
            <button
              key={`${one.src}-${at}`}
              type="button"
              aria-label={`${position(at)}: ${one.alt}`}
              aria-current={at === index ? "true" : undefined}
              onClick={() => show(at)}
              className={`size-14 shrink-0 overflow-clip rounded-control border-2 bg-ground transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                at === index
                  ? "border-primary"
                  : "border-transparent hover:border-line-strong"
              }`}
            >
              <img src={one.thumb ?? one.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom ? (
        <Lightbox
          images={images}
          index={index}
          onIndexChange={show}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
