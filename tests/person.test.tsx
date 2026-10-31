import assert from "node:assert/strict";

import { RelationCard, SPANISH_COPY, UiCopyProvider, UserChip } from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: opening, focus and Escape are React Aria's `DialogTrigger` (driven in a browser).
 * What is ours is the contract: a chip is a button only when it has somewhere to go, it says
 * it opens a dialog, and the card's rows are real links built from what people type — with
 * `wa.me` taking digits only, because a `+` or a space breaks it.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

test("a chip with nowhere to go is text, not a button", () => {
  assert.doesNotMatch(es(<UserChip name="Carla Rojas" detail="aprobó" />), /<button/);
  /* Empty ways of contact are no way of contact. */
  assert.doesNotMatch(es(<UserChip name="Carla Rojas" contact={{ email: "" }} />), /<button/);
});

test("a chip with contact or a record is a button that opens a dialog", () => {
  for (const html of [
    es(<UserChip name="Josefa Muñoz" contact={{ email: "josefa@sincpro.com.bo" }} />),
    es(<UserChip name="Josefa Muñoz" onOpen={() => {}} />),
  ]) {
    assert.equal(html.match(/<button/g)?.length, 1);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, />Josefa Muñoz</);
  }
});

test("the contact card's rows are mailto, tel and wa.me links, digits only for WhatsApp", () => {
  const html = es(
    <RelationCard
      name="Josefa Muñoz"
      secondary="Vendedora · Sucursal La Paz"
      media={{ person: true }}
      contact={{
        email: "josefa.munoz@sincpro.com.bo",
        phone: "+591 72 045-118",
        whatsapp: "+591 (72) 045 118",
      }}
    />,
  );
  assert.match(html, /href="mailto:josefa.munoz@sincpro.com.bo"/);
  assert.match(html, /href="tel:\+59172045118"/);
  assert.match(html, /href="https:\/\/wa.me\/59172045118"/);
  assert.match(html, /Escribir un correo/);
  assert.match(html, /Llamar/);
  assert.match(html, /WhatsApp/);
  assert.match(html, /Vendedora · Sucursal La Paz/);
  /* Without `onOpen` there is no «Abrir». */
  assert.doesNotMatch(html, />Abrir</);
});

test("the card draws only the ways that exist, and «Abrir» with a record", () => {
  const html = es(
    <RelationCard
      name="Carla Rojas"
      media={{ person: true }}
      contact={{ email: "carla@sincpro.com.bo" }}
      onOpen={() => {}}
    />,
  );
  assert.equal(html.match(/data-contact=/g)?.length, 1);
  assert.doesNotMatch(html, /tel:|wa\.me/);
  assert.match(html, /<button[^>]*>.*Abrir<\/button>/);
});

test("the card shows the photo when there is one, the initials when not", () => {
  assert.match(
    es(<RelationCard name="Ana María Gutiérrez" media={{ person: true }} />),
    />AG</,
  );
  assert.match(
    es(<RelationCard name="Ana María Gutiérrez" media={{ person: true, src: "/ana.png" }} />),
    /<img[^>]*src="\/ana.png"/,
  );
});
