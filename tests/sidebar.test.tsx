import assert from "node:assert/strict";

import {
  AppFrame,
  DropZone,
  NavigationTree,
  Sidebar,
  SidebarToggle,
  SPANISH_COPY,
  TopBar,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { KeyRound, Landmark } from "lucide-react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a back office whose chrome is ONE column — the sidebar with the brand on top and
 * the account at the bottom — and that same column as a drawer on a phone. The drawer's
 * behaviour (open, follow a link, close) is the story's play; here, the frame's contract.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

const ABRIR = /aria-label="Abrir la navegación"/;

test("with a sidebar and no menu, nothing is on top of it on a wide screen", () => {
  const html = es(
    <AppFrame sidebar={<p>árbol</p>}>
      <p>vista</p>
    </AppFrame>,
  );
  /* The phone's bar is drawn, hidden from `sm` up, and it carries the drawer's button. */
  assert.match(html, /<div class="sticky top-0 z-40 print:hidden sm:hidden"/);
  assert.match(html, ABRIR);
  /* The sidebar hides on a phone, and the view's header stays in the view: no slot above. */
  assert.match(html, /<aside class="[^"]*max-sm:hidden/);
  assert.doesNotMatch(html, /class="sticky z-30 min-w-0"/);
  assert.ok(html.indexOf("árbol") < html.indexOf("vista"));
});

