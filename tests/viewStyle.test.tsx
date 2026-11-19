import assert from "node:assert/strict";

import { Breadcrumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import { StatusBar } from "@sincpro/web-ui/components/record/StatusBar";
import { useViewStyle, ViewStyleProvider } from "@sincpro/web-ui/foundations/viewStyle";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * EL ESTILO «LIMPIO» DEL REGISTRO: las migas son el título, y el estado es una fila de pasos en
 * vez de un pozo con un segmento relleno. El mismo dato, otra forma.
 */

const STAGES = [
  { id: "draft", label: "Borrador" },
  { id: "posted", label: "Publicada" },
  { id: "paid", label: "Pagada" },
];

test("el estado en pasos: una lista ordenada, la actual marcada, sin el pozo", () => {
  const html = renderToStaticMarkup(
    <StatusBar stages={STAGES} current="posted" look="steps" layout="trail" />,
  );
  assert.match(html, /^<ol/);
  assert.equal(html.match(/aria-current="step"/g)?.length, 1);
  assert.match(html, /aria-current="step"[^>]*>.*Publicada/);
  // The track's well is the classic look's, not this one's.
  assert.doesNotMatch(html, /bg-ground/);
  // The stages are joined: one line between each two.
  assert.equal(html.match(/h-px w-5/g)?.length, 2);
});

test("el estado clásico sigue siendo el pozo con el segmento relleno", () => {
  const html = renderToStaticMarkup(
    <StatusBar stages={STAGES} current="posted" layout="trail" />,
  );
  assert.match(html, /bg-ground/);
  assert.doesNotMatch(html, /h-px w-5/);
});

test("las migas grandes ponen el lugar actual al tamaño del título", () => {
  const crumbs = [{ label: "Ventas", onClick: () => {} }, { label: "FAC/2026/0115" }];
  assert.match(renderToStaticMarkup(<Breadcrumb crumbs={crumbs} size="lg" />), /text-title/);
  assert.doesNotMatch(renderToStaticMarkup(<Breadcrumb crumbs={crumbs} />), /text-title/);
});

test("el estilo se elige una vez alrededor de la app, y un registro puede decir el suyo", () => {
  function Says({ own }: { own?: "traditional" | "modern" }) {
    return <>{useViewStyle(own)}</>;
  }
  assert.equal(renderToStaticMarkup(<Says />), "traditional");
  assert.equal(
    renderToStaticMarkup(
      <ViewStyleProvider value="modern">
        <Says />
      </ViewStyleProvider>,
    ),
    "modern",
  );
  assert.equal(
    renderToStaticMarkup(
      <ViewStyleProvider value="modern">
        <Says own="traditional" />
      </ViewStyleProvider>,
    ),
    "traditional",
  );
});
