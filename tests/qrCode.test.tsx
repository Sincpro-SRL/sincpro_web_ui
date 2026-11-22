import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { QrCode } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a QR is an image a person cannot read, so its words are its name; it is black on
 * white in both themes; and its encoder is fetched only by a screen that draws one.
 */

const SRC = join(import.meta.dirname, "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("the encoder is reached with import(), never statically", () => {
  const statics = files(SRC).filter((file) =>
    /^import\s+(?!type\b)[^;]*from\s+"uqr";/m.test(readFileSync(file, "utf8")),
  );
  assert.deepEqual(
    statics.map((file) => relative(SRC, file)),
    [],
  );
  assert.match(
    readFileSync(join(SRC, "primitives", "value", "QrCode.tsx"), "utf8"),
    /import\("uqr"\)/,
  );
});

test("on the server it is a named, silent square — the code appears in the browser", () => {
  const html = renderToStaticMarkup(
    <QrCode value="sincpro-pay:0047" label="QR para pagar Bs 46,00" caption="Bs 46,00" />,
  );
  assert.match(html, /role="img" aria-label="QR para pagar Bs 46,00"/);
  assert.doesNotMatch(html, /<svg/);
  assert.match(html, /<figcaption[^>]*>Bs 46,00<\/figcaption>/);
});

test("its colours are the QR's own, not the theme's ink and paper", () => {
  const tokens = readFileSync(join(SRC, "tokens.css"), "utf8");
  /* Every theme declares them — and with the same black and white. */
  const inks = [...tokens.matchAll(/--color-qr-ink: (#[0-9a-f]+);/g)].map((m) => m[1]);
  const papers = [...tokens.matchAll(/--color-qr-paper: (#[0-9a-f]+);/g)].map((m) => m[1]);
  assert.ok(inks.length >= 2);
  assert.deepEqual(new Set(inks), new Set(["#000000"]));
  assert.deepEqual(new Set(papers), new Set(["#ffffff"]));
});
