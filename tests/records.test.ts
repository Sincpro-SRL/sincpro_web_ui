import assert from "node:assert/strict";

import type { SearchCriteria } from "@sincpro/web-ui/components/search/criteria";
import {
  describeFilter,
  liftRecords,
  namesOf,
  type TreeCondition,
  treeFromFilter,
  type TreeGroup,
  treeToFilter,
} from "@sincpro/web-ui/components/search/FilterBuilder";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  answers,
  conditionCriteria,
  queryField,
  queryFields,
  readTyped,
  suggest,
  valuesCriteria,
  withValue,
} from "@sincpro/web-ui/components/search/query";
import {
  recordsFilter,
  recordsOf,
  recordTarget,
} from "@sincpro/web-ui/components/search/records";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { test } from "vitest";

/**
 * LOS REGISTROS DE UNA RELACIÓN: se eligen por nombre, viajan por clave.
 *
 * El modelo es el que publica sincpro_framework: un many2one se identifica por su clave
 * foránea (`customer_id`, un entero) y no por un nombre, y un many2many no tiene columna de
 * este lado. Ninguno de los dos se puede preguntar con un texto; sí por sus registros.
 */

const MODEL: ModelDefinition = {
  aggregate: "invoice",
  identity: "id",
  fields: {
    number: { type: "text", nullable: false, sortable: true, ops: ["=", "!=", "like"] },
    state: {
      type: "text",
      nullable: false,
      sortable: true,
      ops: ["=", "!=", "in", "not in"],
      choices: ["paid", "posted", "overdue"],
    },
    customer: {
      type: "many2one",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      relation: "Partner",
      identifiedBy: "customer_id",
    },
    customer_id: {
      type: "integer",
      nullable: true,
      sortable: true,
      ops: ["=", "!=", "in", "not in", "is null", "is not null"],
    },
    tags: {
      type: "many2many",
      nullable: true,
      sortable: false,
      ops: [],
      kind: "relation",
      many: true,
      relation: "Tag",
    },
  },
  translations: {
    name: { default: "Factura" },
    labels: {
      number: { default: "Número" },
      state: { default: "Estado" },
      customer: { default: "Cliente" },
      customer_id: { default: "Cliente (id)" },
      tags: { default: "Etiquetas" },
    },
    choices: {
      state: { paid: { default: "Pagada" }, posted: { default: "Publicada" } },
    },
  },
};

installCopy({ locale: "es-BO", ops: { "=": "es", in: "es alguno de", like: "contiene" } });

const FIELDS = queryFields(MODEL, "default");
const CLIENTE = queryField(MODEL, "customer", "default")!;
const ETIQUETAS = queryField(MODEL, "tags", "default")!;
const ESTADO = queryField(MODEL, "state", "default")!;

const ANDRES_PEREZ = { id: 7, name: "Andrés Pérez" };
const ANDRES_GUTIERREZ = { id: 9, name: "Andrés Gutiérrez" };

/* ---------------------------------------------------------------- *
 *  Cómo entra una relación
 * ---------------------------------------------------------------- */

test("un many2one entra por su clave foránea, con el rótulo de la relación", () => {
  assert.equal(CLIENTE.label, "Cliente");
  assert.equal(CLIENTE.field, "customer_id");
  assert.deepEqual(CLIENTE.relation, {
    name: "customer",
    relation: "Partner",
    many: false,
    key: "id",
    column: "customer_id",
    ops: ["=", "!=", "in", "not in", "is null", "is not null"],
  });
  // La columna que lo identifica no se ofrece dos veces.
  assert.equal(FIELDS.filter((one) => one.field === "customer_id").length, 1);
});

test("un many2many entra sin operadores: sólo se pregunta por sus registros", () => {
  assert.equal(ETIQUETAS.ops.length, 0);
  assert.equal(ETIQUETAS.relation?.many, true);
  assert.equal(ETIQUETAS.relation?.column, undefined);
});

test("un enum trae la palabra de cada valor", () => {
  assert.equal(ESTADO.choiceLabels?.paid, "Pagada");
  // Sin palabra, el valor tal cual.
  assert.equal(ESTADO.choiceLabels?.overdue, "overdue");
});

/* «cliente es andres» contra un entero da cero: no se ofrece. */
test("una relación por clave foránea no contesta un texto", () => {
  assert.equal(answers(CLIENTE, readTyped("andres")), false);
});

/* ---------------------------------------------------------------- *
 *  Lo que se ofrece
 * ---------------------------------------------------------------- */

test("sin búsqueda de registros, una relación por clave no se ofrece para un texto", () => {
  const offered = suggest({ text: "andres" }, FIELDS);
  assert.ok(!offered.some((one) => one.label === "Cliente"));
  assert.ok(!offered.some((one) => one.label === "Etiquetas"));
});

