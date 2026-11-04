import assert from "node:assert/strict";

import {
  ENGLISH_COPY,
  Field,
  FieldCopyProvider,
  FormModeProvider,
  ImageInput,
  SignatureInput,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import {
  clampCrop,
  CROP_CENTERED,
  CROP_MAX_ZOOM,
  croppedName,
  croppedType,
  cropRegion,
  fitFontSize,
  isImageFile,
  outputSize,
  panCrop,
  strokeSteps,
  zoomCrop,
} from "@sincpro/web-ui/primitives/field/media";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the two media controls — an image chosen and cropped, a signature drawn or typed.
 * The pointer, the canvas and the file dialog live in a browser and are driven by the stories
 * (`2 · Primitivas/Imagen y firma`); what is checked here is the arithmetic of the crop and
 * the strokes, and what each control DRAWS: its names, its way in for the keyboard, and its
 * read mode.
 */

function spanish(children: ReactNode): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <FieldCopyProvider value={false}>{children}</FieldCopyProvider>
    </UiCopyProvider>,
  );
}

const read = (children: ReactNode) =>
  spanish(<FormModeProvider value="read">{children}</FormModeProvider>);

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

/* ── The crop ─────────────────────────────────────────────────────────── */

const landscape = { width: 400, height: 200 };

test("at zoom 1 the frame covers the image: the largest box of its aspect, centred", () => {
  assert.deepEqual(cropRegion(landscape, 1, CROP_CENTERED), {
    x: 100,
    y: 0,
    width: 200,
    height: 200,
  });
  /* A banner wider than the photo is as wide as the photo, and shorter. */
  assert.deepEqual(cropRegion(landscape, 4, CROP_CENTERED), {
    x: 0,
    y: 50,
    width: 400,
    height: 100,
  });
});

