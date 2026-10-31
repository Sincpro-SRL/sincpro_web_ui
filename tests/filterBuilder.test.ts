import assert from "node:assert/strict";

import {
  describeFilter,
  type TreeCondition,
  treeFromFilter,
  type TreeGroup,
  treeToFilter,
} from "@sincpro/web-ui/components/search/FilterBuilder";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import { sayCondition } from "@sincpro/web-ui/components/search/query";
import { installCopy } from "@sincpro/web-ui/foundations/copy";
import { test } from "vitest";

/* Las palabras de una frase —los operadores, y también lo que pega dos
   condiciones— salen de la copia y no de una tabla escrita adentro del
   constructor: son las MISMAS que usa la barra. Acá se pone el castellano porque
   las frases de abajo se leen en castellano. */
installCopy({
  locale: "es-BO",
  search: { and: "y", or: "o", notWord: "no", andMore: "y {count} más" },
  ops: {
    "=": "es",
    "!=": "no es",
    like: "contiene",
    ">": "mayor que",
    ">=": "mayor o igual que",
    "<": "menor que",
    "<=": "menor o igual que",
    "is null": "está vacío",
    between: "está entre",
  },
});

/* Y cambiarla cambia la frase: una comparación que el servidor agregue y que
   nadie haya nombrado se dibuja con su símbolo, que es un rótulo que falta —no
   una pregunta que desaparece. */
test("el rótulo de un operador sale de la copia, y lo que no está se dice crudo", () => {
  assert.equal(
    describeFilter({ field: "a", operator: "<=", value: 1 }),
    "a menor o igual que 1",
  );
  assert.equal(describeFilter({ field: "a", operator: "matches", value: 1 }), "a matches 1");
});

const NOMBRE = { kind: "condition", field: "name", operator: "like", value: "labs" } as const;
const FILAS = {
  kind: "condition",
  field: "row_count",
  operator: ">",
  value: "1000",
} as const;

/* treeToFilter: el árbol como el filtro que viaja. */

test("una condición sola no se envuelve", () => {
  const tree: TreeGroup = { kind: "group", join: "all", children: [NOMBRE] };

  assert.deepEqual(treeToFilter(tree), {
    field: "name",
    operator: "like",
    value: "labs",
  });
});

test("dos hijos se unen por el join del grupo", () => {
  const conY: TreeGroup = { kind: "group", join: "all", children: [NOMBRE, FILAS] };
  const conO: TreeGroup = { kind: "group", join: "any", children: [NOMBRE, FILAS] };

  assert.ok("all" in treeToFilter(conY)!);
  assert.ok("any" in treeToFilter(conO)!);
});

test("un grupo adentro de otro sale anidado, a cualquier profundidad", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [
      NOMBRE,
      {
        kind: "group",
        join: "any",
        children: [FILAS, { kind: "group", join: "all", children: [NOMBRE, FILAS] }],
      },
    ],
  };

  const built = treeToFilter(tree) as { all: unknown[] };

  assert.equal(built.all.length, 2);
  const segundo = built.all[1] as { any: unknown[] };
  assert.equal(segundo.any.length, 2);
  assert.ok("all" in (segundo.any[1] as object));
});

test("un grupo sin hijos útiles desaparece en vez de coincidir con todo", () => {
  const vacio: TreeGroup = {
    kind: "group",
    join: "all",
    children: [{ kind: "condition", field: "", operator: "=", value: "" }],
  };

  assert.equal(treeToFilter(vacio), undefined);
});

test("el operador «está vacío» viaja con true y no con lo tipeado", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [{ kind: "condition", field: "produced_by", operator: "is null", value: "" }],
  };

  assert.deepEqual(treeToFilter(tree), {
    field: "produced_by",
    operator: "is null",
    value: true,
  });
});

/* treeFromFilter: el JSON leído de vuelta al árbol editable. */