test("narrowMenu replaces the phone's bare bar", () => {
  const html = es(
    <AppFrame sidebar={<p>árbol</p>} narrowMenu={<TopBar app={{ label: "Colegio" }} />}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(html, /Colegio/);
  assert.match(html, ABRIR);
});

test("with a menu, the bar stays on every screen and opens the drawer on a phone", () => {
  const html = es(
    <AppFrame menu={<TopBar app={{ label: "ERP" }} />} sidebar={<p>árbol</p>}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(html, /<div class="sticky top-0 z-40 print:hidden "/);
  assert.match(html, ABRIR);
  /* …and the header slot under it is still there for the views. */
  assert.match(html, /class="sticky z-30 min-w-0"/);
});

test("a top bar outside a frame with a sidebar draws no button that opens nothing", () => {
  assert.doesNotMatch(es(<TopBar app={{ label: "ERP" }} />), ABRIR);
  assert.equal(es(<SidebarToggle />), "");
  const html = es(
    <AppFrame menu={<TopBar app={{ label: "ERP" }} />}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.doesNotMatch(html, ABRIR);
});

test("the sidebar: brand and user on top, the map in the middle, the account at the bottom", () => {
  const html = es(
    <Sidebar
      brand={{ label: "Colegio de Contadores", icon: Landmark }}
      user={{ name: "Ana Gutiérrez", detail: "Tesorería" }}
      actions={[
        { id: "clave", label: "Cambiar contraseña", icon: KeyRound },
        { id: "sitio", label: "Ver el sitio", href: "/", external: true },
      ]}
    >
      <nav>mapa</nav>
    </Sidebar>,
  );
  const at = (text: string) => html.indexOf(text);
  assert.ok(at("Colegio de Contadores") < at("Ana Gutiérrez"));
  assert.ok(at("Ana Gutiérrez") < at("mapa"));
  assert.ok(at("mapa") < at("Cambiar contraseña"));
  assert.match(html, /<ul aria-label="Mi cuenta"/);
  /* A link that opens another tab says so to whoever cannot see the icon. */
  assert.match(html, /<a href="\/"[^>]*target="_blank"[^>]*rel="noreferrer"/);
  assert.match(html, /se abre en otra pestaña/);
});

test("a drop zone that takes several files asks for them in the plural", () => {
  const html = es(<DropZone multiple onFiles={() => {}} />);
  assert.match(html, /Soltá archivos acá, o elegilos\./);
  assert.match(html, /Elegir archivos/);
  assert.match(html, /<input[^>]*multiple/);
  assert.doesNotMatch(es(<DropZone onFile={() => {}} />), /<input[^>]*multiple/);
});

/* ---------------------------------------------------------------- *
 *  IN THE BRAND'S COLOUR, THE LOGO INLINE, A WORKSPACE, ON PAPER
 * ---------------------------------------------------------------- */

const CREST = <svg data-crest="" viewBox="0 0 8 8" />;

test("sidebarSurface='chrome' paints the column and hands the surface to what is inside", () => {
  const html = es(
    <AppFrame
      sidebarSurface="chrome"
      sidebar={
        <Sidebar brand={{ label: "Colegio", icon: Landmark }}>
          <NavigationTree items={[{ id: "padron", label: "Padrón" }]} current="padron" />
        </Sidebar>
      }
    >
      <p>vista</p>
    </AppFrame>,
  );
  const aside = /<aside class="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.ok(aside.includes("bg-chrome"), "the frame paints the column in the chrome");
  assert.ok(!aside.includes("bg-ground"));
  /* The sidebar and the tree read it from the frame: nobody passed it to them. */
  assert.match(html, /data-surface="chrome"/);
  assert.match(html, /text-lead font-semibold text-chrome-ink">Colegio/);
  assert.match(
    html,
    /bg-chrome-link\/15 text-chrome-link/,
    "the current row in the chrome's link",
  );
  assert.doesNotMatch(html, /bg-primary\/10/);
});

test("by default the sidebar stays on the ground, as before", () => {
  const html = es(
    <AppFrame sidebar={<Sidebar brand={{ label: "Colegio" }}>mapa</Sidebar>}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(html, /<aside class="[^"]*border-ui-sidebar-border bg-ui-sidebar/);
  assert.match(html, /data-surface="canvas"/);
});

test("a logo can be an inline element that paints with the tokens, or still an image's URL", () => {
  const inline = es(<Sidebar brand={{ label: "CAUOR", logo: CREST }}>mapa</Sidebar>);
  assert.match(
    inline,
    /<span aria-hidden="true" class="[^"]*\*:size-full[^"]*"><svg data-crest=""/,
  );
  assert.doesNotMatch(inline, /<img/);

  const image = es(<Sidebar brand={{ label: "CAUOR", logo: "/logo.svg" }}>mapa</Sidebar>);
  assert.match(image, /<img src="\/logo.svg" alt=""/);

  /* The phone's bar says the product the same way. */
  assert.match(es(<TopBar app={{ label: "CAUOR", logo: CREST }} />), /<svg data-crest=""/);
});

test("scroll='view': the frame is the window, and the view's sticky stack starts from zero", () => {
  const html = es(
    <AppFrame scroll="view" menu={<TopBar app={{ label: "ERP" }} />} sidebar={<p>árbol</p>}>
      <p>vista</p>
    </AppFrame>,
  );
  const root = /^<div class="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.ok(root.includes("h-dvh") && root.includes("overflow-hidden"));
  assert.ok(!root.includes("min-h-dvh"));
  assert.match(
    html,
    /<main class="[^"]*min-h-0 overflow-y-auto[^"]*" style="--sticky-top:0px"[^>]*>/,
  );
});

test("by default the page scrolls and the view hangs under the bars, as before", () => {
  const html = es(
    <AppFrame menu={<TopBar app={{ label: "ERP" }} />}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(html, /^<div class="[^"]*min-h-dvh/);
  /* The view does not scroll by itself: the page does. (The bar's height is measured in the
     browser, so on the server both modes start at 0 — the story's play holds the offset.) */
  assert.doesNotMatch(html, /<main class="[^"]*overflow-y-auto/);
});

test("on paper only the view prints: not the bar, not the sidebar", () => {
  const html = es(
    <AppFrame menu={<TopBar app={{ label: "ERP" }} />} sidebar={<p>árbol</p>}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(html, /<div class="sticky top-0 z-40 print:hidden/);
  assert.match(html, /<aside class="[^"]*print:hidden/);
});
