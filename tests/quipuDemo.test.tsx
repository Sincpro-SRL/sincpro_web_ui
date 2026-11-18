import assert from "node:assert/strict";

import {
  DirtyActions,
  Metric,
  modShortcut,
  SearchEntry,
  Sidebar,
  SPANISH_COPY,
  TopBar,
  UiCopyProvider,
} from "@sincpro/web-ui";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: issue #37 — what quipu's demo left in web-ui. The behaviour that needs a browser (a
 * press, the platform's shortcut, the rows' geometry) is in the stories' plays; here, the
 * markup each piece promises.
 */

const es = (node: ReactNode) =>
  renderToStaticMarkup(<UiCopyProvider copy={SPANISH_COPY}>{node}</UiCopyProvider>);

/** The text a person sees: without what is `hidden`, and without the tags. */
const visible = (html: string) =>
  html.replace(/<([a-z]+)[^>]*\shidden=""[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");

test("editing draws only Discard and Save — no third «sin guardar»", () => {
  const html = es(<DirtyActions onSave={() => {}} onDiscard={() => {}} />);
  assert.doesNotMatch(visible(html), /sin guardar/);
  assert.match(html, /Descartar/);
  assert.match(html, /Guardar/);
  assert.doesNotMatch(html, /aria-describedby/);
});

test("the count of changes reaches a screen reader as Save's description, not as a mark", () => {
  const html = es(<DirtyActions onSave={() => {}} onDiscard={() => {}} changes={2} />);
  assert.doesNotMatch(visible(html), /sin guardar/);
  const id = /<span id="([^"]+)" hidden="">2 cambios sin guardar<\/span>/.exec(html)?.[1];
  assert.ok(id, "the count is in the page, hidden");
  assert.match(html, new RegExp(`aria-describedby="${id}"`));
});

test("what cannot be saved yet is the one mark the rail draws, and it names the button", () => {
  const html = es(
    <DirtyActions
      onSave={() => {}}
      onDiscard={() => {}}
      blocked="Falta el NIT del cliente."
      changes={1}
    />,
  );
  assert.match(visible(html), /Falta el NIT del cliente\./);
  assert.match(html, /data-ui="dirty\.blocked"/);
  const blockedId = /<span id="([^"]+)" data-ui="dirty\.blocked"/.exec(html)?.[1];
  assert.ok(blockedId);
  /* The reason first, then the count; and the button is off. */
  assert.match(html, new RegExp(`aria-describedby="${blockedId} [^"]+"`));
  const save = /<button(?:(?!<button)[\s\S])*?Guardar/.exec(
    html.slice(html.lastIndexOf("<button")),
  )?.[0];
  assert.ok(save);
  assert.match(save, /disabled=""/);
});

test("the shortcut is written the way each keyboard says it", () => {
  assert.deepEqual(modShortcut("K", "apple"), { label: "⌘K", aria: "Meta+K" });
  assert.deepEqual(modShortcut("K", "other"), { label: "Ctrl K", aria: "Control+K" });
});

test("on the server the platform is unknown: the entry draws no shortcut rather than a wrong one", () => {
  const html = es(<SearchEntry onSearch={() => {}} />);
  assert.match(html, /Buscar…/);
  assert.doesNotMatch(html, /<kbd/);
  assert.doesNotMatch(html, /aria-keyshortcuts/);
});

test("the sidebar draws «Buscar…» under the product and the user, before the navigation", () => {
  const html = es(
    <Sidebar
      brand={{ label: "Colegio" }}
      user={{ name: "Ana" }}
      search={{ onSearch: () => {}, label: "Buscar socios…" }}
    >
      <p>árbol</p>
    </Sidebar>,
  );
  assert.match(html, /data-ui="sidebar\.search"/);
  assert.ok(html.indexOf("Ana") < html.indexOf("Buscar socios…"));
  assert.ok(html.indexOf("Buscar socios…") < html.indexOf("árbol"));
  /* Without `search` there is no door to a palette the application does not have. */
  assert.doesNotMatch(es(<Sidebar>x</Sidebar>), /data-ui="search-entry"/);
});

test("the bar's entry folds to the magnifier on a phone, its name kept for a screen reader", () => {
  const html = es(<TopBar app={{ label: "Colegio" }} search={{ onSearch: () => {} }} />);
  assert.match(html, /data-ui="search-entry"/);
  assert.match(html, /max-sm:w-\(--size-control-sm\)/);
  assert.match(html, /<span class="[^"]*max-sm:sr-only[^"]*">Buscar…<\/span>/);
});

test("a metric says how many and how much: the amount under the label, and in its name", () => {
  const html = es(
    <Metric value={6} label="Mensualidades por revisar" detail="Bs 1.000,00" />,
  );
  assert.ok(html.indexOf("Mensualidades por revisar") < html.indexOf("Bs 1.000,00"));
  assert.match(html, /aria-label="6 Mensualidades por revisar, Bs 1\.000,00"/);
  /* While the figure loads the amount waits: beside a skeleton it would read as the figure. */
  const loading = es(<Metric label="Pagos" detail="Bs 980,00" loading />);
  assert.doesNotMatch(loading, /Bs 980,00/);
});
