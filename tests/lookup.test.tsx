import assert from "node:assert/strict";
import { test } from "node:test";

import { lookupRows } from "@sincpro/web-ui/components/lookup/LookupDialog";
import { DialogSurface } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Context: «Buscar más…» filters by what a person would type — any column, without accents —
 * unless a server already answered; and its window can be dragged by the header to read the
 * form behind it.
 */

type Cliente = { nombre: string; nit: string; ciudad: string };

const CLIENTES: Cliente[] = [
  { nombre: "Ferretería El Progreso", nit: "4587123018", ciudad: "Cochabamba" },
  { nombre: "Clínica San Gabriel S.A.", nit: "1020304050", ciudad: "La Paz" },
];

const COLUMNAS = [
  { id: "nombre", header: "Cliente", value: (c: Cliente) => c.nombre },
  { id: "nit", header: "NIT", value: (c: Cliente) => c.nit },
  { id: "ciudad", header: "Ciudad", value: (c: Cliente) => c.ciudad },
];

test("it filters by any column, without accents nor case", () => {
  assert.deepEqual(
    lookupRows(CLIENTES, COLUMNAS, "FERRETERIA", { remote: false }).map((c) => c.nit),
    ["4587123018"],
  );
  assert.deepEqual(
    lookupRows(CLIENTES, COLUMNAS, "la paz", { remote: false }).map((c) => c.nit),
    ["1020304050"],
  );
  assert.equal(lookupRows(CLIENTES, COLUMNAS, "1020", { remote: false }).length, 1);
});

test("a server's answer is shown as it came", () => {
  assert.equal(lookupRows(CLIENTES, COLUMNAS, "nada", { remote: true }).length, 2);
});

test("an empty search shows everything", () => {
  assert.equal(lookupRows(CLIENTES, COLUMNAS, "  ", { remote: false }).length, 2);
});

test("a movable window offers its header as the handle; a fixed one does not", () => {
  const movable = renderToStaticMarkup(
    <DialogSurface title="Elegir un cliente" onClose={() => {}} onDragStart={() => {}}>
      cuerpo
    </DialogSurface>,
  );
  const fixed = renderToStaticMarkup(
    <DialogSurface title="Elegir un cliente" onClose={() => {}}>
      cuerpo
    </DialogSurface>,
  );
  assert.match(movable, /<header class="[^"]*cursor-grab/);
  assert.doesNotMatch(fixed, /cursor-grab/);
});
