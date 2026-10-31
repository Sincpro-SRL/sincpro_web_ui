import assert from "node:assert/strict";

import { Field, FormModeProvider, Picker, type PickerItem } from "@sincpro/web-ui";
import { PickerOptions, shownRows } from "@sincpro/web-ui/primitives/picker/Picker";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: the Picker is React Aria's combobox, so arrows, Enter and Escape are React Aria's
 * to test (they are driven in a browser). What is ours is the contract around it: the field
 * names it, the CLOSED field shows the chosen record's name — even when that record is not
 * among the first eight the list would show — and read mode draws the name, not a control.
 *
 * A server render cannot open the list (it lives in a popover), so the LIST is rendered on its
 * own (`PickerOptions`, internal) to check sections and the loading row. Whether the sentinel
 * really asks for the next page when the end scrolls into view is an IntersectionObserver in a
 * browser — the «Desde el servidor» story — and is not checked here.
 */

const ITEMS: PickerItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `P-${i}`,
  name: `Producto ${i}`,
  meta: `${i * 10} en stock`,
}));

test("a picker inside a field is a combobox named by the field's label", () => {
  const html = renderToStaticMarkup(
    <Field label="Producto" htmlFor="producto">
      <Picker items={ITEMS} value="P-1" />
    </Field>,
  );
  assert.match(html, /role="combobox"/);
  assert.match(html, /id="producto"/);
  assert.match(html, /aria-labelledby="producto-label"/);
  assert.match(html, /aria-expanded="false"/);
});

test("the closed field shows the chosen name, also beyond the cap of eight", () => {
  const html = renderToStaticMarkup(<Picker items={ITEMS} value="P-11" />);
  assert.match(html, /value="Producto 11"/);
});

test("with nothing chosen the field is empty and shows the placeholder", () => {
  const html = renderToStaticMarkup(
    <Picker items={ITEMS} placeholder="elegí un producto…" />,
  );
  assert.match(html, /value=""/);
  assert.match(html, /placeholder="elegí un producto…"/);
});

test("an invalid picker says so to assistive technology", () => {
  const html = renderToStaticMarkup(
    <Field label="Producto" htmlFor="producto" error="Elegí un producto.">
      <Picker items={ITEMS} />
    </Field>,
  );
  assert.match(html, /data-invalid="true"|aria-invalid="true"/);
});

test("in read mode a picker is the chosen name as text, not a control", () => {
  const html = renderToStaticMarkup(
    <FormModeProvider value="read">
      <Picker items={ITEMS} value="P-3" />
    </FormModeProvider>,
  );
  assert.doesNotMatch(html, /role="combobox"/);
  assert.match(html, />Producto 3</);
});

test("the list is capped at eight, unless it loads incrementally", () => {
  const capped = shownRows(ITEMS, { loading: false, incremental: false });
  assert.equal(capped.visible.length, 8);
  assert.equal(capped.remaining, 4);

  const incremental = shownRows(ITEMS, { loading: false, incremental: true });
  assert.equal(incremental.visible.length, 12);
  assert.equal(incremental.remaining, 0);

  assert.deepEqual(shownRows(ITEMS, { loading: true, incremental: true }), {
    visible: [],
    remaining: 0,
  });
});

const list = (
  items: readonly PickerItem[],
  extra: Partial<Parameters<typeof PickerOptions>[0]> = {},
) =>
  renderToStaticMarkup(
    <PickerOptions
      aria-label="Cliente"
      items={items}
      marks={false}
      hints={false}
      remaining={0}
      emptyText="Nada coincide."
      {...extra}
    />,
  );

test("consecutive items of a section are grouped under one header", () => {
  const html = list([
    { id: "C-1", name: "Ferretería Illimani", section: "Recientes" },
    { id: "C-2", name: "Constructora Andina", section: "Recientes" },
    { id: "C-3", name: "Agroindustrias del Oriente", section: "Todos" },
    { id: "C-4", name: "Sin sección" },
  ]);
  const groups = [...html.matchAll(/<section[^>]*role="group"[^>]*>(.*?)<\/section>/g)].map(
    (m) => m[1] ?? "",
  );
  const [recientes = "", todos = ""] = groups;
  assert.equal(groups.length, 2);
  assert.match(recientes, /<header[^>]*>Recientes<\/header>/);
  assert.match(recientes, /Ferretería Illimani.*Constructora Andina/);
  assert.match(todos, /<header[^>]*>Todos<\/header>/);
  assert.doesNotMatch(todos, /Sin sección/);
  assert.match(html, /<\/section><div[^>]*role="option"[^>]*data-key="C-4"/);
});

test("without sections the list is flat, as before", () => {
  const html = list(ITEMS.slice(0, 3));
  assert.doesNotMatch(html, /<section/);
  assert.equal([...html.matchAll(/role="option"/g)].length, 3);
});

test("loading more says so in a row at the end, and the list scrolls inside its height", () => {
  const loading = list(ITEMS, { onLoadMore: () => {}, loadingMore: true });
  assert.match(loading, /max-h-\(--size-dropdown\)/);
  assert.match(loading, /data-key="P-11".*loading more…/);

  const idle = list(ITEMS, { onLoadMore: () => {}, loadingMore: false });
  assert.doesNotMatch(idle, /loading more…/);

  const capped = list(ITEMS);
  assert.doesNotMatch(capped, /size-dropdown/);
});

test("an empty list waiting for its next page says only that it is loading", () => {
  const html = list([], { onLoadMore: () => {}, loadingMore: true });
  assert.equal([...html.matchAll(/loading more…/g)].length, 1);
  assert.doesNotMatch(html, /Nada coincide/);
});
