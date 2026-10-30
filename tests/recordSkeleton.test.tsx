import assert from "node:assert/strict";
import { test } from "node:test";

import { Record } from "@sincpro/web-ui/views/record/Record";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * CARGAR UNA FICHA NO ES DECIR QUE NO HAY NADA.
 *
 * Dataset y corrida contestaban la espera con el vacío. La silueta tiene que
 * decir que el registro está en camino, y la frase queda para quien no ve
 * las barras.
 */

test("la ficha cargando no se dice como un vacío", () => {
  const out = renderToStaticMarkup(<Record.Skeleton label="Cargando el registro…" />);
  assert.ok(out.includes("Cargando el registro…"));
  assert.ok(out.includes('aria-busy="true"'));
  assert.ok(out.includes("bg-chrome"));
  assert.ok(!out.includes("Todavía no hay nada"));
});
