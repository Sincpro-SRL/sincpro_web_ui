"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { cn } from "@sincpro/web-ui/foundations/variants";
import { Button, buttonClasses, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { type ControlProps, nameOf, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import {
  capturePointer,
  clampCrop,
  type Crop,
  CROP_CENTERED,
  CROP_MAX_ZOOM,
  croppedName,
  croppedType,
  cropRegion,
  isImageFile,
  outputSize,
  panCrop,
  type Size,
  zoomCrop,
} from "@sincpro/web-ui/primitives/field/media";
import { AlertCircle, ImagePlus, ZoomIn, ZoomOut } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  Button as AriaButton,
  type DropItem,
  DropZone as AriaDropZone,
  FileTrigger,
} from "react-aria-components";

/** What `onChange` hands over: the FILE, for the upload — a multipart part with its name and
 *  type, the thing a server stores — and its `url` (a data URL), to show it right away. */
export type ImageChange = { file: File; url: string };

function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("not an image"));
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error("no blob")) : resolve(blob)),
      type,
      0.92,
    );
  });
}

/** The image being cropped: the file it came from, the decoded image, and the frame on it. */
type Editing = { file: File; image: HTMLImageElement; size: Size; crop: Crop };

/** How far one press of an arrow moves the image: a twentieth of the frame, a fifth with
 *  Shift — fine enough to centre a face, coarse enough not to take forty presses. */
const STEP = 0.05;
const BIG_STEP = 0.2;
const ZOOM_STEP = 1.2;

const FRAME = {
  rect: "w-40 rounded-box",
  circle: "w-24 rounded-pill",
} as const;

/**
 * An image the record holds — a product photo, a logo, the face on a contact: chosen,
 * dropped or pasted, previewed, replaced and removed, and cropped to a shape when the field
 * has one.
 *
 * Context: `Thumb` and `Avatar` showed an image and nothing could change it; this is the
 * control that does. The way in is `DropZone`'s — React Aria's `DropZone` and `FileTrigger`,
 * so a drop, a paste (⌘/Ctrl+V of a copied image) and the keyboard all reach it — but what
 * it holds is the image itself, drawn where the file's name would be.
 *
 * **The value is a string; the change carries the file.** `value` is whatever an `<img>` can
 * draw — the URL the server keeps, or the data URL of a pick not yet saved — so the record
 * passes what it has and the control never asks which. `onChange` hands over `{ file, url }`:
 * the `File` for the upload (with its real name and type), and the `url` to put back into
 * `value` at once, so the new image shows before the server answers. A data URL and not an
 * object URL on purpose: it needs no `revoke`, it does not die with the page, and the form
 * can hold it in state without anyone owning its lifetime. `null` is «removed».
 *
 * **The crop is the field's, not the person's.** With `aspect` (1 for an avatar, 16/9 for a
 * banner) a picked image opens in a frame of that shape before it is taken: drag it or move
 * it with the arrows, zoom with the two buttons or with + and −, Enter applies and Escape
 * leaves it as it was. It is drawn on a canvas, so the file that comes out is ALREADY the
 * crop — the server receives the avatar, not a photo plus four numbers to apply later — and
 * at most `maxSide` pixels on its longer side. Without `aspect` the image is taken as it is.
 *
 * In read mode it draws the image with its `alt`; with no image, the «not set» mark.
 */
