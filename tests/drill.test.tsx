import assert from "node:assert/strict";
import { test } from "node:test";

import { Drill, type DrillState, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import {
  DrillSurface,
  framesOf,
  openPath,
  toPath,
} from "@sincpro/web-ui/primitives/dialog/Drill";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the modal behaviour (focus trap, scrim, the return of focus to the page) is React
 * Aria's and needs a browser. What is ours is the contract of the STACK: one window whose
 * header is a trail back to the page, the context in front as its title and footer, the ones
 * behind kept mounted but hidden, and a path that never loops.
 */

const noop = () => {};

function state(path: readonly string[]): DrillState {
  return {
    path,
    open: noop,
    back: noop,
    to: noop,
    close: noop,
    focusMarks: { current: [] },
  };
}

const ORDER = { kind: "pedido", label: "S00142" };

const FRAMES = [
  { id: "product", title: "Impresora térmica 80 mm", children: <p>el producto</p> },
  {
    id: "supplier",
    title: "Distribuidora Andina S.R.L.",
    subtitle: "Proveedor principal del producto.",
    footer: <button type="button">Guardar proveedor</button>,
    children: <p>el proveedor</p>,
  },
];

test("a drill with nothing on its path draws nothing", () => {
  const html = renderToStaticMarkup(
    <Drill state={state([])} origin={ORDER}>
      <Drill.Context id="product" title="Producto">
        x
      </Drill.Context>
    </Drill>,
  );
  assert.equal(html, "");
});

test("opening pushes one level; opening one already open goes back to it", () => {
  assert.deepEqual(openPath([], "line"), ["line"]);
  assert.deepEqual(openPath(["line"], "product"), ["line", "product"]);
  /* product → supplier → the same product is a loop, not a fourth level. */
  assert.deepEqual(openPath(["line", "product", "supplier"], "product"), ["line", "product"]);
  assert.deepEqual(toPath(["line", "product", "supplier"], "line"), ["line"]);
  assert.deepEqual(toPath(["line"], "nowhere"), ["line"]);
});

test("the open contexts are the written ones on the path, in the path's order", () => {
  const children = (
    <>
      <Drill.Context id="payment" title="Registrar pago">
        a
      </Drill.Context>
      <Drill.Context id="customer" title="Ferretería Sur">
        b
      </Drill.Context>
      <Drill.Context id="product" title="Producto">
        c
      </Drill.Context>
    </>
  );
  assert.deepEqual(
    framesOf(children, ["payment", "customer"]).map((f) => f.id),
    ["payment", "customer"],
  );
  /* On the path but not written: nothing to draw, so it is skipped. */
  assert.deepEqual(
    framesOf(children, ["customer", "ghost"]).map((f) => f.id),
    ["customer"],
  );
  /* A context does not draw where it is written. */
  assert.equal(renderToStaticMarkup(children), "");
});

test("the context in front is the title; the ones behind are the trail back to the page", () => {
  const html = renderToStaticMarkup(
    <DrillSurface frames={FRAMES} origin={ORDER} onBack={noop} onTo={noop} onClose={noop} />,
  );
  const labelledBy = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
  assert.ok(labelledBy, "the window is named by its title");
  assert.match(
    html,
    new RegExp(`<h2[^>]*id="${labelledBy}"[^>]*>Distribuidora Andina S.R.L.</h2>`),
  );
  const trail = /<nav aria-label="Opened from"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
  assert.match(trail, /pedido/);
  assert.match(trail, /S00142/);
  assert.match(trail, /Impresora térmica 80 mm/);
  assert.doesNotMatch(trail, /Distribuidora/, "the one in front is the title, not a crumb");
  /* Described by the subtitle of the one in front. */
  const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert.ok(describedBy);
  assert.match(
    html,
    new RegExp(`id="${describedBy}"[^>]*>Proveedor principal del producto.<`),
  );
});

test("the levels behind stay mounted but hidden; only the front one's footer is drawn", () => {
  const html = renderToStaticMarkup(
    <DrillSurface frames={FRAMES} origin={ORDER} onBack={noop} onTo={noop} onClose={noop} />,
  );
  assert.match(
    html,
    /<div[^>]*hidden=""[^>]*data-drill-context="product"[^>]*><p>el producto/,
  );
  assert.match(
    html,
    /<div(?![^>]*hidden)[^>]*data-drill-context="supplier"[^>]*><p>el proveedor/,
  );
  assert.match(html, /<footer[^>]*>.*Guardar proveedor/);

  const first = renderToStaticMarkup(
    <DrillSurface
      frames={FRAMES.slice(0, 1)}
      origin={ORDER}
      onBack={noop}
      onTo={noop}
      onClose={noop}
    />,
  );
  assert.doesNotMatch(first, /<footer/, "the product has no footer of its own");
  assert.doesNotMatch(first, /Guardar proveedor/);
});

test("one level deep there is no «back»; deeper, it names where it goes", () => {
  const first = renderToStaticMarkup(
    <DrillSurface
      frames={FRAMES.slice(0, 1)}
      origin={ORDER}
      onBack={noop}
      onTo={noop}
      onClose={noop}
    />,
  );
  assert.doesNotMatch(first, /Back to/);
  assert.match(first, /aria-label="Close"/);

  const deeper = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <DrillSurface frames={FRAMES} origin={ORDER} onBack={noop} onTo={noop} onClose={noop} />
    </UiCopyProvider>,
  );
  assert.match(deeper, /aria-label="Volver a Impresora térmica 80 mm"/);
  assert.match(deeper, /<nav aria-label="Abierto desde"/);
});
