/**
 * The arithmetic behind the two media controls — the crop of `ImageInput` and the strokes of
 * `SignatureInput` — kept apart from the canvas so it can be checked without a browser.
 *
 * Context: a crop that is off by half a pixel, or a pan that lets the frame slide past the
 * edge of the photo, is invisible in a story and obvious on the avatar a hundred screens
 * later. Here the rules are plain functions over sizes and points; the components only
 * read the pointer and the keys, ask these where things go, and paint.
 */

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/** Where the frame sits on the image: how much it is zoomed in (1 = the image just covers
 *  the frame) and the CENTRE of the frame, as a fraction of the image's width and height.
 *  Fractions and not pixels so the same crop holds whatever size the image is drawn at. */
export type Crop = { zoom: number; x: number; y: number };

/** Past four times the photo is mostly blur: the limit is about what is worth keeping. */
export const CROP_MAX_ZOOM = 4;

export const CROP_CENTERED: Crop = { zoom: 1, x: 0.5, y: 0.5 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** The width of the frame, in image pixels, at zoom 1: the largest box of `aspect` that fits
 *  inside the image. «Cover», never «contain» — a crop never adds empty bands. */
function coverWidth(image: Size, aspect: number) {
  return Math.min(image.width, image.height * aspect);
}

/** The crop made valid: zoom within `[1, CROP_MAX_ZOOM]`, and the centre held far enough
 *  from the edges that the frame never shows past the image. */
export function clampCrop(image: Size, aspect: number, crop: Crop): Crop {
  const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, 1, CROP_MAX_ZOOM);
  const width = coverWidth(image, aspect) / zoom;
  const height = width / aspect;
  const halfX = width / 2 / image.width;
  const halfY = height / 2 / image.height;
  return {
    zoom,
    x: clamp(crop.x, halfX, 1 - halfX),
    y: clamp(crop.y, halfY, 1 - halfY),
  };
}

/** The part of the image the frame shows, in image pixels — what `drawImage` reads from. */
export function cropRegion(image: Size, aspect: number, crop: Crop): Rect {
  const valid = clampCrop(image, aspect, crop);
  const width = coverWidth(image, aspect) / valid.zoom;
  const height = width / aspect;
  return {
    x: valid.x * image.width - width / 2,
    y: valid.y * image.height - height / 2,
    width,
    height,
  };
}

/**
 * Moves the IMAGE under the frame by a fraction of the frame — the way a drag does: dragging
 * right by a quarter of the frame slides the photo right by a quarter, so the frame now shows
 * more of its left side. The arrow keys move it the same way, so the hand and the keyboard
 * never disagree about which way is which.
 */
export function panCrop(image: Size, aspect: number, crop: Crop, dx: number, dy: number) {
  const region = cropRegion(image, aspect, crop);
  return clampCrop(image, aspect, {
    ...crop,
    x: crop.x - (dx * region.width) / image.width,
    y: crop.y - (dy * region.height) / image.height,
  });
}

/** Zooms by `factor` about the frame's centre (the point the person is looking at). */
export function zoomCrop(image: Size, aspect: number, crop: Crop, factor: number): Crop {
  return clampCrop(image, aspect, { ...crop, zoom: crop.zoom * factor });
}

/** The size the cropped image is written at: the region's own pixels, never upscaled (a
 *  bigger file of the same blur), and at most `maxSide` on its longer side. */
export function outputSize(region: Size, maxSide: number): Size {
  const scale = Math.min(1, maxSide / Math.max(region.width, region.height));
  return {
    width: Math.max(1, Math.round(region.width * scale)),
    height: Math.max(1, Math.round(region.height * scale)),
  };
}

/** Whether a file is an image the browser can draw. A dropped file is not filtered by
 *  `accept`, so the type is checked here — and by its extension when the system did not
 *  say its type, which happens for a file dragged from some file managers. */
export function isImageFile(file: { type: string; name: string }): boolean {
  if (file.type !== "") return file.type.startsWith("image/");
  return /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(file.name);
}

/** The type a crop is written in: JPEG and WebP stay what they were (a photo as PNG is five
 *  times heavier for nothing); everything else becomes PNG, which keeps transparency. */
export function croppedType(type: string): "image/png" | "image/jpeg" | "image/webp" {
  return type === "image/jpeg" || type === "image/webp" ? type : "image/png";
}

/** The file's name with the extension of the type it was written in: «logo.gif» cropped to
 *  a PNG is «logo.png», so the server does not trust a name that lies about its content. */
export function croppedName(name: string, type: string): string {
  const extension = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
  const base = name.replace(/\.[^./]+$/, "");
  return `${base === "" ? "imagen" : base}.${extension}`;
}

/** One instruction of a stroke's path, in the canvas's terms. */
export type PathStep =
  | { kind: "dot"; at: Point }
  | { kind: "move"; to: Point }
  | { kind: "quad"; control: Point; to: Point }
  | { kind: "line"; to: Point };

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * The path of one stroke, smoothed: each sampled point becomes the CONTROL of a quadratic
 * curve that runs between the midpoints around it.
 *
 * Context: joining the pointer's samples with straight lines draws a polygon — at the speed
 * a signature is written the samples are far apart, and every corner shows. Curving through
 * the midpoints passes near every sample without a corner at any of them, and costs nothing:
 * no pressure, no velocity, no library. A single sample is a tap — a dot, the one over an i.
 */
export function strokeSteps(points: readonly Point[]): PathStep[] {
  const first = points[0];
  if (first === undefined) return [];
  if (points.length === 1) return [{ kind: "dot", at: first }];
  const steps: PathStep[] = [{ kind: "move", to: first }];
  for (let i = 1; i < points.length - 1; i += 1) {
    steps.push({
      kind: "quad",
      control: points[i]!,
      to: midpoint(points[i]!, points[i + 1]!),
    });
  }
  steps.push({ kind: "line", to: points[points.length - 1]! });
  return steps;
}

/** The font size a typed name is written at so it fits `maxWidth`: `size` when it fits, and
 *  smaller in proportion when it does not — a long name is still one line, never cut. */
export function fitFontSize(widthAtSize: number, size: number, maxWidth: number, min = 12) {
  if (widthAtSize <= maxWidth || widthAtSize <= 0) return size;
  return Math.max(min, Math.floor((size * maxWidth) / widthAtSize));
}

/** Keeps a pointer's moves on the element that started a drag, even when it leaves it — a
 *  stroke that runs off the pad is still one stroke. A pointer the browser no longer tracks
 *  (a synthetic one, or one already lifted) cannot be captured, and the drag works without. */
export function capturePointer(event: { currentTarget: Element; pointerId: number }) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    /* Not capturable: the moves still arrive while the pointer stays over the element. */
  }
}
