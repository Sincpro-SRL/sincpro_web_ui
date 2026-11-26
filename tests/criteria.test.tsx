import assert from "node:assert/strict";

import {
  filterCriteria,
  groupCriteria,
  groupsOf,
  hasNamed,
  levelsOf,
  removeAt,
  replaceAt,
  type SearchCriteria,
  selectionOf,
  toggleNamed,
} from "@sincpro/web-ui/components/search/criteria";
import { CriteriaChips } from "@sincpro/web-ui/components/search/CriteriaChips";
import { levelNameOf } from "@sincpro/web-ui/primitives/table/levels";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

/**
 * LO QUE LA BARRA TIENE PUESTO.
 *
 * Una sola cosa: instancias. Las de GRUPO dicen cómo se amontona y van siempre a
 * la izquierda; las de FILTRO dicen qué filas quedan y se anidan. Lo que sale
 * hacia el motor es sólo lo de adentro —sin rótulos, sin ids, sin clases— y eso
 * es lo que deja tener un nombre que se lee y un objeto que el servidor acepta,
 * en vez de elegir entre los dos.
 */

const AÑO = groupCriteria({ field: "registered_at", grain: "year" }, "registrado · año");
const MES = groupCriteria({ field: "registered_at", grain: "month" }, "registrado · mes");
const DERIVADOS = filterCriteria(
  { field: "origin", operator: "=", value: "derivado" },
  "sólo derivados",
);
const GRANDES = filterCriteria(
  { field: "row_count", operator: ">", value: 100000 },
  "más de 100.000 filas",
);

/*  [año › mes]   [ cualquiera[ derivados, grandes ] ]  */
const PUESTO: SearchCriteria[] = [
  AÑO,
  MES,
  { id: "n1", kind: "join", join: "any", of: [DERIVADOS, GRANDES] },
];

const draw = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

/* ---------------------------------------------------------------- *
 *  Lo que sale hacia el motor
 * ---------------------------------------------------------------- */

test("hacia afuera sale el objeto del motor, sin una clave de más", () => {
  assert.deepEqual(selectionOf(PUESTO), {
    any: [
      { field: "origin", operator: "=", value: "derivado" },
      { field: "row_count", operator: ">", value: 100000 },
    ],
  });
  /* Los niveles salen por su cuenta: no son un filtro, son la otra pregunta. */
  assert.deepEqual(levelsOf(PUESTO), [
    { field: "registered_at", grain: "year" },
    { field: "registered_at", grain: "month" },
  ]);
});

test("un solo filtro no se envuelve en un grupo que no agrupa", () => {
  assert.deepEqual(selectionOf([AÑO, DERIVADOS]), {
    field: "origin",
    operator: "=",
    value: "derivado",
  });
});

/* «Ninguna» es la negación del grupo entero y no cada condición negada de a una:
   «ni derivado ni grande» es `no (derivado o grande)`. */
test("«ninguna» niega el nodo entero", () => {
  const ninguna: SearchCriteria[] = [
    { id: "n", kind: "join", join: "not", of: [DERIVADOS, GRANDES] },
  ];
  assert.deepEqual(selectionOf(ninguna), {
    negate: {
      any: [
        { field: "origin", operator: "=", value: "derivado" },
        { field: "row_count", operator: ">", value: 100000 },
      ],
    },
  });
});

test("sin filtros no hay `selection`, que es distinto de una `selection` vacía", () => {
  assert.equal(selectionOf([AÑO, MES]), undefined);
});

/* Hay recortes que ninguna `selection` contesta: «con corridas» se define con datos
   de otro contexto. La instancia existe igual —se ve, se cuenta, se saca— y lo
   que viaja sale sin ella. Sin esto no era una instancia de nada: se dibujaba en
   el menú y tildarla no hacía nada. */
test("una instancia sin expresión no viaja, y las otras sí", () => {
  const propio = filterCriteria(undefined, "con corridas", "with-runs");
  assert.deepEqual(selectionOf([propio, GRANDES]), {
    field: "row_count",
    operator: ">",
    value: 100000,
  });
  assert.equal(selectionOf([propio]), undefined);
});

/* La instancia guarda el filtro bajo la MISMA clave que la criteria que llena —
   `Criteria.selection` de @sincpro/criteria 2.0—: quien la lee no traduce nada. */
test("un filtro con nombre lleva su `selection`, la clave de la criteria", () => {
  const vencidas = { field: "state", operator: "=", value: "vencida" };
  assert.deepEqual(
    toggleNamed([], { id: "overdue", label: "vencidas", selection: vencidas }),
    [{ id: "overdue", kind: "filter", label: "vencidas", selection: vencidas }],
  );
  assert.deepEqual(filterCriteria(vencidas, "vencidas", "x"), {
    id: "x",
    kind: "filter",
    label: "vencidas",
    selection: vencidas,
  });
});

/* ---------------------------------------------------------------- *
 *  Tocar el árbol
 * ---------------------------------------------------------------- */