test("un any adentro de un all vuelve como árbol, N niveles", () => {
  const filtro = {
    all: [
      { field: "name", operator: "like", value: "labs" },
      {
        any: [
          { field: "a", operator: "=", value: 1 },
          { all: [{ field: "b", operator: "=", value: 2 }] },
        ],
      },
    ],
  };

  const tree = treeFromFilter(filtro) as TreeGroup;

  assert.equal(tree.kind, "group");
  assert.equal(tree.join, "all");
  const anidado = tree.children[1] as TreeGroup;
  assert.equal(anidado.join, "any");
  assert.equal((anidado.children[1] as TreeGroup).join, "all");
});

/* Negar era lo único que el árbol no sabía construir, así que se escribía en el
   JSON o no se escribía. Ahora es un grupo más —«ninguna»—, y el «no» que ya
   estaba puesto se abre en él en vez de dejar el editor de sólo lectura. */
test("un «no» se lee como el grupo «ninguna»", () => {
  const uno = treeFromFilter({
    negate: { field: "a", operator: "=", value: 1 },
  }) as TreeGroup;
  assert.equal(uno.join, "not");
  assert.equal(uno.children.length, 1);

  /* El `negate` de un `any` son los hijos del grupo negado y no un grupo adentro
     de otro: es lo que `treeToFilter` vuelve a escribir. */
  const dos = treeFromFilter({
    negate: {
      any: [
        { field: "a", operator: "=", value: 1 },
        { field: "b", operator: "=", value: 2 },
      ],
    },
  }) as TreeGroup;
  assert.equal(dos.join, "not");
  assert.equal(dos.children.length, 2);
});

/* «Ninguna» niega el grupo entero, y uno de un solo hijo NO se desarma: hacerlo
   perdería la negación. */
test("«ninguna» vuelve como un `negate` del grupo entero", () => {
  const uno: TreeGroup = {
    kind: "group",
    join: "not",
    children: [{ kind: "condition", field: "a", operator: "=", value: "1" }],
  };
  assert.deepEqual(treeToFilter(uno), {
    negate: { field: "a", operator: "=", value: "1" },
  });

  const dos: TreeGroup = {
    kind: "group",
    join: "not",
    children: [
      { kind: "condition", field: "a", operator: "=", value: "1" },
      { kind: "condition", field: "b", operator: "=", value: "2" },
    ],
  };
  assert.deepEqual(treeToFilter(dos), {
    negate: {
      any: [
        { field: "a", operator: "=", value: "1" },
        { field: "b", operator: "=", value: "2" },
      ],
    },
  });
  /* Y vuelve igual: ida y vuelta no cambia la pregunta. */
  assert.equal((treeFromFilter(treeToFilter(dos)) as TreeGroup).children.length, 2);
});

test("lo que no es un filtro no vuelve como árbol", () => {
  assert.equal(treeFromFilter({ foo: "bar" }), null);
  assert.equal(treeFromFilter([1, 2, 3]), null);
  assert.equal(treeFromFilter(null), null);
});

test("ida y vuelta: árbol -> JSON -> árbol, sin perder la forma", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "any",
    children: [NOMBRE, { kind: "group", join: "all", children: [FILAS, NOMBRE] }],
  };

  const vuelta = treeFromFilter(JSON.parse(JSON.stringify(treeToFilter(tree)))) as TreeGroup;

  assert.equal(vuelta.join, "any");
  assert.equal((vuelta.children[1] as TreeGroup).join, "all");
});

/* describeFilter: lo que dice una ficha. */

test("una condición se dice con el rótulo del operador", () => {
  assert.equal(
    describeFilter({ field: "row_count", operator: ">", value: 1000 }),
    "row_count mayor que 1000",
  );
});

/* EL MODELO ES EL QUE SABE CÓMO SE LLAMA UN CAMPO. La barra dice «filas» porque
   pregunta con las palabras del modelo; si el constructor dijera `row_count`, la
   misma condición se leería de dos maneras según por dónde entró. */
