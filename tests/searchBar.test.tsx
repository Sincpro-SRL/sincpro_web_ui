import assert from "node:assert/strict";
import { test } from "node:test";

import { filterCriteria, groupCriteria, SearchBar } from "@sincpro/web-ui";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * LA BARRA, de afuera.
 *
 * Qué se PUEDE preguntar lo fija `query.test.ts`; cómo se dibuja lo puesto,
 * `criteria.test.tsx`. Acá queda lo de la barra misma: que lo puesto llegue al
 * dibujo con su clase, que el constructor tenga puerta, y que una lista sin
 * modelo siga pudiendo preguntar.
 */

const MODEL: ModelDefinition = {
  aggregate: "dataset",
  identity: "id",
  fields: {
    name: { type: "string", nullable: false, sortable: true, ops: ["=", "like"] },
    row_count: { type: "integer", nullable: false, sortable: true, ops: ["=", "<=", ">"] },
  },
  translations: {
    name: { default: "Dataset" },
    labels: { name: { default: "nombre" }, row_count: { default: "filas" } },
  },
};

const FILAS = filterCriteria(
  { field: "row_count", operator: "<=", value: 100 },
  "filas menor o igual que 100",
);
const AÑO = groupCriteria({ field: "registered_at", grain: "year" }, "registrado · año");

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test("lo puesto se lee en la barra, cada clase en su corchete", () => {
  const out = draw(
    <SearchBar
      facets={[]}
      model={MODEL}
      criteria={[AÑO, FILAS]}
      onCriteriaChange={() => {}}
    />,
  );
  assert.ok(out.includes("registrado · año"));
  assert.ok(out.includes("filas menor o igual que 100"));
  /* Agrupar y filtrar son dos preguntas, así que van en dos corchetes. */
  assert.ok(out.includes("grouped by"));
  assert.ok(out.includes("showing"));
});

/* El número del embudo cuenta lo de ARRIBA y no las hojas: «dos» tiene que ser
   lo que se ve en la barra. */
test("el embudo dice cuántas cosas hay puestas", () => {
  const out = draw(
    <SearchBar
      facets={[]}
      model={MODEL}
      criteria={[AÑO, FILAS]}
      onCriteriaChange={() => {}}
      filters={[{ options: [{ id: "x", label: "x" }] }]}
    />,
  );
  assert.ok(out.includes(">2<"));
});

test("sin nada puesto no hay corchetes que dibujar", () => {
  const out = draw(
    <SearchBar facets={[]} model={MODEL} criteria={[]} onCriteriaChange={() => {}} />,
  );
  assert.ok(!out.includes("showing"));
  assert.ok(!out.includes("grouped by"));
});

/* El constructor existía y no se podía abrir desde el único lugar donde alguien
   lo busca. Las columnas del panel son las preguntas que alguien YA pensó; ésta
   es la puerta a las que no pensó nadie. */
test("el panel ofrece el constructor, aunque no haya ninguna columna", () => {
  const out = draw(
    <SearchBar
      facets={[]}
      model={MODEL}
      criteria={[]}
      onCriteriaChange={() => {}}
      onOpenBuilder={() => {}}
    />,
  );
  assert.ok(out.includes("Filter, group and favorites"));
});

/* Sin modelo, una faceta es un campo de texto y la barra sigue funcionando: no
   hay dos barras, hay una con metadatos y otra sin ellos. */
test("sin modelo, lo puesto se dibuja igual", () => {
  const out = draw(
    <SearchBar
      facets={[{ id: "name", label: "en el nombre" }]}
      criteria={[filterCriteria({ field: "name", operator: "=", value: "x" }, "nombre: x")]}
      onCriteriaChange={() => {}}
    />,
  );
  assert.ok(out.includes("nombre: x"));
});