test("con búsqueda de registros, cada relación se despliega en sus registros", () => {
  const offered = suggest({ text: "andres" }, FIELDS, { records: true });
  const cliente = offered.find((one) => one.label === "Cliente");
  const etiquetas = offered.find((one) => one.label === "Etiquetas");
  assert.equal(cliente?.kind, "unfold");
  assert.equal(etiquetas?.kind, "unfold");
  assert.equal(cliente?.kind === "unfold" ? cliente.text : "", "andres");
});

test("una relación por un nombre contiene el texto Y despliega sus registros", () => {
  const byName: ModelDefinition = {
    ...MODEL,
    fields: {
      ...MODEL.fields,
      customer: { ...MODEL.fields.customer!, identifiedBy: "customer_name" },
      customer_name: { type: "text", nullable: true, sortable: true, ops: ["=", "like"] },
    },
  };
  const offered = suggest({ text: "andres" }, queryFields(byName, "default"), {
    records: true,
  });
  const cliente = offered.find((one) => one.label === "Cliente");
  assert.equal(cliente?.kind, "condition");
  assert.equal(cliente?.kind === "condition" && cliente.unfolds, true);
});

test("un enum se despliega en los valores que contienen lo escrito, por su palabra", () => {
  const partial = suggest({ text: "pag" }, FIELDS).find((one) => one.label === "Estado");
  assert.equal(partial?.kind, "unfold");
  // Ninguna palabra lo contiene: «estado es xyz» da cero, y no se ofrece.
  assert.ok(!suggest({ text: "xyz" }, FIELDS).some((one) => one.label === "Estado"));
});

test("un valor exacto de un enum se ofrece directo, por su palabra, y va primero", () => {
  const offered = suggest({ text: "pagada" }, FIELDS, { literal: true });
  const first = offered[0];
  assert.equal(first?.kind, "value");
  if (first?.kind === "value") {
    assert.equal(first.option.id, "paid");
    assert.equal(first.hint, "Pagada");
  }
});

/* ---------------------------------------------------------------- *
 *  Lo que viaja
 * ---------------------------------------------------------------- */

test("un many2one viaja por su columna; uno es «=», varios «in»", () => {
  const target = CLIENTE.relation!;
  assert.deepEqual(recordsFilter(target, [7]), {
    field: "customer_id",
    operator: "=",
    value: 7,
  });
  assert.deepEqual(recordsFilter(target, [7, 9]), {
    field: "customer_id",
    operator: "in",
    value: [7, 9],
  });
  assert.deepEqual(recordsFilter(target, [7, 9], true), {
    field: "customer_id",
    operator: "not in",
    value: [7, 9],
  });
});

test("un many2many viaja cruzando la relación, por la clave del otro lado", () => {
  assert.deepEqual(recordsFilter(ETIQUETAS.relation!, [3, 4]), {
    through: "tags",
    selection: { field: "id", operator: "in", value: [3, 4] },
  });
  assert.deepEqual(recordsFilter(ETIQUETAS.relation!, [3], true), {
    negate: { through: "tags", selection: { field: "id", operator: "=", value: 3 } },
  });
});

test("una columna que no acepta «in» pregunta cada clave", () => {
  const target = { ...CLIENTE.relation!, ops: ["="] };
  assert.deepEqual(recordsFilter(target, [7, 9]), {
    any: [
      { field: "customer_id", operator: "=", value: 7 },
      { field: "customer_id", operator: "=", value: 9 },
    ],
  });
});

test("lo que recordsFilter escribe, recordsOf lo lee de vuelta", () => {
  for (const target of [
    CLIENTE.relation!,
    ETIQUETAS.relation!,
    { ...CLIENTE.relation!, ops: ["="] },
  ]) {
    for (const keys of [[7], [7, 9]]) {
      for (const negate of [false, true]) {
        const asked = recordsOf(target, recordsFilter(target, keys, negate));
        assert.deepEqual(asked, { keys, negate }, `${target.name} ${keys} ${negate}`);
      }
    }
  }
  assert.equal(
    recordsOf(CLIENTE.relation!, { field: "number", operator: "=", value: 7 }),
    null,
  );
});

/* ---------------------------------------------------------------- *
 *  Las fichas: por la barra o por código, las mismas
 * ---------------------------------------------------------------- */

test("dos registros de la misma relación son UNA ficha", () => {
  let put: SearchCriteria[] = [];
  put = withValue(put, CLIENTE, ANDRES_PEREZ);
  put = withValue(put, CLIENTE, ANDRES_GUTIERREZ);
  // Elegir uno que ya está no cambia nada.
  put = withValue(put, CLIENTE, { id: "7", name: "Andrés Pérez" });
  assert.equal(put.length, 1);
  const chip = put[0]!;
  assert.equal(
    chip.kind === "filter" && chip.label,
    "Cliente: Andrés Pérez or Andrés Gutiérrez",
  );
  assert.deepEqual(chip.kind === "filter" && chip.selection, {
    field: "customer_id",
    operator: "in",
    value: [7, 9],
  });
});

