import assert from "node:assert/strict";

import { isRecognizedFilter } from "@sincpro/web-ui/components/search/FilterBuilder";
import { formatJson } from "@sincpro/web-ui/components/search/JsonEditor";
import { test } from "vitest";

/**
 * LO QUE SE ESCRIBE A MANO.
 *
 * El editor de JSON es la otra mitad del constructor: lo mismo que el árbol
 * arma con controles se puede escribir, copiar o pegar. Acá está lo único que
 * tiene lógica —acomodar lo escrito, y decidir si lo escrito es un filtro—,
 * porque de eso dependen los dos avisos que ve quien escribe.
 */

/* ---------------------------------------------------------------- *
 *  Acomodar lo escrito
 * ---------------------------------------------------------------- */

test("un JSON se acomoda con un campo por línea", () => {
  const out = formatJson('{"field":"a","operator":"=","value":1}');
  assert.equal(out, '{\n  "field": "a",\n  "operator": "=",\n  "value": 1\n}');
});

/* A medio escribir NO se toca: acomodar lo que todavía no cierra devolvería
   cualquier cosa, y quien está tipeando perdería lo que llevaba. */
test("lo que todavía no se puede leer se devuelve igual", () => {
  assert.equal(formatJson('{"field": "a",'), '{"field": "a",');
  assert.equal(formatJson(""), "");
});

/* ---------------------------------------------------------------- *
 *  Si lo escrito es un filtro
 * ---------------------------------------------------------------- */

/* Las cuatro formas que el constructor sabe dibujar. `negate` entró cuando el
   árbol aprendió a construir «ninguna». */
test("las formas que el constructor reconoce", () => {
  assert.ok(isRecognizedFilter({ field: "a", operator: "=", value: 1 }));
  assert.ok(isRecognizedFilter({ all: [] }));
  assert.ok(isRecognizedFilter({ any: [] }));
  assert.ok(isRecognizedFilter({ negate: { field: "a", operator: "=", value: 1 } }));
});

/* Un JSON VÁLIDO que no es un filtro es un error distinto del de sintaxis, y se
   dice distinto: el editor ya subraya dónde se rompe la sintaxis, así que el
   aviso de afuera existe para lo otro. */
test("un JSON válido que no es un filtro no pasa", () => {
  assert.ok(!isRecognizedFilter({}));
  assert.ok(!isRecognizedFilter({ foo: 1 }));
  assert.ok(!isRecognizedFilter([{ field: "a", operator: "=", value: 1 }]));
  assert.ok(!isRecognizedFilter(null));
  assert.ok(!isRecognizedFilter("{}"));
});

/* Una condición a la que le falta una de las tres claves no es una condición:
   mandarla sería preguntar media pregunta. */
test("una condición incompleta no es una condición", () => {
  assert.ok(!isRecognizedFilter({ field: "a", operator: "=" }));
  assert.ok(!isRecognizedFilter({ field: "a", value: 1 }));
});