export function ImageInput({
  id: ownId,
  value,
  onChange,
  alt,
  aspect: ownAspect,
  shape = "rect",
  accept = "image/*",
  maxSide = 1024,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** What an `<img>` draws: a stored URL or a data URL. `null` or `""` is no image. */
  value: string | null;
  onChange?: (next: ImageChange | null) => void;
  /** What the image shows, said to whoever cannot see it: «Foto de Ana Gutiérrez». `""` when
   *  the name beside it already says everything. */
  alt: string;
  /** Width over height of the crop. Present, a picked image is cropped to it before it is
   *  taken. A `circle` crops to 1 by default. */
  aspect?: number;
  /** `circle` for a face: the frame and the preview are round (the file stays square). */
  shape?: "rect" | "circle";
  /** The file dialog's filter. A drop is checked as an image whatever this says. */
  accept?: string;
  /** The longest side the cropped file is written at, in pixels. */
  maxSide?: number;
}) {
  const copy = useUiCopy();
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const readMode = useFormMode(mode) === "read";
  const [editing, setEditing] = useState<Editing | null>(null);
  const [failed, setFailed] = useState(false);
  const [refocus, setRefocus] = useState(false);
  const chooser = useRef<HTMLButtonElement>(null);
  const own = useId();
  const errorId = `${own}-error`;
  const aspect = ownAspect ?? (shape === "circle" ? 1 : undefined);
  const has = value !== null && value !== "";

  /* The editor and the remove button take their buttons with them when they close: the
     focus goes back to the chooser, not to the top of the page. */
  useEffect(() => {
    if (!refocus) return;
    chooser.current?.focus();
    setRefocus(false);
  }, [refocus]);

  if (readMode) {
    return has ? (
      <span className={cn("block overflow-clip bg-ground", FRAME[shape])}>
        <img
          src={value}
          alt={alt}
          style={{ aspectRatio: aspect ?? 4 / 3 }}
          className={cn(
            "block size-full",
            aspect === undefined ? "object-contain" : "object-cover",
          )}
        />
      </span>
    ) : (
      <ReadValue value={null} />
    );
  }

  async function take(file: File) {
    if (disabled) return;
    if (!isImageFile(file)) {
      setFailed(true);
      return;
    }
    try {
      const url = await readDataUrl(file);
      if (aspect === undefined) {
        setFailed(false);
        onChange?.({ file, url });
        return;
      }
      const image = await loadImage(url);
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      setFailed(false);
      setEditing({ file, image, size, crop: clampCrop(size, aspect, CROP_CENTERED) });
    } catch {
      setFailed(true);
    }
  }

  async function onDrop(items: readonly DropItem[]) {
    for (const item of items) {
      if (item.kind === "file") {
        await take(await item.getFile());
        return;
      }
    }
  }

  const types = accept
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");
  const describedAll =
    [describedBy, failed ? errorId : null].filter(Boolean).join(" ") || undefined;
  const error = failed ? (
    <p id={errorId} role="alert" className="flex items-start gap-1.5 text-micro text-danger">
      <AlertCircle
        aria-hidden
        className="mt-px size-(--size-icon-sm) shrink-0"
        strokeWidth={2}
      />
      <span className="max-w-prose">{copy.media.notImage}</span>
    </p>
  ) : null;

  if (editing !== null && aspect !== undefined) {
    return (
      <div
        id={id}
        role="group"
        aria-labelledby={labelledBy}
        aria-label={nameOf(labelledBy, ariaLabel)}
        aria-describedby={describedBy}
        className="flex w-full min-w-0 flex-col gap-2"
      >
        <CropEditor
          editing={editing}
          aspect={aspect}
          shape={shape}
          onCrop={(crop) => setEditing({ ...editing, crop })}
          onCancel={() => {
            setEditing(null);
            setRefocus(true);
          }}
          onApply={async () => {
            const { file, image, size, crop } = editing;
            const region = cropRegion(size, aspect, crop);
            const out = outputSize(region, maxSide);
            const canvas = document.createElement("canvas");
            canvas.width = out.width;
            canvas.height = out.height;
            canvas
              .getContext("2d")
              ?.drawImage(
                image,
                region.x,
                region.y,
                region.width,
                region.height,
                0,
                0,
                out.width,
                out.height,
              );
            const type = croppedType(file.type);
            const url = canvas.toDataURL(type, 0.92);
            const blob = await canvasBlob(canvas, type);
            onChange?.({
              file: new File([blob], croppedName(file.name, type), { type }),
              url,
            });
            setEditing(null);
            setRefocus(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel)}
      aria-describedby={describedAll}
      className="flex w-full min-w-0 flex-col gap-2"
    >
      <AriaDropZone
        aria-label={copy.media.dropImage}
        isDisabled={disabled}
        getDropOperation={() => (disabled ? "cancel" : "copy")}
        onDrop={(event) => void onDrop(event.items)}
        className={({ isDropTarget, isFocusVisible }) =>
          cn(
            "flex min-w-0 items-center gap-4 rounded-box border p-3 transition-colors duration-(--duration-instant) outline-primary outline-offset-2",
            isDropTarget
              ? "border-primary bg-primary/8 forced-colors:border-[Highlight]"
              : invalid || failed
                ? "border-danger bg-surface"
                : "border-dashed border-line-strong bg-surface",
            isFocusVisible ? "outline-2" : "outline-0",
          )
        }
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-clip border border-line bg-ground text-muted",
            FRAME[shape],
          )}
          style={{ aspectRatio: aspect ?? 4 / 3 }}
        >
          {has ? (
            <img
              src={value}
              alt={alt}
              className={cn(
                "block size-full",
                aspect === undefined ? "object-contain" : "object-cover",
              )}
            />
          ) : (
            <ImagePlus aria-hidden className="size-(--size-icon-lg)" strokeWidth={1.5} />
          )}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-2">
          {has ? null : <p className="text-meta text-muted">{copy.media.dropImage}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <FileTrigger
              acceptedFileTypes={types}
              onSelect={(files) => {
                const file = files?.[0];
                if (file !== undefined) void take(file);
              }}
            >
              {/* React Aria's button: the trigger presses it through React Aria's press
                  events. Secondary — the screen's main action is what the image is FOR. */}
              <AriaButton
                ref={chooser}
                isDisabled={disabled}
                data-emphasis="secondary"
                className={buttonClasses("secondary", "sm")}
              >
                {has ? copy.media.changeImage : copy.media.chooseImage}
              </AriaButton>
            </FileTrigger>
            {has ? (
              <Button
                role="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setFailed(false);
                  onChange?.(null);
                  setRefocus(true);
                }}
              >
                {copy.media.removeImage}
              </Button>
            ) : null}
          </div>
        </div>
      </AriaDropZone>
      {error}
    </div>
  );
}

