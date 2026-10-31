import assert from "node:assert/strict";

import { List, SPANISH_COPY, UiCopyProvider } from "@sincpro/web-ui";
import { DialogSurface } from "@sincpro/web-ui/primitives/dialog/Dialog";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: «Buscar más…» is the list in choosing mode, in a window that can be dragged by its
 * header to read the form behind it.
 */

type Cliente = { nombre: string; nit: string };
const CLIENTES: Cliente[] = [
  { nombre: "Ferretería El Progreso", nit: "4587123018" },
  { nombre: "Clínica San Gabriel S.A.", nit: "1020304050" },
];

/* A chooser's row answers: no 👁 / ↗ to open what is being chosen (the composer's rule too). */
test("a list that chooses offers no way in — its rows answer", () => {
  const html = renderToStaticMarkup(
    <UiCopyProvider copy={SPANISH_COPY}>
      <List<Cliente>
        embedded
        items={CLIENTES}
        keyOf={(c) => c.nit}
        onChoose={() => {}}
        onOpen={() => {}}
        onPeek={() => {}}
      >
        <List.Rows<Cliente> row={(c) => ({ name: c.nombre })} />
      </List>
    </UiCopyProvider>,
  );
  assert.doesNotMatch(html, /aria-label="Vista previa/);
  assert.doesNotMatch(html, /aria-label="Abrir/);
  assert.match(html, /cursor-pointer/, "the row is still pressable");
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
