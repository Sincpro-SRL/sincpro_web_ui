import assert from "node:assert/strict";

import type { Pile } from "@sincpro/web-ui/foundations/grouping";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * UN MONTÓN DICE CUÁNTO SUMA, no sólo cuántas filas tiene.
 *
 * «Pagadas · 187» no contesta la pregunta de quien agrupa facturas por estado —¿cuánto es?—;
 * «Pagadas · 187 · Total Bs 1.204.933» sí. Lo suma quien guarda los datos (sobre todas las
 * filas, no la página) y la lista lo dibuja en el encabezado del montón.
 */

type Fila = { id: string; state: string };

const pile = (key: string, count: number, detail?: string): Pile<Fila> => ({
  path: [key],
  depth: 0,
  field: "estado",
  key,
  label: key,
  count,
  items: [],
  piles: [],
  ...(detail === undefined ? {} : { detail }),
});

test("el encabezado de un montón dibuja lo que suma", () => {
  const out = renderToStaticMarkup(
    <ListView<Fila>
      items={[{ id: "F-1", state: "pagada" }]}
      keyOf={(one) => one.id}
      row={(one) => ({ name: one.id })}
      present="rows"
      group={{
        levels: [{ field: "state" }],
        of: (one) => one.state,
        piles: [pile("pagada", 187, "Total 1.204.933,00"), pile("borrador", 12)],
      }}
    />,
  );
  assert.match(out, /Total 1\.204\.933,00/);
  assert.match(out, /borrador/);
});