test("con el modelo, la condición se dice con el rótulo del campo", () => {
  const model: ModelDefinition = {
    aggregate: "dataset",
    identity: "id",
    fields: { row_count: { type: "integer", nullable: false, sortable: true, ops: [">"] } },
    translations: {
      name: { default: "Dataset" },
      labels: { row_count: { default: "filas" } },
    },
  };
  assert.equal(
    describeFilter({ field: "row_count", operator: ">", value: 1000 }, model),
    "filas mayor que 1000",
  );
  /* Y es la MISMA frase que arma la barra al preguntar. */
  assert.equal(
    sayCondition("filas", ">", "1000"),
    describeFilter({ field: "row_count", operator: ">", value: 1000 }, model),
  );
});

test("un all se dice con «y», un any con «o»", () => {
  const partes = [
    { field: "a", operator: "=", value: 1 },
    { field: "b", operator: "=", value: 2 },
  ];

  assert.equal(describeFilter({ all: partes }), "a es 1 y b es 2");
  assert.equal(describeFilter({ any: partes }), "a es 1 o b es 2");
});

test("un grupo anidado se encierra, para que «a y (b o c)» no se lea al revés", () => {
  const dicho = describeFilter({
    all: [
      { field: "a", operator: "=", value: 1 },
      {
        any: [
          { field: "b", operator: "=", value: 2 },
          { field: "c", operator: "=", value: 3 },
        ],
      },
    ],
  });

  assert.equal(dicho, "a es 1 y (b es 2 o c es 3)");
});

test("más de tres condiciones se cortan: una ficha que no entra no dice nada", () => {
  const muchas = [1, 2, 3, 4, 5].map((n) => ({
    field: `f${n}`,
    operator: "=",
    value: n,
  }));

  assert.ok(describeFilter({ all: muchas }).endsWith("y 2 más"));
});

/* Una regla a medio escribir no viaja. */

test("una regla sin valor no filtra: no es «el campo es vacío»", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [{ kind: "condition", field: "name", operator: "like", value: "" }],
  };

  assert.equal(treeToFilter(tree), undefined);
});

test("la regla a medio escribir se cae sola y la completa sobrevive", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [NOMBRE, { kind: "condition", field: "row_count", operator: ">", value: "" }],
  };

  assert.deepEqual(treeToFilter(tree), {
    field: "name",
    operator: "like",
    value: "labs",
  });
});

test("«está vacío» sí viaja sin valor, porque el valor ES la pregunta", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [{ kind: "condition", field: "produced_by", operator: "is null", value: "" }],
  };

  assert.deepEqual(treeToFilter(tree), {
    field: "produced_by",
    operator: "is null",
    value: true,
  });
});

/* «Entre», que compara contra dos extremos. */

test("un rango viaja como sus dos extremos", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [
      {
        kind: "condition",
        field: "registered_at",
        operator: "between",
        value: "2026-01-01",
        upper: "2026-12-31",
      },
    ],
  };

  assert.deepEqual(treeToFilter(tree), {
    field: "registered_at",
    operator: "between",
    value: ["2026-01-01", "2026-12-31"],
  });
});

test("un rango con un solo extremo no es medio rango: no viaja", () => {
  const tree: TreeGroup = {
    kind: "group",
    join: "all",
    children: [
      {
        kind: "condition",
        field: "registered_at",
        operator: "between",
        value: "2026-01-01",
      },
    ],
  };

  assert.equal(treeToFilter(tree), undefined);
});

test("un rango vuelve del JSON a sus dos campos", () => {
  const tree = treeFromFilter({
    field: "registered_at",
    operator: "between",
    value: ["2026-01-01", "2026-12-31"],
  }) as TreeCondition;

  assert.equal(tree.value, "2026-01-01");
  assert.equal(tree.upper, "2026-12-31");
});

test("un rango se dice con «y» entre los extremos", () => {
  assert.equal(
    describeFilter({
      field: "registered_at",
      operator: "between",
      value: ["2026-01-01", "2026-12-31"],
    }),
    "registered_at está entre 2026-01-01 y 2026-12-31",
  );
});