test("una instancia se cambia por su ruta, sin tocar las otras", () => {
  const otra = filterCriteria({ field: "name", operator: "like", value: "x" }, "nombre");
  const next = replaceAt(PUESTO, [2, 0], otra);
  assert.equal(groupsOf(next).length, 2);
  assert.deepEqual(selectionOf(next), {
    any: [
      { field: "name", operator: "like", value: "x" },
      { field: "row_count", operator: ">", value: 100000 },
    ],
  });
});

/* Un nodo que se queda con un solo hijo se desarma: «cualquiera de: (a)» es un
   paréntesis alrededor de nada. */
test("sacar un hermano desarma el nodo que queda solo", () => {
  const next = removeAt(PUESTO, [2, 1]);
  assert.deepEqual(selectionOf(next), {
    field: "origin",
    operator: "=",
    value: "derivado",
  });
});

/* ---------------------------------------------------------------- *
 *  Lo dibujado
 * ---------------------------------------------------------------- */

test("los de grupo van a la izquierda, encadenados, y los de filtro después", () => {
  const out = draw(<CriteriaChips criteria={PUESTO} />);
  const grupo = out.indexOf("registrado · año");
  const filtro = out.indexOf("sólo derivados");
  assert.ok(grupo >= 0 && filtro >= 0);
  assert.ok(grupo < filtro, "los de grupo van siempre primero");
  assert.ok(out.includes("grouped by"));
  assert.ok(out.includes("showing"));
});

test("el nodo dice cómo junta lo que tiene adentro", () => {
  const out = draw(<CriteriaChips criteria={PUESTO} />);
  assert.ok(out.includes(">any<"));
});

/* Todo se toca y todo abre lo mismo: los dos niveles y los dos filtros. */
test("cada instancia es una puerta al constructor", () => {
  const out = draw(<CriteriaChips criteria={PUESTO} onOpen={() => {}} />);
  assert.equal(out.split('title="Open this condition in the builder"').length - 1, 4);
});

/* The levels are one shape, not N filters: one chip, one ×, neutral and not gold. */
test("el agrupado es UNA ficha, con una sola × para todos sus niveles", () => {
  const out = draw(
    <CriteriaChips criteria={PUESTO} onRemove={() => {}} onRemoveMany={() => {}} />,
  );
  assert.equal(out.split('aria-label="Stop grouping"').length - 1, 1);
  assert.ok(!out.includes("Stop grouping by"), "no level carries its own ×");
  assert.equal(out.split('role="group" aria-label="grouped by').length - 1, 1);
});

test("pasado el tope, lo demás se pliega en «+N» y lo nombra", () => {
  const seis = Array.from({ length: 6 }, (_, n) =>
    filterCriteria({ field: "n", operator: "=", value: n }, `filtro ${n}`),
  );
  const out = draw(<CriteriaChips criteria={seis} collapseAfter={4} />);
  /* Wide: 4 show and «+2» names the two folded; narrow: 1 shows and «+5». */
  assert.ok(out.includes(">+2<"));
  assert.ok(out.includes(">+5<"));
  assert.ok(out.includes('title="filtro 4 · filtro 5"'));
});

test("con `Infinity` no se pliega nada", () => {
  const seis = Array.from({ length: 6 }, (_, n) =>
    filterCriteria({ field: "n", operator: "=", value: n }, `filtro ${n}`),
  );
  const out = draw(<CriteriaChips criteria={seis} collapseAfter={Infinity} />);
  assert.ok(!out.includes(">+"));
});

/* El constructor edita lo que VIAJA. Una ficha sin expresión se ve y se saca
   como cualquiera; lo que no hace es prometer una puerta que da a nada. */
test("la que no viaja se dibuja igual, pero no abre el constructor", () => {
  const propio = filterCriteria(undefined, "con corridas", "with-runs");
  const out = draw(<CriteriaChips criteria={[propio, GRANDES]} onOpen={() => {}} />);
  assert.ok(out.includes("con corridas"));
  assert.equal(out.split('title="Open this condition in the builder"').length - 1, 1);
});

test("la conjunción se cambia en la barra, sin abrir nada", () => {
  const out = draw(<CriteriaChips criteria={PUESTO} onJoin={() => {}} />);
  assert.ok(out.includes("aria-expanded"));
});

/* ---------------------------------------------------------------- *
 *  Dónde cae lo próximo
 * ---------------------------------------------------------------- */

/* Abrir un nodo con `#and` y no marcarlo es escribir una condición que aparece
   en un lugar que nadie eligió mirando. */
test("el nodo abierto se marca, y los otros no", () => {
  const marcado = draw(<CriteriaChips criteria={PUESTO} open={[2]} />);
  assert.ok(marcado.includes("ring-1 ring-primary/60"));
  assert.ok(!draw(<CriteriaChips criteria={PUESTO} />).includes("ring-primary/60"));
});

/* Una rama NO es su hermana: dos nodos pueden decir lo mismo y sólo uno está
   abierto. */
