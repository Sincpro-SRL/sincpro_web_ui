import assert from "node:assert/strict";

import {
  AppFrame,
  Banner,
  Callout,
  Gallery,
  InboxList,
  Kbd,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the pieces an application wears around its views — a notice across the frame, the
 * notifications, a key drawn as a key — and the images of one thing. What they say comes from
 * the copy table, never typed in a component.
 */

const es = (node: ReactElement) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("a banner sits above the frame's bar, a status in its tone, closed in the session's words", () => {
  const html = es(
    <AppFrame
      banner={
        <Banner tone="warn" onDismiss={() => {}}>
          Mantenimiento hoy a las 22:00
        </Banner>
      }
      menu={<nav>bar</nav>}
    >
      <p>vista</p>
    </AppFrame>,
  );
  assert.ok(html.indexOf('data-ui="frame.banner"') < html.indexOf('data-ui="frame.bar"'));
  assert.match(html, /role="status" data-ui="banner" data-tone="warn"/);
  assert.match(html, /aria-label="Descartar el aviso"/);
});

test("a callout's × speaks the copy table, not a word typed in the component", () => {
  const html = es(<Callout onDismiss={() => {}}>Periodo cerrado</Callout>);
  assert.match(html, /aria-label="Descartar el aviso"/);
  assert.doesNotMatch(html, /"cerrar"/);
});

test("a key written as is is drawn; a combination waits for the platform", () => {
  assert.match(
    renderToStaticMarkup(<Kbd>Tab</Kbd>),
    /<kbd aria-hidden="true" data-ui="kbd"[^>]*>Tab<\/kbd>/,
  );
  /* On the server the keyboard is unknown: nothing, rather than «Ctrl» on a Mac. */
  assert.equal(renderToStaticMarkup(<Kbd keys="Mod+K" />), "");
});

test("the notifications: unread said and in bold, the count beside the title, newest as given", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const html = es(
    <InboxList
      now={now}
      onMarkAllRead={() => {}}
      items={[
        {
          id: "a",
          title: "Tu pedido salió a reparto",
          when: "2026-11-22T11:55:00Z",
          unread: true,
        },
        { id: "b", title: "Pago recibido", when: "2026-11-21T12:00:00Z", tone: "good" },
      ]}
    />,
  );
  assert.match(html, /Notificaciones<span[^>]*>1 sin leer<\/span>/);
  assert.match(
    html,
    /font-semibold"><span class="sr-only">Sin leer: <\/span>Tu pedido salió a reparto/,
  );
  assert.match(html, /hace 5 minutos/);
  assert.match(html, />Marcar todo como leído</);
  assert.ok(html.indexOf("Tu pedido") < html.indexOf("Pago recibido"));
});

test("nothing unread: no count and no «marcar»; nothing at all: the empty sentence", () => {
  const read = es(
    <InboxList
      onMarkAllRead={() => {}}
      items={[{ id: "b", title: "Pago recibido", when: new Date() }]}
    />,
  );
  assert.doesNotMatch(read, /sin leer/);
  assert.doesNotMatch(read, /Marcar todo/);
  assert.match(es(<InboxList items={[]} />), /Nada nuevo por acá/);
});

test("a gallery says where one is and names every thumbnail; with no images it says so", () => {
  const html = es(
    <Gallery
      images={[
        { src: "/a.jpg", alt: "Silla, de frente" },
        { src: "/b.jpg", alt: "Silla, de costado" },
      ]}
    />,
  );
  assert.match(html, /role="group" aria-label="Imágenes" aria-roledescription="galería"/);
  assert.match(html, /aria-label="Ver en tamaño completo: Silla, de frente"/);
  assert.match(html, /aria-label="Imagen 2 de 2: Silla, de costado"/);
  assert.match(html, /aria-current="true"/);
  assert.match(es(<Gallery images={[]} />), /Todavía no hay imágenes/);
});

test("one image: no arrows, no strip, no counter", () => {
  const html = es(<Gallery images={[{ src: "/a.jpg", alt: "Silla" }]} />);
  assert.doesNotMatch(html, /Imagen siguiente/);
  assert.doesNotMatch(html, /gallery\.strip/);
});
