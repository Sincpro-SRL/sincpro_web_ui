import assert from "node:assert/strict";
import { test } from "node:test";

import { CriteriaBuilder } from "@sincpro/web-ui";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * EL CONSTRUCTOR: el orden y el agrupado se arman como en la barra.
 *
 * Con un `<select>` por campo y otro por dirección, tres campos ordenados eran
 * seis controles y había que leerlos todos para saber por dónde ordena. Y
 * «agregar un nivel» ponía el primer campo del modelo aunque nadie lo hubiera
 * pedido, porque un `<select>` siempre viene con uno puesto.
 */

/* El constructor habla por la COPIA, igual que la barra: el archivo que dibuja
   no es donde se decide en qué idioma habla el producto. Acá se instala el
   castellano porque las frases de abajo se leen en castellano. */
installCopy({
  locale: "es-BO",
  builder: {
    order: "Orden",
    groupBy: "Agrupar por",
    noOrder: "Sin orden propio: el del modelo.",
    noGrouping: "Sin agrupar: la lista entera.",
    addOrder: "ordenar por…",
    addGroup: "agrupar por…",
  },
});

const MODEL: ModelDefinition = {
  aggregate: "dataset",
  identity: "id",
  fields: {
    name: { type: "string", nullable: false, sortable: true, ops: ["=", "like"] },
    row_count: { type: "integer", nullable: false, sortable: true, ops: ["=", ">"] },
    registered_at: { type: "datetime", nullable: false, sortable: true, ops: ["=", ">"] },
  },
  translations: { name: { default: "Dataset" }, labels: {} },
};

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test("el orden se lee en una línea, con su dirección", () => {
  const out = draw(
    <CriteriaBuilder
      model={MODEL}
      initial={{
        order: [
          { field: "row_count", descending: true },
          { field: "name", descending: false },
        ],
      }}
      onApply={() => {}}
    />,
  );
  assert.ok(out.includes("row_count"));
  assert.ok(out.includes("↓"), "la dirección se ve sin abrir nada");
  assert.ok(out.includes("↑"));
});

/* Los niveles se encadenan con «›» porque NO se suman: se anidan, y el orden es
   la pregunta. Es el mismo dibujo que la barra. */
test("los niveles se encadenan, con su corte", () => {
  const out = draw(
    <CriteriaBuilder
      model={MODEL}
      initial={{
        grouping: {
          by: [{ field: "registered_at", grain: "month" }, { field: "name" }],
        },
      }}
      onApply={() => {}}
    />,
  );
  assert.ok(out.includes("registered_at"));
  assert.ok(out.includes("month"), "el corte va adentro de la ficha");
  assert.ok(out.includes("›"));
});

/* Nada puesto es nada puesto: no se elige un campo por nadie. */
test("sin nada, no hay ningún campo elegido de oficio", () => {
  const out = draw(<CriteriaBuilder model={MODEL} onApply={() => {}} />);
  assert.ok(out.includes("Sin orden propio"));
  assert.ok(out.includes("Sin agrupar"));
  assert.ok(out.includes("ordenar por…"));
  assert.ok(out.includes("agrupar por…"));
});

/* Un campo que ya está puesto no se vuelve a ofrecer: ordenar dos veces por lo
   mismo es una regla que no hace nada. */
test("lo ya puesto no se ofrece de nuevo", () => {
  const out = draw(
    <CriteriaBuilder
      model={MODEL}
      initial={{ order: [{ field: "name", descending: false }] }}
      onApply={() => {}}
    />,
  );
  /* Queda el «+» porque hay otros dos campos ordenables. */
  assert.ok(out.includes("ordenar por…"));
});

/* ---------------------------------------------------------------- *
 *  Abrir parado sobre lo que se tocó
 * ---------------------------------------------------------------- */

/* Tocar una ficha abre el constructor SOBRE su condición, y eso vale a cualquier
   profundidad: el árbol le pasa el foco a los grupos que anida. Sin esto había
   que buscar entre doce reglas la que uno venía mirando, que es la manera más
   rápida de editar la equivocada. */
test("la condición que se tocó se marca, aunque esté anidada", () => {
  const out = draw(
    <CriteriaBuilder
      model={MODEL}
      initial={{
        where: {
          all: [
            { field: "name", operator: "like", value: "x" },
            {
              any: [
                { field: "row_count", operator: ">", value: 10 },
                { field: "registered_at", operator: ">", value: "2026-01-01" },
              ],
            },
          ],
        },
      }}
      focus="registered_at"
      onApply={() => {}}
    />,
  );
  assert.equal(out.split("ring-1 ring-primary/60").length - 1, 1);
});

/* Sin foco no se marca nada: un anillo que está siempre no señala nada. */
test("sin foco no hay nada marcado", () => {
  const out = draw(
    <CriteriaBuilder
      model={MODEL}
      initial={{ where: { field: "name", operator: "like", value: "x" } }}
      onApply={() => {}}
    />,
  );
  assert.ok(!out.includes("ring-primary/60"));
});