test("una búsqueda por defecto se arma con las mismas piezas que la barra", () => {
  const defaults = [
    valuesCriteria(CLIENTE, [ANDRES_PEREZ]),
    valuesCriteria(ESTADO, [
      { id: "paid", name: "Pagada" },
      { id: "posted", name: "Publicada" },
    ]),
    conditionCriteria(queryField(MODEL, "number", "default")!, "like", "FAC/2026"),
  ];
  assert.deepEqual(
    defaults.map((one) => (one.kind === "filter" ? one.label : "")),
    ["Cliente: Andrés Pérez", "Estado: Pagada or Publicada", "Número contiene FAC/2026"],
  );
  assert.deepEqual(defaults[1]?.kind === "filter" && defaults[1].selection, {
    field: "state",
    operator: "in",
    value: ["paid", "posted"],
  });
  // Un valor más del estado cae en SU ficha, no en la del cliente.
  const next = withValue(defaults, ESTADO, { id: "overdue", name: "overdue" });
  assert.equal(next.length, 3);
});

/* ---------------------------------------------------------------- *
 *  El constructor: por nombre en pantalla, por clave en el filtro
 * ---------------------------------------------------------------- */

const row = (node: Partial<TreeCondition>): TreeCondition => ({
  kind: "condition",
  field: "customer",
  operator: "=",
  value: "",
  target: recordTarget(MODEL, "customer")!,
  ...node,
});

test("una regla sobre registros viaja por clave", () => {
  assert.deepEqual(treeToFilter(row({ values: [ANDRES_PEREZ] })), {
    field: "customer_id",
    operator: "=",
    value: 7,
  });
  assert.deepEqual(treeToFilter(row({ operator: "!=", values: [ANDRES_PEREZ] })), {
    field: "customer_id",
    operator: "!=",
    value: 7,
  });
  assert.deepEqual(
    treeToFilter(row({ operator: "in", values: [ANDRES_PEREZ, ANDRES_GUTIERREZ] })),
    { field: "customer_id", operator: "in", value: [7, 9] },
  );
  assert.deepEqual(treeToFilter(row({ operator: "is null" })), {
    field: "customer_id",
    operator: "is null",
    value: true,
  });
  // Sin nada elegido, la regla no filtra.
  assert.equal(treeToFilter(row({ values: [] })), undefined);
});

test("leído de vuelta, el valor sale como entró: un número sigue siendo un número", () => {
  const filter = { field: "customer_id", operator: "=", value: 7 };
  assert.deepEqual(treeToFilter(treeFromFilter(filter)!), filter);
  const list = { field: "state", operator: "in", value: ["paid", "posted"] };
  assert.deepEqual(treeToFilter(treeFromFilter(list)!), list);
  const yes = { field: "number", operator: "=", value: true };
  assert.deepEqual(treeToFilter(treeFromFilter(yes)!), yes);
});

test("con el modelo, una columna de relación se vuelve a leer como la relación", () => {
  const lifted = liftRecords(
    treeFromFilter({ field: "customer_id", operator: "in", value: [7, 9] })!,
    MODEL,
  ) as TreeCondition;
  assert.equal(lifted.field, "customer");
  assert.equal(lifted.target?.name, "customer");
  assert.deepEqual(
    lifted.values?.map((one) => one.id),
    [7, 9],
  );
  // Y vuelve a salir igual.
  assert.deepEqual(treeToFilter(lifted), {
    field: "customer_id",
    operator: "in",
    value: [7, 9],
  });
});

test("un many2many cruzado hasta su clave se vuelve a leer como sus registros", () => {
  const none = {
    negate: { through: "tags", selection: { field: "id", operator: "in", value: [3, 4] } },
  };
  const lifted = liftRecords(treeFromFilter(none)!, MODEL) as TreeCondition;
  assert.equal(lifted.field, "tags");
  assert.equal(lifted.operator, "not in");
  assert.deepEqual(treeToFilter(lifted), none);
});

test("la frase de lo aplicado dice los nombres, no las claves", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [row({ operator: "in", values: [ANDRES_PEREZ, ANDRES_GUTIERREZ] })],
  };
  const filter = treeToFilter(tree)!;
  assert.equal(
    describeFilter(filter, MODEL, undefined, namesOf(tree)),
    "Cliente es alguno de Andrés Pérez, Andrés Gutiérrez",
  );
  // Sin los nombres, las claves — pero con el rótulo de la relación, no el de la columna.
  assert.equal(describeFilter(filter, MODEL), "Cliente es alguno de 7, 9");
});
