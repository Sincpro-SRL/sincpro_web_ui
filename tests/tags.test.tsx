import assert from "node:assert/strict";

import { Tags } from "@sincpro/web-ui";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a strip that can be pressed or removed is React Aria's tag group — the keys
 * (arrows, Backspace) are theirs and are driven in a browser. What is ours: a strip nobody
 * presses stays plain text, only the chips with `onRemove` draw an ×, `selected` turns into
 * a selection a screen reader hears, and the strip always has a name.
 */

const noop = () => {};

test("a strip of plain values is text, not a grid", () => {
  const html = renderToStaticMarkup(
    <Tags
      items={[
        { id: "a", label: "almacenable" },
        { id: "b", label: "exento de IVA" },
      ]}
    />,
  );
  assert.doesNotMatch(html, /role="grid"/);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /almacenable/);
});

test("a named strip of values is a list", () => {
  const html = renderToStaticMarkup(
    <Tags label="Clasificación" items={[{ id: "a", label: "almacenable" }]} />,
  );
  assert.match(html, /role="list"/);
  assert.match(html, /role="listitem"/);
});

test("removable chips are a named grid, and only they carry the ×", () => {
  const html = renderToStaticMarkup(
    <Tags
      label="Filtros de las facturas"
      items={[
        {
          id: "cliente",
          label: "cliente: Andina",
          onRemove: noop,
          removeLabel: "Quitar el filtro cliente",
        },
        { id: "fijo", label: "empresa: Sincpro" },
      ]}
    />,
  );
  assert.match(html, /role="grid"/);
  assert.match(html, /aria-label="Filtros de las facturas"/);
  assert.equal((html.match(/role="row"/g) ?? []).length, 2);
  assert.equal((html.match(/slot="remove"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Quitar el filtro cliente"/);
});

test("an interactive strip without a label is named by its chips", () => {
  const html = renderToStaticMarkup(
    <Tags
      items={[
        { id: "c", label: "cliente: Andina", onRemove: noop },
        { id: "e", label: "estado: vencida", onRemove: noop },
      ]}
    />,
  );
  assert.match(html, /aria-label="cliente: Andina, estado: vencida"/);
});

test("chips that say whether they are chosen are a single selection", () => {
  const html = renderToStaticMarkup(
    <Tags
      label="Período"
      items={[
        { id: "mes", label: "Este mes", selected: true, onSelect: noop },
        { id: "hoy", label: "Hoy", selected: false, onSelect: noop },
      ]}
    />,
  );
  assert.match(html, /data-key="mes"[^>]*aria-selected="true"/);
  assert.match(html, /data-key="hoy"[^>]*aria-selected="false"/);
  assert.match(html, /data-selection-mode="single"/);
});

test("chips that only act carry no selection state", () => {
  const html = renderToStaticMarkup(
    <Tags
      label="Agregar un nivel"
      items={[{ id: "cliente", label: "cliente", onSelect: noop }]}
    />,
  );
  assert.match(html, /role="grid"/);
  assert.doesNotMatch(html, /aria-selected/);
});

test("an empty strip draws nothing", () => {
  assert.equal(renderToStaticMarkup(<Tags items={[]} />), "");
});
