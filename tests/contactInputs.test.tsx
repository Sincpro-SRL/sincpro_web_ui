import assert from "node:assert/strict";

import {
  emailHref,
  EmailInput,
  FormModeProvider,
  isEmail,
  isUrl,
  PhoneInput,
  SPANISH_COPY,
  telHref,
  UiCopyProvider,
  urlHref,
  UrlInput,
  urlLabel,
  whatsappHref,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: an email, a phone and a website are text that is an ADDRESS. Edited, they ask the
 * device for the right keyboard and autofill; read, they are links — built here, so what a
 * person typed can never become a `javascript:` link.
 */

const html = (children: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{children}</UiCopyProvider>);
const read = (children: ReactNode) =>
  html(<FormModeProvider value="read">{children}</FormModeProvider>);

test("an email reads as one, and only then is a mailto", () => {
  assert.ok(isEmail("agutierrez@sincpro.com.bo"));
  assert.ok(isEmail("  ana@x.bo "));
  assert.ok(!isEmail("agutierrez@"));
  assert.ok(!isEmail("ana @x.bo"));
  assert.equal(emailHref("ana@x.bo"), "mailto:ana@x.bo");
  assert.equal(emailHref("nope"), null);
});

test("a phone keeps its digits and the leading +", () => {
  assert.equal(telHref("+591 7 123-4567"), "tel:+59171234567");
  assert.equal(telHref("(2) 244-1010"), "tel:22441010");
  assert.equal(telHref("1+2"), "tel:12");
  assert.equal(telHref("sin teléfono"), null);
  assert.equal(whatsappHref("+591 7 123-4567"), "https://wa.me/59171234567");
});

test("a website gets https, keeps http(s), and never becomes a script", () => {
  assert.equal(urlHref("sincpro.com.bo"), "https://sincpro.com.bo/");
  assert.equal(urlHref("http://x.bo/a?b=1"), "http://x.bo/a?b=1");
  assert.equal(urlHref("javascript:alert(1)"), null);
  assert.equal(urlHref("data:text/html,hi"), null);
  assert.equal(urlHref("no es una web"), null);
  assert.equal(
    urlHref("localhost:3000"),
    null,
    "a bare host:port reads as a scheme, not a link",
  );
  assert.ok(isUrl("https://www.sincpro.com.bo"));
  assert.ok(!isUrl("hola"));
  assert.equal(urlLabel("https://www.sincpro.com.bo/"), "sincpro.com.bo");
});

test("edited, each asks for its keyboard, autofill and type", () => {
  const email = html(<EmailInput aria-label="Correo" value="" />);
  assert.match(email, /type="email"/);
  assert.match(email, /inputMode="email"|inputmode="email"/);
  assert.match(email, /autoComplete="email"|autocomplete="email"/);
  const phone = html(<PhoneInput aria-label="Teléfono" value="" />);
  assert.match(phone, /type="tel"/);
  assert.match(phone, /autoComplete="tel"|autocomplete="tel"/);
  const web = html(<UrlInput aria-label="Web" value="" />);
  assert.match(web, /type="url"/);
});

test("read, each is a link", () => {
  assert.match(read(<EmailInput value="ana@x.bo" />), /href="mailto:ana@x.bo"[^>]*>ana@x.bo/);
  assert.match(read(<PhoneInput value="+591 7 123-4567" />), /href="tel:\+59171234567"/);
  const web = read(<UrlInput value="https://www.sincpro.com.bo/" />);
  assert.match(web, /href="https:\/\/www.sincpro.com.bo\/"/);
  assert.match(web, /target="_blank"/);
  assert.match(web, /rel="noopener noreferrer"/);
  assert.ok(web.includes(">sincpro.com.bo<"));
  assert.ok(web.includes("se abre en otra pestaña"));
});

test("read, WhatsApp only when asked; a value that makes no link stays text", () => {
  assert.ok(!read(<PhoneInput value="+591 71234567" />).includes("wa.me"));
  assert.ok(
    read(<PhoneInput value="+591 71234567" whatsapp />).includes("https://wa.me/59171234567"),
  );
  const bad = read(<UrlInput value="javascript:alert(1)" />);
  assert.ok(!bad.includes("href="));
  assert.ok(bad.includes("javascript:alert(1)"));
  assert.ok(read(<EmailInput value="" />).includes("sin definir"));
});