/**
 * The frame a picked image is cropped in: the image on a canvas, moved by the pointer and by
 * the keys, and the two zoom buttons.
 *
 * Context: one focusable surface (`role="application"`, so a screen reader hands the arrows
 * to it instead of reading by line), named and described by the instruction that is also
 * written under it — the keys are not a secret for whoever cannot see the frame, nor for
 * whoever can. The zoom is said as a figure in a polite live region.
 */
function CropEditor({
  editing,
  aspect,
  shape,
  onCrop,
  onCancel,
  onApply,
}: {
  editing: Editing;
  aspect: number;
  shape: "rect" | "circle";
  onCrop: (crop: Crop) => void;
  onCancel: () => void;
  onApply: () => Promise<void>;
}) {
  const copy = useUiCopy();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const helpId = `${useId()}-help`;
  const { image, size, crop } = editing;

  /* The frame is the person's first stop: the image just appeared, and the keys move it. */
  useEffect(() => {
    canvas.current?.focus();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (el === null) return;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(el.clientWidth * dpr));
      const height = Math.max(1, Math.round((el.clientWidth / aspect) * dpr));
      if (el.width !== width) el.width = width;
      if (el.height !== height) el.height = height;
      const ctx = el.getContext("2d");
      if (ctx === null) return;
      const region = cropRegion(size, aspect, crop);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(
        image,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        width,
        height,
      );
      if (shape === "circle") {
        /* What the round preview will cut off, veiled in the surface's colour — read from
           the token at paint time, so the veil follows the theme. */
        const veil = getComputedStyle(el).getPropertyValue("--color-surface").trim();
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = veil === "" ? getComputedStyle(el).backgroundColor : veil;
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fill("evenodd");
        ctx.restore();
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(el);
    return () => observer.disconnect();
  }, [image, size, aspect, crop, shape]);

  const pan = (dx: number, dy: number) => onCrop(panCrop(size, aspect, crop, dx, dy));
  const zoom = (factor: number) => onCrop(zoomCrop(size, aspect, crop, factor));

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0),
      ArrowRight: () => pan(step, 0),
      ArrowUp: () => pan(0, -step),
      ArrowDown: () => pan(0, step),
      "+": () => zoom(ZOOM_STEP),
      "=": () => zoom(ZOOM_STEP),
      "-": () => zoom(1 / ZOOM_STEP),
      _: () => zoom(1 / ZOOM_STEP),
      "0": () => onCrop(clampCrop(size, aspect, CROP_CENTERED)),
      Enter: () => void onApply(),
      Escape: onCancel,
    };
    const run = keys[event.key];
    if (run === undefined) return;
    event.preventDefault();
    run();
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    capturePointer(event);
    drag.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const from = drag.current;
    if (from === null) return;
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY };
    pan((event.clientX - from.x) / box.width, (event.clientY - from.y) / box.height);
  }

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <>
      <canvas
        ref={canvas}
        role="application"
        tabIndex={0}
        aria-label={copy.media.crop}
        aria-describedby={helpId}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ aspectRatio: aspect }}
        className={cn(
          "block w-full max-w-xs cursor-grab touch-none border border-line-strong bg-ground outline-primary outline-offset-2 focus-visible:outline-2 active:cursor-grabbing",
          shape === "circle" ? "rounded-box" : "rounded-control",
        )}
      />
      <p id={helpId} className="max-w-xs text-micro text-muted">
        {copy.media.cropHelp}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <IconButton
          icon={ZoomOut}
          label={copy.media.zoomOut}
          disabled={crop.zoom <= 1}
          onClick={() => zoom(1 / ZOOM_STEP)}
        />
        <span
          aria-live="polite"
          className="min-w-10 text-center text-micro text-muted tabular-nums"
        >
          {Math.round(crop.zoom * 100)} %
        </span>
        <IconButton
          icon={ZoomIn}
          label={copy.media.zoomIn}
          disabled={crop.zoom >= CROP_MAX_ZOOM}
          onClick={() => zoom(ZOOM_STEP)}
        />
        <span className="ml-auto flex items-center gap-2">
          <Button role="ghost" size="sm" onClick={onCancel}>
            {copy.media.cancel}
          </Button>
          <Button size="sm" onClick={() => void onApply()}>
            {copy.media.applyCrop}
          </Button>
        </span>
      </div>
    </>
  );
}
