import assert from "node:assert/strict";

import {
  facetPaths,
  filterCriteria,
  groupCriteria,
  type Removal,
  removeAt,
  restoreRemoval,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { CriteriaChips } from "@sincpro/web-ui/components/search/CriteriaChips";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  chipParts,
  conditionCriteria,
  queryFields,
  valuesCriteria,
  withParts,
} from "@sincpro/web-ui/components/search/query";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * LA BARRA DESDE EL TECLADO, lo que no necesita un navegador.
 *
 * Qué piezas recorren ← →, qué vuelve con «Deshacer», y qué ficha se lee en partes. Las teclas
 * mismas —«/», Alt+↓, el panel con flechas— son la historia «Desde el teclado».
 */

installCopy(SPANISH_COPY);

const MODEL: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    total: {
      type: "decimal",
      nullable: false,
      sortable: true,
      ops: ["=", "<=", ">=", "between"],
    },
    state: {
      type: "string",
      nullable: false,
      sortable: true,
      ops: ["=", "!="],
      choices: ["draft", "paid"],
    },
  },
  translations: {
    name: { default: "Factura" },
    labels: { total: { default: "total" }, state: { default: "estado" } },
    choices: { state: { draft: { default: "Borrador" }, paid: { default: "Pagada" } } },
  },
};

const FIELDS = queryFields(MODEL, "es");
const TOTAL = FIELDS.find((one) => one.field === "total")!;
const STATE = FIELDS.find((one) => one.field === "state")!;

test("una ficha que escribió la barra se lee en partes; una con nombre propio, entera", () => {
  const written = conditionCriteria(TOTAL, "<=", "1000");
  assert.deepEqual(chipParts(written, FIELDS), {
    kind: "condition",
    field: TOTAL,
    op: "<=",
    value: "1000",
  });
  /* The same condition under a name somebody chose is that name, not its parts. */
  const named = filterCriteria(
    { field: "total", operator: "<=", value: 1000 },
    "facturas chicas",
  );
  assert.equal(chipParts(named, FIELDS), undefined);
  /* Values of one field: the field and its values. */
  const values = valuesCriteria(STATE, [{ id: "paid", name: "Pagada" }]);
  assert.equal(chipParts(values, FIELDS)?.kind, "values");
});

test("cambiar una parte deja la ficha en su lugar: misma identidad, lo que viaja cambiado", () => {
  const written = conditionCriteria(TOTAL, "<=", "1000");
  const changed = withParts(written, TOTAL, ">=", "2500");
  assert.equal(changed.id, written.id);
  assert.equal(changed.kind === "filter" ? changed.label : "", "total al menos 2500");
  assert.deepEqual(changed.kind === "filter" ? changed.selection : undefined, {
    field: "total",
    operator: ">=",
    value: "2500",
  });
});

test("las piezas que recorre el teclado: el agrupado es UNA, cada filtro otra", () => {
  const all: SearchCriteria[] = [
    conditionCriteria(TOTAL, "<=", "1000"),
    groupCriteria({ field: "state" }, "estado"),
    groupCriteria({ field: "total" }, "total"),
    conditionCriteria(STATE, "=", "paid"),
  ];
  assert.deepEqual(facetPaths(all), [[[1], [2]], [[0]], [[3]]]);
  assert.deepEqual(facetPaths([]), []);
});

test("deshacer devuelve lo quitado a su lugar aunque después se haya puesto otra cosa", () => {
  const a = conditionCriteria(TOTAL, "<=", "1000");
  const b = conditionCriteria(STATE, "=", "paid");
  const before = [a, b];
  const after = removeAt(before, [0]);
  const removal: Removal = {
    label: a.kind === "filter" ? a.label : "",
    removed: [{ path: [0], node: a }],
    before,
    after,
  };
  const c = conditionCriteria(TOTAL, ">=", "5");
  /* Something set after the removal stays: undoing one chip does not take the next one. */
  assert.deepEqual(
    restoreRemoval([...after, c], removal)?.map((one) => one.id),
    [a.id, b.id, c.id],
  );
  /* Undoing twice puts nothing twice. */
  assert.deepEqual(
    restoreRemoval([a, b], removal)?.map((one) => one.id),
    [a.id, b.id],
  );
});

test("una pieza marcada se dibuja marcada y nunca plegada", () => {
  const all = Array.from({ length: 6 }, (_, at) =>
    conditionCriteria(TOTAL, "<=", String(at)),
  );
  const out = renderToStaticMarkup(
    <CriteriaChips criteria={all} fields={FIELDS} collapseAfter={2} marked={5} />,
  );
  assert.equal((out.match(/data-marked=""/g) ?? []).length, 1);
  /* Marked, nothing folds: a mark on something hidden is a mark nobody sees. */
  assert.ok(!out.includes("+4"));
  /* And it reads in parts: the value apart from the field. */
  assert.ok(out.includes('data-parts=""'));
});
