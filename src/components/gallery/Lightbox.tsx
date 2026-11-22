"use client";

import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { SurfaceProvider } from "@sincpro/web-ui/foundations/surface";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

export type GalleryImage = {
  src: string;
  /** What the image shows, said: «Silla Nórdica, vista de frente». Not optional — an image
   *  without words is a hole for a screen reader. */
  alt: string;
  /** A smaller file for the strip of thumbnails; the `src` when absent. */
  thumb?: string;
};

export type LightboxProps = {
  images: readonly GalleryImage[];
  /** Which one is shown. */
  index: number;
  onIndexChange: (next: number) => void;
  open: boolean;
  onClose: () => void;
};

/* Almost the scrim itself, not a dialog's 40 % veil: the page under it is not what the window
   is about — the image is. At 90 % the page still showed around a light photo and competed with
   it (seen in the gallery's story). Never 100 %: a veil is a share of the scrim (tokens.test). */
const overlay = tv({
  base: "fixed inset-0 z-50 bg-scrim/95 transition-opacity duration-(--duration-quick) ease-(--ease-out)",
  variants: {
    isEntering: { true: "opacity-0" },
    isExiting: { true: "opacity-0" },
  },
});

/** The step that wraps: past the last comes the first, the way a shop's photos go round. */
export function wrapIndex(index: number, total: number): number {
  return total === 0 ? 0 : ((index % total) + total) % total;
}

/**
 * The image at full size, over everything: a product's photo, a damage reported with the
 * phone, a scanned receipt.
 *
 * Context: a modal of React Aria — focus goes in, Escape and the ✕ close it, focus comes back
 * to the image that opened it — on a near-black veil, with the controls on the chrome palette
 * so they read on it. The arrows of the keyboard and the buttons at the sides step through the
 * images; the position is written («2 de 5») so «where am I» never depends on counting dots.
 */
export function Lightbox({ images, index, onIndexChange, open, onClose }: LightboxProps) {
  const copy = useUiCopy();
  const total = images.length;
  const image = images[wrapIndex(index, total)];
  const go = (step: number) => onIndexChange(wrapIndex(index + step, total));
  /* On the window and not on the dialog: the focus starts ON the dialog, and a key pressed
     there never reaches a handler inside it. */
  useEffect(() => {
    if (!open || total < 2) return;
    const keys = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      onIndexChange(wrapIndex(index + (event.key === "ArrowRight" ? 1 : -1), total));
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [open, total, index, onIndexChange]);

  return (
    <ModalOverlay
      isOpen={open && image !== undefined}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable
      className={overlay}
    >
      <Modal className="fixed inset-0 outline-0">
        <Dialog
          aria-label={image?.alt ?? copy.gallery.label}
          className="flex size-full flex-col outline-0"
          data-ui="lightbox"
        >
          <SurfaceProvider value="chrome">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 truncate text-meta text-chrome-ink" aria-live="polite">
                {fillCopy(copy.gallery.position, {
                  index: wrapIndex(index, total) + 1,
                  total,
                })}
              </p>
              <IconButton icon={X} label={copy.gallery.close} size="md" onClick={onClose} />
            </div>
            {/* The image fills what is left and is never cropped: what it shows is the point. */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16">
              {image === undefined ? null : (
                <img
                  src={image.src}
                  alt={image.alt}
                  className="max-h-full max-w-full rounded-control object-contain select-none"
                  draggable={false}
                />
              )}
              {/* On a disc: a bare chevron at the edge of a black screen was found by nobody. */}
              {total < 2 ? null : (
                <>
                  <span className="absolute top-1/2 left-2 -translate-y-1/2 rounded-pill bg-chrome-ink/12">
                    <IconButton
                      icon={ChevronLeft}
                      label={copy.gallery.previous}
                      size="lg"
                      onClick={() => go(-1)}
                    />
                  </span>
                  <span className="absolute top-1/2 right-2 -translate-y-1/2 rounded-pill bg-chrome-ink/12">
                    <IconButton
                      icon={ChevronRight}
                      label={copy.gallery.next}
                      size="lg"
                      onClick={() => go(1)}
                    />
                  </span>
                </>
              )}
            </div>
          </SurfaceProvider>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
