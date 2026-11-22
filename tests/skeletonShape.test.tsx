import assert from "node:assert/strict";

import { Skeleton } from "@sincpro/web-ui";
import { ListView } from "@sincpro/web-ui/views/list/ListView";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * Context: a list waits in the shape of what is coming, so the page does not jump from lines
 * to boxes when the data lands. The bars are silent; the sentence is what a screen reader hears.
 */

type Fila = { id: string };
const fila = (one: Fila) => ({ name: one.id });

test("each shape draws its own silhouette, silent, with the sentence for a screen reader", () => {
  for (const shape of ["rows", "table", "tiles", "board"] as const) {
    const html = renderToStaticMarkup(<Skeleton label="Cargando…" shape={shape} />);
    assert.match(html, new RegExp(`data-shape="${shape}"`));
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /<span class="sr-only">Cargando…<\/span>/);
  }
  assert.match(
    renderToStaticMarkup(<Skeleton label="x" shape="tiles" />),
    /aspect-\(--aspect-tile\)/,
  );
});

test("a loading list waits in its presentation's shape", () => {
  const shapeOf = (present: "rows" | "tiles" | "table" | "board") =>
    /data-shape="(\w+)"/.exec(
      renderToStaticMarkup(
        <ListView<Fila>
          items={[]}
          keyOf={(one) => one.id}
          row={fila}
          state={{ loading: true }}
          present={present}
          presents={[present]}
        />,
      ),
    )?.[1];
  assert.equal(shapeOf("rows"), "rows");
  assert.equal(shapeOf("tiles"), "tiles");
});