test("la marca va en la rama abierta y no en otra", () => {
  const dos: SearchCriteria[] = [
    { id: "a", kind: "join", join: "any", of: [DERIVADOS, GRANDES] },
    { id: "b", kind: "join", join: "any", of: [DERIVADOS, GRANDES] },
  ];
  assert.equal(
    draw(<CriteriaChips criteria={dos} open={[1]} />).split("ring-1").length - 1,
    1,
  );
});

/* Un corchete recién abierto no tiene nada adentro, y vacío se lee como un
   error en vez de como una invitación. */
test("un nodo vacío dice que está esperando", () => {
  const vacío: SearchCriteria[] = [{ id: "n", kind: "join", join: "all", of: [] }];
  assert.ok(draw(<CriteriaChips criteria={vacío} open={[0]} />).includes("lands here"));
});

/* Open and remove are two sibling buttons, never one inside the other (axe: nested-interactive). */
test("una ficha que se abre y se saca no anida un control dentro de otro", () => {
  const out = draw(
    <CriteriaChips criteria={[GRANDES]} onOpen={() => {}} onRemove={() => {}} />,
  );
  assert.doesNotMatch(out, /role="button"/);
  assert.doesNotMatch(out, /<button[^>]*>(?:(?!<\/button>).)*<button/s);
});

/* LOS FILTROS CON NOMBRE DE UN MISMO GRUPO SE SUMAN (#82) — la regla de Odoo: dentro de un
   grupo «o», entre grupos «y». «Pedidos» + «Trabajando» + «Terminados» son tres valores de un
   mismo campo: juntos con «y» no dejaban nada. */

const labelOf = (one: SearchCriteria) => (one.kind === "join" ? one.join : one.label);

const PEDIDOS = {
  id: "requested",
  label: "Pedidos",
  group: "status",
  selection: { field: "status", operator: "=", value: "idle" },
} as const;
const TRABAJANDO = {
  id: "running",
  label: "Trabajando",
  group: "status",
  selection: { field: "status", operator: "=", value: "running" },
} as const;
const MIOS = {
  id: "mine",
  label: "Míos",
  selection: { field: "requester", operator: "=", value: "ana@acme.com" },
} as const;

test("dos filtros de un grupo son UN chip «A o B» que pide cualquiera de los dos", () => {
  const puesto = toggleNamed(toggleNamed([], PEDIDOS, { or: "o" }), TRABAJANDO, { or: "o" });
  assert.equal(puesto.length, 1);
  assert.equal(labelOf(puesto[0]!), "Pedidos o Trabajando");
  assert.deepEqual(selectionOf(puesto), {
    any: [PEDIDOS.selection, TRABAJANDO.selection],
  });
  assert.ok(hasNamed(puesto, "requested") && hasNamed(puesto, "running"));
});

test("un grupo se cruza con «y» con lo demás, y sacar el último quita el chip", () => {
  let puesto = toggleNamed(toggleNamed([], PEDIDOS), MIOS);
  puesto = toggleNamed(puesto, TRABAJANDO);
  assert.deepEqual(selectionOf(puesto), {
    all: [{ any: [PEDIDOS.selection, TRABAJANDO.selection] }, MIOS.selection],
  });
  puesto = toggleNamed(toggleNamed(puesto, PEDIDOS), TRABAJANDO);
  assert.deepEqual(puesto.map(labelOf), ["Míos"]);
  assert.equal(hasNamed(puesto, "requested"), false);
});

test("un solo filtro del grupo viaja como es, sin un «cualquiera» de uno", () => {
  assert.deepEqual(selectionOf(toggleNamed([], PEDIDOS)), PEDIDOS.selection);
});

test("cada faceta de filtro de la barra lleva su embudo; adentro de un nodo, no", () => {
  const html = renderToStaticMarkup(<CriteriaChips criteria={[AÑO, DERIVADOS, GRANDES]} />);
  assert.equal(html.split('data-ui="search.facet-mark"').length - 1, 2);
  const anidado = renderToStaticMarkup(<CriteriaChips criteria={PUESTO} />);
  // El nodo «cualquiera» es UNA faceta: un embudo, no uno por cada chip de adentro.
  assert.equal(anidado.split('data-ui="search.facet-mark"').length - 1, 1);
});

/* LA CABECERA DE UN GRUPO DICE SU NIVEL CON LA PALABRA DE SU COLUMNA (#36): «Estado», nunca la
   clave del campo («status»). Un campo que ninguna columna muestra se lee como es. */
test("un nivel de agrupación se nombra por la cabecera de su columna", () => {
  const columnas = [
    { id: "status", header: "Estado" },
    { id: "total", field: "amount_total", header: "Total" },
  ];
  assert.equal(levelNameOf("status", columnas), "Estado");
  assert.equal(levelNameOf("amount_total", columnas), "Total");
  assert.equal(levelNameOf("stage", columnas), "stage");
  assert.equal(levelNameOf("stage", undefined), "stage");
});
