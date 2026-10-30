import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AppFrame,
  NavigationTree,
  type NavItem,
  SPANISH_COPY,
  UiCopyProvider,
} from "@sincpro/web-ui";
import { CommandSearch } from "@sincpro/web-ui/components/navigation/CommandPalette";
import {
  commandMatches,
  groupCommands,
  type PaletteCommand,
} from "@sincpro/web-ui/components/navigation/commands";
import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: the keyboard of the tree and of the palette is React Aria's to test. What is ours
 * is the contract around it — ids in and out, the current row marked, the path to it open,
 * the locale's match — and that adding a sidebar to `AppFrame` did not move a pixel of the
 * frames that do not use one.
 */

const ITEMS: NavItem[] = [
  {
    id: "ventas",
    label: "Ventas",
    children: [
      { id: "ventas.cotizaciones", label: "Cotizaciones", count: 7 },
      { id: "ventas.facturas", label: "Facturas", count: 1234 },
      { id: "ventas.notas", label: "Notas de crédito", count: 0 },
      {
        id: "ventas.clientes",
        label: "Clientes",
        children: [{ id: "ventas.clientes.precios", label: "Listas de precios" }],
      },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    children: [{ id: "compras.ordenes", label: "Órdenes" }],
  },
];

/** The markup of the row with this key, up to where the next row opens. */
function rowOf(html: string, key: string): string {
  const start = html.indexOf(`data-key="${key}"`);
  assert.ok(start > -1, `row ${key} is drawn`);
  const next = html.indexOf('role="row"', html.indexOf('role="row"', start) + 1);
  return html.slice(
    html.lastIndexOf("<div", start),
    next === -1 ? undefined : html.lastIndexOf("<div", next),
  );
}

test("the sidebar is a tree of rows with a level each", () => {
  const html = renderToStaticMarkup(<NavigationTree items={ITEMS} label="Ventas" />);
  assert.match(html, /role="treegrid"/);
  assert.match(html, /aria-label="Ventas"/);
  assert.match(rowOf(html, "ventas"), /aria-level="1"/);
  assert.match(rowOf(html, "compras"), /aria-expanded="false"/);
});

test("the current screen is the page, and only that one", () => {
  const html = renderToStaticMarkup(
    <NavigationTree items={ITEMS} current="ventas.facturas" />,
  );
  assert.equal(html.match(/aria-current="page"/g)?.length, 1);
  assert.match(rowOf(html, "ventas.facturas"), /aria-current="page"/);
  assert.match(rowOf(html, "ventas.facturas"), /data-current="true"/);
  assert.doesNotMatch(rowOf(html, "ventas.cotizaciones"), /aria-current/);
});

test("the path to the current screen starts open, even two levels down", () => {
  const html = renderToStaticMarkup(
    <NavigationTree items={ITEMS} current="ventas.clientes.precios" />,
  );
  assert.match(rowOf(html, "ventas"), /aria-expanded="true"/);
  assert.match(rowOf(html, "ventas.clientes"), /aria-expanded="true"/);
  assert.match(rowOf(html, "ventas.clientes.precios"), /aria-current="page"/);
  assert.match(rowOf(html, "compras"), /aria-expanded="false"/);
});

test("defaultExpanded opens modules besides the path", () => {
  const html = renderToStaticMarkup(
    <NavigationTree items={ITEMS} current="ventas.facturas" defaultExpanded={["compras"]} />,
  );
  assert.match(rowOf(html, "compras"), /aria-expanded="true"/);
  assert.match(html, /Órdenes/);
});

test("a screen is a link to its id; a module is not", () => {
  const html = renderToStaticMarkup(
    <NavigationTree items={ITEMS} current="ventas.facturas" />,
  );
  assert.match(html, /<a [^>]*href="#ventas\.facturas"/);
  assert.doesNotMatch(rowOf(html, "ventas"), /href=/);
});

test("counts are drawn in the copy's locale, and zero is not drawn", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <NavigationTree items={ITEMS} current="ventas.facturas" />
    </UiCopyProvider>,
  );
  assert.match(rowOf(html, "ventas.facturas"), />1\.234</);
  assert.match(rowOf(html, "ventas.cotizaciones"), />7</);
  assert.doesNotMatch(rowOf(html, "ventas.notas"), />0</);
});

/* ---------------------------------------------------------------- *
 *  THE PALETTE
 * ---------------------------------------------------------------- */

