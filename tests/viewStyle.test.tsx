import assert from "node:assert/strict";

import { Breadcrumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import { StatusBar } from "@sincpro/web-ui/components/record/StatusBar";
import { useViewStyle, ViewStyleProvider } from "@sincpro/web-ui/foundations/viewStyle";
import { Circle, CircleDot } from "lucide-react";
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

test("the segmented state is a pill of pills, the current one filled", () => {
  const html = renderToStaticMarkup(
    <StatusBar stages={STAGES} current="posted" look="segmented" layout="trail" />,
  );
  assert.match(html, /^<ol[^>]*rounded-pill/);
  assert.equal(html.match(/<li[^>]*rounded-pill/g)?.length, 3);
  assert.match(html, /aria-current="step"[^>]*class="[^"]*bg-primary/);
});

test("what a stage shows: only icons says the names; a stage with no icon shows its number", () => {
  const html = renderToStaticMarkup(
    <StatusBar stages={STAGES} current="posted" display="icon" layout="trail" />,
  );
  assert.equal(html.match(/class="sr-only[^"]*">(Borrador|Publicada|Pagada)</g)?.length, 3);
  assert.match(html, /title="Borrador"/);
  assert.match(html, />1<\/span>/);
});

test("only the current stage's name is seen; its active icon is worn", () => {
  const html = renderToStaticMarkup(
    <StatusBar
      stages={STAGES.map((one) => ({ ...one, icon: Circle, activeIcon: CircleDot }))}
      current="posted"
      display="current"
      layout="trail"
    />,
  );
  assert.equal(html.match(/class="sr-only[^"]*">/g)?.length, 2);
  assert.doesNotMatch(html, /class="sr-only[^"]*">Publicada/);
  assert.equal(html.match(/lucide-circle-dot/g)?.length, 1);
});

test("renderStage draws inside the system's segment, told where the stage is", () => {
  const html = renderToStaticMarkup(
    <StatusBar
      stages={STAGES}
      current="posted"
      look="segmented"
      layout="trail"
      renderStage={(stage, { step, index }) => `${index}:${stage.label}:${step}`}
    />,
  );
  assert.match(html, /0:Borrador:done/);
  assert.match(html, /aria-current="step"[^>]*>1:Publicada:current/);
});

test("by default the names are seen where there is room, and on a phone only the current one's", () => {
  const html = renderToStaticMarkup(
    <StatusBar stages={STAGES} current="posted" layout="trail" />,
  );
  // Borrador and Pagada: said on a phone, seen on a desk; Publicada always seen.
  assert.equal(html.match(/max-sm:sr-only[^"]*">(Borrador|Pagada)</g)?.length, 2);
  assert.doesNotMatch(html, /max-sm:sr-only[^"]*">Publicada</);
  // On a phone the others show their number instead.
  assert.match(html, /sm:hidden[^"]*">3</);
});