test("the frame never slides past the edge of the image", () => {
  const far = clampCrop(landscape, 1, { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(far, { zoom: 1, x: 0.25, y: 0.5 });
  const region = cropRegion(landscape, 1, { zoom: 1, x: 5, y: -3 });
  assert.equal(region.x, 200);
  assert.equal(region.y, 0);
});

test("zoom stays between 1 and the maximum, and narrows the frame about its centre", () => {
  assert.equal(zoomCrop(landscape, 1, CROP_CENTERED, 0.1).zoom, 1);
  assert.equal(zoomCrop(landscape, 1, CROP_CENTERED, 100).zoom, CROP_MAX_ZOOM);
  const twice = cropRegion(landscape, 1, zoomCrop(landscape, 1, CROP_CENTERED, 2));
  assert.deepEqual(twice, { x: 150, y: 50, width: 100, height: 100 });
});

test("dragging the image right shows more of its left side, as the hand expects", () => {
  const zoomed = zoomCrop(landscape, 1, CROP_CENTERED, 2);
  const moved = panCrop(landscape, 1, zoomed, 0.5, 0);
  /* Half the frame is 50 image px; the centre moves 50 px left (0.125 of the width). */
  assert.equal(moved.x, 0.375);
  assert.equal(moved.y, 0.5);
  /* And stops at the edge, however far it is pushed. */
  assert.equal(panCrop(landscape, 1, zoomed, 50, 0).x, 0.125);
});

test("the crop is written at its own pixels, never upscaled, and capped on its long side", () => {
  assert.deepEqual(outputSize({ width: 300, height: 200 }, 1024), {
    width: 300,
    height: 200,
  });
  assert.deepEqual(outputSize({ width: 4000, height: 2000 }, 1000), {
    width: 1000,
    height: 500,
  });
});

test("an image is told by its type, or by its extension when the system gave none", () => {
  assert.ok(isImageFile({ type: "image/png", name: "logo" }));
  assert.ok(!isImageFile({ type: "application/pdf", name: "factura.png" }));
  assert.ok(isImageFile({ type: "", name: "Foto Carnet.JPG" }));
  assert.ok(!isImageFile({ type: "", name: "contrato.pdf" }));
});

test("a crop keeps a photo's format, and its name says the format it was written in", () => {
  assert.equal(croppedType("image/jpeg"), "image/jpeg");
  assert.equal(croppedType("image/gif"), "image/png");
  assert.equal(croppedName("logo.gif", "image/png"), "logo.png");
  assert.equal(croppedName("foto.carnet.jpeg", "image/jpeg"), "foto.carnet.jpg");
  assert.equal(croppedName(".png", "image/png"), "imagen.png");
});

/* ── The strokes ──────────────────────────────────────────────────────── */

test("a stroke curves through the midpoints of its samples, and a tap is a dot", () => {
  assert.deepEqual(strokeSteps([]), []);
  assert.deepEqual(strokeSteps([{ x: 1, y: 1 }]), [{ kind: "dot", at: { x: 1, y: 1 } }]);
  assert.deepEqual(
    strokeSteps([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]),
    [
      { kind: "move", to: { x: 0, y: 0 } },
      { kind: "quad", control: { x: 10, y: 0 }, to: { x: 10, y: 5 } },
      { kind: "line", to: { x: 10, y: 10 } },
    ],
  );
});

test("a typed name keeps its size when it fits, and shrinks in proportion when it does not", () => {
  assert.equal(fitFontSize(200, 48, 400), 48);
  assert.equal(fitFontSize(800, 48, 400), 24);
  assert.equal(fitFontSize(10000, 48, 400), 12, "never below the floor");
});

/* ── ImageInput ───────────────────────────────────────────────────────── */

test("an empty image field says how to give it one, and offers the button for the keyboard", () => {
  const html = spanish(
    <Field label="Logo">
      <ImageInput value={null} alt="Logo de la empresa" />
    </Field>,
  );
  assert.ok(html.includes("Soltá una imagen acá, pegala o elegila."));
  assert.ok(html.includes("Elegir imagen"));
  assert.ok(!html.includes("Quitar imagen"), "nothing to remove yet");
  assert.match(html, /role="group"[^>]*aria-labelledby="[^"]+-label"/);
});

test("an image field with an image previews it, and offers to change or remove it", () => {
  const html = spanish(
    <ImageInput value={PHOTO} alt="Foto de Ana Gutiérrez" shape="circle" />,
  );
  assert.ok(html.includes('alt="Foto de Ana Gutiérrez"'));
  assert.ok(html.includes("Cambiar imagen"));
  assert.ok(html.includes("Quitar imagen"));
  assert.ok(html.includes("rounded-pill"), "a face is round");
});

test("an image in read mode is the image with its alt; none is the unset mark", () => {
  const html = read(<ImageInput value={PHOTO} alt="Foto del producto" />);
  assert.ok(html.includes('alt="Foto del producto"'));
  assert.ok(!html.includes("<button"), "nothing to press in read mode");
  assert.ok(read(<ImageInput value="" alt="Foto" />).includes("sin definir"));
});

test("the image copy is complete in Spanish", () => {
  assert.deepEqual(
    Object.keys(SPANISH_COPY.media ?? {}).sort(),
    Object.keys(ENGLISH_COPY.media).sort(),
  );
});

/* ── SignatureInput ───────────────────────────────────────────────────── */

test("the signature pad is named, says what to do, and always offers to type instead", () => {
  const html = spanish(
    <Field label="Firma del cliente">
      <SignatureInput value={null} />
    </Field>,
  );
  assert.ok(html.includes('role="img"'));
  assert.ok(html.includes('aria-label="Área de firma"'));
  assert.ok(html.includes("Firmá con el mouse o con el dedo sobre la línea."));
  assert.ok(html.includes("Escribir mi nombre"), "the way in for whoever cannot draw");
  assert.ok(html.includes("Limpiar"));
  assert.ok(html.includes('data-theme="light"'), "the pad is paper in either theme");
});

test("a signature already saved is shown as it is, not under a blank pad", () => {
  const html = spanish(<SignatureInput value={PHOTO} alt="Firma de Ana Gutiérrez" />);
  assert.ok(html.includes('alt="Firma de Ana Gutiérrez"'));
  assert.ok(!html.includes("<canvas"));
});

test("a signature in read mode is the image on paper; unsigned is the unset mark", () => {
  const html = read(<SignatureInput value={PHOTO} />);
  assert.ok(html.includes('alt="Firma"'));
  assert.ok(html.includes('data-theme="light"'));
  assert.ok(!html.includes("<button"));
  assert.ok(read(<SignatureInput value={null} />).includes("sin definir"));
});