const COMMANDS: PaletteCommand[] = [
  { id: "ir.facturacion", label: "Facturación", section: "Ir a…" },
  { id: "ir.pedidos", label: "Pedidos", section: "Ir a…" },
  { id: "crear.venta", label: "Nueva venta", section: "Crear…", keywords: ["factura"] },
  { id: "ayuda", label: "Ayuda" },
  { id: "crear.cliente", label: "Nuevo cliente", section: "Crear…", shortcut: "Alt+C" },
];

function search(query: string): string {
  return renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <AriaLocale>
        <CommandSearch commands={COMMANDS} onRun={() => {}} query={query} />
      </AriaLocale>
    </UiCopyProvider>,
  );
}

test("commands are grouped by section, the unsectioned ones first", () => {
  const groups = groupCommands(COMMANDS);
  assert.deepEqual(
    groups.map((g) => [g.section, g.commands.map((c) => c.id)]),
    [
      [undefined, ["ayuda"]],
      ["Ir a…", ["ir.facturacion", "ir.pedidos"]],
      ["Crear…", ["crear.venta", "crear.cliente"]],
    ],
  );
});

test("a match takes every word, in any order, in the label or the keywords", () => {
  const contains = (text: string, part: string) =>
    text.toLowerCase().includes(part.toLowerCase());
  const venta = COMMANDS[2]!;
  assert.ok(commandMatches(venta, "nueva venta", contains));
  assert.ok(commandMatches(venta, "venta nueva", contains));
  assert.ok(commandMatches(venta, "factura", contains), "a keyword finds it");
  assert.ok(commandMatches(venta, "   ", contains), "an empty query keeps everything");
  assert.ok(!commandMatches(venta, "nueva compra", contains));
});

test("the palette lists every command, under its heading, when nothing is typed", () => {
  const html = search("");
  for (const c of COMMANDS) assert.match(html, new RegExp(`>${c.label}<`));
  assert.match(html, /<header[^>]*>Ir a…<\/header>/);
  assert.match(html, /<header[^>]*>Crear…<\/header>/);
  assert.match(html, /<kbd[^>]*>Alt\+C<\/kbd>/);
  assert.equal(html.match(/role="menuitem"/g)?.length, COMMANDS.length);
});

test("the palette filters with the locale: no accent, any case, keywords count", () => {
  const html = search("FACTURACION");
  assert.match(html, />Facturación</);
  assert.doesNotMatch(html, />Pedidos</);
  assert.doesNotMatch(html, />Nueva venta</, "«factura» is a keyword, not «facturacion»");
  assert.doesNotMatch(html, /Crear…/, "a section left empty is not drawn");

  const byKeyword = search("factura");
  assert.match(byKeyword, />Nueva venta</);
  assert.match(byKeyword, />Facturación</);
});

test("nothing matches: the copy table says so", () => {
  const html = search("inexistente");
  assert.match(html, /role="menu"[^>]*data-empty="true"/);
  assert.doesNotMatch(html, /data-key=/);
  assert.match(html, /Nada coincide\./);
});

/* ---------------------------------------------------------------- *
 *  THE FRAME
 * ---------------------------------------------------------------- */

test("AppFrame owns the page: background, full height, and no sidebar unless given", () => {
  const html = renderToStaticMarkup(
    <AppFrame menu={<nav>barra</nav>} status={<footer>estado</footer>}>
      <p>vista</p>
    </AppFrame>,
  );
  const root = /^<div class="([^"]*)"/.exec(html)?.[1] ?? "";
  assert.ok(root.includes("bg-ground"), "the frame paints the page background");
  assert.ok(root.includes("min-h-dvh"), "the frame is at least the height of the window");
  assert.match(html, /<main class="[^"]*flex-1[^"]*"/, "the view grows to fill the frame");
  assert.doesNotMatch(html, /<aside/, "no sidebar was given, none is drawn");
  assert.ok(
    html.indexOf("barra") < html.indexOf("vista") &&
      html.indexOf("vista") < html.indexOf("estado"),
  );
});

test("AppFrame with a sidebar puts it beside the view, stuck under the bar", () => {
  const html = renderToStaticMarkup(
    <AppFrame menu={<nav>barra</nav>} sidebar={<p>árbol</p>}>
      <p>vista</p>
    </AppFrame>,
  );
  assert.match(
    html,
    /<aside class="sticky[^"]*w-\(--container-sidebar\)[^"]*" style="top:var\(--sticky-top, 0px\)/,
  );
  assert.ok(html.indexOf("árbol") < html.indexOf("vista"), "the sidebar comes first");
  assert.match(html, /<main[^>]*><p>vista<\/p><\/main>/);
});
