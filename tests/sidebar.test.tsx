import assert from "node:assert/strict";

import {
  AppFrame,
  DropZone,
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
  assert.match(html, /<div class="sticky top-0 z-40 sm:hidden"/);
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
  assert.match(html, /<div class="sticky top-0 z-40 "/);
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
